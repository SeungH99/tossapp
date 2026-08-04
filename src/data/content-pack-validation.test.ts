import { describe, expect, it } from "vitest";

import type {
  BonusContentPack,
  BonusContentPackDescriptor,
  ContentManifest,
  CoreContentPack,
  CoreContentPackDescriptor,
} from "../content/types";
import {
  validateContentLibrary,
  validateContentPack,
} from "./content-pack-validation";

const metadata = {
  contentVersion: "2026.08.180d",
  reviewStatus: "reviewed" as const,
  reviewedAt: "2026-08-04",
  source: { name: "National Archives", url: "https://www.archives.go.kr/" },
};

const corePack: CoreContentPack = {
  id: "core-001",
  kind: "core",
  contentVersion: metadata.contentVersion,
  reviewStatus: "reviewed",
  questions: [
    {
      ...metadata,
      kind: "core",
      id: "core-gentle",
      dateKey: "2026-07-28",
      lens: "then",
      topic: "nostalgia",
      internalDifficulty: "gentle",
      prompt: "공중전화 통화를 시작할 때 먼저 무엇을 넣었을까요?",
      choices: ["십 원짜리 동전", "종이 승차권", "우편 엽서"],
      answerIndex: 0,
      explanation: "동전을 넣고 번호를 눌러 통화했습니다.",
    },
    {
      ...metadata,
      kind: "core",
      id: "core-steady",
      dateKey: "2026-07-28",
      lens: "now",
      topic: "digital",
      internalDifficulty: "steady",
      prompt: "휴대전화 글자를 더 크게 보려면 어느 설정을 바꿀까요?",
      choices: ["화면 밝기", "글자 크기", "통화 음량"],
      answerIndex: 1,
      explanation: "디스플레이 설정에서 글자 크기를 조절합니다.",
    },
    {
      ...metadata,
      kind: "core",
      id: "core-stretch",
      dateKey: "2026-07-28",
      lens: "life",
      topic: "safety",
      internalDifficulty: "stretch",
      prompt: "낯선 송금 요청을 받으면 가장 먼저 어떻게 확인할까요?",
      choices: ["바로 보내기", "직접 전화하기", "문자를 지우기"],
      answerIndex: 2,
      explanation: "알고 있는 연락처로 직접 사실을 확인합니다.",
    },
  ],
};

const coreDescriptor: CoreContentPackDescriptor = {
  id: corePack.id,
  kind: "core",
  path: "src/content/core/pack-001.json",
  sha256: "a".repeat(64),
  questionCount: 3,
  reviewStatus: "reviewed",
  dateStart: "2026-07-28",
  dateEnd: "2026-07-28",
};

function bonusPack(): BonusContentPack {
  return {
    id: "bonus-digital-001",
    kind: "bonus",
    contentVersion: metadata.contentVersion,
    reviewStatus: "reviewed",
    questions: corePack.questions.map((question, index) => ({
      ...question,
      kind: "bonus" as const,
      id: `bonus-${index}`,
      topic: "digital" as const,
      setIndex: 0,
      conceptId: `concept-${index}`,
      variant: question.internalDifficulty,
    })),
  };
}

const bonusDescriptor: BonusContentPackDescriptor = {
  id: "bonus-digital-001",
  kind: "bonus",
  path: "src/content/bonus/digital/pack-001.json",
  sha256: "b".repeat(64),
  questionCount: 3,
  reviewStatus: "reviewed",
  topic: "digital",
  setStart: 0,
  setEnd: 0,
};

function issueCodes(
  pack: unknown,
  descriptor: CoreContentPackDescriptor | BonusContentPackDescriptor,
) {
  return validateContentPack(pack, descriptor).issues.map(({ code }) => code);
}

