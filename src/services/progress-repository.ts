import {
  createBonusEntitlement,
  type BonusEntitlement,
} from "../domain/bonus-entitlement";
import type { QuizSession } from "../domain/quiz-session";

const progressKey = "geuttae-yojeum:progress";

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface ProgressState {
  version: 1;
  sessions: Record<string, QuizSession>;
  bonus: BonusEntitlement;
  completedBonusIds: string[];
}

export function createEmptyProgress(): ProgressState {
  return {
    version: 1,
    sessions: {},
    bonus: createBonusEntitlement(),
    completedBonusIds: [],
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function isProgressState(value: unknown): value is ProgressState {
  if (!isRecord(value) || value.version !== 1) {
    return false;
  }

  return (
    isRecord(value.sessions) &&
    isRecord(value.bonus) &&
    typeof value.bonus.firstFreeUsed === "boolean" &&
    typeof value.bonus.ticketCount === "number" &&
    Array.isArray(value.bonus.grantedMilestones) &&
    Array.isArray(value.bonus.unlockAttempts) &&
    Array.isArray(value.completedBonusIds)
  );
}

export class ProgressRepository {
  constructor(private readonly storage: KeyValueStorage) {}

  async load(): Promise<ProgressState> {
    const stored = await this.storage.getItem(progressKey);
    if (stored == null) {
      return createEmptyProgress();
    }

    try {
      const parsed: unknown = JSON.parse(stored);
      return isProgressState(parsed) ? parsed : createEmptyProgress();
    } catch {
      return createEmptyProgress();
    }
  }

  async save(progress: ProgressState): Promise<void> {
    await this.storage.setItem(progressKey, JSON.stringify(progress));
  }
}
