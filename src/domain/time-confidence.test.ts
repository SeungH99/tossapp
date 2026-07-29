import { describe, expect, it } from "vitest";

import {
  createTimeObservation,
  observeTime,
} from "./time-confidence";

describe("time confidence", () => {
  it("establishes a normal initial observation from a valid KST date", () => {
    const observed = observeTime(
      createTimeObservation(),
      new Date("2026-07-28T03:00:00.000Z"),
    );

    expect(observed).toEqual({
      lastObservedKstDate: "2026-07-28",
      lastValidKstDate: "2026-07-28",
      confidence: "normal",
    });
  });

  it("keeps same-day and seven-day-forward observations normal", () => {
    const first = observeTime(
      createTimeObservation(),
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const sameDay = observeTime(
      first,
      new Date("2026-07-28T14:00:00.000Z"),
    );
    const advanced = observeTime(
      sameDay,
      new Date("2026-08-04T03:00:00.000Z"),
    );

    expect(advanced).toEqual({
      lastObservedKstDate: "2026-08-04",
      lastValidKstDate: "2026-08-04",
      confidence: "normal",
    });
  });

  it("marks a KST date rewind low confidence without replacing the valid date", () => {
    const first = observeTime(
      createTimeObservation(),
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const rewound = observeTime(
      first,
      new Date("2026-07-27T03:00:00.000Z"),
    );

    expect(rewound).toEqual({
      lastObservedKstDate: "2026-07-27",
      lastValidKstDate: "2026-07-28",
      confidence: "lowConfidence",
    });
  });

  it("marks a forward move over seven KST days low confidence", () => {
    const first = observeTime(
      createTimeObservation(),
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const jumped = observeTime(
      first,
      new Date("2026-08-05T03:00:00.000Z"),
    );

    expect(jumped).toEqual({
      lastObservedKstDate: "2026-08-05",
      lastValidKstDate: "2026-07-28",
      confidence: "lowConfidence",
    });
  });

  it("keeps a repeated anomalous date low before recovering from a large forward jump", () => {
    const initial = observeTime(
      createTimeObservation(),
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const jumped = observeTime(
      initial,
      new Date("2026-08-05T03:00:00.000Z"),
    );
    const repeated = observeTime(
      jumped,
      new Date("2026-08-05T14:00:00.000Z"),
    );
    const recovered = observeTime(
      repeated,
      new Date("2026-08-06T03:00:00.000Z"),
    );

    expect(repeated.confidence).toBe("lowConfidence");
    expect(recovered).toEqual({
      lastObservedKstDate: "2026-08-06",
      lastValidKstDate: "2026-08-06",
      confidence: "normal",
    });
  });

  it("keeps a rewind low until the observed KST date catches up", () => {
    const initial = observeTime(
      createTimeObservation(),
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const rewound = observeTime(
      initial,
      new Date("2026-07-26T03:00:00.000Z"),
    );
    const stillBehind = observeTime(
      rewound,
      new Date("2026-07-27T03:00:00.000Z"),
    );
    const caughtUp = observeTime(
      stillBehind,
      new Date("2026-07-28T03:00:00.000Z"),
    );

    expect(stillBehind.confidence).toBe("lowConfidence");
    expect(caughtUp).toEqual({
      lastObservedKstDate: "2026-07-28",
      lastValidKstDate: "2026-07-28",
      confidence: "normal",
    });
  });

  it("rejects an invalid Date", () => {
    expect(() => observeTime(createTimeObservation(), new Date("invalid"))).toThrow(
      RangeError,
    );
  });
});
