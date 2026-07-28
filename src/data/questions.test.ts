import { describe, expect, it } from "vitest";

import { bonusQuestions, coreQuestions } from "./questions";
import {
  validateQuestion,
  type BonusTopic,
  type CoreLens,
  type Question,
} from "../domain/question";

const releaseDates = [
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
  "2026-08-01",
  "2026-08-02",
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-08",
  "2026-08-09",
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-15",
  "2026-08-16",
  "2026-08-17",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
  "2026-08-22",
  "2026-08-23",
  "2026-08-24",
  "2026-08-25",
  "2026-08-26",
] as const;
const coreLenses: CoreLens[] = ["then", "now", "life"];
const bonusTopics: BonusTopic[] = [
  "nostalgia",
  "korean-life",
  "language",
  "digital",
  "safety",
  "nature-general",
];

function normalizePrompt(prompt: string): string {
  return prompt.replace(/\s+/g, "").toLocaleLowerCase("ko-KR");
}

function expectValidQuestion(question: Question) {
  expect(validateQuestion(question)).toEqual([]);
  expect(question.id.trim()).not.toBe("");
  expect(question.prompt.trim()).not.toBe("");
  expect(question.explanation.trim()).not.toBe("");
  expect(question.choices).toHaveLength(3);
  expect(question.choices.every((choice) => choice.trim().length > 0)).toBe(
    true,
  );
  expect(question.answerIndex).toBeGreaterThanOrEqual(0);
  expect(question.answerIndex).toBeLessThan(question.choices.length);
  expect(question.source.name.trim()).not.toBe("");
  expect(question.source.url).toMatch(/^https:\/\//);
}

describe("bundled question content", () => {
  it("핵심과 보너스 문제를 kind로 안전하게 구분한다", () => {
    expect(coreQuestions.every((question) => question.kind === "core")).toBe(
      true,
    );
    expect(
      bonusQuestions.every(
        (question) =>
          question.kind === "bonus" &&
          question.conceptId.length > 0 &&
          question.variant.length > 0 &&
          question.internalDifficulty.length > 0,
      ),
    ).toBe(true);
  });

  it("출시 첫 30일은 매일 그때·요즘·생활 세 문제를 제공한다", () => {
    expect(
      [...new Set(coreQuestions.map((question) => question.dateKey))].sort(),
    ).toEqual([...releaseDates]);

    for (const dateKey of releaseDates) {
      const dailyQuestions = coreQuestions.filter(
        (question) => question.dateKey === dateKey,
      );
      expect(dailyQuestions.map((question) => question.lens)).toEqual(
        coreLenses,
      );
    }
  });

  it("여섯 보너스 주제에 각각 15문제를 제공한다", () => {
    for (const topic of bonusTopics) {
      expect(
        bonusQuestions.filter((question) => question.topic === topic),
      ).toHaveLength(15);
    }
  });

  it("모든 문제의 필수 값과 출처가 유효하고 ID와 질문이 중복되지 않는다", () => {
    const allQuestions = [...coreQuestions, ...bonusQuestions];

    allQuestions.forEach(expectValidQuestion);
    expect(new Set(allQuestions.map((question) => question.id)).size).toBe(
      allQuestions.length,
    );
    expect(
      new Set(
        allQuestions.map((question) => normalizePrompt(question.prompt)),
      ).size,
    ).toBe(allQuestions.length);
  });

  it("30일 핵심 문제의 정답 위치가 한 번호에 치우치지 않는다", () => {
    const answerPositionCounts = [0, 1, 2].map(
      (answerIndex) =>
        coreQuestions.filter(
          (question) => question.answerIndex === answerIndex,
        ).length,
    );

    expect(
      Math.max(...answerPositionCounts) -
        Math.min(...answerPositionCounts),
    ).toBeLessThanOrEqual(2);
  });

  it("보너스 문제의 정답 위치도 한 번호에 치우치지 않는다", () => {
    const answerPositionCounts = [0, 1, 2].map(
      (answerIndex) =>
        bonusQuestions.filter(
          (question) => question.answerIndex === answerIndex,
        ).length,
    );

    expect(
      Math.max(...answerPositionCounts) -
        Math.min(...answerPositionCounts),
    ).toBeLessThanOrEqual(2);
  });
});
