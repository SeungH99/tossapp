import { describe, expect, it } from "vitest";

import {
  appendShadowAudit,
  createShadowAudit,
  exportShadowAuditJson,
  isShadowAudit,
} from "./shadow-audit";

describe("shadow audit", () => {
  it("contains only non-identifying selected IDs, policy version, and reason", () => {
    const audit = createShadowAudit({
      legacyQuestionIds: ["legacy-1", "legacy-2"],
      shadowQuestionIds: ["shadow-1", "shadow-2"],
      policyVersion: "personalization-v1",
      reasonCode: "high-accuracy",
    });

    expect(Object.keys(audit).sort()).toEqual([
      "legacyQuestionIds",
      "policyVersion",
      "reasonCode",
      "shadowQuestionIds",
    ]);
    expect(JSON.stringify(audit)).not.toMatch(
      /isCorrect|selectedIndex|answeredAt|attemptId|sessionKey|userId|reward/i,
    );
  });

  it("rejects a free-form reason code", () => {
    expect(
      isShadowAudit({
        legacyQuestionIds: ["legacy-1"],
        shadowQuestionIds: ["shadow-1"],
        policyVersion: "personalization-v1",
        reasonCode: "member@example.com",
      }),
    ).toBe(false);
  });

  it("retains only the newest 100 audits", () => {
    const audits = Array.from({ length: 101 }, (_, index) =>
      createShadowAudit({
        legacyQuestionIds: [`legacy-${index}`],
        shadowQuestionIds: [`shadow-${index}`],
        policyVersion: "personalization-v1",
        reasonCode: "mixed-accuracy",
      }),
    );

    const retained = audits.reduce(
      (current, audit) => appendShadowAudit(current, audit, "normal"),
      [] as typeof audits,
    );

    expect(retained).toHaveLength(100);
    expect(retained[0].legacyQuestionIds).toEqual(["legacy-1"]);
    expect(retained[99].legacyQuestionIds).toEqual(["legacy-100"]);
  });

  it("does not append a low-confidence decision", () => {
    const existing = [
      createShadowAudit({
        legacyQuestionIds: ["legacy-1"],
        shadowQuestionIds: ["shadow-1"],
        policyVersion: "personalization-v1",
        reasonCode: "mixed-accuracy",
      }),
    ];

    const result = appendShadowAudit(
      existing,
      createShadowAudit({
        legacyQuestionIds: ["legacy-2"],
        shadowQuestionIds: ["shadow-2"],
        policyVersion: "personalization-v1",
        reasonCode: "low-confidence",
      }),
      "lowConfidence",
    );

    expect(result).toEqual(existing);
  });

  it("exports audit JSON only when the caller explicitly identifies development", () => {
    const audits = [
      createShadowAudit({
        legacyQuestionIds: ["legacy-1"],
        shadowQuestionIds: ["shadow-1"],
        policyVersion: "personalization-v1",
        reasonCode: "mixed-accuracy",
      }),
    ];

    expect(exportShadowAuditJson("development", audits)).toBe(
      JSON.stringify(audits),
    );
    expect(exportShadowAuditJson("production", audits)).toBeNull();
  });
});
