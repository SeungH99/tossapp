import { unlockBonus, type BonusUnlockSource } from "./bonus-entitlement";
import { selectShadowBonusQuestions } from "./personalization-engine";
import type { BonusQuestion, BonusTopic, Question } from "./question";
import type {
  AnswerCheckpoint,
  AnswerEvent,
  ProgressState,
} from "./progress-state";
import {
  answerCurrentQuestion,
  createQuizSession,
  type QuizSession,
} from "./quiz-session";
import { appendShadowAudit } from "./shadow-audit";

export const ANSWER_EVENT_LIMIT = 512;

export interface AnswerCommand {
  attemptId: string;
  sessionKey: string;
  session: QuizSession;
  question: Question;
  selectedIndex: number;
  answeredAt: string;
}

export interface ApplyAnswerResult {
  applied: boolean;
  state: ProgressState;
  session: QuizSession;
}

export interface GrantBonusTicketResult {
  applied: boolean;
  state: ProgressState;
}

export type StartBonusSessionResult =
  | {
      applied: true;
      state: ProgressState;
      source: BonusUnlockSource;
      session: QuizSession;
      questionIds: string[];
    }
  | {
      applied: false;
      reason: "duplicate" | "no-questions" | "reward-ad-required";
      state: ProgressState;
      source?: BonusUnlockSource;
      session?: QuizSession;
      questionIds?: string[];
    };

function foldEvent(
  checkpoint: AnswerCheckpoint,
  event: AnswerEvent,
): AnswerCheckpoint {
  const currentQuestion = checkpoint.byQuestion[event.questionId] ?? {
    totalAnswers: 0,
    correctAnswers: 0,
  };

  return {
    totalAnswers: checkpoint.totalAnswers + 1,
    correctAnswers:
      checkpoint.correctAnswers + (event.isCorrect ? 1 : 0),
    byQuestion: {
      ...checkpoint.byQuestion,
      [event.questionId]: {
        totalAnswers: currentQuestion.totalAnswers + 1,
        correctAnswers:
          currentQuestion.correctAnswers + (event.isCorrect ? 1 : 0),
      },
    },
  };
}

function createAnswerEvent(command: AnswerCommand): AnswerEvent {
  const { question } = command;
  return {
    attemptId: command.attemptId,
    sessionKey: command.sessionKey,
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
    selectedIndex: command.selectedIndex,
    isCorrect: command.selectedIndex === question.answerIndex,
    answeredAt: command.answeredAt,
  };
}

export function applyAnswerCommand(
  state: ProgressState,
  command: AnswerCommand,
): ApplyAnswerResult {
  const session = state.sessions[command.sessionKey] ?? command.session;
  if (session.dateKey !== command.sessionKey) {
    throw new Error("Quiz session key does not match its date key");
  }

  if (
    !Number.isInteger(command.selectedIndex) ||
    command.selectedIndex < 0 ||
    command.selectedIndex >= command.question.choices.length
  ) {
    throw new RangeError("Selected answer index is out of range");
  }

  const duplicate = state.answerEvents.some(
    (event) => event.attemptId === command.attemptId,
  );
  if (duplicate) {
    return { applied: false, state, session };
  }

  const nextSession = answerCurrentQuestion(
    session,
    command.question,
    command.selectedIndex,
  );
  if (nextSession === session) {
    throw new Error("Quiz session is not ready to accept an answer");
  }

  const events = [...state.answerEvents, createAnswerEvent(command)];
  let answerCheckpoint = state.answerCheckpoint;
  while (events.length > ANSWER_EVENT_LIMIT) {
    const oldest = events.shift();
    if (oldest != null) {
      answerCheckpoint = foldEvent(answerCheckpoint, oldest);
    }
  }

  const nextState: ProgressState = {
    ...state,
    sessions: {
      ...state.sessions,
      [command.sessionKey]: nextSession,
    },
    answerEvents: events,
    answerCheckpoint,
  };

  return {
    applied: true,
    state: nextState,
    session: nextSession,
  };
}

export function grantBonusTicketCommand(
  state: ProgressState,
  rewardGrantId: string,
): GrantBonusTicketResult {
  if (rewardGrantId.trim().length === 0) {
    throw new TypeError("rewardGrantId must not be empty");
  }

  if (state.rewardGrantIds.includes(rewardGrantId)) {
    return { applied: false, state };
  }

  return {
    applied: true,
    state: {
      ...state,
      bonus: {
        ...state.bonus,
        ticketCount: state.bonus.ticketCount + 1,
      },
      rewardGrantIds: [...state.rewardGrantIds, rewardGrantId],
      rewardAdTicketCount: state.rewardAdTicketCount + 1,
    },
  };
}

export function startBonusSessionCommand(
  state: ProgressState,
  commandId: string,
  dateKey: string,
  topic: BonusTopic,
  bonusQuestions: BonusQuestion[],
): StartBonusSessionResult {
  if (commandId.trim().length === 0) {
    throw new TypeError("commandId must not be empty");
  }

  const completed = Object.hasOwn(state.bonusStartCommands, commandId)
    ? state.bonusStartCommands[commandId]
    : undefined;
  if (completed != null) {
    return {
      applied: false,
      reason: "duplicate",
      state,
      source: completed.source,
      session: state.sessions[completed.sessionKey],
      questionIds: completed.questionIds,
    };
  }

  const decision = selectShadowBonusQuestions({
    topic,
    questions: bonusQuestions,
    completedBonusIds: state.completedBonusIds,
    answerEvents: state.answerEvents,
    timeConfidence: state.timeObservation.confidence,
  });
  if (decision.visibleSelection.questions.length === 0) {
    return { applied: false, reason: "no-questions", state };
  }

  const rewardAdTicketAvailable = state.rewardAdTicketCount > 0;
  const unlock = unlockBonus(
    state.bonus,
    commandId,
    rewardAdTicketAvailable ? "reward_ad" : "streak_ticket",
  );
  if (unlock.source === "reward_ad" && state.bonus.ticketCount === 0) {
    return {
      applied: false,
      reason: "reward-ad-required",
      state,
      source: unlock.source,
    };
  }

  const sessionKey = `${dateKey}:bonus:${topic}`;
  const session = createQuizSession(sessionKey);
  const questionIds = decision.visibleSelection.questions.map(
    (question) => question.id,
  );
  const record = {
    commandId,
    dateKey,
    topic,
    sessionKey,
    questionIds,
    source: unlock.source,
  };
  const nextState: ProgressState = {
    ...state,
    bonus: unlock.state,
    rewardAdTicketCount:
      unlock.source === "reward_ad"
        ? state.rewardAdTicketCount - 1
        : state.rewardAdTicketCount,
    sessions: {
      ...state.sessions,
      [sessionKey]: session,
    },
    bonusStartCommands: {
      ...state.bonusStartCommands,
      [commandId]: record,
    },
    latestBonusStartCommandIds: {
      ...state.latestBonusStartCommandIds,
      [sessionKey]: commandId,
    },
    shadowAudits: appendShadowAudit(
      state.shadowAudits,
      decision.audit,
      state.timeObservation.confidence,
    ),
  };

  return {
    applied: true,
    state: nextState,
    source: unlock.source,
    session,
    questionIds,
  };
}
