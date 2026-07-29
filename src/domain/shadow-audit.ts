import type { TimeConfidence } from "./time-confidence";

export const SHADOW_AUDIT_LIMIT = 100;

export const SHADOW_REASON_CODES = [
  "consecutive-wrong",
  "low-accuracy",
  "high-accuracy",
  "insufficient-history",
  "mixed-accuracy",
  "low-confidence",
  "outside-pilot",
  "insufficient-catalog",
] as const;

export type ShadowReasonCode = (typeof SHADOW_REASON_CODES)[number];

export interface ShadowAudit {
  legacyQuestionIds: string[];
  shadowQuestionIds: string[];
  policyVersion: string;
  reasonCode: ShadowReasonCode;
}

export interface CreateShadowAuditInput {
  legacyQuestionIds: readonly string[];
  shadowQuestionIds: readonly string[];
  policyVersion: string;
  reasonCode: ShadowReasonCode;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((candidate) => typeof candidate === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

export function isShadowReasonCode(value: unknown): value is ShadowReasonCode {
  return (
    typeof value === "string" &&
    (SHADOW_REASON_CODES as readonly string[]).includes(value)
  );
}

export function isShadowAudit(value: unknown): value is ShadowAudit {
  if (!isRecord(value)) {
    return false;
  }

  const keys = Object.keys(value).sort();
  return (
    keys.length === 4 &&
    keys[0] === "legacyQuestionIds" &&
    keys[1] === "policyVersion" &&
    keys[2] === "reasonCode" &&
    keys[3] === "shadowQuestionIds" &&
    isStringArray(value.legacyQuestionIds) &&
    isStringArray(value.shadowQuestionIds) &&
    typeof value.policyVersion === "string" &&
    value.policyVersion.trim().length > 0 &&
    isShadowReasonCode(value.reasonCode)
  );
}

export function createShadowAudit(input: CreateShadowAuditInput): ShadowAudit {
  return {
    legacyQuestionIds: [...input.legacyQuestionIds],
    shadowQuestionIds: [...input.shadowQuestionIds],
    policyVersion: input.policyVersion,
    reasonCode: input.reasonCode,
  };
}

export function appendShadowAudit(
  audits: readonly ShadowAudit[],
  audit: ShadowAudit,
  timeConfidence: TimeConfidence,
): ShadowAudit[] {
  const retained = audits.map(createShadowAudit).slice(-SHADOW_AUDIT_LIMIT);
  if (timeConfidence === "lowConfidence") {
    return retained;
  }

  return [...retained, createShadowAudit(audit)].slice(-SHADOW_AUDIT_LIMIT);
}

export function exportShadowAuditJson(
  environment: string,
  audits: readonly ShadowAudit[],
): string | null {
  if (environment !== "development") {
    return null;
  }

  return JSON.stringify(audits.map(createShadowAudit));
}
