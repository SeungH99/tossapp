import { describe, expect, it } from "vitest";

import { buildLegacyMap } from "./build-legacy-map";

describe("buildLegacyMap", () => {
  it("records a legacy set only when all three retained IDs share one new set", () => {
    const result = buildLegacyMap(
      [{ id: "old-a" }, { id: "old-b" }, { id: "old-c" }],
      [
        { id: "old-a", topic: "digital", setIndex: 0 },
        { id: "old-b", topic: "digital", setIndex: 0 },
        { id: "old-c", topic: "digital", setIndex: 0 },
      ],
    );

    expect(result.completeSets).toEqual([
      {
        topic: "digital",
        setIndex: 0,
        legacyQuestionIds: ["old-a", "old-b", "old-c"],
      },
    ]);
    expect(result.partialMappings).toEqual([]);
    expect(result.unmappedIds).toEqual([]);
    expect(result.legacyMap).toEqual({
      "old-a": { topic: "digital", setIndex: 0 },
      "old-b": { topic: "digital", setIndex: 0 },
      "old-c": { topic: "digital", setIndex: 0 },
    });
  });

  it("audits partial and unmapped IDs without putting them in the migration map", () => {
    const result = buildLegacyMap(
      [{ id: "old-a" }, { id: "old-b" }, { id: "old-unmapped" }],
      [
        { id: "old-a", topic: "nostalgia", setIndex: 4 },
        { id: "old-b", topic: "nostalgia", setIndex: 4 },
        { id: "new-only", topic: "nostalgia", setIndex: 4 },
      ],
    );

    expect(result.completeSets).toEqual([]);
    expect(result.partialMappings).toEqual([
      {
        topic: "nostalgia",
        setIndex: 4,
        legacyQuestionIds: ["old-a", "old-b"],
      },
    ]);
    expect(result.unmappedIds).toEqual(["old-unmapped"]);
    expect(result.legacyMap).toEqual({});
  });
});
