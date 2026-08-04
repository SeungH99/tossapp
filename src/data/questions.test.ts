import { describe, expect, it } from "vitest";

import { bonusQuestions, coreQuestions } from "./questions";
import {
  RELEASE_BONUS_TOPICS,
  RELEASE_CORE_LENSES,
  RELEASE_DATE_KEYS,
  validateBundledContent,
} from "./content-validation";

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

  it("공유 출시 계약을 실제 번들 전체로 확인한다", () => {
    expect(RELEASE_DATE_KEYS).toHaveLength(30);
    expect(RELEASE_CORE_LENSES).toEqual(["then", "now", "life"]);
    expect(RELEASE_BONUS_TOPICS).toEqual([
      "nostalgia",
      "korean-life",
      "language",
      "digital",
      "safety",
      "nature-general",
    ]);
    expect(validateBundledContent(coreQuestions, bonusQuestions)).toEqual({
      coreCount: 90,
      bonusCount: 90,
      issues: [],
    });
  });

  it("legacy 보너스 번들도 주제별 세 문제와 세 난이도로 묶인다", () => {
    for (const topic of RELEASE_BONUS_TOPICS) {
      const topicQuestions = bonusQuestions.filter(
        (question) => question.topic === topic,
      );
      expect(topicQuestions).toHaveLength(15);
      for (const setIndex of [0, 1, 2, 3, 4]) {
        const questions = topicQuestions.filter(
          (question) => question.setIndex === setIndex,
        );
        expect(questions).toHaveLength(3);
        expect(
          questions.map((question) => question.internalDifficulty),
        ).toEqual(["gentle", "steady", "stretch"]);
      }
    }
  });
});
