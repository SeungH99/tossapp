import {
  selectBonusQuestions,
  type BonusSelection,
} from "./bonus-selection";
import {
  PERSONALIZATION_POLICY_V1,
  validatePersonalizationPolicy,
  type PersonalizationPolicy,
} from "./personalization-policy";
import type { AnswerEvent } from "./progress-state";
import type { BonusQuestion, BonusTopic, InternalDifficulty } from "./question";
import {
  createShadowAudit,
  type ShadowAudit,
  type ShadowReasonCode as SharedShadowReasonCode,
} from "./shadow-audit";
import type { TimeConfidence } from "./time-confidence";

const PILOT_TOPICS: readonly BonusTopic[] = ["digital", "safety"];
const SELECTION_LIMIT = 3;

export type ShadowReasonCode = SharedShadowReasonCode;

export interface ShadowSelectionInput {
  topic: BonusTopic;
  questions: readonly BonusQuestion[];
  completedBonusIds: readonly string[];
  answerEvents: readonly AnswerEvent[];
  timeConfidence: TimeConfidence;
  policy?: PersonalizationPolicy;
}

export interface ShadowSelectionDecision {
  visibleSelection: BonusSelection;
  legacySelection: BonusSelection;
  shadowSelection: BonusSelection;
  targetDifficulty: InternalDifficulty;
  policyVersion: string;
  reasonCode: ShadowReasonCode;
  audit: ShadowAudit;
}

interface DifficultyDecision {
  targetDifficulty: InternalDifficulty;
  reasonCode:
    | "consecutive-wrong"
    | "low-accuracy"
    | "high-accuracy"
    | "insufficient-history"
    | "mixed-accuracy";
}

function selectDifficulty(
  answers: readonly AnswerEvent[],
  policy: PersonalizationPolicy,
): DifficultyDecision {
  if (answers.length < policy.minimumAnswersForDifficulty) {
    return { targetDifficulty: "steady", reasonCode: "insufficient-history" };
  }

  const lastAnswers = answers.slice(-policy.consecutiveWrongThreshold);
  if (
    lastAnswers.length === policy.consecutiveWrongThreshold &&
    lastAnswers.every((answer) => !answer.isCorrect)
  ) {
    return { targetDifficulty: "gentle", reasonCode: "consecutive-wrong" };
  }

  const accuracy =
    answers.filter((answer) => answer.isCorrect).length / answers.length;
  if (accuracy < policy.lowAccuracyThreshold) {
    return { targetDifficulty: "gentle", reasonCode: "low-accuracy" };
  }
  if (accuracy >= policy.highAccuracyThreshold) {
    return { targetDifficulty: "stretch", reasonCode: "high-accuracy" };
  }

  return { targetDifficulty: "steady", reasonCode: "mixed-accuracy" };
}

function createSelection(
  topic: BonusTopic,
  questions: BonusQuestion[],
): BonusSelection {
  return {
    questions,
    includesOtherTopics: questions.some((question) => question.topic !== topic),
  };
}

