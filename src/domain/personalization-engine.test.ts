import { describe, expect, it } from "vitest";

import { selectBonusQuestions } from "./bonus-selection";
import { PERSONALIZATION_POLICY_V1 } from "./personalization-policy";
import { selectShadowBonusQuestions } from "./personalization-engine";
import type { AnswerEvent } from "./progress-state";
import type { BonusQuestion } from "./question";

function question(
  id: string,
  difficulty: BonusQuestion["internalDifficulty"],
  topic: BonusQuestion["topic"] = "digital",
): BonusQuestion {
  return {
    kind: "bonus",
    id,
    conceptId: id,
    variant: "base",
    internalDifficulty: difficulty,
    lens: "now",
    topic,
    prompt: id,
    choices: ["one", "two", "three"],
    answerIndex: 0,
    explanation: id,
    source: { name: "test", url: "https://example.com" },
  };
}

function answer(
  id: string,
  isCorrect: boolean,
  topic: AnswerEvent["topic"] = "digital",
): AnswerEvent {
  return {
    attemptId: id,
    sessionKey: `session-${id}`,
    questionId: `question-${id}`,
    questionKind: "bonus",
    topic,
    lens: "now",
    conceptId: `concept-${id}`,
    variant: "base",
    internalDifficulty: "steady",
    selectedIndex: isCorrect ? 0 : 1,
    isCorrect,
    answeredAt: "2026-07-28T12:00:00.000Z",
  };
}

const catalog = [
  question("digital-gentle-1", "gentle"),
  question("digital-gentle-2", "gentle"),
  question("digital-gentle-3", "gentle"),
  question("digital-steady-1", "steady"),
  question("digital-steady-2", "steady"),
  question("digital-steady-3", "steady"),
  question("digital-stretch-1", "stretch"),
  question("digital-stretch-2", "stretch"),
  question("digital-stretch-3", "stretch"),
  question("safety-steady-1", "steady", "safety"),
];

function select(answerEvents: AnswerEvent[] = []) {
  return selectShadowBonusQuestions({
    topic: "digital",
    questions: catalog,
    completedBonusIds: [],
    answerEvents,
    timeConfidence: "normal",
    policy: PERSONALIZATION_POLICY_V1,
  });
}

