import { beforeEach, describe, expect, it } from "vitest";

import { createBonusEntitlement } from "../domain/bonus-entitlement";
import type { BonusQuestion, CoreQuestion } from "../domain/question";

const contentMetadata = {
  contentVersion: "test",
  reviewStatus: "reviewed" as const,
  reviewedAt: "2026-08-04",
};
import { createQuizSession } from "../domain/quiz-session";
import { createShadowAudit } from "../domain/shadow-audit";
import {
  BrowserKeyValueStorage,
  createEmptyProgress,
  migrateV2ToV3,
  ProgressRepository,
  ProgressEnvelopeTooLargeError,
  progressStorageKeys,
  type ProgressLoadResult,
  type ProgressState,
  type ProgressStateV2,
} from "./progress-repository";

function expectState(result: ProgressLoadResult): ProgressState {
  if (result.kind === "unrecoverable") {
    throw new Error("Expected a recoverable progress state");
  }

  return result.state;
}

function createProgress(dateKey = "2026-07-28"): ProgressState {
  return {
    ...createEmptyProgress(),
    sessions: { [dateKey]: createQuizSession(dateKey) },
  };
}

function v2ProgressWithCompletedIds(
  completedBonusIds: string[],
): ProgressStateV2 {
  const current = createEmptyProgress();
  const { bonusTopicProgress: _bonusTopicProgress, ...v2Fields } = current;
  return {
    ...v2Fields,
    version: 2,
    completedBonusIds,
  };
}

const question: CoreQuestion = {
  kind: "core",
  id: "then-phone",
  dateKey: "2026-07-28",
  internalDifficulty: "gentle",
  ...contentMetadata,
  lens: "then",
  topic: "nostalgia",
  prompt: "공중전화에서 통화를 이어 가려면 무엇을 넣었을까요?",
  choices: ["동전", "우표", "열쇠"],
  answerIndex: 0,
  explanation: "동전을 넣어 통화를 이어 갔어요.",
  source: { name: "국가기록원", url: "https://www.archives.go.kr/" },
};

const bonusQuestions: BonusQuestion[] = [
  {
    kind: "bonus",
    id: "bonus-digital-1",
    conceptId: "digital-1",
    variant: "base",
    internalDifficulty: "gentle",
    setIndex: 0,
    ...contentMetadata,
    lens: "now",
    topic: "digital",
    prompt: "디지털 문제 1",
    choices: ["하나", "둘", "셋"],
    answerIndex: 0,
    explanation: "설명 1",
    source: { name: "출처", url: "https://example.com/1" },
  },
  {
    kind: "bonus",
    id: "bonus-digital-2",
    conceptId: "digital-2",
    variant: "base",
    internalDifficulty: "steady",
    setIndex: 0,
    ...contentMetadata,
    lens: "now",
    topic: "digital",
    prompt: "디지털 문제 2",
    choices: ["하나", "둘", "셋"],
    answerIndex: 1,
    explanation: "설명 2",
    source: { name: "출처", url: "https://example.com/2" },
  },
  {
    kind: "bonus",
    id: "bonus-digital-3",
    conceptId: "digital-3",
    variant: "base",
    internalDifficulty: "stretch",
    setIndex: 0,
    ...contentMetadata,
    lens: "now",
    topic: "digital",
    prompt: "디지털 문제 3",
    choices: ["하나", "둘", "셋"],
    answerIndex: 2,
    explanation: "설명 3",
    source: { name: "출처", url: "https://example.com/3" },
  },
];

function progressEnvelope(schemaVersion: 2 | 3, payload: unknown): string {
  const unsigned = {
    schemaVersion,
    revision: 1,
    writtenAt: "2026-07-28T12:00:00.000Z",
    payload,
  };
  const input = JSON.stringify(unsigned);
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return JSON.stringify({
    ...unsigned,
    checksum: (hash >>> 0).toString(16).padStart(8, "0"),
  });
}

function v2Envelope(payload: unknown): string {
  return progressEnvelope(2, payload);
}

function v3Envelope(payload: unknown): string {
  return progressEnvelope(3, payload);
}

