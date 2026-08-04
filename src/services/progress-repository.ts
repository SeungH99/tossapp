import {
  createBonusEntitlement,
  type BonusEntitlement,
} from "../domain/bonus-entitlement";
import legacyQuestionMap from "../content/legacy-map.json";
import {
  applyAnswerCommand,
  grantBonusTicketCommand,
  startBonusSessionCommand,
  type AnswerCommand,
  type ApplyAnswerResult,
  type GrantBonusTicketResult,
  type StartBonusSessionResult,
} from "../domain/progress-commands";
import type {
  AnswerCheckpoint,
  AnswerEvent,
  BonusStartCommandRecord,
  ProgressState,
  ProgressStateV1,
  ProgressStateV2,
} from "../domain/progress-state";
import type { BonusQuestion, BonusTopic } from "../domain/question";
import type { QuizSession } from "../domain/quiz-session";
import {
  isShadowAudit,
  SHADOW_AUDIT_LIMIT,
  type ShadowAudit,
} from "../domain/shadow-audit";
import {
  createTimeObservation,
  observeTime as observeTimeState,
  type TimeObservation,
} from "../domain/time-confidence";

export type {
  AnswerCheckpoint,
  AnswerEvent,
  BonusTopicProgress,
  ProgressState,
  ProgressStateV1,
  ProgressStateV2,
} from "../domain/progress-state";

export interface LegacyQuestionTarget {
  topic: BonusTopic;
  setIndex: number;
}

export type LegacyQuestionMap = Record<string, LegacyQuestionTarget>;

const bundledLegacyQuestionMap = legacyQuestionMap as LegacyQuestionMap;

const BONUS_TOPICS = [
  "nostalgia",
  "korean-life",
  "language",
  "digital",
  "safety",
  "nature-general",
] as const satisfies readonly BonusTopic[];

function createEmptyBonusTopicProgress(): ProgressState["bonusTopicProgress"] {
  return {
    nostalgia: { completedSetIndexes: [] },
    "korean-life": { completedSetIndexes: [] },
    language: { completedSetIndexes: [] },
    digital: { completedSetIndexes: [] },
    safety: { completedSetIndexes: [] },
    "nature-general": { completedSetIndexes: [] },
  };
}

export function migrateV2ToV3(
  progress: ProgressStateV2,
  legacyMap: LegacyQuestionMap,
): ProgressState {
  const completedIds = new Set(progress.completedBonusIds);
  const mappedSets = new Map<
    string,
    { target: LegacyQuestionTarget; questionIds: string[] }
  >();

  for (const [questionId, target] of Object.entries(legacyMap)) {
    const key = `${target.topic}:${target.setIndex}`;
    const mappedSet = mappedSets.get(key) ?? { target, questionIds: [] };
    mappedSet.questionIds.push(questionId);
    mappedSets.set(key, mappedSet);
  }

  const bonusTopicProgress = createEmptyBonusTopicProgress();
  for (const { target, questionIds } of mappedSets.values()) {
    if (
      questionIds.length === 3 &&
      questionIds.every((questionId) => completedIds.has(questionId))
    ) {
      bonusTopicProgress[target.topic].completedSetIndexes.push(
        target.setIndex,
      );
    }
  }
  for (const topic of BONUS_TOPICS) {
    bonusTopicProgress[topic].completedSetIndexes.sort(
      (left, right) => left - right,
    );
  }

  return {
    ...progress,
    version: 3,
    bonusTopicProgress,
  };
}

export const progressStorageKeys = {
  legacy: "geuttae-yojeum:progress",
  v2SlotA: "geuttae-yojeum:progress:v2:a",
  v2SlotB: "geuttae-yojeum:progress:v2:b",
  slotA: "geuttae-yojeum:progress:v3:a",
  slotB: "geuttae-yojeum:progress:v3:b",
} as const;
export const MAX_PROGRESS_ENVELOPE_BYTES = 512 * 1024;

type SlotName = "A" | "B";

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

interface ProgressEnvelopeV2 {
  schemaVersion: 2;
  revision: number;
  checksum: string;
  writtenAt: string;
  payload: ProgressStateV2;
}

