import { beforeEach, describe, expect, it } from "vitest";

import { createBonusEntitlement } from "../domain/bonus-entitlement";
import type { BonusQuestion, CoreQuestion } from "../domain/question";
import { createQuizSession } from "../domain/quiz-session";
import {
  BrowserKeyValueStorage,
  createEmptyProgress,
  ProgressRepository,
  ProgressEnvelopeTooLargeError,
  progressStorageKeys,
  type ProgressLoadResult,
  type ProgressState,
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

const question: CoreQuestion = {
  kind: "core",
  id: "then-phone",
  dateKey: "2026-07-28",
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
    internalDifficulty: "steady",
    lens: "now",
    topic: "digital",
    prompt: "디지털 문제 1",
    choices: ["하나", "둘", "셋"],
    answerIndex: 0,
    explanation: "설명 1",
    source: { name: "출처", url: "https://example.com/1" },
  },
];

function legacyV2Envelope(payload: Record<string, unknown>): string {
  const unsigned = {
    schemaVersion: 2,
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

describe("ProgressRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("새 진행을 두 개의 v2 슬롯에 저장하고 다시 불러온다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
      () => new Date("2026-07-28T12:00:00.000Z"),
    );
    const progress = createProgress();

    await repository.save(progress);
    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
    expect(expectState(restored)).toEqual(progress);
    expect(window.localStorage.getItem(progressStorageKeys.slotA)).not.toBeNull();
    expect(window.localStorage.getItem(progressStorageKeys.slotB)).not.toBeNull();
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
    expect(
      expectState(restored).sessions["2026-07-28"].answers,
    ).toHaveLength(1);
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

  it("기존 v1 진행을 원본 그대로 남겨 두고 v2로 마이그레이션한다", async () => {
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
    expect(expectState(restored).version).toBe(2);
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
    expect(window.localStorage.getItem(progressStorageKeys.legacy)).toBe(
      legacyRaw,
    );
    expect(window.localStorage.getItem(progressStorageKeys.slotA)).not.toBeNull();
    expect(window.localStorage.getItem(progressStorageKeys.slotB)).not.toBeNull();
  });

  it("두 슬롯과 v1이 모두 손상되면 원문을 보존하고 쓰지 않는다", async () => {
    window.localStorage.setItem(progressStorageKeys.slotA, "{slot-a");
    window.localStorage.setItem(progressStorageKeys.slotB, "{slot-b");
    window.localStorage.setItem(progressStorageKeys.legacy, "{legacy");
    const before = {
      slotA: window.localStorage.getItem(progressStorageKeys.slotA),
      slotB: window.localStorage.getItem(progressStorageKeys.slotB),
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
    expect(expectState(await reloadedRepository.load()).bonus.ticketCount).toBe(1);
    expect(expectState(await reloadedRepository.load()).rewardGrantIds).toEqual([
      "reward-1",
    ]);
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
      bonusQuestions,
    );
    const restored = await repository.load();

    expect(result).toMatchObject({ applied: true, source: "streak_ticket" });
    expect(restored).toMatchObject({ kind: "loaded", revision: 2 });
    expect(expectState(restored).bonus.ticketCount).toBe(0);
    expect(
      expectState(restored).sessions["2026-07-28:bonus:digital"],
    ).toEqual({
      dateKey: "2026-07-28:bonus:digital",
      currentIndex: 0,
      phase: "question",
      answers: [],
    });
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
      bonusQuestions,
    );
    const restored = expectState(await repository.load());

    expect(result).toMatchObject({ applied: true, source: "reward_ad" });
    expect(restored.bonusStartCommands["2"]).toEqual({
      commandId: "2",
      dateKey: "2026-07-28",
      topic: "digital",
      sessionKey: "2026-07-28:bonus:digital",
      questionIds: ["bonus-digital-1"],
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
      bonusQuestions,
    );
    const duplicate = await repository.startBonusSession(
      "bonus-command-1",
      "2026-07-28",
      "digital",
      bonusQuestions,
    );
    const restored = await repository.load();

    expect(duplicate).toMatchObject({ applied: false, reason: "duplicate" });
    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
    expect(Object.keys(expectState(restored).bonusStartCommands)).toEqual([
      "bonus-command-1",
    ]);
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
      [],
    );
    const restored = await repository.load();

    expect(result).toMatchObject({ applied: false, reason: "no-questions" });
    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
    expect(expectState(restored).bonus.firstFreeUsed).toBe(false);
    expect(expectState(restored).sessions).toEqual({});
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
        bonusQuestions,
      ),
    ).rejects.toThrow("storage unavailable");
    const restored = await new ProgressRepository(storage).load();

    expect(expectState(restored).bonus.firstFreeUsed).toBe(false);
    expect(expectState(restored).sessions).toEqual({});
  });

  it("새 필드가 없는 기존 v2 payload에 안전한 기본값을 채운다", async () => {
    const modern = createEmptyProgress();
    const legacyPayload: Record<string, unknown> = { ...modern };
    delete legacyPayload.rewardGrantIds;
    delete legacyPayload.bonusStartCommands;
    delete legacyPayload.rewardAdTicketCount;
    delete legacyPayload.latestBonusStartCommandIds;
    const legacyEnvelope = legacyV2Envelope(legacyPayload);
    window.localStorage.setItem(progressStorageKeys.slotA, legacyEnvelope);
    window.localStorage.setItem(progressStorageKeys.slotB, legacyEnvelope);
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();

    expect(restored).toMatchObject({ kind: "loaded", revision: 1 });
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
  });

  it("기존 v2의 광고 소비 기록과 이후 연속 보상권을 구분해 정규화한다", async () => {
    const legacyPayload: Record<string, unknown> = {
      ...createEmptyProgress(),
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
    const legacyEnvelope = legacyV2Envelope(legacyPayload);
    window.localStorage.setItem(progressStorageKeys.slotA, legacyEnvelope);
    window.localStorage.setItem(progressStorageKeys.slotB, legacyEnvelope);
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
