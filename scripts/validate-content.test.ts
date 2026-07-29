import { describe, expect, it } from "vitest";

import type { ContentValidationReport } from "../src/data/content-validation";
import { printContentValidationReport } from "./validate-content";

describe("printContentValidationReport", () => {
  it("prints counts and returns zero for a valid report", () => {
    const lines: string[] = [];
    const code = printContentValidationReport(
      { coreCount: 90, bonusCount: 90, issues: [] },
      (line) => lines.push(line),
    );

    expect(code).toBe(0);
    expect(lines).toEqual(["콘텐츠 검증 통과: 핵심 90개 보너스 90개"]);
  });

  it("prints structured failures and returns one", () => {
    const report: ContentValidationReport = {
      coreCount: 89,
      bonusCount: 90,
      issues: [
        {
          code: "core-count",
          scope: "core",
          message: "핵심 문제 수가 출시 계약과 일치하지 않습니다.",
          expected: 90,
          actual: 89,
        },
      ],
    };
    const lines: string[] = [];

    expect(
      printContentValidationReport(report, (line) => lines.push(line)),
    ).toBe(1);
    expect(lines).toEqual([
      "[core-count] core: 핵심 문제 수가 출시 계약과 일치하지 않습니다. (expected=90, actual=89)",
      "콘텐츠 검증 실패: 1개 위반",
    ]);
  });
});
