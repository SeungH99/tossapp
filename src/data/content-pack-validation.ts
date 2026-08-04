import { validateQuestion } from "../domain/question";
import type { ContentManifest, ContentPackDescriptor } from "../content/types";

export type ContentPackValidationCode =
  | "schema"
  | "count"
  | "date-range"
  | "set-range"
  | "difficulty-balance"
  | "answer-balance"
  | "duplicate-id"
  | "duplicate-prompt"
  | "short-prompt"
  | "similar-prompt"
  | "choice-duplicate"
  | "choice-length-outlier"
  | "answer-leak"
  | "negative-stack"
  | "concept-spacing"
  | "source-review"
  | "checksum";

export type ContentValidationSeverity = "error" | "warning";

export interface ContentPackValidationIssue {
  code: ContentPackValidationCode;
  severity: ContentValidationSeverity;
  scope: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
}

export interface ContentValidationReport {
  packCount: number;
  questionCount: number;
  setCount: number;
  issues: ContentPackValidationIssue[];
}

export interface ContentLibraryPack {
  path: string;
  pack: unknown;
  sha256: string;
}

interface QuestionCandidate {
  id?: unknown;
  kind?: unknown;
  prompt?: unknown;
  choices?: unknown;
  answerIndex?: unknown;
  dateKey?: unknown;
  topic?: unknown;
  setIndex?: unknown;
  conceptId?: unknown;
  internalDifficulty?: unknown;
  contentVersion?: unknown;
  reviewStatus?: unknown;
  reviewedAt?: unknown;
  source?: unknown;
}

interface PackCandidate {
  id?: unknown;
  kind?: unknown;
  contentVersion?: unknown;
  reviewStatus?: unknown;
  questions?: unknown;
}

const DIFFICULTIES = ["gentle", "steady", "stretch"] as const;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function characterLengthWithoutWhitespace(value: string): number {
  return [...value.replace(/\s/gu, "")].length;
}

function trigrams(value: string): Set<string> {
  const characters = [...normalizeText(value)];
  const result = new Set<string>();
  for (let index = 0; index <= characters.length - 3; index += 1) {
    result.add(characters.slice(index, index + 3).join(""));
  }
  return result;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }
  let intersection = 0;
  for (const value of left) {
    if (right.has(value)) {
      intersection += 1;
    }
  }
  return intersection / (left.size + right.size - intersection);
}

function issue(
  issues: ContentPackValidationIssue[],
  code: ContentPackValidationCode,
  severity: ContentValidationSeverity,
  scope: string,
  message: string,
  details: Pick<ContentPackValidationIssue, "expected" | "actual"> = {},
): void {
  issues.push({ code, severity, scope, message, ...details });
}

function questionScope(question: QuestionCandidate, index: number): string {
  return typeof question.id === "string" && question.id.length > 0
    ? `question:${question.id}`
    : `question:${index}`;
}

function questionsFrom(pack: unknown): QuestionCandidate[] {
  if (!isRecord(pack) || !Array.isArray(pack.questions)) {
    return [];
  }
  return pack.questions.filter(isRecord);
}

