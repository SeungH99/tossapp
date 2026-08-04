import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";

export interface RewardAdGateway {
  load(): Promise<boolean>;
  show(): Promise<RewardAdReward | null>;
}

export interface RewardAdReward {
  rewardGrantId: string;
}

type RewardGrantIdFactory = () => string;

function defaultRewardGrantId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `reward-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export class AppsInTossRewardAdGateway implements RewardAdGateway {
  constructor(
    private readonly adGroupId: string,
    private readonly createRewardGrantId: RewardGrantIdFactory = defaultRewardGrantId,
  ) {}

  async load(): Promise<boolean> {
    if (!loadFullScreenAd.isSupported()) {
      return false;
    }

    return new Promise((resolve) => {
      let settled = false;
      const cleanupRef: { current?: () => void } = {};
      const finish = (loaded: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanupRef.current?.();
        resolve(loaded);
      };

      const cleanup = loadFullScreenAd({
        options: { adGroupId: this.adGroupId },
        onEvent: (event) => {
          if (event.type === "loaded") {
            finish(true);
          }
        },
        onError: () => finish(false),
      });
      cleanupRef.current = cleanup;
      if (settled) {
        cleanup();
      }
    });
  }

  async show(): Promise<RewardAdReward | null> {
    if (!showFullScreenAd.isSupported()) {
      return null;
    }

    return new Promise((resolve) => {
      let reward: RewardAdReward | null = null;
      let settled = false;
      const cleanupRef: { current?: () => void } = {};
      const finish = (result: RewardAdReward | null) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanupRef.current?.();
        resolve(result);
      };

      const cleanup = showFullScreenAd({
        options: { adGroupId: this.adGroupId },
        onEvent: (event) => {
          if (settled) {
            return;
          }
          if (event.type === "userEarnedReward") {
            reward ??= { rewardGrantId: this.createRewardGrantId() };
            finish(reward);
          }
          if (event.type === "dismissed") {
            finish(reward);
          }
          if (event.type === "failedToShow") {
            finish(null);
          }
        },
        onError: () => finish(null),
      });
      cleanupRef.current = cleanup;
      if (settled) {
        cleanup();
      }
    });
  }
}