interface ProgressEnvelopeV3 {
  schemaVersion: 3;
  revision: number;
  checksum: string;
  writtenAt: string;
  payload: ProgressState;
}

export interface PreservedSlots {
  slotA: string | null;
  slotB: string | null;
  v2SlotA: string | null;
  v2SlotB: string | null;
  legacy: string | null;
}

export type ProgressLoadResult =
  | { kind: "empty"; state: ProgressState }
  | { kind: "loaded"; state: ProgressState; revision: number }
  | {
      kind: "migrated";
      state: ProgressState;
      fromVersion: 1 | 2;
    }
  | {
      kind: "recovered-slot";
      state: ProgressState;
      revision: number;
      badSlot: SlotName;
    }
  | { kind: "unrecoverable"; preservedRaw: PreservedSlots };

type SlotRead<TEnvelope> =
  | { kind: "missing"; name: SlotName; raw: null }
  | { kind: "invalid"; name: SlotName; raw: string }
  | {
      kind: "valid";
      name: SlotName;
      raw: string;
      envelope: TEnvelope;
    };

export function createEmptyProgress(): ProgressState {
  return {
    version: 3,
    sessions: {},
    bonus: createBonusEntitlement(),
    completedBonusIds: [],
    answerEvents: [],
    answerCheckpoint: {
      totalAnswers: 0,
      correctAnswers: 0,
      byQuestion: {},
    },
    rewardGrantIds: [],
    rewardAdTicketCount: 0,
    bonusStartCommands: {},
    latestBonusStartCommandIds: {},
    timeObservation: createTimeObservation(),
    shadowAudits: [],
    bonusTopicProgress: createEmptyBonusTopicProgress(),
  };
}

function observeProgressTime(
  state: ProgressState,
  observedAt: Date | undefined,
): { changed: boolean; state: ProgressState } {
  if (observedAt == null) {
    return { changed: false, state };
  }

  const timeObservation = observeTimeState(state.timeObservation, observedAt);
  const changed =
    timeObservation.lastObservedKstDate !==
      state.timeObservation.lastObservedKstDate ||
    timeObservation.lastValidKstDate !==
      state.timeObservation.lastValidKstDate ||
    timeObservation.confidence !== state.timeObservation.confidence;

  return changed
    ? {
        changed: true,
        state: {
          ...state,
          timeObservation,
        },
      }
    : { changed: false, state };
}

export class BrowserKeyValueStorage implements KeyValueStorage {
  constructor(private readonly storage: Storage) {}

  async getItem(key: string): Promise<string | null> {
    return this.storage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.setItem(key, value);
  }
}

export class ProgressWriteBlockedError extends Error {
  constructor() {
    super(
      "Progress slots are corrupt; preserved data must not be overwritten.",
    );
    this.name = "ProgressWriteBlockedError";
  }
}

export class ProgressEnvelopeTooLargeError extends Error {
  constructor(readonly byteLength: number) {
    super(
      `Progress envelope is ${byteLength} bytes; maximum is ${MAX_PROGRESS_ENVELOPE_BYTES}.`,
    );
    this.name = "ProgressEnvelopeTooLargeError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((candidate) => typeof candidate === "string")
  );
}

function isQuizSession(value: unknown): value is QuizSession {
  if (
    !isRecord(value) ||
    typeof value.dateKey !== "string" ||
    !Number.isInteger(value.currentIndex) ||
    !["question", "explanation", "completed"].includes(String(value.phase)) ||
    !Array.isArray(value.answers)
  ) {
    return false;
  }

  return value.answers.every(
    (answer) =>
      isRecord(answer) &&
      typeof answer.questionId === "string" &&
      Number.isInteger(answer.selectedIndex) &&
      typeof answer.isCorrect === "boolean",
  );
}

