import { createRoot } from "react-dom/client";

import QuizApp, { SystemTimeProvider } from "../../../src/App";
import type { ContentCatalog } from "../../../src/content/content-catalog";
import { createViteContentCatalog } from "../../../src/content/vite-content-catalog";
import { BrowserAnalyticsGateway } from "../../../src/services/analytics";
import {
  BrowserKeyValueStorage,
  ProgressRepository,
} from "../../../src/services/progress-repository";
import { BrowserQuizShareGateway } from "../../../src/services/quiz-share";
import type {
  RewardAdGateway,
  RewardAdReward,
} from "../../../src/services/reward-ad";

interface RewardHarnessController {
  readonly bonusSetResolutionPending: boolean;
  readonly loadCount: number;
  readonly rewardResolutionPending: boolean;
  readonly showCount: number;
  resolveBonusSet(): void;
  resolveReward(rewardGrantId: string): void;
}

declare global {
  interface Window {
    __E2E_REWARD_HARNESS__: RewardHarnessController;
  }
}

const rootElement = document.getElementById("root");

if (rootElement == null) {
  throw new Error("Root element not found");
}

const realCatalog = createViteContentCatalog();
let bonusSetResolutionPending = false;
let bonusSetResolved = false;
let resolveBonusSetGate: (() => void) | undefined;
const bonusSetGate = new Promise<void>((resolve) => {
  resolveBonusSetGate = resolve;
});

const contentCatalog: ContentCatalog = {
  bonusTopics: realCatalog.bonusTopics,
  availableBonusTopics: realCatalog.availableBonusTopics,
  loadCoreSet: (dateKey) => realCatalog.loadCoreSet(dateKey),
  async loadBonusSet(topic, setIndex) {
    const loaded = await realCatalog.loadBonusSet(topic, setIndex);
    if (setIndex === 1 && !bonusSetResolved) {
      bonusSetResolutionPending = true;
      await bonusSetGate;
      bonusSetResolutionPending = false;
    }
    return loaded;
  },
};

let loadCount = 0;
let showCount = 0;
let rewardResolutionPending = false;
let resolveRewardShow: ((reward: RewardAdReward | null) => void) | undefined;

const rewardAd: RewardAdGateway = {
  async load() {
    loadCount += 1;
    return true;
  },
  show() {
    showCount += 1;
    rewardResolutionPending = true;
    return new Promise((resolve) => {
      resolveRewardShow = resolve;
    });
  },
};

window.__E2E_REWARD_HARNESS__ = {
  get bonusSetResolutionPending() {
    return bonusSetResolutionPending;
  },
  get loadCount() {
    return loadCount;
  },
  get rewardResolutionPending() {
    return rewardResolutionPending;
  },
  get showCount() {
    return showCount;
  },
  resolveBonusSet() {
    bonusSetResolved = true;
    resolveBonusSetGate?.();
  },
  resolveReward(rewardGrantId) {
    if (resolveRewardShow == null) {
      throw new Error("Expected a pending rewarded-ad show");
    }
    rewardResolutionPending = false;
    const resolve = resolveRewardShow;
    resolveRewardShow = undefined;
    resolve({ rewardGrantId });
  },
};

const repository = new ProgressRepository(
  new BrowserKeyValueStorage(window.localStorage),
);

createRoot(rootElement).render(
  <QuizApp
    analytics={new BrowserAnalyticsGateway()}
    contentCatalog={contentCatalog}
    repository={repository}
    rewardAd={rewardAd}
    shareGateway={
      new BrowserQuizShareGateway(window.navigator, window.location.href)
    }
    timeProvider={new SystemTimeProvider()}
  />,
);
