import { describe, expect, it } from "vitest";

import { createEmptyProgress } from "../services/progress-repository";
import type { CoreQuestion } from "./question";
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
