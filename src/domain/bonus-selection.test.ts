import { describe, expect, it } from "vitest";

import type { Question } from "./question";
import { selectBonusQuestions } from "./bonus-selection";

const bonusQuestions: Question[] = [
  {
    id: "digital-completed",
    lens: "now",
    topic: "digital",
    prompt: "완료한 디지털",
    choices: ["가", "나", "다"],
    answerIndex: 0,
    explanation: "해설",
    source: { name: "출처", url: "https://example.com/1" },
  },
  {
    id: "digital-1",
    lens: "now",
    topic: "digital",
    prompt: "디지털 1",
    choices: ["가", "나", "다"],
    answerIndex: 1,
    explanation: "해설",
    source: { name: "출처", url: "https://example.com/2" },
  },
  {
    id: "digital-2",
    lens: "now",
    topic: "digital",
    prompt: "디지털 2",
    choices: ["가", "나", "다"],
    answerIndex: 2,
    explanation: "해설",
    source: { name: "출처", url: "https://example.com/3" },
  },
  {
    id: "safety-1",
    lens: "life",
    topic: "safety",
    prompt: "안전 1",
    choices: ["가", "나", "다"],
    answerIndex: 0,
    explanation: "해설",
    source: { name: "출처", url: "https://example.com/4" },
  },
];

describe("selectBonusQuestions", () => {
  it("선택 주제의 미풀이 문제를 먼저 담고 부족한 수만 다른 주제로 채운다", () => {
    const result = selectBonusQuestions(
      "digital",
      bonusQuestions,
      new Set(["digital-completed"]),
    );

    expect(result.questions.map((question) => question.id)).toEqual([
      "digital-1",
      "digital-2",
      "safety-1",
    ]);
    expect(result.includesOtherTopics).toBe(true);
  });
});
