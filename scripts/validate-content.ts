import { pathToFileURL } from "node:url";

import {
  type ContentValidationIssue,
  type ContentValidationReport,
  validateBundledContent,
} from "../src/data/content-validation";
import { bonusQuestions, coreQuestions } from "../src/data/questions";

function formatIssue(issue: ContentValidationIssue): string {
  const values =
    issue.expected == null && issue.actual == null
      ? ""
      : ` (expected=${String(issue.expected)}, actual=${String(issue.actual)})`;
  return `[${issue.code}] ${issue.scope}: ${issue.message}${values}`;
}

export function printContentValidationReport(
  report: ContentValidationReport,
  writeLine: (line: string) => void = console.log,
): 0 | 1 {
  if (report.issues.length === 0) {
    writeLine(
      `콘텐츠 검증 통과: 핵심 ${report.coreCount}개 보너스 ${report.bonusCount}개`,
    );
    return 0;
  }

  for (const issue of report.issues) {
    writeLine(formatIssue(issue));
  }
  writeLine(`콘텐츠 검증 실패: ${report.issues.length}개 위반`);
  return 1;
}

export function main(): 0 | 1 {
  return printContentValidationReport(
    validateBundledContent(coreQuestions, bonusQuestions),
  );
}

if (
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = main();
}