function addPackSchemaIssues(
  pack: unknown,
  descriptor: ContentPackDescriptor,
  issues: ContentPackValidationIssue[],
): QuestionCandidate[] {
  if (!isRecord(pack)) {
    issue(
      issues,
      "schema",
      "error",
      `pack:${descriptor.id}`,
      "Pack must be a JSON object.",
    );
    return [];
  }
  const candidate: PackCandidate = pack;
  if (
    candidate.id !== descriptor.id ||
    candidate.kind !== descriptor.kind ||
    typeof candidate.contentVersion !== "string" ||
    candidate.reviewStatus !== "reviewed" ||
    !Array.isArray(candidate.questions)
  ) {
    issue(
      issues,
      "schema",
      "error",
      `pack:${descriptor.id}`,
      "Pack metadata does not match its reviewed descriptor.",
    );
  }
  if (
    candidate.reviewStatus !== "reviewed" ||
    descriptor.reviewStatus !== "reviewed"
  ) {
    issue(
      issues,
      "source-review",
      "error",
      `pack:${descriptor.id}`,
      "Pack and descriptor must both be reviewed.",
    );
  }

  if (!Array.isArray(candidate.questions)) {
    return [];
  }

  return candidate.questions.map((value, index) => {
    if (!isRecord(value)) {
      issue(
        issues,
        "schema",
        "error",
        `question:${index}`,
        "Question must be a JSON object.",
      );
      return {};
    }
    const schemaErrors = validateQuestion(value);
    if (schemaErrors.length > 0 || value.kind !== descriptor.kind) {
      issue(
        issues,
        "schema",
        "error",
        questionScope(value, index),
        `Question schema failed: ${schemaErrors.join(", ") || "question.kind"}.`,
      );
    }
    if (
      value.reviewStatus !== "reviewed" ||
      typeof value.reviewedAt !== "string" ||
      !ISO_DATE_PATTERN.test(value.reviewedAt) ||
      !isRecord(value.source) ||
      typeof value.source.name !== "string" ||
      value.source.name.trim().length === 0 ||
      typeof value.source.url !== "string" ||
      !value.source.url.startsWith("https://") ||
      value.contentVersion !== candidate.contentVersion
    ) {
      issue(
        issues,
        "source-review",
        "error",
        questionScope(value, index),
        "Question requires reviewed metadata and an HTTPS source.",
      );
    }
    return value;
  });
}

function addRangeAndBalanceIssues(
  questions: QuestionCandidate[],
  descriptor: ContentPackDescriptor,
  issues: ContentPackValidationIssue[],
): number {
  if (questions.length !== descriptor.questionCount) {
    issue(
      issues,
      "count",
      "error",
      `pack:${descriptor.id}`,
      "Question count does not match the descriptor.",
      { expected: descriptor.questionCount, actual: questions.length },
    );
  }

  const groupKeys = new Set<string>();
  if (descriptor.kind === "core") {
    const dates = questions
      .map(({ dateKey }) => dateKey)
      .filter((value): value is string => typeof value === "string")
      .sort();
    for (const date of dates) {
      groupKeys.add(date);
    }
    const actual = dates.length === 0 ? "none" : `${dates[0]}..${dates.at(-1)}`;
    const expected = `${descriptor.dateStart}..${descriptor.dateEnd}`;
    if (actual !== expected) {
      issue(
        issues,
        "date-range",
        "error",
        `pack:${descriptor.id}`,
        "Core date range does not match the descriptor.",
        { expected, actual },
      );
    }
  } else {
    const setIndexes = questions
      .map(({ setIndex }) => setIndex)
      .filter((value): value is number => Number.isInteger(value))
      .sort((left, right) => left - right);
    for (const setIndex of setIndexes) {
      groupKeys.add(`${descriptor.topic}:${setIndex}`);
    }
    const actual =
      setIndexes.length === 0
        ? "none"
        : `${setIndexes[0]}..${setIndexes.at(-1)}`;
    const expected = `${descriptor.setStart}..${descriptor.setEnd}`;
    const hasWrongTopic = questions.some(
      ({ topic }) => topic !== descriptor.topic,
    );
    if (actual !== expected || hasWrongTopic) {
      issue(
        issues,
        "set-range",
        "error",
        `pack:${descriptor.id}`,
        "Bonus topic or set range does not match the descriptor.",
        { expected: `${descriptor.topic}:${expected}`, actual },
      );
    }
  }

  for (const groupKey of groupKeys) {
    const group = questions.filter((question) =>
      descriptor.kind === "core"
        ? question.dateKey === groupKey
        : `${question.topic}:${question.setIndex}` === groupKey,
    );
    const counts = DIFFICULTIES.map(
      (difficulty) =>
        group.filter(
          ({ internalDifficulty }) => internalDifficulty === difficulty,
        ).length,
    );
    if (counts.some((count) => count !== 1)) {
      issue(
        issues,
        "difficulty-balance",
        "error",
        descriptor.kind === "core" ? `core:${groupKey}` : groupKey,
        "Each set must contain one question per difficulty.",
        { expected: "1,1,1", actual: counts.join(",") },
      );
    }
  }

  if (
    descriptor.setCount !== undefined &&
    descriptor.setCount !== groupKeys.size
  ) {
    issue(
      issues,
      "count",
      "error",
      `pack:${descriptor.id}`,
      "Set count does not match the descriptor.",
      { expected: descriptor.setCount, actual: groupKeys.size },
    );
  }

  const answerCounts = [0, 1, 2].map(
    (answerIndex) =>
      questions.filter((question) => question.answerIndex === answerIndex)
        .length,
  );
  if (Math.max(...answerCounts) - Math.min(...answerCounts) > 2) {
    issue(
      issues,
      "answer-balance",
      "error",
      `pack:${descriptor.id}`,
      "Answer positions must differ by no more than two.",
      { expected: "spread<=2", actual: answerCounts.join(",") },
    );
  }
  return groupKeys.size;
}

