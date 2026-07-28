import { beforeEach, describe, expect, it } from "vitest";

import { createBonusEntitlement } from "../domain/bonus-entitlement";
import type { CoreQuestion } from "../domain/question";
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
});
