import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";

export interface RewardAdGateway {
  load(): Promise<boolean>;
  show(): Promise<boolean>;
}

export class AppsInTossRewardAdGateway implements RewardAdGateway {
  constructor(private readonly adGroupId: string) {}

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

  async show(): Promise<boolean> {
    if (!showFullScreenAd.isSupported()) {
      return false;
    }

    return new Promise((resolve) => {
      let rewarded = false;
      let settled = false;
      const cleanupRef: { current?: () => void } = {};
      const finish = (didEarnReward: boolean) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanupRef.current?.();
        resolve(didEarnReward);
      };

      const cleanup = showFullScreenAd({
        options: { adGroupId: this.adGroupId },
        onEvent: (event) => {
          if (event.type === "userEarnedReward") {
            rewarded = true;
          }
          if (event.type === "dismissed") {
            finish(rewarded);
          }
          if (event.type === "failedToShow") {
            finish(false);
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
}
