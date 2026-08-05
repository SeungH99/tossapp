import { validateQuestion } from "../domain/question";
import type {
  BonusTopicReleaseContract,
  ContentManifest,
  ContentPackDescriptor,
  ContentReleaseContract,
} from "../content/types";
import type { BonusTopic } from "../domain/question";

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
  | "duplicate-concept"
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

export function validateManifestContentVersion(
  value: unknown,
): ContentPackValidationIssue[] {
  if (typeof value === "string" && value.trim().length > 0) return [];
  return [
    {
      code: "schema",
      severity: "error",
      scope: "manifest:contentVersion",
      message: "Manifest contentVersion must be a non-empty string.",
      expected: "non-empty string",
      actual: String(value),
    },
  ];
}

export type ContentLibraryValidationScope =
  "full" | "core" | `bonus:${BonusTopic}`;

interface QuestionCandidate {
  id?: unknown;
  kind?: unknown;
  lens?: unknown;
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
const CORE_LENSES = ["then", "now", "life"] as const;
const BONUS_TOPICS = [
  "nostalgia",
  "korean-life",
  "language",
  "digital",
  "safety",
  "nature-general",
] as const satisfies readonly BonusTopic[];
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STDICT_SEARCH_HOST = "stdict.korean.go.kr";
const STDICT_SEARCH_PATH = "/search/searchResult.do";
const RELEASE_START_UTC = Date.UTC(2026, 6, 28);
const DAY_MS = 24 * 60 * 60 * 1000;
const RELEASE_DATE_KEYS = Array.from({ length: 180 }, (_, index) =>
  new Date(RELEASE_START_UTC + index * DAY_MS).toISOString().slice(0, 10),
);
const LEGACY_BONUS_TOPIC_LABELS: Record<BonusTopic, string> = {
  nostalgia: "추억·대중문화",
  "korean-life": "한국 생활사",
  language: "말·속담·맞춤법",
  digital: "디지털 생활",
  safety: "생활안전",
  "nature-general": "자연·일반상식",
};
const LEGACY_RELEASE_CONTRACT: ContentReleaseContract = {
  core: { packCount: 6, questionCount: 540 },
  bonusTopics: BONUS_TOPICS.map((topic, order) => ({
    topic,
    label: LEGACY_BONUS_TOPIC_LABELS[topic],
    order,
    packCount: 6,
    setCount: 180,
    questionCount: 540,
  })),
};

function isUnsupportedStdictSearchListing(value: string): boolean {
  try {
    const url = new URL(value);
    if (
      url.hostname !== STDICT_SEARCH_HOST ||
      url.pathname !== STDICT_SEARCH_PATH
    ) {
      return false;
    }

    const keyword = url.searchParams.get("searchKeyword")?.normalize("NFKC");
    return (
      keyword === "통째로" ||
      keyword?.startsWith("-") === true ||
      /\s/u.test(keyword ?? "")
    );
  } catch {
    return false;
  }
}

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
  manifestContentVersion?: string,
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
    manifestContentVersion !== undefined &&
    candidate.contentVersion !== manifestContentVersion
  ) {
    issue(
      issues,
      "schema",
      "error",
      `pack:${descriptor.id}:contentVersion`,
      "Pack contentVersion must match the manifest.",
      {
        expected: manifestContentVersion,
        actual: String(candidate.contentVersion),
      },
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
      isUnsupportedStdictSearchListing(value.source.url)
    ) {
      issue(
        issues,
        "source-review",
        "error",
        questionScope(value, index),
        "Question requires reviewed metadata and a direct, supported HTTPS source.",
      );
    }
    const expectedQuestionVersion =
      manifestContentVersion ?? candidate.contentVersion;
    if (value.contentVersion !== expectedQuestionVersion) {
      issue(
        issues,
        "schema",
        "error",
        `${questionScope(value, index)}:contentVersion`,
        "Question contentVersion must match the manifest and pack.",
        {
          expected: String(expectedQuestionVersion),
          actual: String(value.contentVersion),
        },
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

  const concepts = new Map<string, string>();
  for (const [index, question] of questions.entries()) {
    if (typeof question.conceptId !== "string") {
      continue;
    }
    const normalizedConceptId = question.conceptId.trim().toLowerCase();
    const scope = questionScope(question, index);
    const firstScope = concepts.get(normalizedConceptId);
    if (firstScope !== undefined) {
      issue(
        issues,
        "duplicate-concept",
        "error",
        scope,
        `Concept ${question.conceptId} repeats ${firstScope}.`,
      );
    } else {
      concepts.set(normalizedConceptId, scope);
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

  const entriesByTrigram = new Map<string, number[]>();
  for (const [entryIndex, entry] of entries.entries()) {
    for (const trigram of entry.trigrams ?? []) {
      const indexes = entriesByTrigram.get(trigram) ?? [];
      indexes.push(entryIndex);
      entriesByTrigram.set(trigram, indexes);
    }
  }
  const intersections = new Map<number, number>();
  for (const indexes of entriesByTrigram.values()) {
    for (let leftOffset = 0; leftOffset < indexes.length; leftOffset += 1) {
      for (
        let rightOffset = leftOffset + 1;
        rightOffset < indexes.length;
        rightOffset += 1
      ) {
        const leftIndex = indexes[leftOffset];
        const rightIndex = indexes[rightOffset];
        if (entries[leftIndex].path === entries[rightIndex].path) continue;
        const key = leftIndex * entries.length + rightIndex;
        intersections.set(key, (intersections.get(key) ?? 0) + 1);
      }
    }
  }
  for (const [key, intersection] of intersections) {
    const leftIndex = Math.floor(key / entries.length);
    const rightIndex = key % entries.length;
    const left = entries[leftIndex];
    const right = entries[rightIndex];
    if (
      left.normalizedPrompt === undefined ||
      right.normalizedPrompt === undefined ||
      left.normalizedPrompt === right.normalizedPrompt ||
      left.trigrams === undefined ||
      right.trigrams === undefined
    ) {
      continue;
    }
    const similarity =
      intersection / (left.trigrams.size + right.trigrams.size - intersection);
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

  const concepts = new Map<string, { path: string; scope: string }>();
  for (const entry of entries) {
    if (typeof entry.question.conceptId !== "string") {
      continue;
    }
    const normalizedConceptId = entry.question.conceptId.trim().toLowerCase();
    const first = concepts.get(normalizedConceptId);
    if (first !== undefined && first.path !== entry.path) {
      issue(
        issues,
        "duplicate-concept",
        "error",
        entry.scope,
        `Concept ${entry.question.conceptId} repeats ${first.scope} in ${first.path}.`,
      );
    } else if (first === undefined) {
      concepts.set(normalizedConceptId, {
        path: entry.path,
        scope: entry.scope,
      });
    }
  }
}

export function validateContentPack(
  pack: unknown,
  descriptor: ContentPackDescriptor,
  manifestContentVersion?: string,
): ContentValidationReport {
  const issues: ContentPackValidationIssue[] = [];
  const questions = addPackSchemaIssues(
    pack,
    descriptor,
    issues,
    manifestContentVersion,
  );
  const setCount = addRangeAndBalanceIssues(questions, descriptor, issues);
  addQuestionQualityIssues(questions, issues);
  return { packCount: 1, questionCount: questions.length, setCount, issues };
}

function descriptorsForScope(
  manifest: ContentManifest,
  scope: ContentLibraryValidationScope,
): ContentPackDescriptor[] {
  if (scope === "core") return manifest.corePacks;
  if (scope.startsWith("bonus:")) {
    const topic = scope.slice("bonus:".length);
    return manifest.bonusPacks.filter(
      (descriptor) => descriptor.topic === topic,
    );
  }
  return [...manifest.corePacks, ...manifest.bonusPacks];
}

function scopeLabel(scope: ContentLibraryValidationScope): string {
  return scope === "full" ? "library" : `library:${scope}`;
}

function addCountIssue(
  issues: ContentPackValidationIssue[],
  scope: string,
  expected: number,
  actual: number,
  message: string,
): void {
  if (actual !== expected) {
    issue(issues, "count", "error", scope, message, { expected, actual });
  }
}

function rangesOverlap(
  leftStart: string | number,
  leftEnd: string | number,
  rightStart: string | number,
  rightEnd: string | number,
): boolean {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function addDescriptorOverlapIssues(
  descriptors: readonly ContentPackDescriptor[],
  issues: ContentPackValidationIssue[],
): void {
  for (let leftIndex = 0; leftIndex < descriptors.length; leftIndex += 1) {
    const left = descriptors[leftIndex];
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < descriptors.length;
      rightIndex += 1
    ) {
      const right = descriptors[rightIndex];
      if (
        left.kind === "core" &&
        right.kind === "core" &&
        rangesOverlap(
          left.dateStart,
          left.dateEnd,
          right.dateStart,
          right.dateEnd,
        )
      ) {
        issue(
          issues,
          "date-range",
          "error",
          `descriptor:${left.id}~${right.id}`,
          "Core descriptor date ranges overlap.",
        );
      }
      if (
        left.kind === "bonus" &&
        right.kind === "bonus" &&
        left.topic === right.topic &&
        rangesOverlap(left.setStart, left.setEnd, right.setStart, right.setEnd)
      ) {
        issue(
          issues,
          "set-range",
          "error",
          `descriptor:${left.id}~${right.id}`,
          "Bonus descriptor set ranges overlap.",
        );
      }
    }
  }
}

function summarizeCoverage(
  missing: readonly string[],
  invalid: readonly string[],
  extra: readonly string[],
): string {
  const summarize = (values: readonly string[]) =>
    values.length === 0
      ? "none"
      : `${values.length}[${values.slice(0, 5).join(",")}${values.length > 5 ? ",..." : ""}]`;
  return `missing=${summarize(missing)};invalid=${summarize(invalid)};extra=${summarize(extra)}`;
}

function addCoreCoverageIssues(
  files: readonly ContentLibraryPack[],
  issues: ContentPackValidationIssue[],
): void {
  const questions = files
    .flatMap(({ pack }) => questionsFrom(pack))
    .filter((question) => question.kind === "core");
  const expectedDates = new Set(RELEASE_DATE_KEYS);
  const byDate = new Map<string, QuestionCandidate[]>();
  for (const question of questions) {
    if (typeof question.dateKey !== "string") continue;
    const group = byDate.get(question.dateKey) ?? [];
    group.push(question);
    byDate.set(question.dateKey, group);
  }
  const missing: string[] = [];
  const invalid: string[] = [];
  for (const dateKey of RELEASE_DATE_KEYS) {
    const group = byDate.get(dateKey) ?? [];
    if (group.length === 0) {
      missing.push(dateKey);
      continue;
    }
    const difficultyCounts = DIFFICULTIES.map(
      (difficulty) =>
        group.filter(
          ({ internalDifficulty }) => internalDifficulty === difficulty,
        ).length,
    );
    const lensCounts = CORE_LENSES.map(
      (lens) => group.filter((question) => question.lens === lens).length,
    );
    if (
      group.length !== 3 ||
      difficultyCounts.some((count) => count !== 1) ||
      lensCounts.some((count) => count !== 1)
    ) {
      invalid.push(dateKey);
    }
  }
  const extra = [...byDate.keys()]
    .filter((date) => !expectedDates.has(date))
    .sort();
  if (missing.length > 0 || invalid.length > 0 || extra.length > 0) {
    issue(
      issues,
      "date-range",
      "error",
      "core:coverage",
      "Core coverage must contain exactly three unique questions per release date.",
      {
        expected: "2026-07-28..2027-01-23 x3",
        actual: summarizeCoverage(missing, invalid, extra),
      },
    );
  }
}

function addBonusCoverageIssues(
  files: readonly ContentLibraryPack[],
  contracts: readonly BonusTopicReleaseContract[],
  issues: ContentPackValidationIssue[],
): void {
  const questions = files
    .flatMap(({ pack }) => questionsFrom(pack))
    .filter((question) => question.kind === "bonus");
  for (const { topic, setCount } of contracts) {
    const bySet = new Map<number, QuestionCandidate[]>();
    for (const question of questions) {
      if (question.topic !== topic || !Number.isInteger(question.setIndex))
        continue;
      const setIndex = question.setIndex as number;
      const group = bySet.get(setIndex) ?? [];
      group.push(question);
      bySet.set(setIndex, group);
    }
    const missing: string[] = [];
    const invalid: string[] = [];
    for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
      const group = bySet.get(setIndex) ?? [];
      if (group.length === 0) {
        missing.push(String(setIndex));
        continue;
      }
      const counts = DIFFICULTIES.map(
        (difficulty) =>
          group.filter(
            ({ internalDifficulty }) => internalDifficulty === difficulty,
          ).length,
      );
      if (group.length !== 3 || counts.some((count) => count !== 1)) {
        invalid.push(String(setIndex));
      }
    }
    const extra = [...bySet.keys()]
      .filter((setIndex) => setIndex < 0 || setIndex >= setCount)
      .sort((left, right) => left - right)
      .map(String);
    if (missing.length > 0 || invalid.length > 0 || extra.length > 0) {
      issue(
        issues,
        "set-range",
        "error",
        `bonus:${topic}:coverage`,
        "Bonus coverage must contain exactly three unique questions per set index.",
        {
          expected: `0..${setCount - 1} x3`,
          actual: summarizeCoverage(missing, invalid, extra),
        },
      );
    }
  }
}

function addSegmentCountIssues(
  manifest: ContentManifest,
  files: readonly ContentLibraryPack[],
  scope: ContentLibraryValidationScope,
  contract: ContentReleaseContract,
  issues: ContentPackValidationIssue[],
): void {
  if (scope !== "full") return;
  {
    const corePaths = new Set(
      manifest.corePacks.map(({ path }) => path.replace(/\\/g, "/")),
    );
    const coreQuestions = files
      .filter(({ path }) => corePaths.has(path.replace(/\\/g, "/")))
      .reduce((count, file) => count + questionsFrom(file.pack).length, 0);
    addCountIssue(
      issues,
      "library:core:descriptors",
      contract.core.packCount,
      manifest.corePacks.length,
      "Core descriptor count must match the release contract.",
    );
    addCountIssue(
      issues,
      "library:core:questions",
      contract.core.questionCount,
      coreQuestions,
      "Core question count must match the release contract.",
    );
  }
  for (const topicContract of contract.bonusTopics) {
    const { topic } = topicContract;
    const descriptors = manifest.bonusPacks.filter(
      (descriptor) => descriptor.topic === topic,
    );
    const paths = new Set(
      descriptors.map(({ path }) => path.replace(/\\/g, "/")),
    );
    const questionCount = files
      .filter(({ path }) => paths.has(path.replace(/\\/g, "/")))
      .reduce((count, file) => count + questionsFrom(file.pack).length, 0);
    addCountIssue(
      issues,
      `library:bonus:${topic}:descriptors`,
      topicContract.packCount,
      descriptors.length,
      `Bonus topic ${topic} descriptor count must match the release contract.`,
    );
    addCountIssue(
      issues,
      `library:bonus:${topic}:questions`,
      topicContract.questionCount,
      questionCount,
      `Bonus topic ${topic} question count must match the release contract.`,
    );
  }
}

function addReleaseContractIssues(
  manifest: ContentManifest,
  issues: ContentPackValidationIssue[],
): void {
  const contract = manifest.releaseContract;
  if (contract == null) return;

  const countFields = ["packCount", "questionCount"] as const;
  for (const field of countFields) {
    const count = contract.core[field];
    if (!Number.isInteger(count) || count < 0) {
      issue(
        issues,
        "count",
        "error",
        `release-contract:core:${field}`,
        "Release counts must be non-negative integers.",
        { expected: "non-negative integer", actual: count },
      );
    }
  }
  const coreDescriptorQuestionCount = manifest.corePacks.reduce(
    (sum, descriptor) => sum + descriptor.questionCount,
    0,
  );
  if (manifest.corePacks.length !== contract.core.packCount) {
    issue(
      issues,
      "count",
      "error",
      "release-contract:core:descriptors",
      "Core descriptor count must match the release contract.",
      { expected: contract.core.packCount, actual: manifest.corePacks.length },
    );
  }
  if (coreDescriptorQuestionCount !== contract.core.questionCount) {
    issue(
      issues,
      "count",
      "error",
      "release-contract:core:descriptor-questions",
      "Core descriptor question count must match the release contract.",
      { expected: contract.core.questionCount, actual: coreDescriptorQuestionCount },
    );
  }

  const orders = new Map<number, BonusTopic>();
  for (const topicContract of contract.bonusTopics) {
    const { topic, label, order } = topicContract;
    const scope = `release-contract:bonus:${topic}`;
    if (label.trim().length === 0) {
      issue(
        issues,
        "schema",
        "error",
        `${scope}:label`,
        "Bonus topic labels must be non-empty strings.",
        { expected: "non-empty string", actual: label },
      );
    }
    if (!Number.isInteger(order) || order < 0) {
      issue(
        issues,
        "schema",
        "error",
        `${scope}:order`,
        "Bonus topic order must be a non-negative integer.",
        { expected: "non-negative integer", actual: order },
      );
    } else {
      const priorTopic = orders.get(order);
      if (priorTopic != null) {
        issue(
          issues,
          "schema",
          "error",
          `${scope}:order`,
          `Bonus topic order duplicates ${priorTopic}.`,
          { expected: "unique order", actual: order },
        );
      } else {
        orders.set(order, topic);
      }
    }

    for (const field of ["packCount", "setCount", "questionCount"] as const) {
      const count = topicContract[field];
      if (!Number.isInteger(count) || count < 0) {
        issue(
          issues,
          "count",
          "error",
          `${scope}:${field}`,
          "Release counts must be non-negative integers.",
          { expected: "non-negative integer", actual: count },
        );
      }
    }

    const descriptors = manifest.bonusPacks.filter(
      (descriptor) => descriptor.topic === topic,
    );
    const descriptorQuestionCount = descriptors.reduce(
      (sum, descriptor) => sum + descriptor.questionCount,
      0,
    );
    const descriptorSetCount = descriptors.reduce(
      (sum, descriptor) =>
        sum + (descriptor.setCount ?? descriptor.setEnd - descriptor.setStart + 1),
      0,
    );
    if (descriptors.length !== topicContract.packCount) {
      issue(
        issues,
        "count",
        "error",
        `${scope}:descriptors`,
        "Bonus descriptor count must match the release contract.",
        { expected: topicContract.packCount, actual: descriptors.length },
      );
    }
    if (descriptorSetCount !== topicContract.setCount) {
      issue(
        issues,
        "count",
        "error",
        `${scope}:descriptor-sets`,
        "Bonus descriptor set count must match the release contract.",
        { expected: topicContract.setCount, actual: descriptorSetCount },
      );
    }
    if (descriptorQuestionCount !== topicContract.questionCount) {
      issue(
        issues,
        "count",
        "error",
        `${scope}:descriptor-questions`,
        "Bonus descriptor question count must match the release contract.",
        { expected: topicContract.questionCount, actual: descriptorQuestionCount },
      );
    }
  }
}

export function validateContentLibrary(
  manifest: ContentManifest,
  packs: readonly ContentLibraryPack[],
  scope: ContentLibraryValidationScope = "full",
): ContentValidationReport {
  const issues: ContentPackValidationIssue[] = [];
  const manifestVersionIssues = validateManifestContentVersion(
    manifest.contentVersion,
  );
  issues.push(...manifestVersionIssues);
  addReleaseContractIssues(manifest, issues);
  const manifestContentVersion =
    manifestVersionIssues.length === 0 ? manifest.contentVersion : undefined;
  const descriptors = descriptorsForScope(manifest, scope);
  const descriptorPaths = new Set(
    descriptors.map(({ path }) => path.replace(/\\/g, "/")),
  );
  const selectedPacks = packs.filter(({ path }) =>
    descriptorPaths.has(path.replace(/\\/g, "/")),
  );
  const filesByPath = new Map(
    selectedPacks.map((file) => [file.path.replace(/\\/g, "/"), file]),
  );
  let questionCount = 0;
  let setCount = 0;

  const contract = manifest.releaseContract ?? LEGACY_RELEASE_CONTRACT;
  const scopedBonusContract = scope.startsWith("bonus:")
    ? contract.bonusTopics.find(
        ({ topic }) => topic === scope.slice("bonus:".length),
      )
    : undefined;
  const expectedDescriptorCount =
    scope === "full"
      ? contract.core.packCount +
        contract.bonusTopics.reduce((sum, item) => sum + item.packCount, 0)
      : scope === "core"
        ? contract.core.packCount
        : (scopedBonusContract?.packCount ?? 0);
  const expectedQuestionCount =
    scope === "full"
      ? contract.core.questionCount +
        contract.bonusTopics.reduce((sum, item) => sum + item.questionCount, 0)
      : scope === "core"
        ? contract.core.questionCount
        : (scopedBonusContract?.questionCount ?? 0);
  const label = scopeLabel(scope);
  addCountIssue(
    issues,
    `${label}:descriptors`,
    expectedDescriptorCount,
    descriptors.length,
    "Library descriptor count does not match the release contract.",
  );
  addCountIssue(
    issues,
    `${label}:pack-files`,
    expectedDescriptorCount,
    filesByPath.size,
    "Library pack-file count does not match the release contract.",
  );
  if (
    manifest.releaseStart !== "2026-07-28" ||
    manifest.releaseEnd !== "2027-01-23"
  ) {
    issue(
      issues,
      "date-range",
      "error",
      "manifest:release",
      "Manifest release range must match the 180-day contract.",
      {
        expected: "2026-07-28..2027-01-23",
        actual: `${manifest.releaseStart}..${manifest.releaseEnd}`,
      },
    );
  }
  addSegmentCountIssues(manifest, selectedPacks, scope, contract, issues);
  addDescriptorOverlapIssues(descriptors, issues);

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
    const report = validateContentPack(
      file.pack,
      descriptor,
      manifestContentVersion,
    );
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
  addCountIssue(
    issues,
    `${label}:questions`,
    expectedQuestionCount,
    questionCount,
    "Library question count does not match the release contract.",
  );
  if (scope === "full" || scope === "core") {
    const corePaths = new Set(
      manifest.corePacks.map(({ path }) => path.replace(/\\/g, "/")),
    );
    addCoreCoverageIssues(
      selectedPacks.filter(({ path }) =>
        corePaths.has(path.replace(/\\/g, "/")),
      ),
      issues,
    );
  }
  const bonusContracts =
    scope === "full"
      ? contract.bonusTopics
      : scope.startsWith("bonus:")
        ? scopedBonusContract == null
          ? []
          : [scopedBonusContract]
        : [];
  addBonusCoverageIssues(selectedPacks, bonusContracts, issues);
  addCrossPackQualityIssues(selectedPacks, issues);
  return { packCount: descriptors.length, questionCount, setCount, issues };
}
