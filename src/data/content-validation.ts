import {
  type BonusQuestion,
  type BonusTopic,
  type CoreLens,
  type CoreQuestion,
  type Question,
  validateQuestion,
} from "../domain/question";

const DAY_MS = 24 * 60 * 60 * 1000;
const RELEASE_START_UTC = Date.UTC(2026, 6, 28);

export const RELEASE_DATE_KEYS = Array.from({ length: 30 }, (_, index) =>
  new Date(RELEASE_START_UTC + index * DAY_MS).toISOString().slice(0, 10),
);
export const RELEASE_CORE_LENSES = [
  "then",
  "now",
  "life",
] as const satisfies readonly CoreLens[];
export const RELEASE_BONUS_TOPICS = [
  "nostalgia",
  "korean-life",
  "language",
  "digital",
  "safety",
  "nature-general",
] as const satisfies readonly BonusTopic[];

export type ContentValidationCode =
  | "question-schema"
  | "duplicate-id"
  | "duplicate-prompt"
  | "core-count"
  | "core-date-range"
  | "core-date-lens-count"
  | "bonus-count"
  | "bonus-topic-count"
  | "answer-balance";

export interface ContentValidationIssue {
  code: ContentValidationCode;
  scope: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
}

export interface ContentValidationReport {
  coreCount: number;
  bonusCount: number;
  issues: ContentValidationIssue[];
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function addDuplicateIssues(
  questions: readonly Question[],
  issues: ContentValidationIssue[],
): void {
  const ids = new Map<string, string>();
  const prompts = new Map<string, string>();

  for (const question of questions) {
    const priorId = ids.get(question.id);
    if (priorId != null) {
      issues.push({
        code: "duplicate-id",
        scope: `question:${question.id}`,
        message: `문제 ID가 ${priorId}와 중복됩니다.`,
      });
    } else {
      ids.set(question.id, question.id);
    }

    const normalized = normalizePrompt(question.prompt);
    const priorPromptId = prompts.get(normalized);
    if (priorPromptId != null) {
      issues.push({
        code: "duplicate-prompt",
        scope: `question:${question.id}`,
        message: `질문 문장이 ${priorPromptId}와 중복됩니다.`,
      });
    } else {
      prompts.set(normalized, question.id);
    }
  }
}

function addAnswerBalanceIssue(
  scope: "core" | "bonus",
  questions: readonly Question[],
  issues: ContentValidationIssue[],
): void {
  const counts = [0, 1, 2].map(
    (answerIndex) =>
      questions.filter((question) => question.answerIndex === answerIndex)
        .length,
  );
  const spread = Math.max(...counts) - Math.min(...counts);

  if (spread > 2) {
    issues.push({
      code: "answer-balance",
      scope,
      message: "정답 위치의 최대-최소 개수 차이가 2를 초과합니다.",
      expected: "<=2",
      actual: `${counts[0]},${counts[1]},${counts[2]}`,
    });
  }
}

export function validateBundledContent(
  core: readonly CoreQuestion[],
  bonus: readonly BonusQuestion[],
): ContentValidationReport {
  const issues: ContentValidationIssue[] = [];
  const allQuestions: readonly Question[] = [...core, ...bonus];

  for (const [index, question] of allQuestions.entries()) {
    for (const field of validateQuestion(question)) {
      issues.push({
        code: "question-schema",
        scope: `question:${question.id || index}`,
        message: `필수 필드가 유효하지 않습니다: ${field}`,
      });
    }
  }

  if (core.length !== 90) {
    issues.push({
      code: "core-count",
      scope: "core",
      message: "핵심 문제 수가 출시 계약과 일치하지 않습니다.",
      expected: 90,
      actual: core.length,
    });
  }
  if (bonus.length !== 90) {
    issues.push({
      code: "bonus-count",
      scope: "bonus",
      message: "보너스 문제 수가 출시 계약과 일치하지 않습니다.",
      expected: 90,
      actual: bonus.length,
    });
  }

  const releaseDateSet = new Set(RELEASE_DATE_KEYS);
  for (const question of core) {
    if (!releaseDateSet.has(question.dateKey)) {
      issues.push({
        code: "core-date-range",
        scope: `question:${question.id}`,
        message: "핵심 문제 날짜가 출시 30일 범위 밖입니다.",
        expected: `${RELEASE_DATE_KEYS[0]}..${RELEASE_DATE_KEYS.at(-1)}`,
        actual: question.dateKey,
      });
    }
  }

  for (const dateKey of RELEASE_DATE_KEYS) {
    for (const lens of RELEASE_CORE_LENSES) {
      const count = core.filter(
        (question) => question.dateKey === dateKey && question.lens === lens,
      ).length;
      if (count !== 1) {
        issues.push({
          code: "core-date-lens-count",
          scope: `core:${dateKey}:${lens}`,
          message: "날짜·렌즈 조합은 정확히 한 문제여야 합니다.",
          expected: 1,
          actual: count,
        });
      }
    }
  }

  for (const topic of RELEASE_BONUS_TOPICS) {
    const count = bonus.filter((question) => question.topic === topic).length;
    if (count !== 15) {
      issues.push({
        code: "bonus-topic-count",
        scope: `bonus:${topic}`,
        message: "보너스 주제는 정확히 15문제여야 합니다.",
        expected: 15,
        actual: count,
      });
    }
  }

  addDuplicateIssues(allQuestions, issues);
  addAnswerBalanceIssue("core", core, issues);
  addAnswerBalanceIssue("bonus", bonus, issues);

  return { coreCount: core.length, bonusCount: bonus.length, issues };
}
