import { describe, expect, it } from "vitest";

import { bonusQuestions, coreQuestions } from "./questions";
import { validateBundledContent } from "./content-validation";

describe("validateBundledContent", () => {
  it("accepts the bundled 90 core and 90 bonus questions", () => {
    expect(validateBundledContent(coreQuestions, bonusQuestions)).toEqual({
      coreCount: 90,
      bonusCount: 90,
      issues: [],
    });
  });

  it("returns every release-contract error from one broken fixture", () => {
    const brokenCore = coreQuestions.map((question) => ({ ...question }));
    brokenCore[0] = {
      ...brokenCore[0],
      id: brokenCore[1].id,
      prompt: bonusQuestions[0].prompt,
      dateKey: "2026-08-27",
    };
    const brokenBonus = bonusQuestions.slice(0, -1);

    const report = validateBundledContent(brokenCore, brokenBonus);
    const codes = report.issues.map((issue) => issue.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "duplicate-id",
        "duplicate-prompt",
        "core-date-range",
        "core-date-lens-count",
        "bonus-count",
        "bonus-topic-count",
      ]),
    );
    expect(report.issues.every((issue) => issue.scope.length > 0)).toBe(true);
    expect(report.issues.every((issue) => issue.message.length > 0)).toBe(true);
  });
});