function isBonusEntitlement(value: unknown): value is BonusEntitlement {
  return (
    isRecord(value) &&
    typeof value.firstFreeUsed === "boolean" &&
    typeof value.ticketCount === "number" &&
    isStringArray(value.grantedMilestones) &&
    Array.isArray(value.unlockAttempts) &&
    value.unlockAttempts.every(
      (attempt) =>
        isRecord(attempt) &&
        typeof attempt.attemptId === "string" &&
        ["first_free", "streak_ticket", "reward_ad"].includes(
          String(attempt.source),
        ),
    )
  );
}

function isAnswerEvent(value: unknown): value is AnswerEvent {
  return (
    isRecord(value) &&
    typeof value.attemptId === "string" &&
    typeof value.sessionKey === "string" &&
    typeof value.questionId === "string" &&
    ["core", "bonus"].includes(String(value.questionKind)) &&
    typeof value.topic === "string" &&
    typeof value.lens === "string" &&
    Number.isInteger(value.selectedIndex) &&
    typeof value.isCorrect === "boolean" &&
    typeof value.answeredAt === "string"
  );
}

function isAnswerCheckpoint(value: unknown): value is AnswerCheckpoint {
  return (
    isRecord(value) &&
    Number.isInteger(value.totalAnswers) &&
    Number.isInteger(value.correctAnswers) &&
    isRecord(value.byQuestion) &&
    Object.values(value.byQuestion).every(
      (entry) =>
        isRecord(entry) &&
        Number.isInteger(entry.totalAnswers) &&
        Number.isInteger(entry.correctAnswers),
    )
  );
}

function isBonusStartCommandRecord(
  value: unknown,
): value is BonusStartCommandRecord {
  return (
    isRecord(value) &&
    typeof value.commandId === "string" &&
    typeof value.dateKey === "string" &&
    [
      "nostalgia",
      "korean-life",
      "language",
      "digital",
      "safety",
      "nature-general",
    ].includes(String(value.topic)) &&
    typeof value.sessionKey === "string" &&
    isStringArray(value.questionIds) &&
    ["first_free", "streak_ticket", "reward_ad"].includes(String(value.source))
  );
}

function isBonusStartCommands(
  value: unknown,
): value is Record<string, BonusStartCommandRecord> {
  return (
    isRecord(value) && Object.values(value).every(isBonusStartCommandRecord)
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((candidate) => typeof candidate === "string")
  );
}

function isTimeObservation(value: unknown): value is TimeObservation {
  return (
    isRecord(value) &&
    (value.lastObservedKstDate === null ||
      typeof value.lastObservedKstDate === "string") &&
    (value.lastValidKstDate === null ||
      typeof value.lastValidKstDate === "string") &&
    ["normal", "lowConfidence"].includes(String(value.confidence))
  );
}

function isShadowAudits(value: unknown): value is ShadowAudit[] {
  return (
    Array.isArray(value) &&
    value.length <= SHADOW_AUDIT_LIMIT &&
    value.every(isShadowAudit)
  );
}

function inferLatestBonusStartCommandIds(
  commands: Record<string, BonusStartCommandRecord>,
): Record<string, string> {
  const latestBySession: Record<string, string> = {};
  for (const command of Object.values(commands)) {
    latestBySession[command.sessionKey] = command.commandId;
  }
  return latestBySession;
}

function hasValidProgressFields(value: Record<string, unknown>): boolean {
  return (
    isRecord(value.sessions) &&
    Object.values(value.sessions).every(isQuizSession) &&
    isBonusEntitlement(value.bonus) &&
    isStringArray(value.completedBonusIds)
  );
}

function isProgressStateV1(value: unknown): value is ProgressStateV1 {
  return (
    isRecord(value) && value.version === 1 && hasValidProgressFields(value)
  );
}

