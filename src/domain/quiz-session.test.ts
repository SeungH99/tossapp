import { describe, expect, it } from "vitest";

import type { CoreQuestion } from "./question";

const contentMetadata = {
  contentVersion: "test",
  reviewStatus: "reviewed" as const,
  reviewedAt: "2026-08-04",
};
import {
  advanceQuiz,
  answerCurrentQuestion,
  createQuizSession,
  scoreQuiz,
  selectDailyCoreSet,
} from "./quiz-session";

const questions: CoreQuestion[] = [
  {
    kind: "core",
    id: "life-1",
    dateKey: "2026-07-28",
    internalDifficulty: "gentle",
    ...contentMetadata,
    lens: "life",
    topic: "safety",
    prompt: "생활 문제",
    choices: ["가", "나", "다"],
    answerIndex: 0,
    explanation: "생활 해설",
    source: { name: "출처", url: "https://example.com/life" },
  },
  {
    kind: "core",
    id: "then-1",
    dateKey: "2026-07-28",
    internalDifficulty: "steady",
    ...contentMetadata,
    lens: "then",
    topic: "nostalgia",
    prompt: "그때 문제",
    choices: ["가", "나", "다"],
    answerIndex: 1,
    explanation: "그때 해설",
    source: { name: "출처", url: "https://example.com/then" },
  },
  {
    kind: "core",
    id: "now-1",
    dateKey: "2026-07-28",
    internalDifficulty: "stretch",
    ...contentMetadata,
    lens: "now",
    topic: "digital",
    prompt: "요즘 문제",
    choices: ["가", "나", "다"],
    answerIndex: 2,
    explanation: "요즘 해설",
    source: { name: "출처", url: "https://example.com/now" },
  },
  {
    kind: "core",
    id: "other-day",
    dateKey: "2026-07-29",
    internalDifficulty: "gentle",
    ...contentMetadata,
    lens: "then",
    topic: "nostalgia",
    prompt: "다른 날 문제",
    choices: ["가", "나", "다"],
    answerIndex: 0,
    explanation: "다른 날 해설",
    source: { name: "출처", url: "https://example.com/other" },
  },
];

describe("selectDailyCoreSet", () => {
  it("같은 날짜의 그때·요즘·생활 문제를 고정 순서로 고른다", () => {
    const selected = selectDailyCoreSet("2026-07-28", questions);

    expect(selected.map((question) => question.id)).toEqual([
      "then-1",
      "now-1",
      "life-1",
    ]);
  });

  it("등록된 날짜가 없어도 보유 문제를 순환해 세 문제를 제공한다", () => {
    const selected = selectDailyCoreSet("2026-08-01", questions);

    expect(selected).toHaveLength(3);
    expect(selected.map((question) => question.lens)).toEqual([
      "then",
      "now",
      "life",
    ]);
  });
});

describe("core quiz session", () => {
  it("첫 답안을 채점한 뒤 같은 문제의 답을 바꾸지 못하게 잠근다", () => {
    const [question] = selectDailyCoreSet("2026-07-28", questions);
    const session = createQuizSession("2026-07-28");

    const answered = answerCurrentQuestion(session, question, 0);
    const doubleTapped = answerCurrentQuestion(answered, question, 1);

    expect(doubleTapped.answers).toEqual([
      {
        questionId: "then-1",
        selectedIndex: 0,
        isCorrect: false,
      },
    ]);
    expect(doubleTapped.phase).toBe("explanation");
  });

  it("세 번째 해설을 넘기면 완료하고 맞힌 개수를 계산한다", () => {
    const selected = selectDailyCoreSet("2026-07-28", questions);
    let session = createQuizSession("2026-07-28");

    session = answerCurrentQuestion(session, selected[0], 1);
    session = advanceQuiz(session, selected.length);
    session = answerCurrentQuestion(session, selected[1], 0);
    session = advanceQuiz(session, selected.length);
    session = answerCurrentQuestion(session, selected[2], 0);
    session = advanceQuiz(session, selected.length);

    expect(session.phase).toBe("completed");
    expect(scoreQuiz(session)).toBe(2);
  });
});
