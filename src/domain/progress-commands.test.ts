import { describe, expect, it } from "vitest";

import { createEmptyProgress } from "../services/progress-repository";
import * as progressCommands from "./progress-commands";
import type { BonusQuestion, CoreQuestion } from "./question";
import { createQuizSession } from "./quiz-session";
import {
  ANSWER_EVENT_LIMIT,
  applyAnswerCommand,
} from "./progress-commands";

const question: CoreQuestion = {
  kind: "core",
  id: "then-phone",
  dateKey: "2026-07-28",
  lens: "then",
  topic: "nostalgia",
  prompt: "공중전화에서 통화를 이어 가려면 무엇을 넣었을까요?",
  choices: ["동전", "우표", "열쇠"],
  answerIndex: 0,
  explanation: "동전을 넣어 통화를 이어 갔어요.",
  source: { name: "국가기록원", url: "https://www.archives.go.kr/" },
};

const bonusQuestions: BonusQuestion[] = [
  {
    kind: "bonus",
    id: "bonus-digital-1",
    conceptId: "digital-1",
    variant: "base",
    internalDifficulty: "steady",
    lens: "now",
    topic: "digital",
    prompt: "디지털 문제 1",
    choices: ["하나", "둘", "셋"],
    answerIndex: 0,
    explanation: "설명 1",
    source: { name: "출처", url: "https://example.com/1" },
  },
  {
    kind: "bonus",
    id: "bonus-digital-2",
    conceptId: "digital-2",
    variant: "base",
    internalDifficulty: "steady",
    lens: "now",
    topic: "digital",
    prompt: "디지털 문제 2",
    choices: ["하나", "둘", "셋"],
    answerIndex: 1,
    explanation: "설명 2",
    source: { name: "출처", url: "https://example.com/2" },
  },
];

describe("applyAnswerCommand", () => {
  it("세션 답변과 AnswerEvent를 하나의 새 상태로 계산한다", () => {
    const state = createEmptyProgress();
    state.sessions["2026-07-28"] = createQuizSession("2026-07-28");

    const result = applyAnswerCommand(state, {
      attemptId: "core:2026-07-28:then-phone:0",
      sessionKey: "2026-07-28",
      session: state.sessions["2026-07-28"],
      question,
      selectedIndex: 0,
      answeredAt: "2026-07-28T12:00:00.000Z",
    });

    expect(result.applied).toBe(true);
    expect(result.session.phase).toBe("explanation");
    expect(result.state.sessions["2026-07-28"].answers).toEqual([
      {
        questionId: "then-phone",
        selectedIndex: 0,
        isCorrect: true,
      },
    ]);
    expect(result.state.answerEvents).toEqual([
      expect.objectContaining({
        attemptId: "core:2026-07-28:then-phone:0",
        questionId: "then-phone",
        isCorrect: true,
      }),
    ]);
    expect(state.sessions["2026-07-28"].answers).toEqual([]);
  });

  it("같은 attemptId를 다시 적용하면 기존 결과를 그대로 반환한다", () => {
    const state = createEmptyProgress();
    state.sessions["2026-07-28"] = createQuizSession("2026-07-28");
    const command = {
      attemptId: "core:2026-07-28:then-phone:0",
      sessionKey: "2026-07-28",
      session: state.sessions["2026-07-28"],
      question,
      selectedIndex: 0,
      answeredAt: "2026-07-28T12:00:00.000Z",
    } as const;
    const first = applyAnswerCommand(state, command);

    const duplicate = applyAnswerCommand(first.state, command);

    expect(duplicate.applied).toBe(false);
    expect(duplicate.state).toBe(first.state);
    expect(duplicate.state.answerEvents).toHaveLength(1);
    expect(duplicate.session.answers).toHaveLength(1);
  });

  it("최근 이벤트 상한을 넘으면 오래된 답변을 checkpoint에 접는다", () => {
    let state = createEmptyProgress();

    for (let index = 0; index <= ANSWER_EVENT_LIMIT; index += 1) {
      const sessionKey = `session-${index}`;
      state = {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionKey]: createQuizSession(sessionKey),
        },
      };
      state = applyAnswerCommand(state, {
        attemptId: `attempt-${index}`,
        sessionKey,
        session: state.sessions[sessionKey],
        question,
        selectedIndex: index % 2,
        answeredAt: "2026-07-28T12:00:00.000Z",
      }).state;
    }

    expect(state.answerEvents).toHaveLength(ANSWER_EVENT_LIMIT);
    expect(state.answerCheckpoint.totalAnswers).toBe(1);
    expect(state.answerCheckpoint.byQuestion["then-phone"]).toEqual({
      totalAnswers: 1,
      correctAnswers: 1,
    });
  });

});

