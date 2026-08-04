import type { ProgressState } from "./progress-state";
import { deriveNextSetIndex } from "./progress-state";
import type { BonusTopic } from "./question";

export type BonusSetAvailability =
  | { kind: "available"; setIndex: number }
  | { kind: "daily-limit" }
  | { kind: "exhausted" }
  | { kind: "active-session"; sessionKey: string };

export function resolveBonusSetAvailability(
  progress: ProgressState,
  topic: BonusTopic,
  dateKey: string,
): BonusSetAvailability {
  for (const [sessionKey, session] of Object.entries(progress.sessions)) {
    if (sessionKey.includes(":bonus:") && session.phase !== "completed") {
      return { kind: "active-session", sessionKey };
    }
  }

  const topicProgress = progress.bonusTopicProgress[topic];
  if (topicProgress.lastCompletedDateKey === dateKey) {
    return { kind: "daily-limit" };
  }

  const setIndex = deriveNextSetIndex(topicProgress.completedSetIndexes);
  return setIndex == null
    ? { kind: "exhausted" }
    : { kind: "available", setIndex };
}