describe("validateContentPack", () => {
  it("accepts a reviewed pack that satisfies every release-quality rule", () => {
    expect(validateContentPack(corePack, coreDescriptor).issues).toEqual([]);
  });

  it("blocks similar prompts and answer-length clues", () => {
    const suspiciousPack = {
      ...corePack,
      questions: corePack.questions.map((question) => ({ ...question })),
    };
    suspiciousPack.questions[1].prompt =
      "공중전화 통화를 시작할 때 먼저 무엇을 넣었을가요?";
    suspiciousPack.questions[1].choices = [
      "짧은 답",
      "설명처럼 아주 길고 눈에 띄는 정답 선택지",
      "다른 답",
    ];

    expect(issueCodes(suspiciousPack, coreDescriptor)).toEqual(
      expect.arrayContaining(["similar-prompt", "choice-length-outlier"]),
    );
  });

  it("requires each bonus set to contain all three difficulties once", () => {
    const invalid = bonusPack();
    invalid.questions[1].internalDifficulty = "gentle";

    expect(validateContentPack(invalid, bonusDescriptor).issues).toContainEqual(
      expect.objectContaining({
        code: "difficulty-balance",
        scope: "digital:0",
      }),
    );
  });

  it("applies the exact short-prompt boundary after removing whitespace", () => {
    const short = structuredClone(corePack);
    short.questions[0].prompt = "가 나 다 라 마 바 사 아 자 차 카 타 파";
    const boundary = structuredClone(corePack);
    boundary.questions[0].prompt = "가 나 다 라 마 바 사 아 자 차 카 타 파 하";

    expect(issueCodes(short, coreDescriptor)).toContain("short-prompt");
    expect(issueCodes(boundary, coreDescriptor)).not.toContain("short-prompt");
  });

  it("detects schema, count, range, answer balance, and source-review failures", () => {
    const invalid = structuredClone(corePack) as unknown as Record<
      string,
      unknown
    >;
    const questions = invalid.questions as Array<Record<string, unknown>>;
    questions[0].answerIndex = 1;
    questions[2].answerIndex = 1;
    questions[0].source = { name: "", url: "http://example.com" };
    questions[0].reviewedAt = "2026/08/04";
    questions[2].dateKey = "2026-07-29";

    expect(
      issueCodes(invalid, { ...coreDescriptor, questionCount: 4 }),
    ).toEqual(
      expect.arrayContaining([
        "schema",
        "count",
        "date-range",
        "answer-balance",
        "source-review",
      ]),
    );
  });

  it("detects duplicate IDs, prompts, choices, answer leaks, and stacked negatives", () => {
    const invalid = structuredClone(corePack);
    invalid.questions[1].id = invalid.questions[0].id;
    invalid.questions[1].prompt = invalid.questions[0].prompt;
    invalid.questions[2].prompt =
      "다음 중 직접 전화하기가 아닌 것과 옳지 않은 것은 무엇일까요?";
    invalid.questions[2].choices = ["같은 선택", "같은 선택", "직접 전화하기"];

    expect(issueCodes(invalid, coreDescriptor)).toEqual(
      expect.arrayContaining([
        "duplicate-id",
        "duplicate-prompt",
        "choice-duplicate",
        "answer-leak",
        "negative-stack",
      ]),
    );
  });

  it("flags bonus set range and concepts repeated less than 30 sets apart", () => {
    const invalid = bonusPack();
    invalid.questions.push(
      ...invalid.questions.map((question) => ({
        ...question,
        id: `${question.id}-next`,
        setIndex: 29,
        prompt: `${question.prompt} 다음 상황`,
      })),
    );

    expect(issueCodes(invalid, { ...bonusDescriptor, setEnd: 30 })).toEqual(
      expect.arrayContaining(["set-range", "concept-spacing"]),
    );
  });
});

describe("validateContentLibrary", () => {
  it("checks raw checksums and duplicates across pack boundaries", () => {
    const secondPack = structuredClone(corePack);
    secondPack.id = "core-002";
    secondPack.questions = secondPack.questions.map((question) => ({
      ...question,
      dateKey: "2026-07-29",
    }));
    const secondDescriptor: CoreContentPackDescriptor = {
      ...coreDescriptor,
      id: secondPack.id,
      path: "src/content/core/pack-002.json",
      dateStart: "2026-07-29",
      dateEnd: "2026-07-29",
    };
    const manifest: ContentManifest = {
      releaseStart: "2026-07-28",
      releaseEnd: "2027-01-23",
      contentVersion: metadata.contentVersion,
      corePacks: [coreDescriptor, secondDescriptor],
      bonusPacks: [],
    };

    const report = validateContentLibrary(manifest, [
      {
        path: coreDescriptor.path,
        pack: corePack,
        sha256: coreDescriptor.sha256,
      },
      { path: secondDescriptor.path, pack: secondPack, sha256: "wrong" },
    ]);

    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["checksum", "duplicate-id", "duplicate-prompt"]),
    );
  });

  it("detects similar prompts and concept spacing across pack boundaries", () => {
    const first = bonusPack();
    const second = bonusPack();
    second.id = "bonus-digital-002";
    second.questions = second.questions.map((question, index) => ({
      ...question,
      id: `later-${index}`,
      setIndex: 29,
      prompt:
        index === 0
          ? "공중전화 통화를 시작할 때 먼저 무엇을 넣었을가요?"
          : `${question.prompt} 새로운 상황을 살펴봅니다`,
    }));
    const secondDescriptor: BonusContentPackDescriptor = {
      ...bonusDescriptor,
      id: second.id,
      path: "src/content/bonus/digital/pack-002.json",
      sha256: "c".repeat(64),
      setStart: 29,
      setEnd: 29,
    };
    const manifest: ContentManifest = {
      releaseStart: "2026-07-28",
      releaseEnd: "2027-01-23",
      contentVersion: metadata.contentVersion,
      corePacks: [],
      bonusPacks: [bonusDescriptor, secondDescriptor],
    };

    const report = validateContentLibrary(manifest, [
      {
        path: bonusDescriptor.path,
        pack: first,
        sha256: bonusDescriptor.sha256,
      },
      {
        path: secondDescriptor.path,
        pack: second,
        sha256: secondDescriptor.sha256,
      },
    ]);

    expect(report.issues.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["similar-prompt", "concept-spacing"]),
    );
  });
});
