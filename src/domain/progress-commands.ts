import { unlockBonus, type BonusUnlockSource } from "./bonus-entitlement";
import { resolveBonusSetAvailability } from "./bonus-progress";
import { selectShadowBonusQuestions } from "./personalization-engine";
import type { BonusQuestion, BonusTopic, Question } from "./question";
import type {
  AnswerCheckpoint,
  AnswerEvent,
  ProgressState,
} from "./progress-state";
import {
  answerCurrentQuestion,
  createQuizSession,
  type QuizSession,
} from "./quiz-session";
import { appendShadowAudit } from "./shadow-audit";

export const ANSWER_EVENT_LIMIT = 512;

export interface AnswerCommand {
  attemptId: string;
  sessionKey: string;
  session: QuizSession;
  question: Question;
  selectedIndex: number;
  answeredAt: string;
}

export interface ApplyAnswerResult {
  applied: boolean;
  state: ProgressState;
  session: QuizSession;
}

export interface GrantBonusTicketResult {
  applied: boolean;
  state: ProgressState;
}

export type StartBonusSessionResult =
  | {
      applied: true;
      state: ProgressState;
      source: BonusUnlockSource;
      session: QuizSession;
      questionIds: string[];
    }
  | {
      applied: false;
      reason:
        | "duplicate"
        | "no-questions"
        | "reward-ad-required"
        | "daily-limit"
        | "exhausted"
        | "active-session"
        | "set-mismatch"
        | "seen-question"
        | "seen-concept";
      state: ProgressState;
      source?: BonusUnlockSource;
      session?: QuizSession;
      sessionKey?: string;
      questionIds?: string[];
    };

export type CompleteBonusSetResult =
  | { applied: true; state: ProgressState }
  | {
      applied: false;
      reason:
        | "duplicate"
        | "missing-session"
        | "incomplete-session"
        | "answer-mismatch"
        | "set-mismatch";
      state: ProgressState;
    };

function foldEvent(
  checkpoint: AnswerCheckpoint,
  event: AnswerEvent,
): AnswerCheckpoint {
  const currentQuestion = checkpoint.byQuestion[event.questionId] ?? {
    totalAnswers: 0,
    correctAnswers: 0,
  };

  return {
    totalAnswers: checkpoint.totalAnswers + 1,
    correctAnswers: checkpoint.correctAnswers + (event.isCorrect ? 1 : 0),
    byQuestion: {
      ...checkpoint.byQuestion,
      [event.questionId]: {
        totalAnswers: currentQuestion.totalAnswers + 1,
        correctAnswers:
          currentQuestion.correctAnswers + (event.isCorrect ? 1 : 0),
      },
    },
  };
}

function createAnswerEvent(command: AnswerCommand): AnswerEvent {
  const { question } = command;
  return {
    attemptId: command.attemptId,
    sessionKey: command.sessionKey,
    questionId: question.id,
    questionKind: question.kind,
    topic: question.topic,
    lens: question.lens,
    ...(question.kind === "bonus"
      ? {
          conceptId: question.conceptId,
          variant: question.variant,
          internalDifficulty: question.internalDifficulty,
        }
      : {}),
    selectedIndex: command.selectedIndex,
    isCorrect: command.selectedIndex === question.answerIndex,
    answeredAt: command.answeredAt,
  };
}

export function applyAnswerCommand(
  state: ProgressState,
  command: AnswerCommand,
): ApplyAnswerResult {
  const session = state.sessions[command.sessionKey] ?? command.session;
  if (session.dateKey !== command.sessionKey) {
    throw new Error("Quiz session key does not match its date key");
  }

  if (
    !Number.isInteger(command.selectedIndex) ||
    command.selectedIndex < 0 ||
    command.selectedIndex >= command.question.choices.length
  ) {
    throw new RangeError("Selected answer index is out of range");
  }

  const duplicate = state.answerEvents.some(
    (event) => event.attemptId === command.attemptId,
  );
  if (duplicate) {
    return { applied: false, state, session };
  }

  const nextSession = answerCurrentQuestion(
    session,
    command.question,
    command.selectedIndex,
  );
  if (nextSession === session) {
    throw new Error("Quiz session is not ready to accept an answer");
  }

  const events = [...state.answerEvents, createAnswerEvent(command)];
  let answerCheckpoint = state.answerCheckpoint;
  while (events.length > ANSWER_EVENT_LIMIT) {
    const oldest = events.shift();
    if (oldest != null) {
      answerCheckpoint = foldEvent(answerCheckpoint, oldest);
    }
  }

  const nextState: ProgressState = {
    ...state,
    sessions: {
      ...state.sessions,
      [command.sessionKey]: nextSession,
    },
    answerEvents: events,
    answerCheckpoint,
    seenQuestionIds: [
      ...new Set([...state.seenQuestionIds, command.question.id]),
    ],
    seenConceptIds: [
      ...new Set([...state.seenConceptIds, command.question.conceptId]),
    ],
  };

  return {
    applied: true,
    state: nextState,
    session: nextSession,
  };
}

