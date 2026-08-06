import { describe, expect, it } from "vitest";

import historicalConceptMap from "../content/legacy-concept-map.json";
import { calculateCompletionStreak } from "../domain/streak";
import { completeBonusSetCommand } from "../domain/progress-commands";
import type { AnswerEvent, ProgressState } from "../domain/progress-state";
import type { BonusQuestion, CoreQuestion, Question } from "../domain/question";
import {
  MAX_PROGRESS_ENVELOPE_BYTES,
  MAX_PROGRESS_DUAL_SLOT_BYTES,
  ProgressRepository,
  progressStorageKeys,
  type KeyValueStorage,
  type ProgressLoadResult,
} from "./progress-repository";

type ContentPack = { questions: Question[] };

const packModules = import.meta.glob("../content/{core,bonus}/**/*.json", {
  eager: true,
  import: "default",
}) as Record<string, ContentPack>;

class MemoryStorage implements KeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

function stateFrom(result: ProgressLoadResult): ProgressState {
  if (result.kind === "unrecoverable") {
    throw new Error("Expected a recoverable progress state");
  }
  return result.state;
}

function deterministicUuid(index: number): string {
  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}

function allReleasedQuestions(): {
  core: CoreQuestion[];
  bonus: BonusQuestion[];
} {
  const questions = Object.values(packModules).flatMap(
    (pack) => pack.questions,
  );
  return {
    core: questions
      .filter((question): question is CoreQuestion => question.kind === "core")
      .sort(
        (left, right) =>
          (left.dateKey < right.dateKey
            ? -1
            : left.dateKey > right.dateKey
              ? 1
              : 0) ||
          ["then", "now", "life"].indexOf(left.lens) -
            ["then", "now", "life"].indexOf(right.lens),
      ),
    bonus: questions
      .filter(
        (question): question is BonusQuestion => question.kind === "bonus",
      )
      .sort(
        (left, right) =>
          ["nostalgia", "korean-life", "language"].indexOf(left.topic) -
            ["nostalgia", "korean-life", "language"].indexOf(right.topic) ||
          left.setIndex - right.setIndex ||
          ["gentle", "steady", "stretch"].indexOf(left.internalDifficulty) -
            ["gentle", "steady", "stretch"].indexOf(right.internalDifficulty),
      ),
  };
}

function createAnswerEvent(
  question: Question,
  sessionKey: string,
  answerIndex: number,
): AnswerEvent {
  return {
    attemptId: deterministicUuid(answerIndex + 1),
    sessionKey,
    questionId: question.id,
    questionKind: question.kind,
    topic: question.topic,
    lens: question.lens,
    ...(question.kind === "bonus"
      ? {
          conceptId: question.conceptId,
          variant: question.variant,
          internalDifficulty: question.internalDifficulty,
        }
      : {}),
    selectedIndex: question.answerIndex,
    isCorrect: true,
    answeredAt: `${
      question.kind === "core" ? question.dateKey : "2027-01-23"
    }T03:00:00.000Z`,
  };
}