function normalizeProgressStateV2(value: unknown): ProgressStateV2 | null {
  if (
    !isRecord(value) ||
    value.version !== 2 ||
    !hasValidProgressFields(value) ||
    !Array.isArray(value.answerEvents) ||
    !value.answerEvents.every(isAnswerEvent) ||
    !isAnswerCheckpoint(value.answerCheckpoint)
  ) {
    return null;
  }

  const rewardGrantIds =
    value.rewardGrantIds === undefined
      ? []
      : isStringArray(value.rewardGrantIds)
        ? value.rewardGrantIds
        : null;
  const bonusStartCommands =
    value.bonusStartCommands === undefined
      ? {}
      : isBonusStartCommands(value.bonusStartCommands)
        ? value.bonusStartCommands
        : null;
  if (rewardGrantIds == null || bonusStartCommands == null) {
    return null;
  }
  const inferredRewardAdTicketCount = Math.min(
    rewardGrantIds.length,
    Math.max(
      0,
      Number((value.bonus as BonusEntitlement).ticketCount) -
        (value.bonus as BonusEntitlement).grantedMilestones.length,
    ),
  );
  const rewardAdTicketCount =
    value.rewardAdTicketCount === undefined
      ? inferredRewardAdTicketCount
      : Number.isInteger(value.rewardAdTicketCount) &&
          Number(value.rewardAdTicketCount) >= 0 &&
          Number(value.rewardAdTicketCount) <=
            Number((value.bonus as BonusEntitlement).ticketCount)
        ? Number(value.rewardAdTicketCount)
        : null;
  const latestBonusStartCommandIds =
    value.latestBonusStartCommandIds === undefined
      ? inferLatestBonusStartCommandIds(bonusStartCommands)
      : isStringRecord(value.latestBonusStartCommandIds)
        ? value.latestBonusStartCommandIds
        : null;
  const timeObservation =
    value.timeObservation === undefined
      ? createTimeObservation()
      : isTimeObservation(value.timeObservation)
        ? value.timeObservation
        : null;
  const shadowAudits =
    value.shadowAudits === undefined
      ? []
      : isShadowAudits(value.shadowAudits)
        ? value.shadowAudits
        : null;
  if (
    rewardAdTicketCount == null ||
    latestBonusStartCommandIds == null ||
    timeObservation == null ||
    shadowAudits == null
  ) {
    return null;
  }

  return {
    version: 2,
    sessions: value.sessions as Record<string, QuizSession>,
    bonus: value.bonus as BonusEntitlement,
    completedBonusIds: value.completedBonusIds as string[],
    answerEvents: value.answerEvents as AnswerEvent[],
    answerCheckpoint: value.answerCheckpoint as AnswerCheckpoint,
    rewardGrantIds,
    rewardAdTicketCount,
    bonusStartCommands,
    latestBonusStartCommandIds,
    timeObservation,
    shadowAudits,
  };
}

function normalizeBonusTopicProgress(
  value: unknown,
): ProgressState["bonusTopicProgress"] | null {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== BONUS_TOPICS.length ||
    !BONUS_TOPICS.every((topic) => Object.hasOwn(value, topic))
  ) {
    return null;
  }

  const normalized = createEmptyBonusTopicProgress();
  for (const topic of BONUS_TOPICS) {
    const progress = value[topic];
    if (
      !isRecord(progress) ||
      !Array.isArray(progress.completedSetIndexes) ||
      !progress.completedSetIndexes.every(
        (setIndex) =>
          Number.isInteger(setIndex) &&
          Number(setIndex) >= 0 &&
          Number(setIndex) < 180,
      ) ||
      (progress.lastCompletedDateKey !== undefined &&
        typeof progress.lastCompletedDateKey !== "string")
    ) {
      return null;
    }

    normalized[topic] = {
      completedSetIndexes: [
        ...new Set(progress.completedSetIndexes as number[]),
      ].sort((left, right) => left - right),
      ...(typeof progress.lastCompletedDateKey === "string"
        ? { lastCompletedDateKey: progress.lastCompletedDateKey }
        : {}),
    };
  }

  return normalized;
}

function normalizeProgressState(value: unknown): ProgressState | null {
  if (!isRecord(value) || value.version !== 3) {
    return null;
  }
  const v2 = normalizeProgressStateV2({ ...value, version: 2 });
  const bonusTopicProgress = normalizeBonusTopicProgress(
    value.bonusTopicProgress,
  );
  if (v2 == null || bonusTopicProgress == null) {
    return null;
  }

  return { ...v2, version: 3, bonusTopicProgress };
}

