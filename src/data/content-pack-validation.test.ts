import { describe, expect, it } from "vitest";

import type {
  BonusContentPack,
  BonusContentPackDescriptor,
  ContentManifest,
  CoreContentPack,
  CoreContentPackDescriptor,
} from "../content/types";
import type { BonusTopic, InternalDifficulty } from "../domain/question";
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
      conceptId: "nostalgia-public-phone-coin-call",
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
      conceptId: "digital-mobile-text-size-setting",
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
      conceptId: "safety-suspicious-transfer-direct-verification",
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

const DAY_MS = 24 * 60 * 60 * 1000;
const RELEASE_START = Date.UTC(2026, 6, 28);
const DIFFICULTIES = [
  "gentle",
  "steady",
  "stretch",
] as const satisfies readonly InternalDifficulty[];
const LENSES = ["then", "now", "life"] as const;
const BONUS_TOPICS = [
  "nostalgia",
  "korean-life",
  "language",
  "digital",
  "safety",
  "nature-general",
] as const satisfies readonly BonusTopic[];

function releaseDate(offset: number): string {
  return new Date(RELEASE_START + offset * DAY_MS).toISOString().slice(0, 10);
}

function uniquePrompt(seed: number): string {
  let state = (seed + 1) * 2_654_435_761;
  let result = "";
  for (let index = 0; index < 32; index += 1) {
    state = Math.imul(state ^ (state >>> 15), 2_246_822_519);
    result += String.fromCharCode(97 + ((state >>> 0) % 26));
  }
  return result;
}

function checksum(index: number): string {
  return index.toString(16).padStart(64, "0");
}

function buildCoreLibrary(startOffset = 0) {
  const descriptors: CoreContentPackDescriptor[] = [];
  const packs: Array<{ path: string; pack: CoreContentPack; sha256: string }> =
    [];
  for (let packIndex = 0; packIndex < 6; packIndex += 1) {
    const firstOffset = startOffset + packIndex * 30;
    const questions = Array.from({ length: 30 }, (_, dayIndex) =>
      DIFFICULTIES.map((internalDifficulty, difficultyIndex) => ({
        ...metadata,
        kind: "core" as const,
        id: `core-${packIndex}-${dayIndex}-${difficultyIndex}`,
        conceptId: `core-concept-${packIndex}-${dayIndex}-${difficultyIndex}`,
        dateKey: releaseDate(firstOffset + dayIndex),
        lens: LENSES[difficultyIndex],
        topic: "nostalgia" as const,
        internalDifficulty,
        prompt: uniquePrompt(
          1 + packIndex * 90 + dayIndex * 3 + difficultyIndex,
        ),
        choices: ["alpha choice", "beta choice", "gamma choice"] as [
          string,
          string,
          string,
        ],
        answerIndex: difficultyIndex as 0 | 1 | 2,
        explanation: "Reviewed source explanation for this core question.",
      })),
    ).flat();
    const pack: CoreContentPack = {
      id: `core-${String(packIndex + 1).padStart(3, "0")}`,
      kind: "core",
      contentVersion: metadata.contentVersion,
      reviewStatus: "reviewed",
      questions,
    };
    const path = `src/content/core/pack-${String(packIndex + 1).padStart(3, "0")}.json`;
    const sha256 = checksum(packIndex + 1);
    descriptors.push({
      id: pack.id,
      kind: "core",
      path,
      sha256,
      questionCount: 90,
      setCount: 30,
      reviewStatus: "reviewed",
      dateStart: releaseDate(firstOffset),
      dateEnd: releaseDate(firstOffset + 29),
    });
    packs.push({ path, pack, sha256 });
  }
  return { descriptors, packs };
}

