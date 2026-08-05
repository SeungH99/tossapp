import { TossAds } from "@apps-in-toss/web-framework";

export type BannerAdEvent =
  "rendered" | "impression" | "viewable" | "clicked" | "unavailable";

export interface BannerAdGateway {
  attach(
    target: HTMLElement,
    onEvent: (event: BannerAdEvent) => void,
  ): () => void;
}

export class AppsInTossBannerAdGateway implements BannerAdGateway {
  constructor(private readonly adGroupId: string) {}

  attach(
    target: HTMLElement,
    onEvent: (event: BannerAdEvent) => void,
  ): () => void {
    let active = true;
    let attached: { destroy(): void } | undefined;
    let unavailableReported = false;
    const emit = (event: BannerAdEvent) => {
      if (active) {
        onEvent(event);
      }
    };
    const reportUnavailable = () => {
      if (!unavailableReported) {
        unavailableReported = true;
        emit("unavailable");
      }
    };

    if (
      !TossAds.initialize.isSupported() ||
      !TossAds.attachBanner.isSupported()
    ) {
      reportUnavailable();
      return () => {
        active = false;
      };
    }

    try {
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            if (!active) {
              return;
            }
            try {
              attached = TossAds.attachBanner(this.adGroupId, target, {
                theme: "auto",
                tone: "blackAndWhite",
                variant: "expanded",
                callbacks: {
                  onAdRendered: () => emit("rendered"),
                  onAdImpression: () => emit("impression"),
                  onAdViewable: () => emit("viewable"),
                  onAdClicked: () => emit("clicked"),
                  onNoFill: reportUnavailable,
                  onAdFailedToRender: reportUnavailable,
                },
              });
            } catch {
              reportUnavailable();
            }
          },
          onInitializationFailed: reportUnavailable,
        },
      });
    } catch {
      reportUnavailable();
    }

    return () => {
      active = false;
      attached?.destroy();
    };
  }
}
