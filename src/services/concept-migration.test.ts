import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import conceptMigrationMap from "../content/concept-map.json";
import corePack from "../content/core/pack-001.json";
import languagePack from "../content/bonus/language/pack-001.json";
import { coreQuestions, bonusQuestions } from "../data/questions";
import { findSeenQuestion } from "../domain/progress-commands";
import type { ProgressStateV3 } from "../domain/progress-state";
import type { BonusQuestion } from "../domain/question";
import {
  createEmptyProgress,
  migrateV3ToV4,
  type ConceptMigrationMap,
} from "./progress-repository";

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function loadHistoricalConceptMap(): Record<string, string> {
  const path = resolve("src/content/legacy-concept-map.json");
  return existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as Record<string, string>)
    : {};
}

function v3ProgressWithAnsweredQuestion(questionId: string): ProgressStateV3 {
  const current = createEmptyProgress();
  const {
    seenQuestionIds: _seenQuestionIds,
    seenConceptIds: _seenConceptIds,
    bonusTopicProgress: _bonusTopicProgress,
    ...v3Fields
  } = current;
  void _seenQuestionIds;
  void _seenConceptIds;
  void _bonusTopicProgress;

  return {
    ...v3Fields,
    version: 3,
    answerEvents: [
      {
        attemptId: "legacy-language-answer",
        sessionKey: "legacy-language-session",
        questionId,
        questionKind: "bonus",
        topic: "language",
        lens: "life",
        selectedIndex: 1,
        isCorrect: true,
        answeredAt: "2026-08-04T12:00:00.000Z",
      },
    ],
    bonusTopicProgress: {
      nostalgia: { completedSetIndexes: [] },
      "korean-life": { completedSetIndexes: [] },
      language: { completedSetIndexes: [] },
      digital: { completedSetIndexes: [] },
      safety: { completedSetIndexes: [] },
      "nature-general": { completedSetIndexes: [] },
    },
  };
}

describe("historical concept migration", () => {
  it("covers every known production question from the legacy data assets", () => {
    const historicalConcepts = loadHistoricalConceptMap();
    const knownLegacyIds = [...coreQuestions, ...bonusQuestions]
      .map(({ id }) => id)
      .sort(compareOrdinal);

    expect(
      knownLegacyIds.filter(
        (questionId) => historicalConcepts[questionId] == null,
      ),
    ).toEqual([]);
    expect(historicalConcepts["2026-08-14-then-18-v1"]).toBe(
      "korean-life-kimjang-community-winter-preparation",
    );
  });

  it("migrates legacy 웬일 to the released concept and rejects it as a duplicate", () => {
    const currentWenil = languagePack.questions.find(
      ({ id }) => id === "bonus-language-001-s00-stretch-wenil",
    );
    if (currentWenil == null) {
      throw new Error("Expected the released 웬일 question fixture");
    }

    const migrated = migrateV3ToV4(
      v3ProgressWithAnsweredQuestion("bonus-language-2"),
      conceptMigrationMap as ConceptMigrationMap,
    );

    expect(currentWenil.conceptId).toBe(
      "language-spelling-wenil-unexpected-event",
    );
    expect(migrated.seenQuestionIds).toContain("bonus-language-2");
    expect(migrated.seenConceptIds).toContain(currentWenil.conceptId);
    expect(
      findSeenQuestion(migrated, [currentWenil as unknown as BonusQuestion]),
    ).toEqual({ kind: "concept-id", value: currentWenil.conceptId });
  });

  it("keeps an unknown historical ID question-only during migration", () => {
    const migrated = migrateV3ToV4(
      v3ProgressWithAnsweredQuestion("unknown-historical-question"),
      conceptMigrationMap as ConceptMigrationMap,
    );

    expect(migrated.seenQuestionIds).toContain("unknown-historical-question");
    expect(migrated.seenConceptIds).toEqual([]);
  });

  it("restores an in-progress V3 kimjang session with its exact historical payload", () => {
    const stableQuestionId = "2026-08-14-then-18-v1";
    const activeSession = {
      dateKey: "2026-08-14",
      currentIndex: 0,
      phase: "explanation" as const,
      answers: [
        {
          questionId: stableQuestionId,
          selectedIndex: 1,
          isCorrect: true,
        },
      ],
    };
    const base = v3ProgressWithAnsweredQuestion(stableQuestionId);
    const migrated = migrateV3ToV4(
      {
        ...base,
        sessions: { [activeSession.dateKey]: activeSession },
        answerEvents: base.answerEvents.map((event) => ({
          ...event,
          sessionKey: activeSession.dateKey,
          questionKind: "core" as const,
          topic: "korean-life" as const,
          lens: "then" as const,
        })),
      },
      conceptMigrationMap as ConceptMigrationMap,
    );
    const restored = corePack.questions.find(
      ({ id }) => id === stableQuestionId,
    );

    expect(migrated.sessions[activeSession.dateKey]).toEqual(activeSession);
    expect(migrated.seenQuestionIds).toContain(stableQuestionId);
    expect(migrated.seenConceptIds).toContain(
      "korean-life-kimjang-community-winter-preparation",
    );
    expect(restored).toEqual({
      kind: "core",
      id: stableQuestionId,
      conceptId: "korean-life-kimjang-community-winter-preparation",
      dateKey: "2026-08-14",
      lens: "then",
      topic: "korean-life",
      internalDifficulty: "gentle",
      prompt:
        "늦가을이면 이웃들이 많은 채소를 한꺼번에 손질하고 나누었습니다. 겨울 먹거리를 준비하던 이 공동체 풍습은 무엇을 가리킬까요?",
      choices: [
        "메주를 띄워 봄에 장을 가르는 장 담그기",
        "김치를 함께 담가 집집마다 나누는 김장",
        "햇곡식으로 술과 떡을 빚는 추수 의례",
      ],
      answerIndex: 1,
      explanation:
        "김장은 늦가을에 공동체가 많은 김치를 만들고 나누며 겨울 먹거리를 마련하는 풍습입니다. 집집마다 조리법을 전하고 이웃 간 협력도 다졌습니다.",
      source: {
        name: "유네스코 무형유산",
        url: "https://ich.unesco.org/en/RL/kimjang-making-and-sharing-kimchi-in-the-republic-of-korea-00881",
      },
      contentVersion: "2026.08.180d",
      reviewStatus: "reviewed",
      reviewedAt: "2026-08-04",
    });
  });
});
