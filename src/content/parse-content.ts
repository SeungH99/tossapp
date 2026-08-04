import {
  validateQuestion,
  type BonusQuestion,
  type CoreQuestion,
} from "../domain/question";
import type { BonusContentPack, CoreContentPack } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePack(
  value: unknown,
  kind: "core" | "bonus",
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${kind} pack must be an object`);
  }
  if (value.kind !== kind) {
    throw new Error(`${kind}.kind`);
  }
  for (const field of ["id", "contentVersion"] as const) {
    if (!isNonEmptyString(value[field])) {
      throw new Error(`${kind}.${field}`);
    }
  }
  if (value.reviewStatus !== "reviewed") {
    throw new Error(`${kind}.reviewStatus`);
  }
  if (!Array.isArray(value.questions)) {
    throw new Error(`${kind}.questions`);
  }
  return value;
}

function parseQuestions<TQuestion>(
  questions: unknown[],
  kind: "core" | "bonus",
): TQuestion[] {
  return questions.map((question, index) => {
    const errors = validateQuestion(question);
    if (errors.length > 0) {
      throw new Error(`${kind}.questions[${index}].${errors[0]}`);
    }
    if (!isRecord(question) || question.kind !== kind) {
      throw new Error(`${kind}.questions[${index}].question.kind`);
    }
    return question as TQuestion;
  });
}

export function parseCorePack(value: unknown): CoreContentPack {
  const pack = parsePack(value, "core");
  return {
    id: pack.id as string,
    kind: "core",
    contentVersion: pack.contentVersion as string,
    reviewStatus: "reviewed",
    questions: parseQuestions<CoreQuestion>(
      pack.questions as unknown[],
      "core",
    ),
  };
}

export function parseBonusPack(value: unknown): BonusContentPack {
  const pack = parsePack(value, "bonus");
  return {
    id: pack.id as string,
    kind: "bonus",
    contentVersion: pack.contentVersion as string,
    reviewStatus: "reviewed",
    questions: parseQuestions<BonusQuestion>(
      pack.questions as unknown[],
      "bonus",
    ),
  };
}
