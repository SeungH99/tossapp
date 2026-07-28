import { describe, expect, it } from "vitest";

import {
  validateQuestion,
  type BonusQuestion,
  type CoreQuestion,
} from "./question";

const source = {
  name: "국가기록원",
  url: "https://www.archives.go.kr/",
};

describe("validateQuestion", () => {
  it("core 문제는 kind와 날짜를 포함해야 한다", () => {
    const question: CoreQuestion = {
      kind: "core",
      id: "2026-07-28-then-phone",
      dateKey: "2026-07-28",
      lens: "then",
      topic: "nostalgia",
      prompt: "예전 공중전화에서 무엇을 넣었을까요?",
      choices: ["동전", "우표", "열쇠"],
      answerIndex: 0,
      explanation: "동전을 넣어 사용했어요.",
      source,
    };

    expect(validateQuestion(question)).toEqual([]);
  });

  it("bonus 문제는 개인화 메타데이터를 포함해야 한다", () => {
    const question: BonusQuestion = {
      kind: "bonus",
      id: "bonus-nostalgia-phone-base",
      lens: "then",
      topic: "nostalgia",
      conceptId: "nostalgia-public-phone",
      variant: "base",
      internalDifficulty: "steady",
      prompt: "공중전화에서 사용하던 것은 무엇일까요?",
      choices: ["동전", "우표", "열쇠"],
      answerIndex: 0,
      explanation: "동전을 넣어 사용했어요.",
      source,
    };

    expect(validateQuestion(question)).toEqual([]);
  });

  it("kind별 필수 값이 없으면 구체적인 오류를 반환한다", () => {
    const invalidCore = {
      kind: "core",
      id: "core-without-date",
      lens: "then",
      topic: "nostalgia",
      prompt: "질문",
      choices: ["하나", "둘", "셋"],
      answerIndex: 0,
      explanation: "설명",
      source,
    };
    const invalidBonus = {
      kind: "bonus",
      id: "bonus-without-metadata",
      lens: "then",
      topic: "nostalgia",
      prompt: "질문",
      choices: ["하나", "둘", "셋"],
      answerIndex: 0,
      explanation: "설명",
      source,
    };

    expect(validateQuestion(invalidCore)).toContain("core.dateKey");
    expect(validateQuestion(invalidBonus)).toEqual(
      expect.arrayContaining([
        "bonus.conceptId",
        "bonus.variant",
        "bonus.internalDifficulty",
      ]),
    );
  });

  it("알 수 없는 kind와 잘못된 정답 인덱스를 거부한다", () => {
    expect(
      validateQuestion({
        kind: "mystery",
        id: "unknown",
        prompt: "질문",
        choices: ["하나", "둘", "셋"],
        answerIndex: 4,
        explanation: "설명",
        source,
      }),
    ).toEqual(expect.arrayContaining(["question.kind", "question.answerIndex"]));
  });
});
