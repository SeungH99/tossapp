import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import QuizApp from "./App";
import { bonusQuestions, coreQuestions } from "./data/questions";
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
const analytics = import.meta.env.DEV
  ? new BrowserAnalyticsGateway()
  : new AppsInTossAnalyticsGateway();

createRoot(rootElement).render(
  <StrictMode>
    <QuizApp
      bonusQuestions={bonusQuestions}
      coreQuestions={coreQuestions}
      analytics={analytics}
      now={new Date()}
      repository={repository}
      rewardAd={rewardAd}
      shareGateway={shareGateway}
    />
  </StrictMode>,
);
