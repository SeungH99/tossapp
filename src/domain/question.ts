export type CoreLens = "then" | "now" | "life";

export type BonusTopic =
  | "nostalgia"
  | "korean-life"
  | "language"
  | "digital"
  | "safety"
  | "nature-general";

export type InternalDifficulty = "gentle" | "steady" | "stretch";

export type ReviewStatus = "draft" | "fact-checked" | "reviewed";

export interface QuestionSource {
  name: string;
  url: string;
}

interface QuestionBase {
  id: string;
  lens: CoreLens;
  topic: BonusTopic;
  prompt: string;
  choices: [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  source: QuestionSource;
  contentVersion: string;
  reviewStatus: ReviewStatus;
  reviewedAt: string;
  validThrough?: string;
}

export interface CoreQuestion extends QuestionBase {
  kind: "core";
  dateKey: string;
  internalDifficulty: InternalDifficulty;
}

export interface BonusQuestion extends QuestionBase {
  kind: "bonus";
  conceptId: string;
  variant: string;
  internalDifficulty: InternalDifficulty;
  setIndex: number;
}

export type Question = CoreQuestion | BonusQuestion;

export type CoreQuestionInput = Omit<
  CoreQuestion,
  | "kind"
  | "internalDifficulty"
  | "contentVersion"
  | "reviewStatus"
  | "reviewedAt"
> &
  Partial<
    Pick<
      CoreQuestion,
      "internalDifficulty" | "contentVersion" | "reviewStatus" | "reviewedAt"
    >
  >;

export type BonusQuestionInput = Omit<
  BonusQuestion,
  | "kind"
  | "conceptId"
  | "variant"
  | "internalDifficulty"
  | "setIndex"
  | "contentVersion"
  | "reviewStatus"
  | "reviewedAt"
> &
  Partial<
    Pick<
      BonusQuestion,
      | "conceptId"
      | "variant"
      | "internalDifficulty"
      | "setIndex"
      | "contentVersion"
      | "reviewStatus"
      | "reviewedAt"
    >
  >;

export function createCoreQuestion(input: CoreQuestionInput): CoreQuestion {
  return {
    ...input,
    kind: "core",
    internalDifficulty: input.internalDifficulty ?? "steady",
    contentVersion: input.contentVersion ?? "legacy",
    reviewStatus: input.reviewStatus ?? "reviewed",
    reviewedAt: input.reviewedAt ?? "2026-08-04",
  };
}

export function createBonusQuestion(input: BonusQuestionInput): BonusQuestion {
  return {
    ...input,
    kind: "bonus",
    conceptId: input.conceptId ?? input.id,
    variant: input.variant ?? "base",
    internalDifficulty: input.internalDifficulty ?? "steady",
    setIndex: input.setIndex ?? 0,
    contentVersion: input.contentVersion ?? "legacy",
    reviewStatus: input.reviewStatus ?? "reviewed",
    reviewedAt: input.reviewedAt ?? "2026-08-04",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasQuestionChoices(value: unknown): value is [string, string, string] {
  return (
    Array.isArray(value) && value.length === 3 && value.every(isNonEmptyString)
  );
}

export function validateQuestion(value: unknown): string[] {
  if (!isRecord(value)) {
    return ["question"];
  }

  const errors: string[] = [];

  if (value.kind !== "core" && value.kind !== "bonus") {
    errors.push("question.kind");
  }
  if (!isNonEmptyString(value.id)) {
    errors.push("question.id");
  }
  if (!["then", "now", "life"].includes(String(value.lens))) {
    errors.push("question.lens");
  }
  if (
    ![
      "nostalgia",
      "korean-life",
      "language",
      "digital",
      "safety",
      "nature-general",
    ].includes(String(value.topic))
  ) {
    errors.push("question.topic");
  }
  if (!isNonEmptyString(value.prompt)) {
    errors.push("question.prompt");
  }
  if (!hasQuestionChoices(value.choices)) {
    errors.push("question.choices");
  }
  if (
    typeof value.answerIndex !== "number" ||
    ![0, 1, 2].includes(value.answerIndex)
  ) {
    errors.push("question.answerIndex");
  }
  if (!isNonEmptyString(value.explanation)) {
    errors.push("question.explanation");
  }
  if (!isNonEmptyString(value.contentVersion)) {
    errors.push("question.contentVersion");
  }
  if (value.reviewStatus !== "reviewed") {
    errors.push("question.reviewStatus");
  }
  if (
    !isNonEmptyString(value.reviewedAt) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.reviewedAt)
  ) {
    errors.push("question.reviewedAt");
  }
  if (
    value.validThrough !== undefined &&
    (!isNonEmptyString(value.validThrough) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.validThrough))
  ) {
    errors.push("question.validThrough");
  }

  if (!isRecord(value.source)) {
    errors.push("question.source");
  } else {
    if (!isNonEmptyString(value.source.name)) {
      errors.push("question.source.name");
    }
    if (
      !isNonEmptyString(value.source.url) ||
      !value.source.url.startsWith("https://")
    ) {
      errors.push("question.source.url");
    }
  }

  if (value.kind === "core") {
    if (!isNonEmptyString(value.dateKey)) {
      errors.push("core.dateKey");
    }
    if (
      !["gentle", "steady", "stretch"].includes(
        String(value.internalDifficulty),
      )
    ) {
      errors.push("core.internalDifficulty");
    }
  }

  if (value.kind === "bonus") {
    if (!isNonEmptyString(value.conceptId)) {
      errors.push("bonus.conceptId");
    }
    if (!isNonEmptyString(value.variant)) {
      errors.push("bonus.variant");
    }
    if (
      !["gentle", "steady", "stretch"].includes(
        String(value.internalDifficulty),
      )
    ) {
      errors.push("bonus.internalDifficulty");
    }
    if (
      typeof value.setIndex !== "number" ||
      !Number.isInteger(value.setIndex) ||
      value.setIndex < 0
    ) {
      errors.push("bonus.setIndex");
    }
  }

  return errors;
}
