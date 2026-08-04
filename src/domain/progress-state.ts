import type { BonusEntitlement, BonusUnlockSource } from "./bonus-entitlement";
import type {
  BonusTopic,
  CoreLens,
  InternalDifficulty,
  Question,
} from "./question";
import type { QuizSession } from "./quiz-session";
import type { ShadowAudit } from "./shadow-audit";
import type { TimeObservation } from "./time-confidence";

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
  setIndex?: number;
  sessionKey: string;
  questionIds: string[];
  source: BonusUnlockSource;
}

export interface ProgressStateV2 {
  version: 2;
  sessions: Record<string, QuizSession>;
  bonus: BonusEntitlement;
  completedBonusIds: string[];
  answerEvents: AnswerEvent[];
  answerCheckpoint: AnswerCheckpoint;
  rewardGrantIds: string[];
  rewardAdTicketCount: number;
  bonusStartCommands: Record<string, BonusStartCommandRecord>;
  latestBonusStartCommandIds: Record<string, string>;
  timeObservation: TimeObservation;
  shadowAudits: ShadowAudit[];
}

export interface BonusTopicProgress {
  completedSetIndexes: number[];
  lastCompletedDateKey?: string;
}

export function deriveNextSetIndex(
  completedSetIndexes: readonly number[],
): number | undefined {
  const completed = new Set(completedSetIndexes);
  for (let setIndex = 0; setIndex < 180; setIndex += 1) {
    if (!completed.has(setIndex)) {
      return setIndex;
    }
  }
  return undefined;
}

export interface ProgressState extends Omit<ProgressStateV2, "version"> {
  version: 3;
  bonusTopicProgress: Record<BonusTopic, BonusTopicProgress>;
}