function buildFullReleaseProfile(): ProgressState {
  const { core, bonus } = allReleasedQuestions();
  expect(core).toHaveLength(540);
  expect(bonus).toHaveLength(540);

  const sessions: ProgressState["sessions"] = {};
  const bonusStartCommands: ProgressState["bonusStartCommands"] = {};
  const latestBonusStartCommandIds: ProgressState["latestBonusStartCommandIds"] =
    {};
  const unlockAttempts: ProgressState["bonus"]["unlockAttempts"] = [];
  const rewardGrantIds: string[] = [];
  const allEvents: AnswerEvent[] = [];

  for (let dayIndex = 0; dayIndex < 180; dayIndex += 1) {
    const coreQuestions = core.slice(dayIndex * 3, dayIndex * 3 + 3);
    const dateKey = coreQuestions[0].dateKey;
    sessions[dateKey] = {
      dateKey,
      currentIndex: 2,
      phase: "completed",
      answers: coreQuestions.map((question) => ({
        questionId: question.id,
        selectedIndex: question.answerIndex,
        isCorrect: true,
      })),
    };
    coreQuestions.forEach((question) =>
      allEvents.push(createAnswerEvent(question, dateKey, allEvents.length)),
    );

    const bonusQuestions = bonus.slice(dayIndex * 3, dayIndex * 3 + 3);
    const topic = bonusQuestions[0].topic;
    const setIndex = bonusQuestions[0].setIndex;
    const sessionKey = `${dateKey}:bonus:${topic}`;
    const commandId = deterministicUuid(2_000 + dayIndex);
    sessions[sessionKey] = {
      dateKey: sessionKey,
      currentIndex: 2,
      phase: "completed",
      answers: bonusQuestions.map((question) => ({
        questionId: question.id,
        selectedIndex: question.answerIndex,
        isCorrect: true,
      })),
    };
    bonusStartCommands[commandId] = {
      commandId,
      dateKey,
      topic,
      setIndex,
      sessionKey,
      questionIds: bonusQuestions.map((question) => question.id),
      source: dayIndex === 0 ? "first_free" : "reward_ad",
    };
    latestBonusStartCommandIds[sessionKey] = commandId;
    unlockAttempts.push({
      attemptId: commandId,
      source: dayIndex === 0 ? "first_free" : "reward_ad",
    });
    if (dayIndex > 0) {
      rewardGrantIds.push(deterministicUuid(4_000 + dayIndex));
    }
    bonusQuestions.forEach((question) =>
      allEvents.push(createAnswerEvent(question, sessionKey, allEvents.length)),
    );
  }

  const foldedEvents = allEvents.slice(0, allEvents.length - 512);
  const releasedQuestions = [...core, ...bonus];
  const releasedQuestionIds = new Set(
    releasedQuestions.map((question) => question.id),
  );
  const legacyOnlyQuestionIds = Object.keys(historicalConceptMap).filter(
    (questionId) => !releasedQuestionIds.has(questionId),
  );
  const byQuestion = Object.fromEntries(
    foldedEvents.map((event) => [
      event.questionId,
      { totalAnswers: 1, correctAnswers: 1 },
    ]),
  );
  for (const questionId of legacyOnlyQuestionIds) {
    byQuestion[questionId] = { totalAnswers: 1, correctAnswers: 1 };
  }
  const seenQuestionIds = [
    ...new Set([
      ...releasedQuestions.map((question) => question.id),
      ...Object.keys(historicalConceptMap),
    ]),
  ];
  const seenConceptIds = [
    ...new Set([
      ...releasedQuestions.map((question) => question.conceptId),
      ...Object.values(historicalConceptMap),
    ]),
  ];
  const legacyBonusQuestionIds = legacyOnlyQuestionIds.filter((questionId) =>
    questionId.startsWith("bonus-"),
  );

  return {
    version: 4,
    sessions,
    bonus: {
      firstFreeUsed: true,
      ticketCount: 0,
      grantedMilestones: [],
      unlockAttempts,
    },
    completedBonusIds: [
      ...bonus.map((question) => question.id),
      ...legacyBonusQuestionIds,
    ],
    answerEvents: allEvents.slice(-512),
    answerCheckpoint: {
      totalAnswers: foldedEvents.length + legacyOnlyQuestionIds.length,
      correctAnswers: foldedEvents.length + legacyOnlyQuestionIds.length,
      byQuestion,
    },
    rewardGrantIds,
    rewardAdTicketCount: 0,
    bonusStartCommands,
    latestBonusStartCommandIds,
    timeObservation: {
      lastObservedKstDate: "2027-01-23",
      lastValidKstDate: "2027-01-23",
      confidence: "normal",
    },
    shadowAudits: [],
    seenQuestionIds,
    seenConceptIds,
    bonusTopicProgress: {
      nostalgia: {
        completedSetIndexes: Array.from({ length: 120 }, (_, index) => index),
        skippedSetIndexes: [],
        lastCompletedDateKey: core[119 * 3].dateKey,
      },
      "korean-life": {
        completedSetIndexes: Array.from({ length: 30 }, (_, index) => index),
        skippedSetIndexes: [],
        lastCompletedDateKey: core[149 * 3].dateKey,
      },
      language: {
        completedSetIndexes: Array.from({ length: 30 }, (_, index) => index),
        skippedSetIndexes: [],
        lastCompletedDateKey: core[179 * 3].dateKey,
      },
      digital: { completedSetIndexes: [], skippedSetIndexes: [] },
      safety: { completedSetIndexes: [], skippedSetIndexes: [] },
      "nature-general": { completedSetIndexes: [], skippedSetIndexes: [] },
    },
  };
}

