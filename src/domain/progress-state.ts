import type {
  BonusEntitlement,
  BonusUnlockSource,
} from "./bonus-entitlement";
import type {
  BonusTopic,
  CoreLens,
  InternalDifficulty,
  Question,
} from "./question";
import type { QuizSession } from "./quiz-session";

export interface AnswerEvent {
  attemptId: string;
  sessionKey: string;
  questionId: string;
  questionKind: Question["kind"];
  topic: BonusTopic;
  lens: CoreLens;
  conceptId?: string;
  variant?: string;
  internalDifficulty?: InternalDifficulty;
  selectedIndex: number;
  isCorrect: boolean;
  answeredAt: string;
}

export interface QuestionAnswerCheckpoint {
  totalAnswers: number;
  correctAnswers: number;
}

export interface AnswerCheckpoint {
  totalAnswers: number;
  correctAnswers: number;
  byQuestion: Record<string, QuestionAnswerCheckpoint>;
}

export interface ProgressStateV1 {
  version: 1;
  sessions: Record<string, QuizSession>;
  bonus: BonusEntitlement;
  completedBonusIds: string[];
}

export interface BonusStartCommandRecord {
  commandId: string;
  dateKey: string;
  topic: BonusTopic;
  sessionKey: string;
  questionIds: string[];
  source: BonusUnlockSource;
}

export interface ProgressState {
  version: 2;
  sessions: Record<string, QuizSession>;
  bonus: BonusEntitlement;
  completedBonusIds: string[];
  answerEvents: AnswerEvent[];
  answerCheckpoint: AnswerCheckpoint;
  rewardGrantIds: string[];
  bonusStartCommands: Record<string, BonusStartCommandRecord>;
}