export function grantBonusTicketCommand(
  state: ProgressState,
  rewardGrantId: string,
): GrantBonusTicketResult {
  if (rewardGrantId.trim().length === 0) {
    throw new TypeError("rewardGrantId must not be empty");
  }

  if (state.rewardGrantIds.includes(rewardGrantId)) {
    return { applied: false, state };
  }

  return {
    applied: true,
    state: {
      ...state,
      bonus: {
        ...state.bonus,
        ticketCount: state.bonus.ticketCount + 1,
      },
      rewardGrantIds: [...state.rewardGrantIds, rewardGrantId],
      rewardAdTicketCount: state.rewardAdTicketCount + 1,
    },
  };
}

export function findSeenQuestion(
  state: ProgressState,
  questions: readonly Question[],
): { kind: "question-id" | "concept-id"; value: string } | undefined {
  const seenQuestionIds = new Set(state.seenQuestionIds);
  const seenQuestion = questions.find((question) =>
    seenQuestionIds.has(question.id),
  );
  if (seenQuestion != null) {
    return { kind: "question-id", value: seenQuestion.id };
  }

  const seenConceptIds = new Set(state.seenConceptIds);
  const seenConcept = questions.find((question) =>
    seenConceptIds.has(question.conceptId),
  );
  return seenConcept == null
    ? undefined
    : { kind: "concept-id", value: seenConcept.conceptId };
}

export function skipBonusSetCommand(
  state: ProgressState,
  topic: BonusTopic,
  setIndex: number,
): ProgressState {
  const topicProgress = state.bonusTopicProgress[topic];
  if (topicProgress.skippedSetIndexes.includes(setIndex)) {
    return state;
  }

  return {
    ...state,
    bonusTopicProgress: {
      ...state.bonusTopicProgress,
      [topic]: {
        ...topicProgress,
        skippedSetIndexes: [...topicProgress.skippedSetIndexes, setIndex].sort(
          (left, right) => left - right,
        ),
      },
    },
  };
}

