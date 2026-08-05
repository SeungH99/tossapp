import { describe, expect, it } from "vitest";

import {
  createEmptyProgress,
  ProgressRepository,
  type KeyValueStorage,
} from "../services/progress-repository";
import { startBonusSessionCommand } from "./progress-commands";
import { createBonusQuestion } from "./question";

const setThirty = ["gentle", "steady", "stretch"].map(
  (internalDifficulty, index) =>
    createBonusQuestion({
      id: `language-set-30-${index}`,
      conceptId: `language-set-30-concept-${index}`,
      lens: ["then", "now", "life"][index] as "then" | "now" | "life",
      topic: "language",
      prompt: `Released inventory boundary ${index}`,
      choices: ["A", "B", "C"],
      answerIndex: 0,
      explanation: "Boundary fixture",
      source: { name: "fixture", url: "https://example.com/source" },
      contentVersion: "test",
      reviewStatus: "reviewed",
      reviewedAt: "2026-08-05",
      variant: "base",
      internalDifficulty: internalDifficulty as "gentle" | "steady" | "stretch",
      setIndex: 30,
    }),
);

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

describe("released bonus inventory contract", () => {
  it("rejects set 30 for a 30-set topic before consuming entitlement", () => {
    const state = createEmptyProgress();
    state.bonus = {
      ...state.bonus,
      firstFreeUsed: true,
      ticketCount: 2,
      unlockAttempts: [
        { attemptId: "preserved-attempt", source: "streak_ticket" },
      ],
    };
    state.rewardGrantIds = ["00000000-0000-4000-8000-000000000001"];
    state.rewardAdTicketCount = 1;
    state.bonusTopicProgress.language.completedSetIndexes = Array.from(
      { length: 30 },
      (_, setIndex) => setIndex,
    );

    const result = startBonusSessionCommand(
      state,
      "00000000-0000-4000-8000-000000000002",
      "2026-08-05",
      "language",
      30,
      30,
      setThirty,
    );

    expect(result).toMatchObject({ applied: false, reason: "exhausted" });
    expect(result.state).toBe(state);
    expect(result.state.bonus).toBe(state.bonus);
    expect(result.state.rewardGrantIds).toBe(state.rewardGrantIds);
    expect(result.state.rewardAdTicketCount).toBe(1);
    expect(result.state.sessions).toBe(state.sessions);
    expect(result.state.bonusStartCommands).toBe(state.bonusStartCommands);
  });

  it("requires the repository caller to provide the released set count", async () => {
    const repository = new ProgressRepository(new MemoryStorage());
    const state = createEmptyProgress();
    state.bonus = {
      ...state.bonus,
      firstFreeUsed: true,
      ticketCount: 2,
    };
    state.rewardGrantIds = ["00000000-0000-4000-8000-000000000003"];
    state.rewardAdTicketCount = 1;
    state.bonusTopicProgress.language.completedSetIndexes = Array.from(
      { length: 30 },
      (_, setIndex) => setIndex,
    );
    await repository.save(state);

    const result = await repository.startBonusSession(
      "00000000-0000-4000-8000-000000000004",
      "2026-08-05",
      "language",
      30,
      30,
      setThirty,
    );
    const loaded = await repository.load();
    if (loaded.kind === "unrecoverable") {
      throw new Error("Expected repository state to remain recoverable");
    }

    expect(result).toMatchObject({ applied: false, reason: "exhausted" });
    expect(result.state.bonus).toEqual(state.bonus);
    expect(result.state.rewardGrantIds).toEqual(state.rewardGrantIds);
    expect(result.state.rewardAdTicketCount).toBe(1);
    expect(result.state.sessions).toEqual(state.sessions);
    expect(result.state.bonusStartCommands).toEqual(state.bonusStartCommands);
    expect(loaded.state).toEqual(state);
  });
});
