import { describe, expect, it } from "vitest";

import { createQuizSession, type QuizSession } from "./quiz-session";
import {
  calculateCompletionStreak,
  calculateVisibleStreakDay,
} from "./streak";

function completedSession(dateKey: string): QuizSession {
  return {
    ...createQuizSession(dateKey),
    phase: "completed",
  };
}

describe("participation streak", () => {
  it("날짜 경계를 넘어 연속 완료 일수와 시작일을 계산한다", () => {
    const sessions = {
      "2026-07-31": completedSession("2026-07-31"),
      "2026-08-01": completedSession("2026-08-01"),
      "2026-08-02": completedSession("2026-08-02"),
    };

    expect(calculateCompletionStreak("2026-08-02", sessions)).toEqual({
      days: 3,
      startDate: "2026-07-31",
    });
  });

  it("중간에 빠진 날짜가 있으면 현재 연속 구간만 계산한다", () => {
    const sessions = {
      "2026-07-29": completedSession("2026-07-29"),
      "2026-07-31": completedSession("2026-07-31"),
    };

    expect(calculateCompletionStreak("2026-07-31", sessions)).toEqual({
      days: 1,
      startDate: "2026-07-31",
    });
  });

  it("오늘 완료 전에는 어제까지의 연속 기록에 오늘을 이어서 보여 준다", () => {
    const sessions = {
      "2026-07-28": completedSession("2026-07-28"),
      "2026-07-29": completedSession("2026-07-29"),
    };

    expect(calculateVisibleStreakDay("2026-07-30", sessions)).toBe(3);
  });
});
