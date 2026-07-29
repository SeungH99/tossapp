import {
  createBonusEntitlement,
  type BonusEntitlement,
} from "../domain/bonus-entitlement";
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
} from "../domain/progress-state";
import type { BonusQuestion, BonusTopic } from "../domain/question";
import type { QuizSession } from "../domain/quiz-session";

export type {
  AnswerCheckpoint,
  AnswerEvent,
  ProgressState,
  ProgressStateV1,
} from "../domain/progress-state";

export const progressStorageKeys = {
  legacy: "geuttae-yojeum:progress",
  slotA: "geuttae-yojeum:progress:v2:a",
  slotB: "geuttae-yojeum:progress:v2:b",
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
  payload: ProgressState;
}

export interface PreservedSlots {
  slotA: string | null;
  slotB: string | null;
  legacy: string | null;
}

export type ProgressLoadResult =
  | { kind: "empty"; state: ProgressState }
  | { kind: "loaded"; state: ProgressState; revision: number }
  | {
      kind: "migrated";
      state: ProgressState;
      fromVersion: 1;
    }
  | {
      kind: "recovered-slot";
      state: ProgressState;
      revision: number;
      badSlot: SlotName;
    }
  | { kind: "unrecoverable"; preservedRaw: PreservedSlots };

type SlotRead =
  | { kind: "missing"; name: SlotName; raw: null }
  | { kind: "invalid"; name: SlotName; raw: string }
  | {
      kind: "valid";
      name: SlotName;
      raw: string;
      envelope: ProgressEnvelopeV2;
    };

export function createEmptyProgress(): ProgressState {
  return {
    version: 2,
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
  };
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
    super("Progress slots are corrupt; preserved data must not be overwritten.");
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
    !["question", "explanation", "completed"].includes(
      String(value.phase),
    ) ||
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
    ["first_free", "streak_ticket", "reward_ad"].includes(
      String(value.source),
    )
  );
}

function isBonusStartCommands(
  value: unknown,
): value is Record<string, BonusStartCommandRecord> {
  return (
    isRecord(value) &&
    Object.values(value).every(isBonusStartCommandRecord)
  );
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((candidate) => typeof candidate === "string")
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

function hasValidProgressFields(
  value: Record<string, unknown>,
): boolean {
  return (
    isRecord(value.sessions) &&
    Object.values(value.sessions).every(isQuizSession) &&
    isBonusEntitlement(value.bonus) &&
    isStringArray(value.completedBonusIds)
  );
}

function isProgressStateV1(value: unknown): value is ProgressStateV1 {
  return (
    isRecord(value) &&
    value.version === 1 &&
    hasValidProgressFields(value)
  );
}

function normalizeProgressState(value: unknown): ProgressState | null {
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
  if (
    rewardAdTicketCount == null ||
    latestBonusStartCommandIds == null
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
  };
}

function migrateV1ToV2(progress: ProgressStateV1): ProgressState {
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
  };
}

function checksumInput(
  envelope: {
    schemaVersion: 2;
    revision: number;
    writtenAt: string;
    payload: unknown;
  },
): string {
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
): ProgressEnvelopeV2 {
  const unsigned = {
    schemaVersion: 2 as const,
    revision,
    writtenAt,
    payload: progress,
  };

  return {
    ...unsigned,
    checksum: checksum(checksumInput(unsigned)),
  };
}

function serializeEnvelope(envelope: ProgressEnvelopeV2): string {
  const serialized = JSON.stringify(envelope);
  const byteLength = new TextEncoder().encode(serialized).byteLength;
  if (byteLength > MAX_PROGRESS_ENVELOPE_BYTES) {
    throw new ProgressEnvelopeTooLargeError(byteLength);
  }
  return serialized;
}