function buildBonusTopicLibrary(topic: BonusTopic, startSet = 0) {
  const topicIndex = BONUS_TOPICS.indexOf(topic);
  const descriptors: BonusContentPackDescriptor[] = [];
  const packs: Array<{ path: string; pack: BonusContentPack; sha256: string }> =
    [];
  for (let packIndex = 0; packIndex < 6; packIndex += 1) {
    const firstSet = startSet + packIndex * 30;
    const questions = Array.from({ length: 30 }, (_, setOffset) =>
      DIFFICULTIES.map((internalDifficulty, difficultyIndex) => {
        const setIndex = firstSet + setOffset;
        return {
          ...metadata,
          kind: "bonus" as const,
          id: `bonus-${topic}-${setIndex}-${difficultyIndex}`,
          conceptId: `concept-${topic}-${setIndex}-${difficultyIndex}`,
          variant: internalDifficulty,
          setIndex,
          lens: LENSES[difficultyIndex],
          topic,
          internalDifficulty,
          prompt: uniquePrompt(
            10_000 +
              topicIndex * 1_000 +
              packIndex * 90 +
              setOffset * 3 +
              difficultyIndex,
          ),
          choices: ["alpha choice", "beta choice", "gamma choice"] as [
            string,
            string,
            string,
          ],
          answerIndex: difficultyIndex as 0 | 1 | 2,
          explanation: "Reviewed source explanation for this bonus question.",
        };
      }),
    ).flat();
    const suffix = String(packIndex + 1).padStart(3, "0");
    const pack: BonusContentPack = {
      id: `bonus-${topic}-${suffix}`,
      kind: "bonus",
      contentVersion: metadata.contentVersion,
      reviewStatus: "reviewed",
      questions,
    };
    const path = `src/content/bonus/${topic}/pack-${suffix}.json`;
    const sha256 = checksum(100 + topicIndex * 6 + packIndex);
    descriptors.push({
      id: pack.id,
      kind: "bonus",
      path,
      sha256,
      questionCount: 90,
      setCount: 30,
      reviewStatus: "reviewed",
      topic,
      setStart: firstSet,
      setEnd: firstSet + 29,
    });
    packs.push({ path, pack, sha256 });
  }
  return { descriptors, packs };
}

function manifestWith(
  corePacks: CoreContentPackDescriptor[],
  bonusPacks: BonusContentPackDescriptor[],
): ContentManifest {
  return {
    releaseStart: "2026-07-28",
    releaseEnd: "2027-01-23",
    contentVersion: metadata.contentVersion,
    corePacks,
    bonusPacks,
  };
}

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

  it("flags bonus set range and duplicate concepts", () => {
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
      expect.arrayContaining(["set-range", "duplicate-concept"]),
    );
  });
});