describe("ProgressRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("완료된 기존 세 문제 전부가 매핑될 때만 새 세트를 완료 처리한다", () => {
    const migrated = migrateV2ToV3(
      v2ProgressWithCompletedIds(["old-a", "old-b", "old-c"]),
      {
        "old-a": { topic: "digital", setIndex: 0 },
        "old-b": { topic: "digital", setIndex: 0 },
        "old-c": { topic: "digital", setIndex: 0 },
      },
    );

    expect(migrated.bonusTopicProgress.digital.completedSetIndexes).toEqual([
      0,
    ]);
  });

  it("부분 매핑은 새 세트를 완료 처리하지 않는다", () => {
    const migrated = migrateV2ToV3(
      v2ProgressWithCompletedIds(["old-a", "old-b"]),
      {
        "old-a": { topic: "digital", setIndex: 0 },
        "old-b": { topic: "digital", setIndex: 0 },
        "old-c": { topic: "digital", setIndex: 0 },
      },
    );

    expect(migrated.bonusTopicProgress.digital.completedSetIndexes).toEqual([]);
  });

  it("세 질문 전체가 명시적으로 매핑되지 않은 세트는 완료 처리하지 않는다", () => {
    const migrated = migrateV2ToV3(
      v2ProgressWithCompletedIds(["old-a", "old-b"]),
      {
        "old-a": { topic: "digital", setIndex: 0 },
        "old-b": { topic: "digital", setIndex: 0 },
      },
    );

    expect(migrated.bonusTopicProgress.digital.completedSetIndexes).toEqual([]);
    expect(migrated.completedBonusIds).toEqual(["old-a", "old-b"]);
  });

  it("새 진행을 두 개의 v3 슬롯에 저장하고 다시 불러온다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
      () => new Date("2026-07-28T12:00:00.000Z"),
    );
    const progress = createProgress();

    await repository.save(progress);
    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
    expect(expectState(restored)).toEqual(progress);
    expect(
      window.localStorage.getItem(progressStorageKeys.slotA),
    ).not.toBeNull();
    expect(
      window.localStorage.getItem(progressStorageKeys.slotB),
    ).not.toBeNull();
  });

  it("기존 v2 슬롯을 원문 그대로 두고 v3 슬롯으로 마이그레이션한다", async () => {
    const v2 = v2ProgressWithCompletedIds(["legacy-unmapped"]);
    const raw = v2Envelope(v2);
    window.localStorage.setItem(progressStorageKeys.v2SlotA, raw);
    window.localStorage.setItem(progressStorageKeys.v2SlotB, raw);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "migrated", fromVersion: 2 });
    expect(expectState(restored)).toMatchObject({
      version: 3,
      completedBonusIds: ["legacy-unmapped"],
      bonusTopicProgress: {
        nostalgia: { completedSetIndexes: [] },
        "korean-life": { completedSetIndexes: [] },
        language: { completedSetIndexes: [] },
        digital: { completedSetIndexes: [] },
        safety: { completedSetIndexes: [] },
        "nature-general": { completedSetIndexes: [] },
      },
    });
    expect(window.localStorage.getItem(progressStorageKeys.v2SlotA)).toBe(raw);
    expect(window.localStorage.getItem(progressStorageKeys.v2SlotB)).toBe(raw);
    expect(
      window.localStorage.getItem(progressStorageKeys.slotA),
    ).not.toBeNull();
    expect(
      window.localStorage.getItem(progressStorageKeys.slotB),
    ).not.toBeNull();
  });

  it("v2 마이그레이션 뒤 다시 불러와도 v3 슬롯을 다시 쓰지 않는다", async () => {
    const raw = v2Envelope(v2ProgressWithCompletedIds([]));
    window.localStorage.setItem(progressStorageKeys.v2SlotA, raw);
    window.localStorage.setItem(progressStorageKeys.v2SlotB, raw);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
      () => new Date("2026-07-28T12:00:00.000Z"),
    );

    const first = await repository.load();
    const firstV3SlotA = window.localStorage.getItem(progressStorageKeys.slotA);
    const second = await repository.load();

    expect(first).toMatchObject({ kind: "migrated", fromVersion: 2 });
    expect(second).toMatchObject({ kind: "loaded", revision: 1 });
    expect(expectState(second)).toEqual(expectState(first));
    expect(window.localStorage.getItem(progressStorageKeys.slotA)).toBe(
      firstV3SlotA,
    );
  });

  it("손상된 v3 원문을 덮어쓰지 않고 유효한 v2 진행으로 복구한다", async () => {
    const corruptV3A = "{corrupt-v3-a";
    const corruptV3B = "{corrupt-v3-b";
    const v2Raw = v2Envelope(v2ProgressWithCompletedIds(["legacy-id"]));
    window.localStorage.setItem(progressStorageKeys.slotA, corruptV3A);
    window.localStorage.setItem(progressStorageKeys.slotB, corruptV3B);
    window.localStorage.setItem(progressStorageKeys.v2SlotA, v2Raw);
    window.localStorage.setItem(progressStorageKeys.v2SlotB, v2Raw);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "migrated", fromVersion: 2 });
    expect(expectState(restored).completedBonusIds).toEqual(["legacy-id"]);
    expect(window.localStorage.getItem(progressStorageKeys.slotA)).toBe(
      corruptV3A,
    );
    expect(window.localStorage.getItem(progressStorageKeys.slotB)).toBe(
      corruptV3B,
    );
  });

  it("v3 진행이 있으면 v2 슬롯보다 먼저 불러온다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const current = {
      ...createProgress(),
      completedBonusIds: ["v3-id"],
    };
    await repository.save(current);
    const v2Raw = v2Envelope(v2ProgressWithCompletedIds(["v2-id"]));
    window.localStorage.setItem(progressStorageKeys.v2SlotA, v2Raw);
    window.localStorage.setItem(progressStorageKeys.v2SlotB, v2Raw);

    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
    expect(expectState(restored).completedBonusIds).toEqual(["v3-id"]);
  });

  it("v3 세트 인덱스를 정렬하고 중복과 nextSetIndex를 저장하지 않는다", async () => {
    const payload = {
      ...createEmptyProgress(),
      bonusTopicProgress: {
        ...createEmptyProgress().bonusTopicProgress,
        digital: {
          completedSetIndexes: [4, 2, 4],
          nextSetIndex: 0,
        },
      },
    };
    const raw = v3Envelope(payload);
    window.localStorage.setItem(progressStorageKeys.slotA, raw);
    window.localStorage.setItem(progressStorageKeys.slotB, raw);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();
    const state = expectState(restored);
    await repository.save(state);
    const saved = JSON.parse(
      window.localStorage.getItem(progressStorageKeys.slotA) ?? "{}",
    ) as { payload: ProgressState };

    expect(state.bonusTopicProgress.digital.completedSetIndexes).toEqual([
      2, 4,
    ]);
    expect(saved.payload.bonusTopicProgress.digital).not.toHaveProperty(
      "nextSetIndex",
    );
  });

  it("유효한 슬롯 중 revision이 가장 높은 진행을 선택한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save(createProgress("2026-07-28"));
    await repository.save(createProgress("2026-07-29"));

    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "loaded", revision: 2 });
    expect(expectState(restored).sessions["2026-07-29"]).toBeDefined();
  });

  it("동시에 요청된 저장을 직렬화해 마지막 상태를 revision 2로 남긴다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    await Promise.all([
      repository.save(createProgress("2026-07-28")),
      repository.save(createProgress("2026-07-29")),
    ]);
    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "loaded", revision: 2 });
    expect(expectState(restored).sessions["2026-07-29"]).toBeDefined();
  });

  it("같은 답변 command가 겹쳐도 AnswerEvent를 한 번만 저장한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const session = createQuizSession("2026-07-28");
    const command = {
      attemptId: "core:2026-07-28:then-phone:0",
      sessionKey: "2026-07-28",
      session,
      question,
      selectedIndex: 0,
      answeredAt: "2026-07-28T12:00:00.000Z",
    } as const;

    await Promise.all([
      repository.commitAnswer(command),
      repository.commitAnswer(command),
    ]);
    const restored = await repository.load();

    expect(expectState(restored).answerEvents).toHaveLength(1);
    expect(expectState(restored).sessions["2026-07-28"].answers).toHaveLength(
      1,
    );
  });

  it("512KB envelope 예산을 넘는 저장을 거부하고 기존 슬롯을 보존한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const original = createProgress("2026-07-28");
    await repository.save(original);
    const oversized = {
      ...createProgress("2026-07-29"),
      completedBonusIds: ["x".repeat(530 * 1024)],
    };

    await expect(repository.save(oversized)).rejects.toBeInstanceOf(
      ProgressEnvelopeTooLargeError,
    );
    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
    expect(expectState(restored)).toEqual(original);
  });

  it("최신 슬롯의 checksum이 맞지 않으면 이전 슬롯을 복구하고 다음 저장에서 고친다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save(createProgress("2026-07-28"));
    await repository.save(createProgress("2026-07-29"));
    const latestRaw = window.localStorage.getItem(progressStorageKeys.slotA);
    const latest = JSON.parse(latestRaw ?? "{}") as {
      payload: ProgressState;
    };
    latest.payload.completedBonusIds = ["tampered-without-checksum"];
    window.localStorage.setItem(
      progressStorageKeys.slotA,
      JSON.stringify(latest),
    );

    const restored = await repository.load();

    expect(restored).toMatchObject({
      kind: "recovered-slot",
      revision: 1,
      badSlot: "A",
    });
    expect(expectState(restored).sessions["2026-07-28"]).toBeDefined();

    await repository.save(expectState(restored));
    const repaired = await repository.load();

    expect(repaired).toMatchObject({ kind: "loaded", revision: 2 });
    expect(expectState(repaired).completedBonusIds).toEqual([]);
  });

  it("기존 v1 진행을 원본 그대로 남겨 두고 v3로 마이그레이션한다", async () => {
    const legacyRaw = JSON.stringify({
      version: 1,
      sessions: { "2026-07-28": createQuizSession("2026-07-28") },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });
    window.localStorage.setItem(progressStorageKeys.legacy, legacyRaw);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "migrated", fromVersion: 1 });
    expect(expectState(restored).version).toBe(3);
    expect(expectState(restored).rewardGrantIds).toEqual([]);
    expect(expectState(restored).bonusStartCommands).toEqual({});
    expect(expectState(restored)).toMatchObject({
      rewardAdTicketCount: 0,
      latestBonusStartCommandIds: {},
      timeObservation: {
        lastObservedKstDate: null,
        lastValidKstDate: null,
        confidence: "normal",
      },
      bonusTopicProgress: {
        nostalgia: { completedSetIndexes: [] },
        "korean-life": { completedSetIndexes: [] },
        language: { completedSetIndexes: [] },
        digital: { completedSetIndexes: [] },
        safety: { completedSetIndexes: [] },
        "nature-general": { completedSetIndexes: [] },
      },
    });
    expect(window.localStorage.getItem(progressStorageKeys.legacy)).toBe(
      legacyRaw,
    );
    expect(
      window.localStorage.getItem(progressStorageKeys.slotA),
    ).not.toBeNull();
    expect(
      window.localStorage.getItem(progressStorageKeys.slotB),
    ).not.toBeNull();
  });

  it("두 슬롯과 v1이 모두 손상되면 원문을 보존하고 쓰지 않는다", async () => {
    window.localStorage.setItem(progressStorageKeys.slotA, "{slot-a");
    window.localStorage.setItem(progressStorageKeys.slotB, "{slot-b");
    window.localStorage.setItem(progressStorageKeys.v2SlotA, "{v2-slot-a");
    window.localStorage.setItem(progressStorageKeys.v2SlotB, "{v2-slot-b");
    window.localStorage.setItem(progressStorageKeys.legacy, "{legacy");
    const before = {
      slotA: window.localStorage.getItem(progressStorageKeys.slotA),
      slotB: window.localStorage.getItem(progressStorageKeys.slotB),
      v2SlotA: window.localStorage.getItem(progressStorageKeys.v2SlotA),
      v2SlotB: window.localStorage.getItem(progressStorageKeys.v2SlotB),
      legacy: window.localStorage.getItem(progressStorageKeys.legacy),
    };
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();

    expect(restored).toEqual({
      kind: "unrecoverable",
      preservedRaw: before,
    });
    expect({
      slotA: window.localStorage.getItem(progressStorageKeys.slotA),
      slotB: window.localStorage.getItem(progressStorageKeys.slotB),
      v2SlotA: window.localStorage.getItem(progressStorageKeys.v2SlotA),
      v2SlotB: window.localStorage.getItem(progressStorageKeys.v2SlotB),
      legacy: window.localStorage.getItem(progressStorageKeys.legacy),
    }).toEqual(before);
  });

  it("저장 데이터가 없으면 명시적인 empty 결과를 반환한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();

    expect(restored).toEqual({
      kind: "empty",
      state: createEmptyProgress(),
    });
  });

  it("creates an empty time observation state", () => {
    expect(createEmptyProgress()).toMatchObject({
      timeObservation: {
        lastObservedKstDate: null,
        lastValidKstDate: null,
        confidence: "normal",
      },
    });
  });

  it("persists valid bounded shadow audits across reload", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const shadowAudits = [
      createShadowAudit({
        legacyQuestionIds: ["legacy-1"],
        shadowQuestionIds: ["shadow-1"],
        policyVersion: "personalization-v1",
        reasonCode: "high-accuracy",
      }),
    ];

    await repository.save({ ...createProgress(), shadowAudits });
    const restored = expectState(await repository.load());

    expect(restored.shadowAudits).toEqual(shadowAudits);
  });

  it("rejects noncanonical and over-limit persisted shadow audits", async () => {
    const noncanonicalReasonPayload: Record<string, unknown> = {
      ...createEmptyProgress(),
      shadowAudits: [
        {
          legacyQuestionIds: ["legacy-1"],
          shadowQuestionIds: ["shadow-1"],
          policyVersion: "personalization-v1",
          reasonCode: "member@example.com",
        },
      ],
    };
    const overLimitPayload: Record<string, unknown> = {
      ...createEmptyProgress(),
      shadowAudits: Array.from({ length: 101 }, (_, index) => ({
        legacyQuestionIds: [`legacy-${index}`],
        shadowQuestionIds: [`shadow-${index}`],
        policyVersion: "personalization-v1",
        reasonCode: "high-accuracy",
      })),
    };
    window.localStorage.setItem(
      progressStorageKeys.slotA,
      v3Envelope(noncanonicalReasonPayload),
    );
    window.localStorage.setItem(
      progressStorageKeys.slotB,
      v3Envelope(overLimitPayload),
    );
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    await expect(repository.load()).resolves.toMatchObject({
      kind: "unrecoverable",
    });
  });

  it("rejects a persisted shadow audit with a prohibited extra key", async () => {
    const payload: Record<string, unknown> = {
      ...createEmptyProgress(),
      shadowAudits: [
        {
          legacyQuestionIds: ["legacy-1"],
          shadowQuestionIds: ["shadow-1"],
          policyVersion: "personalization-v1",
          reasonCode: "high-accuracy",
          answeredAt: "2026-07-28T12:00:00.000Z",
        },
      ],
    };
    const envelope = v3Envelope(payload);
    window.localStorage.setItem(progressStorageKeys.slotA, envelope);
    window.localStorage.setItem(progressStorageKeys.slotB, envelope);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    await expect(repository.load()).resolves.toMatchObject({
      kind: "unrecoverable",
    });
  });

  it("persists a low-confidence time observation across reload", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const progress = {
      ...createProgress(),
      timeObservation: {
        lastObservedKstDate: "2026-08-05",
        lastValidKstDate: "2026-07-28",
        confidence: "lowConfidence" as const,
      },
    };

    await repository.save(progress);
    const restored = await new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    ).load();

    expect(expectState(restored).timeObservation).toEqual(
      progress.timeObservation,
    );
  });

  it("does not write a new revision for a same-day observation", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save({
      ...createProgress(),
      timeObservation: {
        lastObservedKstDate: "2026-07-28",
        lastValidKstDate: "2026-07-28",
        confidence: "normal",
      },
    });

    const observed = await repository.observeTime(
      new Date("2026-07-28T14:59:00.000Z"),
    );
    const restored = await repository.load();

    expect(observed.timeObservation).toEqual({
      lastObservedKstDate: "2026-07-28",
      lastValidKstDate: "2026-07-28",
      confidence: "normal",
    });
    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
  });

  it("같은 rewardGrantId를 재시도하고 다시 불러와도 이용권을 한 번만 지급한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    expect(repository).toHaveProperty("grantBonusTicket");

    const first = await repository.grantBonusTicket("reward-1");
    const duplicate = await repository.grantBonusTicket("reward-1");
    const reloadedRepository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const reloaded = await reloadedRepository.grantBonusTicket("reward-1");

    expect(first).toMatchObject({ applied: true });
    expect(duplicate).toMatchObject({ applied: false });
    expect(reloaded).toMatchObject({ applied: false });
    expect(expectState(await reloadedRepository.load()).bonus.ticketCount).toBe(
      1,
    );
    expect(expectState(await reloadedRepository.load()).rewardGrantIds).toEqual(
      ["reward-1"],
    );
  });

  it("보너스 시작을 한 revision으로 이용권 소비와 세션 생성까지 저장한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save({
      ...createEmptyProgress(),
      bonus: {
        ...createEmptyProgress().bonus,
        firstFreeUsed: true,
        ticketCount: 1,
      },
    });
    expect(repository).toHaveProperty("startBonusSession");

    const result = await repository.startBonusSession(
      "bonus-command-1",
      "2026-07-28",
      "digital",
      0,
      bonusQuestions,
    );
    const restored = await repository.load();

    expect(result).toMatchObject({ applied: true, source: "streak_ticket" });
    expect(restored).toMatchObject({ kind: "loaded", revision: 2 });
    expect(expectState(restored).bonus.ticketCount).toBe(0);
    expect(expectState(restored).sessions["2026-07-28:bonus:digital"]).toEqual({
      dateKey: "2026-07-28:bonus:digital",
      currentIndex: 0,
      phase: "question",
      answers: [],
    });
    expect(expectState(restored).shadowAudits).toEqual([
      {
        legacyQuestionIds: [
          "bonus-digital-1",
          "bonus-digital-2",
          "bonus-digital-3",
        ],
        shadowQuestionIds: [
          "bonus-digital-2",
          "bonus-digital-1",
          "bonus-digital-3",
        ],
        policyVersion: "personalization-v1",
        reasonCode: "insufficient-history",
      },
    ]);
  });

  it("광고 보상 이용권의 출처와 최신 세션 명령을 원자적으로 저장한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save({
      ...createEmptyProgress(),
      bonus: {
        ...createEmptyProgress().bonus,
        firstFreeUsed: true,
      },
    });
    await repository.grantBonusTicket("private-reward-grant");

    const result = await repository.startBonusSession(
      "2",
      "2026-07-28",
      "digital",
      0,
      bonusQuestions,
    );
    const restored = expectState(await repository.load());

    expect(result).toMatchObject({ applied: true, source: "reward_ad" });
    expect(restored.bonusStartCommands["2"]).toEqual({
      commandId: "2",
      dateKey: "2026-07-28",
      topic: "digital",
      setIndex: 0,
      sessionKey: "2026-07-28:bonus:digital",
      questionIds: ["bonus-digital-1", "bonus-digital-2", "bonus-digital-3"],
      source: "reward_ad",
    });
    expect(restored).toMatchObject({
      rewardAdTicketCount: 0,
      latestBonusStartCommandIds: {
        "2026-07-28:bonus:digital": "2",
      },
    });
    expect(JSON.stringify(restored.bonusStartCommands["2"])).not.toContain(
      "private-reward-grant",
    );
  });

  it("같은 보너스 commandId 재시도는 revision과 세션을 늘리지 않는다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    await repository.startBonusSession(
      "bonus-command-1",
      "2026-07-28",
      "digital",
      0,
      bonusQuestions,
    );
    const duplicate = await repository.startBonusSession(
      "bonus-command-1",
      "2026-07-28",
      "digital",
      0,
      bonusQuestions,
    );
    const restored = await repository.load();

    expect(duplicate).toMatchObject({ applied: false, reason: "duplicate" });
    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
    expect(Object.keys(expectState(restored).bonusStartCommands)).toEqual([
      "bonus-command-1",
    ]);
    expect(expectState(restored).shadowAudits).toHaveLength(1);
  });

  it("excludes a rewind-triggered low-confidence start from the shadow audit ring", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save({
      ...createEmptyProgress(),
      timeObservation: {
        lastObservedKstDate: "2026-07-28",
        lastValidKstDate: "2026-07-28",
        confidence: "normal",
      },
    });

    const result = await repository.startBonusSession(
      "low-confidence-start",
      "2026-07-27",
      "digital",
      0,
      bonusQuestions,
      new Date("2026-07-27T12:00:00.000Z"),
    );
    const restored = expectState(await repository.load());

    expect(result).toMatchObject({ applied: true });
    expect(restored.timeObservation.confidence).toBe("lowConfidence");
    expect(restored.shadowAudits).toEqual([]);
  });

  it("선택할 문제가 없으면 보너스 권리와 revision을 그대로 유지한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save(createEmptyProgress());

    const result = await repository.startBonusSession(
      "bonus-command-1",
      "2026-07-28",
      "digital",
      0,
      [],
    );
    const restored = await repository.load();

    expect(result).toMatchObject({ applied: false, reason: "no-questions" });
    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
    expect(expectState(restored).bonus.firstFreeUsed).toBe(false);
    expect(expectState(restored).sessions).toEqual({});
    expect(expectState(restored).shadowAudits).toEqual([]);
  });

  it("보너스 시작 저장 실패 뒤 reload에는 권리 소비와 세션이 보이지 않는다", async () => {
    let shouldFailWrites = false;
    const storage = {
      getItem: async (key: string) => window.localStorage.getItem(key),
      setItem: async (key: string, value: string) => {
        if (shouldFailWrites) {
          throw new Error("storage unavailable");
        }
        window.localStorage.setItem(key, value);
      },
    };
    const repository = new ProgressRepository(storage);
    await repository.save(createEmptyProgress());
    shouldFailWrites = true;

    await expect(
      repository.startBonusSession(
        "bonus-command-1",
        "2026-07-28",
        "digital",
        0,
        bonusQuestions,
      ),
    ).rejects.toThrow("storage unavailable");
    const restored = await new ProgressRepository(storage).load();

    expect(expectState(restored).bonus.firstFreeUsed).toBe(false);
    expect(expectState(restored).sessions).toEqual({});
    expect(expectState(restored).shadowAudits).toEqual([]);
  });

  it("동시 완료 재시도는 세트와 세 문제를 한 revision에 한 번만 저장한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const started = await repository.startBonusSession(
      "complete-once",
      "2026-08-04",
      "digital",
      0,
      bonusQuestions,
    );
    expect(started.applied).toBe(true);
    if (!started.applied) {
      return;
    }
    const loaded = expectState(await repository.load());
    await repository.save({
      ...loaded,
      sessions: {
        ...loaded.sessions,
        [started.session.dateKey]: {
          ...started.session,
          currentIndex: 2,
          phase: "completed",
        },
      },
    });

    const results = await Promise.all([
      repository.completeBonusSet(
        started.session.dateKey,
        "digital",
        0,
        "2026-08-04",
      ),
      repository.completeBonusSet(
        started.session.dateKey,
        "digital",
        0,
        "2026-08-04",
      ),
    ]);
    const restored = await repository.load();

    expect(results).toEqual([
      expect.objectContaining({ applied: true }),
      expect.objectContaining({ applied: false, reason: "duplicate" }),
    ]);
    expect(restored).toMatchObject({ kind: "loaded", revision: 3 });
    expect(expectState(restored).bonusTopicProgress.digital).toEqual({
      completedSetIndexes: [0],
      lastCompletedDateKey: "2026-08-04",
    });
    expect(expectState(restored).completedBonusIds).toEqual([
      "bonus-digital-1",
      "bonus-digital-2",
      "bonus-digital-3",
    ]);
  });

  it("동시 보너스 시작은 진행 중 세션을 복원하고 권리를 한 번만 소비한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save({
      ...createEmptyProgress(),
      bonus: {
        ...createEmptyProgress().bonus,
        firstFreeUsed: true,
        ticketCount: 2,
      },
    });

    const results = await Promise.all([
      repository.startBonusSession(
        "concurrent-1",
        "2026-08-04",
        "digital",
        0,
        bonusQuestions,
      ),
      repository.startBonusSession(
        "concurrent-2",
        "2026-08-04",
        "digital",
        0,
        bonusQuestions,
      ),
    ]);
    const restored = expectState(await repository.load());

    expect(results[0]).toMatchObject({ applied: true });
    expect(results[1]).toMatchObject({
      applied: false,
      reason: "active-session",
      sessionKey: "2026-08-04:bonus:digital",
    });
    expect(restored.bonus.ticketCount).toBe(1);
    expect(Object.keys(restored.bonusStartCommands)).toEqual(["concurrent-1"]);
  });

  it("새 필드가 없는 기존 v2 payload에 안전한 기본값을 채운다", async () => {
    const preE5Payload: Record<string, unknown> = {
      version: 2,
      sessions: {},
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
      answerEvents: [],
      answerCheckpoint: {
        totalAnswers: 0,
        correctAnswers: 0,
        byQuestion: {},
      },
      rewardGrantIds: [],
      rewardAdTicketCount: 0,
      bonusStartCommands: {},
      latestBonusStartCommandIds: {},
    };
    const legacyEnvelope = v2Envelope(preE5Payload);
    const rawEnvelope = JSON.parse(legacyEnvelope) as {
      checksum: string;
      payload: Record<string, unknown>;
    };
    expect(rawEnvelope.payload).toEqual(preE5Payload);
    expect(rawEnvelope.payload).not.toHaveProperty("timeObservation");
    expect(rawEnvelope.payload).not.toHaveProperty("shadowAudits");
    expect(rawEnvelope.checksum).toMatch(/^[0-9a-f]{8}$/);
    window.localStorage.setItem(progressStorageKeys.v2SlotA, legacyEnvelope);
    window.localStorage.setItem(progressStorageKeys.v2SlotB, legacyEnvelope);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "migrated", fromVersion: 2 });
    expect(expectState(restored).rewardGrantIds).toEqual([]);
    expect(expectState(restored).bonusStartCommands).toEqual({});
    expect(expectState(restored)).toMatchObject({
      rewardAdTicketCount: 0,
      latestBonusStartCommandIds: {},
      timeObservation: {
        lastObservedKstDate: null,
        lastValidKstDate: null,
        confidence: "normal",
      },
    });
    expect(expectState(restored).shadowAudits).toEqual([]);
  });

  it("기존 v2의 광고 소비 기록과 이후 연속 보상권을 구분해 정규화한다", async () => {
    const legacyPayload: Record<string, unknown> = {
      ...v2ProgressWithCompletedIds([]),
      bonus: {
        ...createBonusEntitlement(),
        firstFreeUsed: true,
        ticketCount: 1,
        grantedMilestones: ["2026-07-29:3"],
        unlockAttempts: [
          {
            attemptId: "old-ad-backed-start",
            source: "streak_ticket",
          },
        ],
      },
      rewardGrantIds: ["old-private-reward-grant"],
      bonusStartCommands: {
        "old-ad-backed-start": {
          commandId: "old-ad-backed-start",
          dateKey: "2026-07-28",
          topic: "digital",
          sessionKey: "2026-07-28:bonus:digital",
          questionIds: ["bonus-digital-1"],
          source: "streak_ticket",
        },
      },
    };
    delete legacyPayload.rewardAdTicketCount;
    delete legacyPayload.latestBonusStartCommandIds;
    const legacyEnvelope = v2Envelope(legacyPayload);
    window.localStorage.setItem(progressStorageKeys.v2SlotA, legacyEnvelope);
    window.localStorage.setItem(progressStorageKeys.v2SlotB, legacyEnvelope);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = expectState(await repository.load());

    expect(restored).toMatchObject({
      rewardAdTicketCount: 0,
      latestBonusStartCommandIds: {
        "2026-07-28:bonus:digital": "old-ad-backed-start",
      },
    });
  });
});
