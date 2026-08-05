import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppsInTossBannerAdGateway } from "./banner-ad";

const sdk = vi.hoisted(() => ({
  attachBanner: vi.fn(),
  attachBannerIsSupported: vi.fn(),
  initialize: vi.fn(),
  initializeIsSupported: vi.fn(),
}));

vi.mock("@apps-in-toss/web-framework", () => ({
  TossAds: {
    attachBanner: Object.assign(sdk.attachBanner, {
      isSupported: sdk.attachBannerIsSupported,
    }),
    initialize: Object.assign(sdk.initialize, {
      isSupported: sdk.initializeIsSupported,
    }),
  },
}));

describe("AppsInTossBannerAdGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sdk.initializeIsSupported.mockReturnValue(true);
    sdk.attachBannerIsSupported.mockReturnValue(true);
  });

  it("initializes Toss Ads, attaches the result banner, and destroys it on cleanup", () => {
    const target = document.createElement("div");
    const events: string[] = [];
    const destroy = vi.fn();
    sdk.attachBanner.mockReturnValue({ destroy });

    const gateway = new AppsInTossBannerAdGateway("result-banner-group");
    const cleanup = gateway.attach(target, (event) => events.push(event));

    expect(sdk.initialize).toHaveBeenCalledTimes(1);
    const initializeOptions = sdk.initialize.mock.calls[0]?.[0];
    initializeOptions.callbacks.onInitialized();

    expect(sdk.attachBanner).toHaveBeenCalledWith(
      "result-banner-group",
      target,
      expect.objectContaining({
        theme: "auto",
        tone: "blackAndWhite",
        variant: "expanded",
      }),
    );
    const attachOptions = sdk.attachBanner.mock.calls[0]?.[2];
    attachOptions.callbacks.onAdRendered({ slotId: "result-slot" });
    attachOptions.callbacks.onAdImpression({ slotId: "result-slot" });
    attachOptions.callbacks.onAdViewable({ slotId: "result-slot" });
    attachOptions.callbacks.onAdClicked({ slotId: "result-slot" });

    expect(events).toEqual(["rendered", "impression", "viewable", "clicked"]);

    cleanup();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("reports unavailable without leaving a banner slot when the SDK is unsupported", () => {
    const target = document.createElement("div");
    const events: string[] = [];
    sdk.initializeIsSupported.mockReturnValue(false);

    const gateway = new AppsInTossBannerAdGateway("result-banner-group");
    gateway.attach(target, (event) => events.push(event));

    expect(events).toEqual(["unavailable"]);
    expect(sdk.initialize).not.toHaveBeenCalled();
    expect(sdk.attachBanner).not.toHaveBeenCalled();
  });

  it("reports unavailable when no banner inventory is available", () => {
    const target = document.createElement("div");
    const events: string[] = [];
    sdk.attachBanner.mockReturnValue({ destroy: vi.fn() });

    const gateway = new AppsInTossBannerAdGateway("result-banner-group");
    gateway.attach(target, (event) => events.push(event));

    const initializeOptions = sdk.initialize.mock.calls[0]?.[0];
    initializeOptions.callbacks.onInitialized();
    const attachOptions = sdk.attachBanner.mock.calls[0]?.[2];
    attachOptions.callbacks.onNoFill({ slotId: "result-slot" });

    expect(events).toEqual(["unavailable"]);
  });
});
