import { describe, expect, it } from "vitest";

import { parseBonusPack, parseCorePack } from "./parse-content";

const metadata = {
  contentVersion: "2026.08.180d",
  reviewStatus: "reviewed",
  reviewedAt: "2026-08-04",
  source: { name: "국가기록원", url: "https://www.archives.go.kr/" },
};

describe("content pack parsers", () => {
  it("parses a reviewed core pack", () => {
    expect(
      parseCorePack({
        id: "core-001",
        kind: "core",
        contentVersion: metadata.contentVersion,
        reviewStatus: metadata.reviewStatus,
        questions: [
          {
            ...metadata,
            kind: "core",
            id: "2026-07-28-then-public-phone",
            conceptId: "nostalgia-public-phone-coin-call",
            dateKey: "2026-07-28",
            lens: "then",
            topic: "nostalgia",
            internalDifficulty: "gentle",
            prompt: "공중전화에서 통화를 이어가려면 무엇이 필요했을까요?",
            choices: ["수화기", "동전", "우표"],
            answerIndex: 1,
            explanation: "동전을 넣어 통화를 이어갔어요.",
          },
        ],
      }),
    ).toMatchObject({ id: "core-001", kind: "core" });
  });

  it("rejects a bonus pack with invalid question review metadata", () => {
    expect(() =>
      parseBonusPack({
        id: "bonus-digital-001",
        kind: "bonus",
        contentVersion: metadata.contentVersion,
        reviewStatus: "reviewed",
        questions: [
          {
            ...metadata,
            reviewStatus: "draft",
            kind: "bonus",
            id: "bonus-digital-0-gentle",
            conceptId: "public-phone",
            variant: "gentle",
            internalDifficulty: "gentle",
            setIndex: 0,
            lens: "now",
            topic: "digital",
            prompt: "휴대전화 화면에서 글자를 크게 보려면 무엇을 조절할까요?",
            choices: ["글자 크기", "벨소리", "손전등"],
            answerIndex: 0,
            explanation: "설정에서 글자 크기를 조절할 수 있어요.",
          },
        ],
      }),
    ).toThrow("bonus.questions[0].question.reviewStatus");
  });
});
