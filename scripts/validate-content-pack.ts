import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type {
  ContentManifest,
  ContentPackDescriptor,
} from "../src/content/types";
import {
  type ContentPackValidationIssue,
  type ContentValidationReport,
  validateContentPack,
} from "../src/data/content-pack-validation";

export interface PackValidationOptions {
  cwd?: string;
  packPath: string;
  manifestPath?: string;
  updateManifest?: boolean;
  writeLine?: (line: string) => void;
}

export interface PackValidationResult {
  exitCode: 0 | 1;
  report: ContentValidationReport;
  updatedManifest: boolean;
}

function sha256(raw: Buffer): string {
  return createHash("sha256").update(raw).digest("hex");
}

function normalizePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function actualDescriptorFields(
  pack: Record<string, unknown>,
  checksum: string,
): Partial<ContentPackDescriptor> & {
  sha256: string;
  questionCount: number;
  setCount: number;
  reviewStatus: "reviewed" | "draft" | "fact-checked";
} {
  const questions = Array.isArray(pack.questions)
    ? pack.questions.filter(
        (value): value is Record<string, unknown> =>
          typeof value === "object" && value !== null && !Array.isArray(value),
      )
    : [];
  const reviewStatus =
    pack.reviewStatus === "reviewed" ||
    pack.reviewStatus === "fact-checked" ||
    pack.reviewStatus === "draft"
      ? pack.reviewStatus
      : "draft";
  if (pack.kind === "bonus") {
    const setIndexes = questions
      .map(({ setIndex }) => setIndex)
      .filter((value): value is number => Number.isInteger(value))
      .sort((left, right) => left - right);
    const topics = questions
      .map(({ topic }) => topic)
      .filter((value): value is string => typeof value === "string");
    return {
      sha256: checksum,
      questionCount: questions.length,
      setCount: new Set(setIndexes).size,
      reviewStatus,
      topic: topics[0],
      setStart: setIndexes[0] ?? 0,
      setEnd: setIndexes.at(-1) ?? 0,
    } as Partial<ContentPackDescriptor> & {
      sha256: string;
      questionCount: number;
      setCount: number;
      reviewStatus: "reviewed" | "draft" | "fact-checked";
    };
  }
  const dates = questions
    .map(({ dateKey }) => dateKey)
    .filter((value): value is string => typeof value === "string")
    .sort();
  return {
    sha256: checksum,
    questionCount: questions.length,
    setCount: new Set(dates).size,
    reviewStatus,
    dateStart: dates[0] ?? "",
    dateEnd: dates.at(-1) ?? "",
  } as Partial<ContentPackDescriptor> & {
    sha256: string;
    questionCount: number;
    setCount: number;
    reviewStatus: "reviewed" | "draft" | "fact-checked";
  };
}

function synthesizedDescriptor(
  pack: Record<string, unknown>,
  packPath: string,
  checksum: string,
): ContentPackDescriptor {
  const id = typeof pack.id === "string" ? pack.id : "invalid-pack";
  const base = {
    id,
    path: normalizePath(packPath),
    ...actualDescriptorFields(pack, checksum),
  };
  if (pack.kind === "bonus") {
    return { ...base, kind: "bonus" } as ContentPackDescriptor;
  }
  return { ...base, kind: "core" } as ContentPackDescriptor;
}

function findDescriptor(
  manifest: ContentManifest,
  cwd: string,
  packPath: string,
): ContentPackDescriptor | undefined {
  const absolutePackPath = resolve(packPath);
  return [...manifest.corePacks, ...manifest.bonusPacks].find(
    (descriptor) => resolve(cwd, descriptor.path) === absolutePackPath,
  );
}

function formatIssue(issue: ContentPackValidationIssue): string {
  const details =
    issue.expected === undefined && issue.actual === undefined
      ? ""
      : ` (expected=${String(issue.expected)}, actual=${String(issue.actual)})`;
  return `[${issue.code}] ${issue.scope}: ${issue.message}${details}`;
}

export function printPackValidationReport(
  report: ContentValidationReport,
  writeLine: (line: string) => void,
): 0 | 1 {
  for (const finding of report.issues) {
    writeLine(formatIssue(finding));
  }
  if (report.issues.length > 0) {
    writeLine(
      `Content pack validation failed: ${report.issues.length} finding(s).`,
    );
    return 1;
  }
  writeLine(
    `Content pack validation passed: ${report.questionCount} questions in ${report.setCount} sets.`,
  );
  return 0;
}

function writeJsonAtomically(path: string, value: unknown): void {
  const temporaryPath = resolve(dirname(path), `.${randomUUID()}.tmp`);
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
    });
    renameSync(temporaryPath, path);
  } finally {
    if (existsSync(temporaryPath)) {
      rmSync(temporaryPath);
    }
  }
}