describe("full-release V4 storage budget", () => {
  it("keeps every active answer and the latest completed core result exact", async () => {
    const profile = buildFullReleaseProfile();
    const coreSessionKeys = Object.keys(profile.sessions).filter((sessionKey) =>
      /^\d{4}-\d{2}-\d{2}$/.test(sessionKey),
    );
    const activeCoreKey = coreSessionKeys.at(-1);
    const latestCompletedCoreKey = coreSessionKeys.at(-2);
    const archivedCoreKey = coreSessionKeys[0];
    const activeBonusKey = Object.keys(profile.latestBonusStartCommandIds).at(
      -1,
    );
    if (
      activeCoreKey == null ||
      latestCompletedCoreKey == null ||
      archivedCoreKey == null ||
      activeBonusKey == null
    ) {
      throw new Error("Expected full-release session fixtures");
    }

    profile.sessions[activeCoreKey] = {
      ...profile.sessions[activeCoreKey],
      currentIndex: 1,
      phase: "question",
      answers: profile.sessions[activeCoreKey].answers.slice(0, 1),
    };
    profile.sessions[activeBonusKey] = {
      ...profile.sessions[activeBonusKey],
      currentIndex: 1,
      phase: "question",
      answers: profile.sessions[activeBonusKey].answers.slice(0, 1),
    };
    const expectedActiveCore = profile.sessions[activeCoreKey];
    const expectedActiveBonus = profile.sessions[activeBonusKey];
    const expectedLatestCore = profile.sessions[latestCompletedCoreKey];

    const repository = new ProgressRepository(new MemoryStorage());
    await repository.save(profile);
    const restored = stateFrom(await repository.load());

    expect(restored.sessions[activeCoreKey]).toEqual(expectedActiveCore);
    expect(restored.sessions[activeBonusKey]).toEqual(expectedActiveBonus);
    expect(restored.sessions[latestCompletedCoreKey]).toEqual(
      expectedLatestCore,
    );
    expect(restored.sessions[archivedCoreKey].answers).toEqual([]);
  });

  it("keeps an archived completed bonus command idempotent", () => {
    const profile = buildFullReleaseProfile();
    const start = Object.values(profile.bonusStartCommands)[0];
    const archived = {
      ...profile,
      sessions: {
        ...profile.sessions,
        [start.sessionKey]: {
          ...profile.sessions[start.sessionKey],
          answers: [],
        },
      },
    };

    const result = completeBonusSetCommand(
      archived,
      start.sessionKey,
      start.topic,
      start.setIndex ?? 0,
      start.dateKey,
    );

    expect(result).toMatchObject({ applied: false, reason: "duplicate" });
    expect(result.state).toBe(archived);
  });

  it("keeps completed bonus answers until topic completion is recorded", async () => {
    const profile = buildFullReleaseProfile();
    const start = Object.values(profile.bonusStartCommands).at(-1);
    if (start?.setIndex == null) {
      throw new Error("Expected a completed bonus start fixture");
    }
    profile.bonusTopicProgress[start.topic] = {
      ...profile.bonusTopicProgress[start.topic],
      completedSetIndexes: profile.bonusTopicProgress[
        start.topic
      ].completedSetIndexes.filter((setIndex) => setIndex !== start.setIndex),
    };
    const expectedSession = profile.sessions[start.sessionKey];
    const repository = new ProgressRepository(new MemoryStorage());

    await repository.save(profile);
    const restored = stateFrom(await repository.load());
    const completed = completeBonusSetCommand(
      restored,
      start.sessionKey,
      start.topic,
      start.setIndex,
      start.dateKey,
    );

    expect(restored.sessions[start.sessionKey]).toEqual(expectedSession);
    expect(completed).toMatchObject({ applied: true });
  });

  it("round-trips the exact 180-day inventory through both V4 slots", async () => {
    const profile = buildFullReleaseProfile();
    expect(profile.seenQuestionIds).toHaveLength(1_260);
    expect(profile.seenConceptIds).toHaveLength(1_243);
    expect(Object.keys(profile.answerCheckpoint.byQuestion)).toHaveLength(748);
    expect(profile.completedBonusIds).toHaveLength(630);
    const storage = new MemoryStorage();
    const repository = new ProgressRepository(
      storage,
      () => new Date("2027-01-23T03:00:00.000Z"),
    );

    await repository.save(profile);
    await repository.save(profile);

    const slotA = storage.values.get(progressStorageKeys.slotA);
    const slotB = storage.values.get(progressStorageKeys.slotB);
    if (slotA == null || slotB == null) {
      throw new Error("Expected both V4 progress slots to be initialized");
    }
    expect(
      [JSON.parse(slotA).revision, JSON.parse(slotB).revision].sort(),
    ).toEqual([1, 2]);

    const encoder = new TextEncoder();
    const slotABytes = encoder.encode(slotA).byteLength;
    const slotBBytes = encoder.encode(slotB).byteLength;
    expect(slotABytes).toBeLessThanOrEqual(MAX_PROGRESS_ENVELOPE_BYTES);
    expect(slotBBytes).toBeLessThanOrEqual(MAX_PROGRESS_ENVELOPE_BYTES);
    expect(slotABytes + slotBBytes).toBeLessThanOrEqual(
      MAX_PROGRESS_DUAL_SLOT_BYTES,
    );

    const loadResult = await repository.load();
    expect(loadResult).toMatchObject({ kind: "loaded", revision: 2 });
    const restored = stateFrom(loadResult);
    expect(restored.seenQuestionIds).toEqual(profile.seenQuestionIds);
    expect(restored.seenConceptIds).toEqual(profile.seenConceptIds);
    expect(restored.answerEvents).toEqual(profile.answerEvents);
    expect(restored.answerCheckpoint).toEqual(profile.answerCheckpoint);
    expect(restored.rewardGrantIds).toEqual(profile.rewardGrantIds);
    expect(restored.bonus).toEqual(profile.bonus);
    expect(restored.bonusStartCommands).toEqual(profile.bonusStartCommands);
    expect(restored.latestBonusStartCommandIds).toEqual(
      profile.latestBonusStartCommandIds,
    );
    expect(restored.bonusTopicProgress).toEqual(profile.bonusTopicProgress);
    expect(
      calculateCompletionStreak("2027-01-23", restored.sessions).days,
    ).toBe(180);
    expect(Object.keys(restored.sessions)).toHaveLength(360);
  });
});
