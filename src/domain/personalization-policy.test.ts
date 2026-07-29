import { describe, expect, it } from "vitest";

import {
  PERSONALIZATION_POLICY_V1,
  validatePersonalizationPolicy,
} from "./personalization-policy";

describe("personalization policy", () => {
  it("accepts the published v1 policy", () => {
    expect(validatePersonalizationPolicy(PERSONALIZATION_POLICY_V1)).toEqual([]);
  });

  it("rejects weights that do not total one", () => {
    expect(
      validatePersonalizationPolicy({
        ...PERSONALIZATION_POLICY_V1,
        topicInterestWeight: 0.5,
      }),
    ).toContain("topicWeights");
  });

  it("rejects unordered accuracy thresholds", () => {
    expect(
      validatePersonalizationPolicy({
        ...PERSONALIZATION_POLICY_V1,
        lowAccuracyThreshold: 0.9,
      }),
    ).toContain("accuracyThresholds");
  });

  it("rejects non-positive counts and windows", () => {
    expect(
      validatePersonalizationPolicy({
        ...PERSONALIZATION_POLICY_V1,
        recentAccuracyWindow: 0,
      }),
    ).toContain("recentAccuracyWindow");
  });

  it("rejects blank policy and tie-break versions", () => {
    expect(
      validatePersonalizationPolicy({
        ...PERSONALIZATION_POLICY_V1,
        version: " ",
        tieBreakAlgorithmVersion: "",
      }),
    ).toEqual(expect.arrayContaining(["version", "tieBreakAlgorithmVersion"]));
  });

  it("rejects duplicate and unknown fallback entries", () => {
    expect(
      validatePersonalizationPolicy({
        ...PERSONALIZATION_POLICY_V1,
        fallbackOrder: [
          "adjacent-level",
          "adjacent-level",
          "unrecognized",
        ],
      }),
    ).toEqual(
      expect.arrayContaining(["fallbackOrder.duplicate", "fallbackOrder.entry"]),
    );
  });
});