export async function runPackValidation(
  options: PackValidationOptions,
): Promise<PackValidationResult> {
  const cwd = resolve(options.cwd ?? process.cwd());
  const packPath = isAbsolute(options.packPath)
    ? resolve(options.packPath)
    : resolve(cwd, options.packPath);
  const manifestPath = resolve(
    cwd,
    options.manifestPath ?? "src/content/manifest.json",
  );
  const writeLine = options.writeLine ?? console.log;
  const raw = readFileSync(packPath);
  let pack: unknown;
  try {
    pack = JSON.parse(raw.toString("utf8"));
  } catch {
    const report: ContentValidationReport = {
      packCount: 1,
      questionCount: 0,
      setCount: 0,
      issues: [
        {
          code: "schema",
          severity: "error",
          scope: `pack:${normalizePath(relative(cwd, packPath))}`,
          message: "Pack is not valid JSON.",
        },
      ],
    };
    return {
      exitCode: printPackValidationReport(report, writeLine),
      report,
      updatedManifest: false,
    };
  }

  const checksum = sha256(raw);
  const candidate =
    typeof pack === "object" && pack !== null && !Array.isArray(pack)
      ? (pack as Record<string, unknown>)
      : {};
  let manifest: ContentManifest | undefined;
  let matchingDescriptor: ContentPackDescriptor | undefined;
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as ContentManifest;
    matchingDescriptor = findDescriptor(manifest, cwd, packPath);
  }

  if (
    options.updateManifest &&
    (manifest == null || matchingDescriptor == null)
  ) {
    const report: ContentValidationReport = {
      packCount: 1,
      questionCount: Array.isArray(candidate.questions)
        ? candidate.questions.length
        : 0,
      setCount: 0,
      issues: [
        {
          code: "schema",
          severity: "error",
          scope: `pack:${String(candidate.id ?? "unknown")}`,
          message: "--update-manifest requires a matching descriptor.",
        },
      ],
    };
    return {
      exitCode: printPackValidationReport(report, writeLine),
      report,
      updatedManifest: false,
    };
  }

  const mutableFields = actualDescriptorFields(candidate, checksum);
  const descriptor = matchingDescriptor
    ? options.updateManifest
      ? ({ ...matchingDescriptor, ...mutableFields } as ContentPackDescriptor)
      : matchingDescriptor
    : synthesizedDescriptor(
        candidate,
        normalizePath(relative(cwd, packPath)),
        checksum,
      );
  const report = validateContentPack(pack, descriptor);
  if (
    matchingDescriptor != null &&
    !options.updateManifest &&
    matchingDescriptor.sha256 !== checksum
  ) {
    report.issues.push({
      code: "checksum",
      severity: "error",
      scope: `pack:${matchingDescriptor.id}`,
      message: "Raw-file SHA-256 does not match the descriptor.",
      expected: matchingDescriptor.sha256,
      actual: checksum,
    });
  }
  const exitCode = printPackValidationReport(report, writeLine);
  if (
    exitCode !== 0 ||
    !options.updateManifest ||
    manifest == null ||
    matchingDescriptor == null
  ) {
    return { exitCode, report, updatedManifest: false };
  }

  Object.assign(matchingDescriptor, mutableFields);
  writeJsonAtomically(manifestPath, manifest);
  writeLine(`Updated manifest descriptor: ${matchingDescriptor.id}.`);
  return { exitCode: 0, report, updatedManifest: true };
}

function parseArgs(args: readonly string[]): {
  packPath?: string;
  manifestPath?: string;
  updateManifest: boolean;
} {
  let packPath: string | undefined;
  let manifestPath: string | undefined;
  let updateManifest = false;
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === "--update-manifest") {
      updateManifest = true;
    } else if (value === "--manifest") {
      manifestPath = args[index + 1];
      index += 1;
    } else if (!value.startsWith("--") && packPath == null) {
      packPath = value;
    }
  }
  return { packPath, manifestPath, updateManifest };
}

export async function main(
  args: readonly string[] = process.argv.slice(2),
): Promise<0 | 1> {
  const parsed = parseArgs(args);
  if (parsed.packPath == null) {
    console.error(
      "Usage: validate-content-pack <pack.json> [--manifest manifest.json] [--update-manifest]",
    );
    return 1;
  }
  try {
    return (
      await runPackValidation({
        packPath: parsed.packPath,
        manifestPath: parsed.manifestPath,
        updateManifest: parsed.updateManifest,
      })
    ).exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = await main();
}
