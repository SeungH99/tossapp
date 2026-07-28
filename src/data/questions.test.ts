import { describe, expect, it } from "vitest";

import { bonusQuestions, coreQuestions } from "./questions";
import type { BonusTopic, CoreLens, Question } from "../domain/question";

const releaseDates = [
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
  "2026-08-01",
  "2026-08-02",
  "2026-08-03",
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
  it("출시 첫 7일은 매일 그때·요즘·생활 세 문제를 제공한다", () => {
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

  it("여섯 보너스 주제에 각각 최소 여섯 문제를 제공한다", () => {
    for (const topic of bonusTopics) {
      expect(
        bonusQuestions.filter((question) => question.topic === topic),
      ).toHaveLength(6);
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
});
