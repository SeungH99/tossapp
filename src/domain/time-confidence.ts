import { toKstDateKey } from "./date-key";

export type TimeConfidence = "normal" | "lowConfidence";

export interface TimeObservation {
  lastObservedKstDate: string | null;
  lastValidKstDate: string | null;
  confidence: TimeConfidence;
}

export function createTimeObservation(): TimeObservation {
  return {
    lastObservedKstDate: null,
    lastValidKstDate: null,
    confidence: "normal",
  };
}

function kstDateNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

export function compareKstDateKeys(left: string, right: string): number {
  return kstDateNumber(left) - kstDateNumber(right);
}

export function observeTime(
  observation: TimeObservation,
  now: Date,
): TimeObservation {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("Time observation must be a valid Date");
  }

  const dateKey = toKstDateKey(now);
  if (observation.lastObservedKstDate == null) {
    return {
      lastObservedKstDate: dateKey,
      lastValidKstDate: dateKey,
      confidence: "normal",
    };
  }

  const distance = compareKstDateKeys(
    dateKey,
    observation.lastObservedKstDate,
  );
  const validDate = observation.lastValidKstDate;
  const observedVsValid =
    validDate == null ? null : compareKstDateKeys(dateKey, validDate);
  const lastObservedVsValid =
    validDate == null
      ? null
      : compareKstDateKeys(observation.lastObservedKstDate, validDate);
  if (
    observation.confidence === "lowConfidence" &&
    validDate != null &&
    observedVsValid != null &&
    lastObservedVsValid != null &&
    observedVsValid >= 0 &&
    (lastObservedVsValid < 0 || (distance > 0 && distance <= 7))
  ) {
    return {
      lastObservedKstDate: dateKey,
      lastValidKstDate: dateKey,
      confidence: "normal",
    };
  }
  if (observation.confidence === "normal" && distance >= 0 && distance <= 7) {
    return {
      lastObservedKstDate: dateKey,
      lastValidKstDate: dateKey,
      confidence: "normal",
    };
  }

  return {
    lastObservedKstDate: dateKey,
    lastValidKstDate: observation.lastValidKstDate,
    confidence: "lowConfidence",
  };
}
