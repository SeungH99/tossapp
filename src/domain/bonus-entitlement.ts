export type BonusUnlockSource =
  | "first_free"
  | "streak_ticket"
  | "reward_ad";

interface UnlockAttempt {
  attemptId: string;
  source: Exclude<BonusUnlockSource, "reward_ad">;
}

export interface BonusEntitlement {
  firstFreeUsed: boolean;
  ticketCount: number;
  grantedMilestones: string[];
  unlockAttempts: UnlockAttempt[];
}

export interface BonusUnlockResult {
  source: BonusUnlockSource;
  state: BonusEntitlement;
}

export function createBonusEntitlement(): BonusEntitlement {
  return {
    firstFreeUsed: false,
    ticketCount: 0,
    grantedMilestones: [],
    unlockAttempts: [],
  };
}

export function grantStreakTicket(
  state: BonusEntitlement,
  streakStartDate: string,
  streakDays: number,
): BonusEntitlement {
  if (streakDays !== 3 && streakDays !== 7) {
    return state;
  }

  const milestoneKey = `${streakStartDate}:${streakDays}`;
  if (state.grantedMilestones.includes(milestoneKey)) {
    return state;
  }

  return {
    ...state,
    ticketCount: state.ticketCount + 1,
    grantedMilestones: [...state.grantedMilestones, milestoneKey],
  };
}

export function unlockBonus(
  state: BonusEntitlement,
  attemptId: string,
): BonusUnlockResult {
  const existing = state.unlockAttempts.find(
    (attempt) => attempt.attemptId === attemptId,
  );

  if (existing != null) {
    return { source: existing.source, state };
  }

  if (!state.firstFreeUsed) {
    return {
      source: "first_free",
      state: {
        ...state,
        firstFreeUsed: true,
        unlockAttempts: [
          ...state.unlockAttempts,
          { attemptId, source: "first_free" },
        ],
      },
    };
  }

  if (state.ticketCount > 0) {
    return {
      source: "streak_ticket",
      state: {
        ...state,
        ticketCount: state.ticketCount - 1,
        unlockAttempts: [
          ...state.unlockAttempts,
          { attemptId, source: "streak_ticket" },
        ],
      },
    };
  }

  return { source: "reward_ad", state };
}
