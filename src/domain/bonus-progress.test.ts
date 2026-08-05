import { describe, expect, it } from "vitest";

import { createEmptyProgress } from "../services/progress-repository";
import type { BonusTopic } from "./question";
import { createQuizSession } from "./quiz-session";
import { resolveBonusSetAvailability } from "./bonus-progress";

function completedTopicProgress(
  topic: BonusTopic,
  dateKey: string,
  setIndex: number,
) {
  const progress = createEmptyProgress();
  progress.bonusTopicProgress[topic] = {
    completedSetIndexes: [setIndex],
    skippedSetIndexes: [],
    lastCompletedDateKey: dateKey,
  };
  return progress;
}

function progressWithCompletedSets(
  topic: BonusTopic,
  completedSetIndexes: number[],
) {
  const progress = createEmptyProgress();
  progress.bonusTopicProgress[topic] = {
    completedSetIndexes,
    skippedSetIndexes: [],
  };
  return progress;
}

describe("resolveBonusSetAvailability", () => {
  it("같은 주제는 완료한 날 다시 열지 않고 다른 주제는 연다", () => {
    const progress = completedTopicProgress("digital", "2026-08-04", 0);
    expect(resolveBonusSetAvailability(progress, "digital", "2026-08-04"))
      .toEqual({ kind: "daily-limit" });
    expect(resolveBonusSetAvailability(progress, "language", "2026-08-04"))
      .toEqual({ kind: "available", setIndex: 0 });
  });

  it("완료되지 않은 세트 중 가장 작은 번호를 선택한다", () => {
    const progress = progressWithCompletedSets("digital", [0, 2]);
    expect(resolveBonusSetAvailability(progress, "digital", "2026-08-05"))
      .toEqual({ kind: "available", setIndex: 1 });
  });

  it("진행 중인 보너스 세션을 복원하도록 새 주제 생성을 막는다", () => {
    const progress = createEmptyProgress();
    const sessionKey = "2026-08-03:bonus:digital";
    progress.sessions[sessionKey] = createQuizSession(sessionKey);

    expect(resolveBonusSetAvailability(progress, "language", "2026-08-04"))
      .toEqual({ kind: "active-session", sessionKey });
  });

  it("180개 세트를 모두 완료한 주제는 소진 상태다", () => {
    const progress = progressWithCompletedSets(
      "digital",
      Array.from({ length: 180 }, (_, setIndex) => setIndex),
    );

    expect(resolveBonusSetAvailability(progress, "digital", "2026-08-05"))
      .toEqual({ kind: "exhausted" });
  });

  it("legacy 완료 세션은 같은 날 같은 주제를 다시 열지 않는다", () => {
    const progress = createEmptyProgress();
    const sessionKey = "2026-08-04:bonus:digital";
    progress.sessions[sessionKey] = {
      ...createQuizSession(sessionKey),
      phase: "completed",
    };
    progress.bonusStartCommands["legacy-complete"] = {
      commandId: "legacy-complete",
      dateKey: "2026-08-04",
      topic: "digital",
      setIndex: 0,
      sessionKey,
      questionIds: ["digital-0-g", "digital-0-s", "digital-0-x"],
      source: "first_free",
    };
    progress.completedBonusIds = [
      "digital-0-g",
      "digital-0-s",
      "digital-0-x",
    ];

    expect(resolveBonusSetAvailability(progress, "digital", "2026-08-04"))
      .toEqual({ kind: "daily-limit" });
  });

  it("legacy 완료 세트도 다음 날 가장 작은 미완료 번호에서 이어 간다", () => {
    const progress = createEmptyProgress();
    const sessionKey = "2026-08-04:bonus:digital";
    progress.sessions[sessionKey] = {
      ...createQuizSession(sessionKey),
      phase: "completed",
    };
    progress.bonusStartCommands["legacy-complete"] = {
      commandId: "legacy-complete",
      dateKey: "2026-08-04",
      topic: "digital",
      setIndex: 0,
      sessionKey,
      questionIds: ["digital-0-g", "digital-0-s", "digital-0-x"],
      source: "first_free",
    };
    progress.completedBonusIds = [
      "digital-0-g",
      "digital-0-s",
      "digital-0-x",
    ];

    expect(resolveBonusSetAvailability(progress, "digital", "2026-08-05"))
      .toEqual({ kind: "available", setIndex: 1 });
  });
});
