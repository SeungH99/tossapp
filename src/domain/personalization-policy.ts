import type { InternalDifficulty } from "./question";

export type PersonalizationFallback =
  | "adjacent-level"
  | "same-topic-unseen"
  | "default-selector";

export interface PersonalizationPolicy {
  version: string;
  minimumAnswersForDifficulty: number;
  recentAccuracyWindow: number;
  lowAccuracyThreshold: number;
  highAccuracyThreshold: number;
  consecutiveWrongThreshold: number;
  topicHistoryWindowDays: number;
  topicInterestWeight: number;
  topicDueWeight: number;
  topicRotationWeight: number;
  firstReviewIntervalDays: number;
  secondReviewIntervalDays: number;
  maintainedReviewIntervalDays: number;
  variantReuseCooldownDays: number;
  masteryCorrectReviews: number;
  masteryMinimumSeparationDays: number;
  neverSelectedAgeDays: number;
  fallbackOrder: readonly string[];
  tieBreakAlgorithmVersion: string;
  difficultyLevels: Record<InternalDifficulty, number>;
}

export const PERSONALIZATION_POLICY_V1: PersonalizationPolicy = {
  version: "personalization-v1",
  minimumAnswersForDifficulty: 2,
  recentAccuracyWindow: 8,
  lowAccuracyThreshold: 0.5,
  highAccuracyThreshold: 0.8,
  consecutiveWrongThreshold: 2,
  topicHistoryWindowDays: 14,
  topicInterestWeight: 0.45,
  topicDueWeight: 0.35,
  topicRotationWeight: 0.2,
  firstReviewIntervalDays: 3,
  secondReviewIntervalDays: 7,
  maintainedReviewIntervalDays: 30,
  variantReuseCooldownDays: 7,
  masteryCorrectReviews: 2,
  masteryMinimumSeparationDays: 3,
  neverSelectedAgeDays: 7,
  fallbackOrder: [
    "adjacent-level",
    "same-topic-unseen",
    "default-selector",
  ],
  tieBreakAlgorithmVersion: "catalog-order-v1",
  difficultyLevels: {
    gentle: 1,
    steady: 2,
    stretch: 3,
  },
};

const FALLBACKS: readonly PersonalizationFallback[] = [
  "adjacent-level",
  "same-topic-unseen",
  "default-selector",
];

function isPositiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isVersion(value: string): boolean {
  return value.trim().length > 0;
}

export function validatePersonalizationPolicy(
  policy: PersonalizationPolicy,
): string[] {
  const errors: string[] = [];
  if (!isVersion(policy.version)) {
    errors.push("version");
  }
  if (!isVersion(policy.tieBreakAlgorithmVersion)) {
    errors.push("tieBreakAlgorithmVersion");
  }

  const positiveIntegerFields: Array<keyof PersonalizationPolicy> = [
    "minimumAnswersForDifficulty",
    "recentAccuracyWindow",
    "consecutiveWrongThreshold",
    "topicHistoryWindowDays",
    "firstReviewIntervalDays",
    "secondReviewIntervalDays",
    "maintainedReviewIntervalDays",
    "variantReuseCooldownDays",
    "masteryCorrectReviews",
    "masteryMinimumSeparationDays",
    "neverSelectedAgeDays",
  ];
  for (const field of positiveIntegerFields) {
    if (!isPositiveInteger(policy[field] as number)) {
      errors.push(field);
    }
  }

  if (
    !Number.isFinite(policy.lowAccuracyThreshold) ||
    !Number.isFinite(policy.highAccuracyThreshold) ||
    policy.lowAccuracyThreshold < 0 ||
    policy.highAccuracyThreshold > 1 ||
    policy.lowAccuracyThreshold > policy.highAccuracyThreshold
  ) {
    errors.push("accuracyThresholds");
  }

  const weightSum =
    policy.topicInterestWeight +
    policy.topicDueWeight +
    policy.topicRotationWeight;
  if (
    !Number.isFinite(policy.topicInterestWeight) ||
    !Number.isFinite(policy.topicDueWeight) ||
    !Number.isFinite(policy.topicRotationWeight) ||
    Math.abs(weightSum - 1) > 1e-9
  ) {
    errors.push("topicWeights");
  }

  if (
    policy.difficultyLevels.gentle !== 1 ||
    policy.difficultyLevels.steady !== 2 ||
    policy.difficultyLevels.stretch !== 3
  ) {
    errors.push("difficultyLevels");
  }

  const seenFallbacks = new Set<string>();
  for (const fallback of policy.fallbackOrder) {
    if (!FALLBACKS.includes(fallback as PersonalizationFallback)) {
      errors.push("fallbackOrder.entry");
    }
    if (seenFallbacks.has(fallback)) {
      errors.push("fallbackOrder.duplicate");
    }
    seenFallbacks.add(fallback);
  }
  if (policy.fallbackOrder.length !== FALLBACKS.length) {
    errors.push("fallbackOrder");
  }

  return errors;
}