function addQuestionQualityIssues(
  questions: QuestionCandidate[],
  issues: ContentPackValidationIssue[],
): void {
  const ids = new Map<string, string>();
  const prompts = new Map<string, string>();

  for (const [index, question] of questions.entries()) {
    const scope = questionScope(question, index);
    if (typeof question.id === "string") {
      const prior = ids.get(question.id);
      if (prior != null) {
        issue(
          issues,
          "duplicate-id",
          "error",
          scope,
          `Question ID duplicates ${prior}.`,
        );
      } else {
        ids.set(question.id, scope);
      }
    }

    if (typeof question.prompt !== "string") {
      continue;
    }
    const normalizedPrompt = normalizeText(question.prompt);
    const priorPrompt = prompts.get(normalizedPrompt);
    if (priorPrompt != null) {
      issue(
        issues,
        "duplicate-prompt",
        "error",
        scope,
        `Prompt duplicates ${priorPrompt}.`,
      );
    } else {
      prompts.set(normalizedPrompt, scope);
    }
    if (characterLengthWithoutWhitespace(question.prompt) < 14) {
      issue(
        issues,
        "short-prompt",
        "warning",
        scope,
        "Prompt has fewer than 14 non-space characters.",
      );
    }

    const negativeMatches = question.prompt.match(
      /않(?:은|는|게|도록)?|아닌|제외|말고|틀린|\bnot\b|\bexcept\b|\bnever\b|\bwithout\b/giu,
    );
    if ((negativeMatches?.length ?? 0) >= 2) {
      issue(
        issues,
        "negative-stack",
        "warning",
        scope,
        "Prompt stacks two or more negative conditions.",
      );
    }

    if (!Array.isArray(question.choices) || question.choices.length !== 3) {
      continue;
    }
    const choices = question.choices.filter(
      (choice): choice is string => typeof choice === "string",
    );
    if (choices.length !== 3) {
      continue;
    }
    const normalizedChoices = choices.map(normalizeText);
    if (new Set(normalizedChoices).size !== normalizedChoices.length) {
      issue(
        issues,
        "choice-duplicate",
        "error",
        scope,
        "Choices must be unique.",
      );
    }
    const lengths = choices.map(characterLengthWithoutWhitespace);
    for (const [choiceIndex, length] of lengths.entries()) {
      const otherAverage =
        lengths
          .filter((_, otherIndex) => otherIndex !== choiceIndex)
          .reduce((sum, otherLength) => sum + otherLength, 0) / 2;
      if (length >= otherAverage * 1.8 && length >= otherAverage + 8) {
        issue(
          issues,
          "choice-length-outlier",
          "warning",
          scope,
          `Choice ${choiceIndex} is an answer-length outlier.`,
        );
        break;
      }
    }
    if (
      typeof question.answerIndex === "number" &&
      question.answerIndex >= 0 &&
      question.answerIndex < normalizedChoices.length
    ) {
      const answer = normalizedChoices[question.answerIndex];
      if (answer.length >= 2 && normalizedPrompt.includes(answer)) {
        issue(
          issues,
          "answer-leak",
          "warning",
          scope,
          "The normalized answer appears in the prompt.",
        );
      }
    }
  }

  for (let leftIndex = 0; leftIndex < questions.length; leftIndex += 1) {
    const left = questions[leftIndex];
    if (typeof left.prompt !== "string") continue;
    const leftNormalized = normalizeText(left.prompt);
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < questions.length;
      rightIndex += 1
    ) {
      const right = questions[rightIndex];
      if (typeof right.prompt !== "string") continue;
      const rightNormalized = normalizeText(right.prompt);
      if (leftNormalized === rightNormalized) continue;
      const similarity = jaccard(trigrams(left.prompt), trigrams(right.prompt));
      if (similarity >= 0.72) {
        issue(
          issues,
          "similar-prompt",
          "warning",
          `${questionScope(left, leftIndex)}~${questionScope(right, rightIndex)}`,
          "Normalized character 3-gram similarity is at least 0.72.",
          { expected: "<0.72", actual: similarity.toFixed(3) },
        );
      }
    }
  }

  const concepts = new Map<string, Array<{ index: number; scope: string }>>();
  for (const [index, question] of questions.entries()) {
    if (
      typeof question.conceptId !== "string" ||
      !Number.isInteger(question.setIndex)
    ) {
      continue;
    }
    const entries = concepts.get(question.conceptId) ?? [];
    entries.push({
      index: question.setIndex as number,
      scope: questionScope(question, index),
    });
    concepts.set(question.conceptId, entries);
  }
  for (const [conceptId, entries] of concepts) {
    entries.sort((left, right) => left.index - right.index);
    for (let index = 1; index < entries.length; index += 1) {
      const spacing = entries[index].index - entries[index - 1].index;
      if (spacing < 30) {
        issue(
          issues,
          "concept-spacing",
          "warning",
          entries[index].scope,
          `Concept ${conceptId} repeats fewer than 30 set indexes apart.`,
          { expected: ">=30", actual: spacing },
        );
      }
    }
  }
}