describe("selectShadowBonusQuestions", () => {
  it("chooses gentle after two consecutive wrong bonus answers", () => {
    const result = select([answer("one", false), answer("two", false)]);

    expect(result.targetDifficulty).toBe("gentle");
    expect(result.shadowSelection.questions.map((item) => item.id)).toEqual([
      "digital-gentle-1",
      "digital-gentle-2",
      "digital-gentle-3",
    ]);
    expect(result.reasonCode).toBe("consecutive-wrong");
  });

  it("chooses gentle from low accuracy when wrong answers are not consecutive", () => {
    const result = select([
      answer("one", false),
      answer("two", true),
      answer("three", false),
    ]);

    expect(result.targetDifficulty).toBe("gentle");
    expect(result.reasonCode).toBe("low-accuracy");
  });

  it("chooses stretch from high recent accuracy without consecutive wrong", () => {
    const result = select([
      answer("one", true),
      answer("two", true),
      answer("three", true),
      answer("four", true),
    ]);

    expect(result.targetDifficulty).toBe("stretch");
    expect(result.shadowSelection.questions.map((item) => item.id)).toEqual([
      "digital-stretch-1",
      "digital-stretch-2",
      "digital-stretch-3",
    ]);
    expect(result.reasonCode).toBe("high-accuracy");
  });

  it("chooses steady when history has fewer than two answers", () => {
    const result = select([answer("one", true)]);

    expect(result.targetDifficulty).toBe("steady");
    expect(result.shadowSelection.questions.map((item) => item.id)).toEqual([
      "digital-steady-1",
      "digital-steady-2",
      "digital-steady-3",
    ]);
    expect(result.reasonCode).toBe("insufficient-history");
  });

  it("chooses steady for mixed accuracy that meets neither threshold", () => {
    const result = select([answer("one", true), answer("two", false)]);

    expect(result.targetDifficulty).toBe("steady");
    expect(result.reasonCode).toBe("mixed-accuracy");
  });

  it("uses only the most recent eight relevant answers", () => {
    const result = select([
      answer("old-one", false),
      answer("old-two", false),
      ...Array.from({ length: 8 }, (_, index) => answer(`recent-${index}`, true)),
    ]);

    expect(result.targetDifficulty).toBe("stretch");
  });

  it("is deterministic and does not mutate serializable input", () => {
    const input = {
      topic: "digital" as const,
      questions: catalog,
      completedBonusIds: [],
      answerEvents: [answer("one", true), answer("two", true)],
      timeConfidence: "normal" as const,
      policy: PERSONALIZATION_POLICY_V1,
    };
    const serializedBefore = JSON.stringify(input);

    const first = selectShadowBonusQuestions(input);
    const second = selectShadowBonusQuestions(JSON.parse(JSON.stringify(input)));

    expect(second).toEqual(first);
    expect(JSON.stringify(input)).toBe(serializedBefore);
  });

  it("always keeps the existing selector result visible, including its fallback", () => {
    const completedBonusIds = [
      "digital-gentle-1",
      "digital-gentle-2",
      "digital-gentle-3",
      "digital-steady-1",
      "digital-steady-2",
      "digital-steady-3",
      "digital-stretch-1",
    ];
    const result = selectShadowBonusQuestions({
      topic: "digital",
      questions: catalog,
      completedBonusIds,
      answerEvents: [answer("one", true), answer("two", true)],
      timeConfidence: "normal",
      policy: PERSONALIZATION_POLICY_V1,
    });

    expect(result.legacySelection).toEqual(
      selectBonusQuestions("digital", catalog, new Set(completedBonusIds)),
    );
    expect(result.visibleSelection).toEqual(result.legacySelection);
  });

  it("uses adjacent levels, same-topic unseen questions, then legacy fallback", () => {
    const result = selectShadowBonusQuestions({
      topic: "digital",
      questions: [
        question("digital-gentle-1", "gentle"),
        question("digital-gentle-2", "gentle"),
        question("safety-steady-1", "steady", "safety"),
      ],
      completedBonusIds: [],
      answerEvents: [answer("one", true), answer("two", true)],
      timeConfidence: "normal",
      policy: PERSONALIZATION_POLICY_V1,
    });

    expect(result.shadowSelection.questions.map((item) => item.id)).toEqual([
      "digital-gentle-1",
      "digital-gentle-2",
      "safety-steady-1",
    ]);
  });

  it("returns legacy selection outside the pilot", () => {
    const result = selectShadowBonusQuestions({
      topic: "nostalgia",
      questions: [...catalog, question("nostalgia-1", "stretch", "nostalgia")],
      completedBonusIds: [],
      answerEvents: [answer("one", true, "nostalgia"), answer("two", true, "nostalgia")],
      timeConfidence: "normal",
      policy: PERSONALIZATION_POLICY_V1,
    });

    expect(result.shadowSelection).toEqual(result.legacySelection);
    expect(result.reasonCode).toBe("outside-pilot");
    expect(result.policyVersion).toBe(PERSONALIZATION_POLICY_V1.version);
  });

  it("returns legacy selection when the pilot catalog has no unseen question", () => {
    const questions = [question("safety-1", "steady", "safety")];
    const result = selectShadowBonusQuestions({
      topic: "digital",
      questions,
      completedBonusIds: [],
      answerEvents: [answer("one", true), answer("two", true)],
      timeConfidence: "normal",
      policy: PERSONALIZATION_POLICY_V1,
    });

    expect(result.shadowSelection).toEqual(result.legacySelection);
    expect(result.reasonCode).toBe("insufficient-catalog");
  });
});