describe("bonus progress commands", () => {
  it("keeps the legacy bonus question order while recording the pilot shadow decision", () => {
    const result = progressCommands.startBonusSessionCommand(
      createEmptyProgress(),
      "shadowed-digital-start",
      "2026-07-28",
      "digital",
      bonusQuestions,
    );

    expect(result).toMatchObject({
      applied: true,
      questionIds: ["bonus-digital-1", "bonus-digital-2"],
    });
    expect(result.state.bonusStartCommands["shadowed-digital-start"])
      .toMatchObject({ questionIds: ["bonus-digital-1", "bonus-digital-2"] });
    expect(result.state.shadowAudits).toEqual([
      {
        legacyQuestionIds: ["bonus-digital-1", "bonus-digital-2"],
        shadowQuestionIds: ["bonus-digital-1", "bonus-digital-2"],
        policyVersion: "personalization-v1",
        reasonCode: "insufficient-history",
      },
    ]);
  });

  it("records a safety pilot decision without changing the legacy selection", () => {
    const safetyQuestions = bonusQuestions.map((question) => ({
      ...question,
      id: question.id.replace("digital", "safety"),
      conceptId: question.conceptId.replace("digital", "safety"),
      topic: "safety" as const,
    }));

    const result = progressCommands.startBonusSessionCommand(
      createEmptyProgress(),
      "shadowed-safety-start",
      "2026-07-28",
      "safety",
      safetyQuestions,
    );

    expect(result).toMatchObject({
      applied: true,
      questionIds: ["bonus-safety-1", "bonus-safety-2"],
    });
    expect(result.state.bonusStartCommands["shadowed-safety-start"])
      .toMatchObject({ questionIds: ["bonus-safety-1", "bonus-safety-2"] });
    expect(result.state.shadowAudits[0]).toMatchObject({
      legacyQuestionIds: ["bonus-safety-1", "bonus-safety-2"],
      shadowQuestionIds: ["bonus-safety-1", "bonus-safety-2"],
      reasonCode: "insufficient-history",
    });
  });

  it("같은 rewardGrantId를 다시 적용해도 보너스 이용권은 한 번만 지급한다", () => {
    expect(progressCommands).toHaveProperty("grantBonusTicketCommand");
    const grantBonusTicketCommand = progressCommands.grantBonusTicketCommand;
    const initial = createEmptyProgress();

    const first = grantBonusTicketCommand(initial, "reward-1");
    const duplicate = grantBonusTicketCommand(first.state, "reward-1");

    expect(first.applied).toBe(true);
    expect(first.state.bonus.ticketCount).toBe(1);
    expect(first.state.rewardGrantIds).toEqual(["reward-1"]);
    expect(first.state).toMatchObject({ rewardAdTicketCount: 1 });
    expect(duplicate.applied).toBe(false);
    expect(duplicate.state).toBe(first.state);
    expect(() => grantBonusTicketCommand(initial, "  ")).toThrow(
      "rewardGrantId must not be empty",
    );
  });

  it("광고 보상으로 지급한 이용권은 보너스 시작 출처를 reward_ad로 보존한다", () => {
    const initial = {
      ...createEmptyProgress(),
      bonus: {
        ...createEmptyProgress().bonus,
        firstFreeUsed: true,
      },
    };
    const granted = progressCommands.grantBonusTicketCommand(
      initial,
      "private-reward-grant",
    );

    const result = progressCommands.startBonusSessionCommand(
      granted.state,
      "bonus-command-from-ad",
      "2026-07-28",
      "digital",
      bonusQuestions,
    );

    expect(result).toMatchObject({ applied: true, source: "reward_ad" });
    expect(result.state).toMatchObject({ rewardAdTicketCount: 0 });
    expect(
      result.state.bonusStartCommands["bonus-command-from-ad"],
    ).toMatchObject({
      source: "reward_ad",
    });
    expect(
      JSON.stringify(result.state.bonusStartCommands["bonus-command-from-ad"]),
    ).not.toContain("private-reward-grant");
  });

  it("보너스 시작은 이용권 소비와 선택된 세션을 하나의 상태로 만든다", () => {
    expect(progressCommands).toHaveProperty("startBonusSessionCommand");
    const startBonusSessionCommand = progressCommands.startBonusSessionCommand;
    const initial = {
      ...createEmptyProgress(),
      bonus: {
        ...createEmptyProgress().bonus,
        firstFreeUsed: true,
        ticketCount: 1,
      },
    };

    const result = startBonusSessionCommand(
      initial,
      "bonus-command-1",
      "2026-07-28",
      "digital",
      bonusQuestions,
    );

    expect(result).toMatchObject({ applied: true, source: "streak_ticket" });
    expect(result.state.bonus.ticketCount).toBe(0);
    expect(result.state.bonusStartCommands["bonus-command-1"]).toEqual({
      commandId: "bonus-command-1",
      dateKey: "2026-07-28",
      topic: "digital",
      sessionKey: "2026-07-28:bonus:digital",
      questionIds: ["bonus-digital-1", "bonus-digital-2"],
      source: "streak_ticket",
    });
    expect(result.state).toMatchObject({
      latestBonusStartCommandIds: {
        "2026-07-28:bonus:digital": "bonus-command-1",
      },
    });
    expect(result.session).toEqual({
      dateKey: "2026-07-28:bonus:digital",
      currentIndex: 0,
      phase: "question",
      answers: [],
    });

    const duplicate = startBonusSessionCommand(
      result.state,
      "bonus-command-1",
      "2026-07-28",
      "digital",
      [],
    );

    expect(duplicate).toMatchObject({
      applied: false,
      reason: "duplicate",
      questionIds: ["bonus-digital-1", "bonus-digital-2"],
    });
  });

  it("프로토타입 키 commandId도 새 세션을 시작한 뒤에만 멱등 처리한다", () => {
    const startBonusSessionCommand = progressCommands.startBonusSessionCommand;
    const initial = createEmptyProgress();

    const first = startBonusSessionCommand(
      initial,
      "__proto__",
      "2026-07-28",
      "digital",
      bonusQuestions,
    );

    expect(first).toMatchObject({ applied: true, source: "first_free" });
    expect(first.state.bonus.firstFreeUsed).toBe(true);
    expect(Object.hasOwn(first.state.bonusStartCommands, "__proto__")).toBe(
      true,
    );

    const duplicate = startBonusSessionCommand(
      first.state,
      "__proto__",
      "2026-07-28",
      "digital",
      bonusQuestions,
    );

    expect(duplicate).toMatchObject({ applied: false, reason: "duplicate" });
  });
});