function migrateV1ToV2(progress: ProgressStateV1): ProgressStateV2 {
  return {
    version: 2,
    sessions: progress.sessions,
    bonus: progress.bonus,
    completedBonusIds: progress.completedBonusIds,
    answerEvents: [],
    answerCheckpoint: {
      totalAnswers: 0,
      correctAnswers: 0,
      byQuestion: {},
    },
    rewardGrantIds: [],
    rewardAdTicketCount: 0,
    bonusStartCommands: {},
    latestBonusStartCommandIds: {},
    timeObservation: createTimeObservation(),
    shadowAudits: [],
  };
}

function checksumInput(envelope: {
  schemaVersion: 2 | 3;
  revision: number;
  writtenAt: string;
  payload: unknown;
}): string {
  return JSON.stringify({
    schemaVersion: envelope.schemaVersion,
    revision: envelope.revision,
    writtenAt: envelope.writtenAt,
    payload: envelope.payload,
  });
}

function checksum(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function createEnvelope(
  progress: ProgressState,
  revision: number,
  writtenAt: string,
): ProgressEnvelopeV3 {
  const unsigned = {
    schemaVersion: 3 as const,
    revision,
    writtenAt,
    payload: progress,
  };

  return {
    ...unsigned,
    checksum: checksum(checksumInput(unsigned)),
  };
}

function serializeEnvelope(envelope: ProgressEnvelopeV3): string {
  const serialized = JSON.stringify(envelope);
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength > MAX_PROGRESS_ENVELOPE_BYTES) {
    throw new ProgressEnvelopeTooLargeError(byteLength);
  }
  return serialized;
}

function parseSlot<TProgress, TVersion extends 2 | 3>(
  name: SlotName,
  raw: string | null,
  schemaVersion: TVersion,
  normalize: (value: unknown) => TProgress | null,
): SlotRead<TVersion extends 2 ? ProgressEnvelopeV2 : ProgressEnvelopeV3> {
  if (raw == null) {
    return { kind: "missing", name, raw };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== schemaVersion ||
      !Number.isInteger(parsed.revision) ||
      Number(parsed.revision) < 1 ||
      typeof parsed.checksum !== "string" ||
      typeof parsed.writtenAt !== "string"
    ) {
      return { kind: "invalid", name, raw };
    }
    const expected = checksum(
      checksumInput({
        schemaVersion,
        revision: Number(parsed.revision),
        writtenAt: parsed.writtenAt,
        payload: parsed.payload,
      }),
    );

    if (parsed.checksum !== expected) {
      return { kind: "invalid", name, raw };
    }

    const payload = normalize(parsed.payload);
    if (payload == null) {
      return { kind: "invalid", name, raw };
    }
    const envelope = {
      schemaVersion,
      revision: Number(parsed.revision),
      checksum: parsed.checksum,
      writtenAt: parsed.writtenAt,
      payload,
    } as unknown as TVersion extends 2
      ? ProgressEnvelopeV2
      : ProgressEnvelopeV3;

    return { kind: "valid", name, raw, envelope };
  } catch {
    return { kind: "invalid", name, raw };
  }
}