function addCrossPackQualityIssues(
  packs: readonly ContentLibraryPack[],
  issues: ContentPackValidationIssue[],
): void {
  const ids = new Map<string, { path: string; scope: string }>();
  const prompts = new Map<string, { path: string; scope: string }>();
  const entries: Array<{
    path: string;
    question: QuestionCandidate;
    scope: string;
    normalizedPrompt?: string;
    trigrams?: Set<string>;
  }> = [];
  for (const file of packs) {
    for (const [index, question] of questionsFrom(file.pack).entries()) {
      const scope = `${file.path}:${questionScope(question, index)}`;
      const entry = {
        path: file.path,
        question,
        scope,
      } as (typeof entries)[number];
      if (typeof question.prompt === "string") {
        entry.normalizedPrompt = normalizeText(question.prompt);
        entry.trigrams = trigrams(question.prompt);
      }
      entries.push(entry);
      if (typeof question.id === "string") {
        const prior = ids.get(question.id);
        if (prior != null && prior.path !== file.path) {
          issue(
            issues,
            "duplicate-id",
            "error",
            scope,
            `Question ID duplicates ${prior.scope}.`,
          );
        } else {
          ids.set(question.id, { path: file.path, scope });
        }
      }
      if (typeof question.prompt === "string") {
        const normalized = normalizeText(question.prompt);
        const prior = prompts.get(normalized);
        if (prior != null && prior.path !== file.path) {
          issue(
            issues,
            "duplicate-prompt",
            "error",
            scope,
            `Prompt duplicates ${prior.scope}.`,
          );
        } else {
          prompts.set(normalized, { path: file.path, scope });
        }
      }
    }
  }

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    const left = entries[leftIndex];
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < entries.length;
      rightIndex += 1
    ) {
      const right = entries[rightIndex];
      if (
        left.path === right.path ||
        left.normalizedPrompt === undefined ||
        right.normalizedPrompt === undefined ||
        left.normalizedPrompt === right.normalizedPrompt ||
        left.trigrams === undefined ||
        right.trigrams === undefined
      ) {
        continue;
      }
      const similarity = jaccard(left.trigrams, right.trigrams);
      if (similarity >= 0.72) {
        issue(
          issues,
          "similar-prompt",
          "warning",
          `${left.scope}~${right.scope}`,
          "Normalized character 3-gram similarity is at least 0.72 across packs.",
          { expected: "<0.72", actual: similarity.toFixed(3) },
        );
      }
    }
  }

  const concepts = new Map<
    string,
    Array<{ path: string; setIndex: number; scope: string }>
  >();
  for (const entry of entries) {
    if (
      typeof entry.question.conceptId !== "string" ||
      !Number.isInteger(entry.question.setIndex)
    ) {
      continue;
    }
    const conceptEntries = concepts.get(entry.question.conceptId) ?? [];
    conceptEntries.push({
      path: entry.path,
      setIndex: entry.question.setIndex as number,
      scope: entry.scope,
    });
    concepts.set(entry.question.conceptId, conceptEntries);
  }
  for (const [conceptId, conceptEntries] of concepts) {
    conceptEntries.sort((left, right) => left.setIndex - right.setIndex);
    for (let leftIndex = 0; leftIndex < conceptEntries.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < conceptEntries.length;
        rightIndex += 1
      ) {
        const left = conceptEntries[leftIndex];
        const right = conceptEntries[rightIndex];
        const spacing = right.setIndex - left.setIndex;
        if (spacing >= 30) break;
        if (left.path !== right.path) {
          issue(
            issues,
            "concept-spacing",
            "warning",
            right.scope,
            `Concept ${conceptId} repeats fewer than 30 set indexes apart across packs.`,
            { expected: ">=30", actual: spacing },
          );
        }
      }
    }
  }
}

