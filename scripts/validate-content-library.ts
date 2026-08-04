import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { ContentManifest } from "../src/content/types";
import {
  type ContentLibraryPack,
  type ContentPackValidationIssue,
  type ContentValidationReport,
  validateContentLibrary,
} from "../src/data/content-pack-validation";

export interface LibraryValidationOptions {
  cwd?: string;
  manifestPath?: string;
  writeLine?: (line: string) => void;
}

function sha256(raw: Buffer): string {
  return createHash("sha256").update(raw).digest("hex");
}

function formatIssue(issue: ContentPackValidationIssue): string {
  const details =
    issue.expected === undefined && issue.actual === undefined
      ? ""
      : ` (expected=${String(issue.expected)}, actual=${String(issue.actual)})`;
  return `[${issue.code}] ${issue.scope}: ${issue.message}${details}`;
}

export function printLibraryValidationReport(
  report: ContentValidationReport,
  writeLine: (line: string) => void = console.log,
): 0 | 1 {
  for (const finding of report.issues) {
    writeLine(formatIssue(finding));
  }
  if (report.issues.length > 0) {
    writeLine(
      `Content library validation failed: ${report.issues.length} finding(s).`,
    );
    return 1;
  }
  writeLine(
    `Content library validation passed: ${report.packCount} packs, ${report.questionCount} questions, ${report.setCount} sets.`,
  );
  return 0;
}

export function runLibraryValidation(options: LibraryValidationOptions = {}): {
  exitCode: 0 | 1;
  report: ContentValidationReport;
} {
  const cwd = resolve(options.cwd ?? process.cwd());
  const manifestPath = isAbsolute(options.manifestPath ?? "")
    ? resolve(options.manifestPath as string)
    : resolve(cwd, options.manifestPath ?? "src/content/manifest.json");
  const manifest = JSON.parse(
    readFileSync(manifestPath, "utf8"),
  ) as ContentManifest;
  const packs: ContentLibraryPack[] = [];
  const unreadableIssues: ContentPackValidationIssue[] = [];
  for (const descriptor of [...manifest.corePacks, ...manifest.bonusPacks]) {
    try {
      const raw = readFileSync(resolve(cwd, descriptor.path));
      packs.push({
        path: descriptor.path,
        pack: JSON.parse(raw.toString("utf8")),
        sha256: sha256(raw),
      });
    } catch (error) {
      unreadableIssues.push({
        code: "schema",
        severity: "error",
        scope: `pack:${descriptor.id}`,
        message: `Cannot read pack: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  const report = validateContentLibrary(manifest, packs);
  report.issues.unshift(...unreadableIssues);
  return {
    exitCode: printLibraryValidationReport(
      report,
      options.writeLine ?? console.log,
    ),
    report,
  };
}

export function main(args: readonly string[] = process.argv.slice(2)): 0 | 1 {
  try {
    return runLibraryValidation({ manifestPath: args[0] }).exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = main();
}
