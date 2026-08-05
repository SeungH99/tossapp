import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import QuizApp, { SystemTimeProvider } from "./App";
import { createViteContentCatalog } from "./content/vite-content-catalog";
import { AppsInTossKeyValueStorage } from "./services/apps-in-toss-storage";
import {
  BrowserKeyValueStorage,
  ProgressRepository,
} from "./services/progress-repository";
import {
  AppsInTossQuizShareGateway,
  BrowserQuizShareGateway,
} from "./services/quiz-share";
import { AppsInTossRewardAdGateway } from "./services/reward-ad";
import { AppsInTossBannerAdGateway } from "./services/banner-ad";
import {
  AppsInTossAnalyticsGateway,
  BrowserAnalyticsGateway,
} from "./services/analytics";

const rootElement = document.getElementById("root");

if (rootElement == null) {
  throw new Error("Root element not found");
}

const storage = import.meta.env.DEV
  ? new BrowserKeyValueStorage(window.localStorage)
  : new AppsInTossKeyValueStorage();
const repository = new ProgressRepository(storage);
const shareGateway = import.meta.env.DEV
  ? new BrowserQuizShareGateway(window.navigator, window.location.href)
  : new AppsInTossQuizShareGateway();
const rewardAd = import.meta.env.DEV
  ? undefined
  : new AppsInTossRewardAdGateway(
      import.meta.env.VITE_REWARDED_AD_GROUP_ID ??
        "ait-ad-test-rewarded-id",
    );
const bannerAd = import.meta.env.DEV
  ? undefined
  : new AppsInTossBannerAdGateway(
      import.meta.env.VITE_BANNER_AD_GROUP_ID ?? "ait-ad-test-banner-id",
    );
const analytics = import.meta.env.DEV
  ? new BrowserAnalyticsGateway()
  : new AppsInTossAnalyticsGateway();
const timeProvider = new SystemTimeProvider();
const contentCatalog = createViteContentCatalog();

createRoot(rootElement).render(
  <StrictMode>
    <QuizApp
      bannerAd={bannerAd}
      contentCatalog={contentCatalog}
      analytics={analytics}
      timeProvider={timeProvider}
      repository={repository}
      rewardAd={rewardAd}
      shareGateway={shareGateway}
    />
  </StrictMode>,
);