function decodeV1(raw: string | null): ProgressStateV1 | null {
  if (raw == null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isProgressStateV1(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function keyForSlot(name: SlotName): string {
  return name === "A" ? progressStorageKeys.slotA : progressStorageKeys.slotB;
}

function normalizeProgressInput(
  progress: ProgressState | ProgressStateV1 | ProgressStateV2,
): ProgressState | null {
  if (progress.version === 1) {
    return migrateV2ToV3(migrateV1ToV2(progress), bundledLegacyQuestionMap);
  }
  if (progress.version === 2) {
    const normalized = normalizeProgressStateV2(progress);
    return normalized == null
      ? null
      : migrateV2ToV3(normalized, bundledLegacyQuestionMap);
  }
  return normalizeProgressState(progress);
}

export class ProgressRepository {
  private writeTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async readRaw(): Promise<PreservedSlots> {
    const [slotA, slotB, v2SlotA, v2SlotB, legacy] = await Promise.all([
      this.storage.getItem(progressStorageKeys.slotA),
      this.storage.getItem(progressStorageKeys.slotB),
      this.storage.getItem(progressStorageKeys.v2SlotA),
      this.storage.getItem(progressStorageKeys.v2SlotB),
      this.storage.getItem(progressStorageKeys.legacy),
    ]);
    return { slotA, slotB, v2SlotA, v2SlotB, legacy };
  }

  private async initializeSlots(progress: ProgressState): Promise<void> {
    const envelope = serializeEnvelope(
      createEnvelope(progress, 1, this.now().toISOString()),
    );
    await this.storage.setItem(progressStorageKeys.slotA, envelope);
    await this.storage.setItem(progressStorageKeys.slotB, envelope);
  }

  async load(): Promise<ProgressLoadResult> {
    const preservedRaw = await this.readRaw();
    const slots = [
      parseSlot("A", preservedRaw.slotA, 3, normalizeProgressState),
      parseSlot("B", preservedRaw.slotB, 3, normalizeProgressState),
    ];
    const validSlots = slots
      .filter(
        (
          slot,
        ): slot is Extract<SlotRead<ProgressEnvelopeV3>, { kind: "valid" }> =>
          slot.kind === "valid",
      )
      .sort((left, right) => right.envelope.revision - left.envelope.revision);

    if (validSlots.length === 2) {
      const latest = validSlots[0];
      return {
        kind: "loaded",
        state: latest.envelope.payload,
        revision: latest.envelope.revision,
      };
    }

    if (validSlots.length === 1) {
      const recovered = validSlots[0];
      const badSlot = recovered.name === "A" ? "B" : "A";
      return {
        kind: "recovered-slot",
        state: recovered.envelope.payload,
        revision: recovered.envelope.revision,
        badSlot,
      };
    }

    const v2Slots = [
      parseSlot("A", preservedRaw.v2SlotA, 2, normalizeProgressStateV2),
      parseSlot("B", preservedRaw.v2SlotB, 2, normalizeProgressStateV2),
    ];
    const validV2Slots = v2Slots
      .filter(
        (
          slot,
        ): slot is Extract<SlotRead<ProgressEnvelopeV2>, { kind: "valid" }> =>
          slot.kind === "valid",
      )
      .sort((left, right) => right.envelope.revision - left.envelope.revision);
    if (validV2Slots.length > 0) {
      const migrated = migrateV2ToV3(
        validV2Slots[0].envelope.payload,
        bundledLegacyQuestionMap,
      );
      if (preservedRaw.slotA == null && preservedRaw.slotB == null) {
        try {
          await this.initializeSlots(migrated);
        } catch {
          // Untouched v2 slots remain authoritative and migration is retried.
        }
      }
      return { kind: "migrated", state: migrated, fromVersion: 2 };
    }

    const legacy = decodeV1(preservedRaw.legacy);
    if (legacy != null) {
      const migrated = migrateV2ToV3(
        migrateV1ToV2(legacy),
        bundledLegacyQuestionMap,
      );
      if (preservedRaw.slotA == null && preservedRaw.slotB == null) {
        try {
          await this.initializeSlots(migrated);
        } catch {
          // The untouched v1 value remains authoritative and migration is retried.
        }
      }
      return {
        kind: "migrated",
        state: migrated,
        fromVersion: 1,
      };
    }

    if (
      preservedRaw.slotA == null &&
      preservedRaw.slotB == null &&
      preservedRaw.v2SlotA == null &&
      preservedRaw.v2SlotB == null &&
      preservedRaw.legacy == null
    ) {
      return { kind: "empty", state: createEmptyProgress() };
    }

    return { kind: "unrecoverable", preservedRaw };
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const queued = this.writeTail.then(operation, operation);
    this.writeTail = queued.then(
      () => undefined,
      () => undefined,
    );
    return queued;
  }

  private async saveImmediately(
    progress: ProgressState | ProgressStateV1 | ProgressStateV2,
  ): Promise<void> {
    const nextProgress = normalizeProgressInput(progress);
    if (nextProgress == null) {
      throw new TypeError("Invalid progress state");
    }

    const raw = await this.readRaw();
    const slotA = parseSlot("A", raw.slotA, 3, normalizeProgressState);
    const slotB = parseSlot("B", raw.slotB, 3, normalizeProgressState);
    const validSlots = [slotA, slotB].filter(
      (
        slot,
      ): slot is Extract<SlotRead<ProgressEnvelopeV3>, { kind: "valid" }> =>
        slot.kind === "valid",
    );

    if (validSlots.length === 0) {
      if (raw.slotA != null || raw.slotB != null) {
        throw new ProgressWriteBlockedError();
      }
      await this.initializeSlots(nextProgress);
      return;
    }

    const revision =
      Math.max(...validSlots.map((slot) => slot.envelope.revision)) + 1;
    let target: SlotName;
    if (slotA.kind !== "valid") {
      target = "A";
    } else if (slotB.kind !== "valid") {
      target = "B";
    } else {
      target = slotA.envelope.revision <= slotB.envelope.revision ? "A" : "B";
    }

    const envelope = createEnvelope(
      nextProgress,
      revision,
      this.now().toISOString(),
    );
    await this.storage.setItem(keyForSlot(target), serializeEnvelope(envelope));
  }

  save(
    progress: ProgressState | ProgressStateV1 | ProgressStateV2,
    observedAt?: Date,
  ): Promise<void> {
    if (observedAt == null) {
      return this.enqueue(() => this.saveImmediately(progress));
    }

    return this.enqueue(async () => {
      const loaded = await this.load();
      if (loaded.kind === "unrecoverable") {
        throw new ProgressWriteBlockedError();
      }
      const normalized = normalizeProgressInput(progress);
      if (normalized == null) {
        throw new TypeError("Invalid progress state");
      }

      const observed = observeProgressTime(loaded.state, observedAt);
      await this.saveImmediately({
        ...normalized,
        timeObservation: observed.state.timeObservation,
      });
    });
  }

  observeTime(observedAt: Date): Promise<ProgressState> {
    return this.enqueue(async () => {
      const loaded = await this.load();
      if (loaded.kind === "unrecoverable") {
        throw new ProgressWriteBlockedError();
      }

      const observed = observeProgressTime(loaded.state, observedAt);
      if (observed.changed) {
        await this.saveImmediately(observed.state);
      }
      return observed.state;
    });
  }

  commitAnswer(
    command: AnswerCommand,
    observedAt?: Date,
  ): Promise<ApplyAnswerResult> {
    return this.enqueue(async () => {
      const loaded = await this.load();
      if (loaded.kind === "unrecoverable") {
        throw new ProgressWriteBlockedError();
      }

      const observed = observeProgressTime(loaded.state, observedAt);
      const result = applyAnswerCommand(observed.state, command);
      if (result.applied || observed.changed) {
        await this.saveImmediately(result.state);
      }
      return result;
    });
  }

  grantBonusTicket(
    rewardGrantId: string,
    observedAt?: Date,
  ): Promise<GrantBonusTicketResult> {
    return this.enqueue(async () => {
      const loaded = await this.load();
      if (loaded.kind === "unrecoverable") {
        throw new ProgressWriteBlockedError();
      }

      const observed = observeProgressTime(loaded.state, observedAt);
      const result = grantBonusTicketCommand(observed.state, rewardGrantId);
      if (result.applied || observed.changed) {
        await this.saveImmediately(result.state);
      }
      return result;
    });
  }

  startBonusSession(
    commandId: string,
    dateKey: string,
    topic: BonusTopic,
    bonusQuestions: BonusQuestion[],
    observedAt?: Date,
  ): Promise<StartBonusSessionResult> {
    return this.enqueue(async () => {
      const loaded = await this.load();
      if (loaded.kind === "unrecoverable") {
        throw new ProgressWriteBlockedError();
      }

      const observed = observeProgressTime(loaded.state, observedAt);
      const result = startBonusSessionCommand(
        observed.state,
        commandId,
        dateKey,
        topic,
        bonusQuestions,
      );
      if (result.applied || observed.changed) {
        await this.saveImmediately(result.state);
      }
      return result;
    });
  }
}