export function validateContentPack(
  pack: unknown,
  descriptor: ContentPackDescriptor,
): ContentValidationReport {
  const issues: ContentPackValidationIssue[] = [];
  const questions = addPackSchemaIssues(pack, descriptor, issues);
  const setCount = addRangeAndBalanceIssues(questions, descriptor, issues);
  addQuestionQualityIssues(questions, issues);
  return { packCount: 1, questionCount: questions.length, setCount, issues };
}

export function validateContentLibrary(
  manifest: ContentManifest,
  packs: readonly ContentLibraryPack[],
): ContentValidationReport {
  const issues: ContentPackValidationIssue[] = [];
  const descriptors: ContentPackDescriptor[] = [
    ...manifest.corePacks,
    ...manifest.bonusPacks,
  ];
  const filesByPath = new Map(
    packs.map((file) => [file.path.replace(/\\/g, "/"), file]),
  );
  let questionCount = 0;
  let setCount = 0;

  for (const descriptor of descriptors) {
    const file = filesByPath.get(descriptor.path.replace(/\\/g, "/"));
    if (file == null) {
      issue(
        issues,
        "schema",
        "error",
        `pack:${descriptor.id}`,
        `Manifest pack file is missing: ${descriptor.path}.`,
      );
      continue;
    }
    const report = validateContentPack(file.pack, descriptor);
    issues.push(...report.issues);
    questionCount += report.questionCount;
    setCount += report.setCount;
    if (
      !SHA256_PATTERN.test(descriptor.sha256) ||
      file.sha256 !== descriptor.sha256
    ) {
      issue(
        issues,
        "checksum",
        "error",
        `pack:${descriptor.id}`,
        "Raw-file SHA-256 does not match the descriptor.",
        { expected: descriptor.sha256, actual: file.sha256 },
      );
    }
  }
  addCrossPackQualityIssues(packs, issues);
  return { packCount: descriptors.length, questionCount, setCount, issues };
}