describe("validateContentLibrary", () => {
  it("rejects a concept repeated anywhere in the released library", () => {
    const core = buildCoreLibrary();
    const nostalgia = buildBonusTopicLibrary("nostalgia");
    core.packs[0].pack.questions[0].conceptId = "shared-kimjang";
    nostalgia.packs[0].pack.questions[0].conceptId = "shared-kimjang";

    const report = validateContentLibrary(
      manifestWith(core.descriptors, nostalgia.descriptors),
      [...core.packs, ...nostalgia.packs],
    );

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "duplicate-concept" }),
      ]),
    );
  });

  it("rejects case and whitespace variants of a repeated concept", () => {
    const core = buildCoreLibrary();
    const nostalgia = buildBonusTopicLibrary("nostalgia");
    core.packs[0].pack.questions[0].conceptId = " shared-kimjang ";
    nostalgia.packs[0].pack.questions[0].conceptId = "SHARED-KIMJANG";

    const report = validateContentLibrary(
      manifestWith(core.descriptors, nostalgia.descriptors),
      [...core.packs, ...nostalgia.packs],
    );

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "schema" }),
        expect.objectContaining({ code: "duplicate-concept" }),
      ]),
    );
  });

  it.each([
    { label: "missing full", value: undefined, scope: "full" as const },
    { label: "empty core", value: "", scope: "core" as const },
    {
      label: "non-string bonus",
      value: 202608,
      scope: "bonus:digital" as const,
    },
  ])("rejects a $label manifest contentVersion", ({ value, scope }) => {
    const core = scope === "core" ? buildCoreLibrary() : undefined;
    const digital =
      scope === "bonus:digital" ? buildBonusTopicLibrary("digital") : undefined;
    const manifest = manifestWith(
      core?.descriptors ?? [],
      digital?.descriptors ?? [],
    ) as unknown as Record<string, unknown>;
    if (value === undefined) {
      delete manifest.contentVersion;
    } else {
      manifest.contentVersion = value;
    }

    const report = validateContentLibrary(
      manifest as unknown as ContentManifest,
      core?.packs ?? digital?.packs ?? [],
      scope,
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "schema",
        scope: "manifest:contentVersion",
        expected: "non-empty string",
      }),
    );
  });

  it("rejects an empty default library with exact release totals", () => {
    const report = validateContentLibrary(manifestWith([], []), []);

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "count",
          scope: "library:descriptors",
          expected: 42,
          actual: 0,
        }),
        expect.objectContaining({
          code: "count",
          scope: "library:questions",
          expected: 3780,
          actual: 0,
        }),
      ]),
    );
  });

  it("accepts a complete core scope without requiring bonus packs", () => {
    const core = buildCoreLibrary();

    const report = validateContentLibrary(
      manifestWith(core.descriptors, []),
      core.packs,
      "core",
    );

    expect(report).toMatchObject({
      packCount: 6,
      questionCount: 540,
      setCount: 180,
      issues: [],
    });
  });

  it("accepts a complete bonus topic scope without requiring other topics", () => {
    const digital = buildBonusTopicLibrary("digital");

    const report = validateContentLibrary(
      manifestWith([], digital.descriptors),
      digital.packs,
      "bonus:digital",
    );

    expect(report).toMatchObject({
      packCount: 6,
      questionCount: 540,
      setCount: 180,
      issues: [],
    });
  });

  it("accepts exactly 42 packs and 3,780 globally covered questions", () => {
    const core = buildCoreLibrary();
    const bonus = BONUS_TOPICS.map((topic) => buildBonusTopicLibrary(topic));
    const bonusDescriptors = bonus.flatMap(({ descriptors }) => descriptors);
    const packs = [...core.packs, ...bonus.flatMap(({ packs }) => packs)];

    const report = validateContentLibrary(
      manifestWith(core.descriptors, bonusDescriptors),
      packs,
    );

    expect(report).toMatchObject({
      packCount: 42,
      questionCount: 3780,
      setCount: 1260,
      issues: [],
    });
  });

  it("accepts the manifest-declared MVP release inventory", () => {
    const core = buildCoreLibrary();
    const nostalgia = buildBonusTopicLibrary("nostalgia");
    const bonusDescriptors = nostalgia.descriptors.slice(0, 4);
    const packs = [...core.packs, ...nostalgia.packs.slice(0, 4)];
    const manifest = {
      ...manifestWith(core.descriptors, bonusDescriptors),
      releaseContract: {
        core: { packCount: 6, questionCount: 540 },
        bonusTopics: [
          {
            topic: "nostalgia",
            label: "추억·대중문화",
            order: 0,
            packCount: 4,
            setCount: 120,
            questionCount: 360,
          },
        ],
      },
    } as unknown as ContentManifest;

    const report = validateContentLibrary(manifest, packs);

    expect(report).toMatchObject({
      packCount: 10,
      questionCount: 900,
      setCount: 300,
      issues: [],
    });
  });

  it.each([
    {
      label: "empty labels",
      change: (topics: Array<Record<string, unknown>>) => {
        topics[0].label = " ";
      },
      code: "schema",
      scope: "release-contract:bonus:nostalgia:label",
    },
    {
      label: "duplicate display orders",
      change: (topics: Array<Record<string, unknown>>) => {
        topics[1].order = 0;
      },
      code: "schema",
      scope: "release-contract:bonus:korean-life:order",
    },
    {
      label: "negative released counts",
      change: (topics: Array<Record<string, unknown>>) => {
        topics[0].setCount = -1;
      },
      code: "count",
      scope: "release-contract:bonus:nostalgia:setCount",
    },
    {
      label: "descriptor count disagreements",
      change: (topics: Array<Record<string, unknown>>) => {
        topics[0].packCount = 3;
      },
      code: "count",
      scope: "release-contract:bonus:nostalgia:descriptors",
    },
  ])("rejects release contracts with $label", ({ change, code, scope }) => {
    const core = buildCoreLibrary();
    const nostalgia = buildBonusTopicLibrary("nostalgia");
    const koreanLife = buildBonusTopicLibrary("korean-life");
    const language = buildBonusTopicLibrary("language");
    const manifest = {
      ...manifestWith(
        core.descriptors,
        [
          ...nostalgia.descriptors.slice(0, 4),
          koreanLife.descriptors[0],
          language.descriptors[0],
        ],
      ),
      releaseContract: {
        core: { packCount: 6, questionCount: 540 },
        bonusTopics: [
          {
            topic: "nostalgia",
            label: "추억·대중문화",
            order: 0,
            packCount: 4,
            setCount: 120,
            questionCount: 360,
          },
          {
            topic: "korean-life",
            label: "한국 생활사",
            order: 1,
            packCount: 1,
            setCount: 30,
            questionCount: 90,
          },
          {
            topic: "language",
            label: "말·속담·맞춤법",
            order: 2,
            packCount: 1,
            setCount: 30,
            questionCount: 90,
          },
        ],
      },
    } as unknown as ContentManifest;
    change(
      (manifest as unknown as {
        releaseContract: { bonusTopics: Array<Record<string, unknown>> };
      }).releaseContract.bonusTopics,
    );

    const report = validateContentLibrary(
      manifest,
      [
        ...core.packs,
        ...nostalgia.packs.slice(0, 4),
        koreanLife.packs[0],
        language.packs[0],
      ],
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({ code, scope }),
    );
  });

  it("rejects a 41-pack partial default library deterministically", () => {
    const core = buildCoreLibrary();
    const bonus = BONUS_TOPICS.map((topic) => buildBonusTopicLibrary(topic));
    const bonusDescriptors = bonus.flatMap(({ descriptors }) => descriptors);
    const packs = [...core.packs, ...bonus.flatMap(({ packs }) => packs)];
    bonusDescriptors.pop();
    packs.pop();

    const report = validateContentLibrary(
      manifestWith(core.descriptors, bonusDescriptors),
      packs,
    );

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "count",
          scope: "library:descriptors",
          expected: 42,
          actual: 41,
        }),
        expect.objectContaining({
          code: "count",
          scope: "library:questions",
          expected: 3780,
          actual: 3690,
        }),
      ]),
    );
  });

  it("rejects locally complete core packs that shift outside global date coverage", () => {
    const shifted = buildCoreLibrary(1);

    const report = validateContentLibrary(
      manifestWith(shifted.descriptors, []),
      shifted.packs,
      "core",
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({ code: "date-range", scope: "core:coverage" }),
    );
  });

  it("rejects overlapping core descriptor ranges", () => {
    const core = buildCoreLibrary();
    core.descriptors[1] = {
      ...core.descriptors[1],
      dateStart: core.descriptors[0].dateStart,
      dateEnd: core.descriptors[0].dateEnd,
    };

    const report = validateContentLibrary(
      manifestWith(core.descriptors, []),
      core.packs,
      "core",
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "date-range",
        scope: "descriptor:core-001~core-002",
      }),
    );
  });

  it("rejects locally complete bonus packs that omit set zero and add set 180", () => {
    const shifted = buildBonusTopicLibrary("digital", 1);

    const report = validateContentLibrary(
      manifestWith([], shifted.descriptors),
      shifted.packs,
      "bonus:digital",
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "set-range",
        scope: "bonus:digital:coverage",
      }),
    );
  });

  it("rejects overlapping bonus descriptor ranges", () => {
    const digital = buildBonusTopicLibrary("digital");
    digital.descriptors[1] = {
      ...digital.descriptors[1],
      setStart: digital.descriptors[0].setStart,
      setEnd: digital.descriptors[0].setEnd,
    };

    const report = validateContentLibrary(
      manifestWith([], digital.descriptors),
      digital.packs,
      "bonus:digital",
    );

    expect(report.issues).toContainEqual(
      expect.objectContaining({
        code: "set-range",
        scope: "descriptor:bonus-digital-001~bonus-digital-002",
      }),
    );
  });

  it("ties pack and question versions to the manifest version", () => {
    const core = buildCoreLibrary();
    core.packs[0].pack.contentVersion = "stale-version";
    core.packs[0].pack.questions[0].contentVersion = "stale-version";

    const report = validateContentLibrary(
      manifestWith(core.descriptors, []),
      core.packs,
      "core",
    );

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "schema",
          scope: "pack:core-001:contentVersion",
        }),
        expect.objectContaining({
          code: "schema",
          scope: "question:core-0-0-0:contentVersion",
        }),
      ]),
    );
  });

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

  it("detects similar prompts and duplicate concepts across pack boundaries", () => {
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
      expect.arrayContaining(["similar-prompt", "duplicate-concept"]),
    );
  });
});