function selectShadowQuestions(
  topic: BonusTopic,
  questions: readonly BonusQuestion[],
  completedBonusIds: ReadonlySet<string>,
  targetDifficulty: InternalDifficulty,
  legacySelection: BonusSelection,
  policy: PersonalizationPolicy,
): BonusSelection | null {
  const unseen = questions.filter(
    (question) => !completedBonusIds.has(question.id),
  );
  if (!unseen.some((question) => question.topic === topic)) {
    return null;
  }

  const selected: BonusQuestion[] = [];
  const selectedIds = new Set<string>();
  const append = (candidates: readonly BonusQuestion[]) => {
    for (const question of candidates) {
      if (selected.length === SELECTION_LIMIT) {
        return;
      }
      if (!selectedIds.has(question.id)) {
        selected.push(question);
        selectedIds.add(question.id);
      }
    }
  };

  append(
    unseen.filter(
      (question) =>
        question.topic === topic &&
        question.internalDifficulty === targetDifficulty,
    ),
  );

  for (const fallback of policy.fallbackOrder) {
    if (selected.length === SELECTION_LIMIT) {
      break;
    }
    if (fallback === "adjacent-level") {
      const targetLevel = policy.difficultyLevels[targetDifficulty];
      const adjacentDifficulties = (
        Object.entries(policy.difficultyLevels) as Array<
          [InternalDifficulty, number]
        >
      )
        .filter(([difficulty]) => difficulty !== targetDifficulty)
        .sort(
          ([leftDifficulty, leftLevel], [rightDifficulty, rightLevel]) =>
            Math.abs(leftLevel - targetLevel) -
              Math.abs(rightLevel - targetLevel) ||
            leftLevel - rightLevel ||
            leftDifficulty.localeCompare(rightDifficulty),
        )
        .map(([difficulty]) => difficulty);
      for (const difficulty of adjacentDifficulties) {
        append(
          unseen.filter(
            (question) =>
              question.topic === topic &&
              question.internalDifficulty === difficulty,
          ),
        );
      }
    } else if (fallback === "same-topic-unseen") {
      append(unseen.filter((question) => question.topic === topic));
    } else if (fallback === "default-selector") {
      append(legacySelection.questions);
    }
  }

  return createSelection(topic, selected);
}

function createDecision(
  legacySelection: BonusSelection,
  shadowSelection: BonusSelection,
  targetDifficulty: InternalDifficulty,
  policyVersion: string,
  reasonCode: ShadowReasonCode,
): ShadowSelectionDecision {
  return {
    visibleSelection: legacySelection,
    legacySelection,
    shadowSelection,
    targetDifficulty,
    policyVersion,
    reasonCode,
    audit: createShadowAudit({
      legacyQuestionIds: legacySelection.questions.map((question) => question.id),
      shadowQuestionIds: shadowSelection.questions.map((question) => question.id),
      policyVersion,
      reasonCode,
    }),
  };
}

export function selectShadowBonusQuestions(
  input: ShadowSelectionInput,
): ShadowSelectionDecision {
  const policy = input.policy ?? PERSONALIZATION_POLICY_V1;
  const validationErrors = validatePersonalizationPolicy(policy);
  if (validationErrors.length > 0) {
    throw new RangeError(
      `Invalid personalization policy: ${validationErrors.join(", ")}`,
    );
  }

  const completedBonusIds = new Set(input.completedBonusIds);
  const legacySelection = selectBonusQuestions(
    input.topic,
    [...input.questions],
    completedBonusIds,
  );
  const relevantAnswers = input.answerEvents
    .filter(
      (answer) =>
        answer.questionKind === "bonus" && answer.topic === input.topic,
    )
    .slice(-policy.recentAccuracyWindow);
  const difficulty = selectDifficulty(relevantAnswers, policy);

  if (input.timeConfidence === "lowConfidence") {
    return createDecision(
      legacySelection,
      legacySelection,
      difficulty.targetDifficulty,
      policy.version,
      "low-confidence",
    );
  }
  if (!PILOT_TOPICS.includes(input.topic)) {
    return createDecision(
      legacySelection,
      legacySelection,
      difficulty.targetDifficulty,
      policy.version,
      "outside-pilot",
    );
  }

  const shadowSelection = selectShadowQuestions(
    input.topic,
    input.questions,
    completedBonusIds,
    difficulty.targetDifficulty,
    legacySelection,
    policy,
  );
  if (shadowSelection == null) {
    return createDecision(
      legacySelection,
      legacySelection,
      difficulty.targetDifficulty,
      policy.version,
      "insufficient-catalog",
    );
  }

  return createDecision(
    legacySelection,
    shadowSelection,
    difficulty.targetDifficulty,
    policy.version,
    difficulty.reasonCode,
  );
}