function parseSlot(
  name: SlotName,
  raw: string | null,
): SlotRead {
  if (raw == null) {
    return { kind: "missing", name, raw };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.schemaVersion !== 2 ||
      !Number.isInteger(parsed.revision) ||
      Number(parsed.revision) < 1 ||
      typeof parsed.checksum !== "string" ||
      typeof parsed.writtenAt !== "string" ||
      normalizeProgressState(parsed.payload) == null
    ) {
      return { kind: "invalid", name, raw };
    }

    const payload = normalizeProgressState(parsed.payload);
    if (payload == null) {
      return { kind: "invalid", name, raw };
    }
    const envelope: ProgressEnvelopeV2 = {
      schemaVersion: 2,
      revision: Number(parsed.revision),
      checksum: parsed.checksum,
      writtenAt: parsed.writtenAt,
      payload,
    };
    const expected = checksum(
      checksumInput({
        schemaVersion: envelope.schemaVersion,
        revision: envelope.revision,
        writtenAt: envelope.writtenAt,
        payload: parsed.payload,
      }),
    );

    if (envelope.checksum !== expected) {
      return { kind: "invalid", name, raw };
    }

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
  return name === "A"
    ? progressStorageKeys.slotA
    : progressStorageKeys.slotB;
}

export class ProgressRepository {
  private writeTail: Promise<void> = Promise.resolve();

  constructor(
    private readonly storage: KeyValueStorage,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async readRaw(): Promise<PreservedSlots> {
    const [slotA, slotB, legacy] = await Promise.all([
      this.storage.getItem(progressStorageKeys.slotA),
      this.storage.getItem(progressStorageKeys.slotB),
      this.storage.getItem(progressStorageKeys.legacy),
    ]);
    return { slotA, slotB, legacy };
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
      parseSlot("A", preservedRaw.slotA),
      parseSlot("B", preservedRaw.slotB),
    ];
    const validSlots = slots
      .filter(
        (slot): slot is Extract<SlotRead, { kind: "valid" }> =>
          slot.kind === "valid",
      )
      .sort(
        (left, right) =>
          right.envelope.revision - left.envelope.revision,
      );

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

    const legacy = decodeV1(preservedRaw.legacy);
    if (legacy != null) {
      const migrated = migrateV1ToV2(legacy);
      try {
        await this.initializeSlots(migrated);
      } catch {
        // The untouched v1 value remains authoritative and migration is retried.
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
    progress: ProgressState | ProgressStateV1,
  ): Promise<void> {
    const nextProgress = normalizeProgressState(
      progress.version === 1 ? migrateV1ToV2(progress) : progress,
    );
    if (nextProgress == null) {
      throw new TypeError("Invalid progress state");
    }

    const raw = await this.readRaw();
    const slotA = parseSlot("A", raw.slotA);
    const slotB = parseSlot("B", raw.slotB);
    const validSlots = [slotA, slotB].filter(
      (slot): slot is Extract<SlotRead, { kind: "valid" }> =>
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
      target =
        slotA.envelope.revision <= slotB.envelope.revision ? "A" : "B";
    }

    const envelope = createEnvelope(
      nextProgress,
      revision,
      this.now().toISOString(),
    );
    await this.storage.setItem(
      keyForSlot(target),
      serializeEnvelope(envelope),
    );
  }

  save(progress: ProgressState | ProgressStateV1): Promise<void> {
    return this.enqueue(() => this.saveImmediately(progress));
  }

  commitAnswer(command: AnswerCommand): Promise<ApplyAnswerResult> {
    return this.enqueue(async () => {
      const loaded = await this.load();
      if (loaded.kind === "unrecoverable") {
        throw new ProgressWriteBlockedError();
      }

      const result = applyAnswerCommand(loaded.state, command);
      if (result.applied) {
        await this.saveImmediately(result.state);
      }
      return result;
    });
  }

  grantBonusTicket(rewardGrantId: string): Promise<GrantBonusTicketResult> {
    return this.enqueue(async () => {
      const loaded = await this.load();
      if (loaded.kind === "unrecoverable") {
        throw new ProgressWriteBlockedError();
      }

      const result = grantBonusTicketCommand(loaded.state, rewardGrantId);
      if (result.applied) {
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
  ): Promise<StartBonusSessionResult> {
    return this.enqueue(async () => {
      const loaded = await this.load();
      if (loaded.kind === "unrecoverable") {
        throw new ProgressWriteBlockedError();
      }

      const result = startBonusSessionCommand(
        loaded.state,
        commandId,
        dateKey,
        topic,
        bonusQuestions,
      );
      if (result.applied) {
        await this.saveImmediately(result.state);
      }
      return result;
    });
  }
}
