import { describe, expect, it } from "vitest";

import { deriveNextSetIndex } from "./progress-state";

describe("deriveNextSetIndex", () => {
  it("returns zero when no sets are complete", () => {
    expect(deriveNextSetIndex([])).toBe(0);
  });

  it("returns the smallest incomplete set index", () => {
    expect(deriveNextSetIndex([0, 2])).toBe(1);
  });

  it("handles unsorted duplicate completed indexes", () => {
    expect(deriveNextSetIndex([2, 0, 2, 0])).toBe(1);
  });

  it("returns undefined when all 180 sets are complete", () => {
    expect(
      deriveNextSetIndex(Array.from({ length: 180 }, (_, index) => index)),
    ).toBeUndefined();
  });
});
