import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppsInTossRewardAdGateway } from "./reward-ad";

const sdk = vi.hoisted(() => ({
  load: vi.fn(),
  loadIsSupported: vi.fn(),
  show: vi.fn(),
  showIsSupported: vi.fn(),
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  loadFullScreenAd: Object.assign(sdk.load, {
    isSupported: sdk.loadIsSupported,
  }),
  showFullScreenAd: Object.assign(sdk.show, {
    isSupported: sdk.showIsSupported,
  }),
}));

describe("AppsInTossRewardAdGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("한 번의 광고 표시에서 중복 보상 콜백이 와도 한 개의 안정적인 보상 ID만 반환한다", async () => {
    let params: Parameters<typeof sdk.show>[0] | undefined;
    const cleanup = vi.fn();
    const createRewardGrantId = vi.fn(() => "stable-reward-id");
    sdk.showIsSupported.mockReturnValue(true);
    sdk.show.mockImplementation((nextParams) => {
      params = nextParams;
      return cleanup;
    });

    const gateway = new AppsInTossRewardAdGateway(
      "bonus-ad-group",
      createRewardGrantId,
    );
    const reward = gateway.show();

    params?.onEvent({ type: "userEarnedReward" });
    params?.onEvent({ type: "userEarnedReward" });
    params?.onEvent({ type: "dismissed" });
    params?.onEvent({ type: "dismissed" });

    expect(await reward).toEqual({ rewardGrantId: "stable-reward-id" });
    expect(createRewardGrantId).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("완료된 광고의 늦은 보상 콜백은 새 보상 ID를 만들지 않는다", async () => {
    let params: Parameters<typeof sdk.show>[0] | undefined;
    const cleanup = vi.fn();
    const createRewardGrantId = vi.fn(() => "late-reward-id");
    sdk.showIsSupported.mockReturnValue(true);
    sdk.show.mockImplementation((nextParams) => {
      params = nextParams;
      return cleanup;
    });

    const gateway = new AppsInTossRewardAdGateway(
      "bonus-ad-group",
      createRewardGrantId,
    );
    const reward = gateway.show();

    params?.onEvent({ type: "dismissed" });
    params?.onEvent({ type: "userEarnedReward" });

    await expect(reward).resolves.toBeNull();
    expect(createRewardGrantId).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
