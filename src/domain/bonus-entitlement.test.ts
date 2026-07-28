import { describe, expect, it } from "vitest";

import {
  createBonusEntitlement,
  grantStreakTicket,
  unlockBonus,
} from "./bonus-entitlement";

describe("bonus entitlement", () => {
  it("첫 보너스는 광고나 무료권 차감 없이 한 번만 연다", () => {
    const initial = createBonusEntitlement();

    const firstUnlock = unlockBonus(initial, "attempt-1");
    const restoredAttempt = unlockBonus(firstUnlock.state, "attempt-1");

    expect(firstUnlock.source).toBe("first_free");
    expect(firstUnlock.state.firstFreeUsed).toBe(true);
    expect(firstUnlock.state.ticketCount).toBe(0);
    expect(restoredAttempt.state).toEqual(firstUnlock.state);
  });

  it("같은 연속 참여 구간의 3일 보너스권을 한 번만 지급한다", () => {
    const initial = createBonusEntitlement();

    const granted = grantStreakTicket(initial, "2026-07-26", 3);
    const duplicated = grantStreakTicket(granted, "2026-07-26", 3);

    expect(duplicated.ticketCount).toBe(1);
    expect(duplicated.grantedMilestones).toEqual(["2026-07-26:3"]);
  });

  it("첫 무료 사용 후에는 무료권을 먼저 쓰고 없으면 광고를 요구한다", () => {
    const afterFirst = unlockBonus(
      createBonusEntitlement(),
      "attempt-first",
    ).state;
    const withTicket = grantStreakTicket(afterFirst, "2026-07-26", 3);

    const ticketUnlock = unlockBonus(withTicket, "attempt-ticket");
    const adUnlock = unlockBonus(ticketUnlock.state, "attempt-ad");

    expect(ticketUnlock.source).toBe("streak_ticket");
    expect(ticketUnlock.state.ticketCount).toBe(0);
    expect(adUnlock.source).toBe("reward_ad");
  });
});
