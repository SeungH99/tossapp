export type CoreLens = "then" | "now" | "life";

export type BonusTopic =
  | "nostalgia"
  | "korean-life"
  | "language"
  | "digital"
  | "safety"
  | "nature-general";

export type InternalDifficulty = "gentle" | "steady" | "stretch";

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
}

export interface CoreQuestion extends QuestionBase {
  kind: "core";
  dateKey: string;
}

export interface BonusQuestion extends QuestionBase {
  kind: "bonus";
  conceptId: string;
  variant: string;
  internalDifficulty: InternalDifficulty;
}

export type Question = CoreQuestion | BonusQuestion;

export type CoreQuestionInput = Omit<CoreQuestion, "kind">;

export type BonusQuestionInput = Omit<
  BonusQuestion,
  "kind" | "conceptId" | "variant" | "internalDifficulty"
> &
  Partial<
    Pick<
      BonusQuestion,
      "conceptId" | "variant" | "internalDifficulty"
    >
  >;

export function createCoreQuestion(
  input: CoreQuestionInput,
): CoreQuestion {
  return { ...input, kind: "core" };
}

export function createBonusQuestion(
  input: BonusQuestionInput,
): BonusQuestion {
  return {
    ...input,
    kind: "bonus",
    conceptId: input.conceptId ?? input.id,
    variant: input.variant ?? "base",
    internalDifficulty: input.internalDifficulty ?? "steady",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasQuestionChoices(
  value: unknown,
): value is [string, string, string] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(isNonEmptyString)
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

  if (value.kind === "core" && !isNonEmptyString(value.dateKey)) {
    errors.push("core.dateKey");
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
  }

  return errors;
}
