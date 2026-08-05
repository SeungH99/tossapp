import { describe, expect, it } from "vitest";

import {
  createBonusQuestion,
  createCoreQuestion,
  validateQuestion,
  type BonusQuestion,
  type BonusQuestionInput,
  type CoreQuestion,
  type CoreQuestionInput,
} from "./question";

const source = {
  name: "국가기록원",
  url: "https://www.archives.go.kr/",
};

describe("validateQuestion", () => {
  const validCoreQuestion = {
    kind: "core",
    id: "2026-07-28-then-public-phone",
    dateKey: "2026-07-28",
    lens: "then",
    topic: "nostalgia",
    internalDifficulty: "gentle",
    prompt:
      "공중전화에서 안내음이 들린 뒤 통화를 계속하려면 무엇이 필요했을까요?",
    choices: ["수화기 교체", "동전 추가", "전화번호 재입력"],
    answerIndex: 1,
    explanation: "안내음 뒤 동전을 더 넣어 통화를 이어갔어요.",
    source,
    contentVersion: "2026.08.180d",
    reviewStatus: "reviewed",
    reviewedAt: "2026-08-04",
  };

  it("검수 메타데이터와 핵심 난이도를 요구한다", () => {
    expect(validateQuestion(validCoreQuestion)).toEqual([]);
  });

  it("omitted factory metadata is not promoted to reviewed content", () => {
    const coreWithoutMetadata = Object.fromEntries(
      Object.entries(validCoreQuestion).filter(
        ([key]) =>
          !["contentVersion", "reviewStatus", "reviewedAt"].includes(key),
      ),
    );
    const bonusWithoutMetadata = {
      ...coreWithoutMetadata,
      kind: "bonus" as const,
      conceptId: "public-phone",
      variant: "base",
      setIndex: 0,
    };

    expect(
      validateQuestion(
        createCoreQuestion(coreWithoutMetadata as unknown as CoreQuestionInput),
      ),
    ).toEqual(
      expect.arrayContaining([
        "question.contentVersion",
        "question.reviewStatus",
        "question.reviewedAt",
      ]),
    );
    expect(
      validateQuestion(
        createBonusQuestion(
          bonusWithoutMetadata as unknown as BonusQuestionInput,
        ),
      ),
    ).toEqual(
      expect.arrayContaining([
        "question.contentVersion",
        "question.reviewStatus",
        "question.reviewedAt",
      ]),
    );
  });

  it("rejects impossible review dates and incomplete source URLs", () => {
    expect(
      validateQuestion({ ...validCoreQuestion, reviewedAt: "2026-02-30" }),
    ).toContain("question.reviewedAt");
    expect(
      validateQuestion({
        ...validCoreQuestion,
        source: { name: "source", url: "https://" },
      }),
    ).toContain("question.source.url");
  });

  it("draft 상태와 잘못된 reviewedAt을 출시 문제로 거부한다", () => {
    expect(
      validateQuestion({ ...validCoreQuestion, reviewStatus: "draft" }),
    ).toContain("question.reviewStatus");
    expect(
      validateQuestion({ ...validCoreQuestion, reviewedAt: "2026/08/04" }),
    ).toContain("question.reviewedAt");
  });

  it("core 문제는 kind와 날짜를 포함해야 한다", () => {
    const question: CoreQuestion = {
      kind: "core",
      id: "2026-07-28-then-phone",
      dateKey: "2026-07-28",
      internalDifficulty: "gentle",
      lens: "then",
      topic: "nostalgia",
      prompt: "예전 공중전화에서 무엇을 넣었을까요?",
      choices: ["동전", "우표", "열쇠"],
      answerIndex: 0,
      explanation: "동전을 넣어 사용했어요.",
      source,
      contentVersion: "2026.08.180d",
      reviewStatus: "reviewed",
      reviewedAt: "2026-08-04",
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
      setIndex: 0,
      prompt: "공중전화에서 사용하던 것은 무엇일까요?",
      choices: ["동전", "우표", "열쇠"],
      answerIndex: 0,
      explanation: "동전을 넣어 사용했어요.",
      source,
      contentVersion: "2026.08.180d",
      reviewStatus: "reviewed",
      reviewedAt: "2026-08-04",
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
    ).toEqual(
      expect.arrayContaining(["question.kind", "question.answerIndex"]),
    );
  });
});