export function startBonusSessionCommand(
  state: ProgressState,
  commandId: string,
  dateKey: string,
  topic: BonusTopic,
  setIndex: number,
  releasedSetCount: number,
  bonusQuestions: BonusQuestion[],
): StartBonusSessionResult {
  if (commandId.trim().length === 0) {
    throw new TypeError("commandId must not be empty");
  }

  const completed = Object.hasOwn(state.bonusStartCommands, commandId)
    ? state.bonusStartCommands[commandId]
    : undefined;
  if (completed != null) {
    return {
      applied: false,
      reason: "duplicate",
      state,
      source: completed.source,
      session: state.sessions[completed.sessionKey],
      questionIds: completed.questionIds,
    };
  }

  const availability = resolveBonusSetAvailability(
    state,
    topic,
    dateKey,
    releasedSetCount,
  );
  if (availability.kind !== "available") {
    return {
      applied: false,
      reason: availability.kind,
      state,
      ...(availability.kind === "active-session"
        ? { sessionKey: availability.sessionKey }
        : {}),
    };
  }

  if (availability.setIndex !== setIndex) {
    return { applied: false, reason: "set-mismatch", state };
  }

  const candidateQuestions = bonusQuestions;
  if (candidateQuestions.length !== 3) {
    return { applied: false, reason: "no-questions", state };
  }
  if (
    candidateQuestions.some(
      (question) => question.topic !== topic || question.setIndex !== setIndex,
    )
  ) {
    return { applied: false, reason: "set-mismatch", state };
  }
  if (
    new Set(candidateQuestions.map((question) => question.id)).size !== 3 ||
    new Set(candidateQuestions.map((question) => question.internalDifficulty))
      .size !== 3
  ) {
    return { applied: false, reason: "no-questions", state };
  }

  const seenQuestion = findSeenQuestion(state, candidateQuestions);
  if (seenQuestion != null) {
    return {
      applied: false,
      reason:
        seenQuestion.kind === "question-id" ? "seen-question" : "seen-concept",
      state,
    };
  }

  const decision = selectShadowBonusQuestions({
    topic,
    questions: candidateQuestions,
    completedBonusIds: state.completedBonusIds,
    answerEvents: state.answerEvents,
    timeConfidence: state.timeObservation.confidence,
  });
  const rewardAdTicketAvailable = state.rewardAdTicketCount > 0;
  const unlock = unlockBonus(
    state.bonus,
    commandId,
    rewardAdTicketAvailable ? "reward_ad" : "streak_ticket",
  );
  if (unlock.source === "reward_ad" && state.bonus.ticketCount === 0) {
    return {
      applied: false,
      reason: "reward-ad-required",
      state,
      source: unlock.source,
    };
  }

  const sessionKey = `${dateKey}:bonus:${topic}`;
  const session = createQuizSession(sessionKey);
  const questionIds = candidateQuestions.map((question) => question.id);
  const record = {
    commandId,
    dateKey,
    topic,
    setIndex,
    sessionKey,
    questionIds,
    source: unlock.source,
  };
  const nextState: ProgressState = {
    ...state,
    bonus: unlock.state,
    rewardAdTicketCount:
      unlock.source === "reward_ad"
        ? state.rewardAdTicketCount - 1
        : state.rewardAdTicketCount,
    sessions: {
      ...state.sessions,
      [sessionKey]: session,
    },
    bonusStartCommands: {
      ...state.bonusStartCommands,
      [commandId]: record,
    },
    latestBonusStartCommandIds: {
      ...state.latestBonusStartCommandIds,
      [sessionKey]: commandId,
    },
    shadowAudits:
      topic === "digital" || topic === "safety"
        ? appendShadowAudit(
            state.shadowAudits,
            decision.audit,
            state.timeObservation.confidence,
          )
        : state.shadowAudits,
  };

  return {
    applied: true,
    state: nextState,
    source: unlock.source,
    session,
    questionIds,
  };
}

export function completeBonusSetCommand(
  state: ProgressState,
  sessionKey: string,
  topic: BonusTopic,
  setIndex: number,
  completedDateKey: string,
): CompleteBonusSetResult {
  const commandId = state.latestBonusStartCommandIds[sessionKey];
  const start =
    commandId == null ? undefined : state.bonusStartCommands[commandId];
  if (
    start == null ||
    start.sessionKey !== sessionKey ||
    start.topic !== topic ||
    start.setIndex !== setIndex
  ) {
    return { applied: false, reason: "set-mismatch", state };
  }

  const topicProgress = state.bonusTopicProgress[topic];
  if (topicProgress.completedSetIndexes.includes(setIndex)) {
    return { applied: false, reason: "duplicate", state };
  }

  const session = state.sessions[sessionKey];
  if (session == null) {
    return { applied: false, reason: "missing-session", state };
  }
  if (session.phase !== "completed") {
    return { applied: false, reason: "incomplete-session", state };
  }

  const expectedQuestionIds = new Set(start.questionIds);
  const answeredQuestionIds = session.answers.map(
    (answer) => answer.questionId,
  );
  if (
    start.questionIds.length !== 3 ||
    expectedQuestionIds.size !== 3 ||
    answeredQuestionIds.length !== 3 ||
    new Set(answeredQuestionIds).size !== 3 ||
    answeredQuestionIds.some(
      (questionId) => !expectedQuestionIds.has(questionId),
    )
  ) {
    return { applied: false, reason: "answer-mismatch", state };
  }

  return {
    applied: true,
    state: {
      ...state,
      completedBonusIds: [
        ...new Set([...state.completedBonusIds, ...start.questionIds]),
      ],
      bonusTopicProgress: {
        ...state.bonusTopicProgress,
        [topic]: {
          ...topicProgress,
          completedSetIndexes: [
            ...topicProgress.completedSetIndexes,
            setIndex,
          ].sort((left, right) => left - right),
          lastCompletedDateKey: completedDateKey,
        },
      },
    },
  };
}
