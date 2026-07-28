import type { QuizSession } from "./quiz-session";

export interface CompletionStreak {
  days: number;
  startDate: string;
}

function shiftDateKey(dateKey: string, dayOffset: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return date.toISOString().slice(0, 10);
}

function isCompletedCoreSession(
  dateKey: string,
  sessions: Record<string, QuizSession>,
): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(dateKey) &&
    sessions[dateKey]?.phase === "completed"
  );
}

export function calculateCompletionStreak(
  endDateKey: string,
  sessions: Record<string, QuizSession>,
): CompletionStreak {
  let days = 0;
  let cursor = endDateKey;

  while (isCompletedCoreSession(cursor, sessions)) {
    days += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return {
    days,
    startDate: days === 0 ? endDateKey : shiftDateKey(endDateKey, 1 - days),
  };
}

export function calculateVisibleStreakDay(
  dateKey: string,
  sessions: Record<string, QuizSession>,
): number {
  const completedToday = calculateCompletionStreak(dateKey, sessions);
  if (completedToday.days > 0) {
    return completedToday.days;
  }

  const yesterday = calculateCompletionStreak(
    shiftDateKey(dateKey, -1),
    sessions,
  );
  return Math.max(1, yesterday.days + 1);
}
