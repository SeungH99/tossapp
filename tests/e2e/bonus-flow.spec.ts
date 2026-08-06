import { expect, type Page, test } from "@playwright/test";

import koreanLifePack from "../../src/content/bonus/korean-life/pack-001.json" with { type: "json" };
import languagePack from "../../src/content/bonus/language/pack-001.json" with { type: "json" };

import {
  FIXED_NOW,
  completeCoreQuiz,
  finishQuiz,
  openFreshApp,
  openBonusOffer,
} from "./support/quiz-flow";

interface StoredBonusSession {
  dateKey: string;
  currentIndex: number;
  phase: string;
  answers: unknown[];
}

interface StoredBonusCommand {
  sessionKey: string;
  topic: string;
  setIndex: number;
  questionIds: string[];
  source: string;
}

interface StoredProgress {
  sessions: Record<string, StoredBonusSession>;
  bonus: {
    firstFreeUsed: boolean;
    ticketCount: number;
  };
  answerEvents: Array<{
    conceptId?: string;
    questionKind: string;
  }>;
  seenConceptIds: string[];
  bonusTopicProgress: Record<
    string,
    {
      completedSetIndexes: number[];
      skippedSetIndexes: number[];
    }
  >;
  rewardGrantIds: string[];
  rewardAdTicketCount: number;
  bonusStartCommands: Record<string, StoredBonusCommand>;
}

interface StoredProgressEnvelope {
  schemaVersion: 4;
  revision: number;
  checksum: string;
  writtenAt: string;
  payload: StoredProgress;
}

interface AnalyticsEvent {
  ordinal: number;
  serialized: string;
  name: string;
  params: Record<string, unknown>;
}

interface AnalyticsCapture {
  events: AnalyticsEvent[];
  flush(): Promise<void>;
}

interface RewardHarnessState {
  bonusSetResolutionPending: boolean;
  loadCount: number;
  rewardResolutionPending: boolean;
  showCount: number;
}

const progressKeys = [
  "geuttae-yojeum:progress:v4:a",
  "geuttae-yojeum:progress:v4:b",
] as const;

const koreanLifeSets = [0, 1].map((setIndex) =>
  koreanLifePack.questions.filter((question) => question.setIndex === setIndex),
);
const languageSets = [0, 1].map((setIndex) =>
  languagePack.questions.filter((question) => question.setIndex === setIndex),
);

async function readLatestProgress(page: Page): Promise<StoredProgress> {
  const progress = await page.evaluate((keys) => {
    const latest = keys
      .map((key) => localStorage.getItem(key))
      .filter((raw): raw is string => raw != null)
      .map((raw) => JSON.parse(raw) as StoredProgressEnvelope)
      .sort((left, right) => right.revision - left.revision)[0];
    return latest?.payload ?? null;
  }, progressKeys);

  expect(progress).not.toBeNull();
  if (progress == null) {
    throw new Error("Expected persisted V4 progress");
  }
  return progress;
}

async function seedV4Progress(
  page: Page,
  seed: {
    answeredCoreConceptId?: string;
    bonusTicketCount?: number;
    firstFreeUsed?: boolean;
    rewardGrantIds?: string[];
    exhaustedTopic?: "nostalgia" | "korean-life" | "language";
    exhaustedSetCount?: number;
  },
): Promise<void> {
  await page.evaluate(
    ({ keys, requestedSeed }) => {
      const checksum = (value: string) => {
        let hash = 0x811c9dc5;
        for (let index = 0; index < value.length; index += 1) {
          hash ^= value.charCodeAt(index);
          hash = Math.imul(hash, 0x01000193);
        }
        return (hash >>> 0).toString(16).padStart(8, "0");
      };

      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw == null) {
          continue;
        }
        const envelope = JSON.parse(raw) as StoredProgressEnvelope;
        if (requestedSeed.answeredCoreConceptId != null) {
          const firstCoreAnswer = envelope.payload.answerEvents.find(
            (event) => event.questionKind === "core",
          );
          if (firstCoreAnswer == null) {
            throw new Error("Expected a persisted core answer event");
          }
          firstCoreAnswer.conceptId = requestedSeed.answeredCoreConceptId;
          envelope.payload.seenConceptIds = [
            ...new Set([
              ...envelope.payload.seenConceptIds,
              requestedSeed.answeredCoreConceptId,
            ]),
          ];
        }
        if (
          requestedSeed.exhaustedTopic != null &&
          requestedSeed.exhaustedSetCount != null
        ) {
          envelope.payload.bonusTopicProgress[
            requestedSeed.exhaustedTopic
          ].completedSetIndexes = Array.from(
            { length: requestedSeed.exhaustedSetCount },
            (_, setIndex) => setIndex,
          );
        }
        if (requestedSeed.bonusTicketCount != null) {
          envelope.payload.bonus.ticketCount = requestedSeed.bonusTicketCount;
        }
        if (requestedSeed.firstFreeUsed != null) {
          envelope.payload.bonus.firstFreeUsed = requestedSeed.firstFreeUsed;
        }
        if (requestedSeed.rewardGrantIds != null) {
          envelope.payload.rewardGrantIds = requestedSeed.rewardGrantIds;
        }
        envelope.checksum = checksum(
          JSON.stringify({
            schemaVersion: envelope.schemaVersion,
            revision: envelope.revision,
            writtenAt: envelope.writtenAt,
            payload: envelope.payload,
          }),
        );
        localStorage.setItem(key, JSON.stringify(envelope));
      }
    },
    { keys: progressKeys, requestedSeed: seed },
  );
}

function collectBrowserAnalytics(page: Page): AnalyticsCapture {
  const events: AnalyticsEvent[] = [];
  let nextOrdinal = 0;
  let pending = Promise.resolve();
  page.on("console", (message) => {
    if (message.type() !== "info") {
      return;
    }
    const ordinal = nextOrdinal;
    nextOrdinal += 1;
    const serialized = message.text();
    pending = pending.then(async () => {
      let values: unknown[];
      try {
        values = await Promise.all(
          message.args().map((argument) => argument.jsonValue()),
        );
      } catch {
        // A navigation can invalidate handles from the page being replaced.
        return;
      }
      const [prefix, name, params] = values;
      if (prefix === "[analytics]" && typeof name === "string") {
        events.push({
          ordinal,
          serialized,
          name,
          params:
            params != null && typeof params === "object"
              ? (params as Record<string, unknown>)
              : {},
        });
      }
    });
  });
  return {
    events,
    async flush() {
      await pending;
    },
  };
}

function orderedAnalyticsEvents(
  events: readonly AnalyticsEvent[],
): AnalyticsEvent[] {
  return [...events].sort((left, right) => left.ordinal - right.ordinal);
}

async function openFreshRewardHarness(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto("/tests/e2e/fixtures/reward-ad-harness.html");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("button", { name: "오늘의 3문제 시작" }),
  ).toBeVisible();
}

async function readRewardHarnessState(page: Page): Promise<RewardHarnessState> {
  return page.evaluate(() => {
    const controller = (
      window as typeof window & {
        __E2E_REWARD_HARNESS__: RewardHarnessState;
      }
    ).__E2E_REWARD_HARNESS__;
    return {
      bonusSetResolutionPending: controller.bonusSetResolutionPending,
      loadCount: controller.loadCount,
      rewardResolutionPending: controller.rewardResolutionPending,
      showCount: controller.showCount,
    };
  });
}

async function resolveDeferredBonusSet(page: Page): Promise<void> {
  await page.evaluate(() => {
    const controller = (
      window as typeof window & {
        __E2E_REWARD_HARNESS__: { resolveBonusSet(): void };
      }
    ).__E2E_REWARD_HARNESS__;
    controller.resolveBonusSet();
  });
}

async function resolveDeferredReward(
  page: Page,
  rewardGrantId: string,
): Promise<void> {
  await page.evaluate((grantId) => {
    const controller = (
      window as typeof window & {
        __E2E_REWARD_HARNESS__: {
          resolveReward(rewardGrantId: string): void;
        };
      }
    ).__E2E_REWARD_HARNESS__;
    controller.resolveReward(grantId);
  }, rewardGrantId);
}

async function finishCatalogSetCorrectly(
  page: Page,
  questions: ReadonlyArray<{
    answerIndex: number;
    explanation: string;
    prompt: string;
  }>,
): Promise<void> {
  for (const [index, question] of questions.entries()) {
    await expect(
      page.getByRole("heading", { name: question.prompt }),
    ).toBeVisible();
    await page.locator(".answer-button").nth(question.answerIndex).click();
    await expect(page.locator(".explanation-card")).toContainText(
      question.explanation,
    );
    await expect(page.getByText("저장됐어요.")).toBeVisible();
    await page
      .getByRole("button", {
        name: index === questions.length - 1 ? "결과 보기" : "다음 문제",
      })
      .click();
  }
}

test("bonus topic radios support arrow-key focus and selection", async ({
  page,
}) => {
  await openFreshApp(page);
  await completeCoreQuiz(page);
  await openBonusOffer(page);

  const topics = page.getByRole("radio");
  const firstTopic = topics.nth(0);
  const secondTopic = topics.nth(1);
  await expect(firstTopic).toHaveAttribute("aria-checked", "true");
  await expect(firstTopic).toHaveAttribute("tabindex", "0");
  await expect(secondTopic).toHaveAttribute("tabindex", "-1");

  await firstTopic.focus();
  await page.keyboard.press("ArrowRight");
  await expect(secondTopic).toBeFocused();
  await expect(secondTopic).toHaveAttribute("aria-checked", "true");
  await expect(secondTopic).toHaveAttribute("tabindex", "0");
  await expect(firstTopic).toHaveAttribute("tabindex", "-1");

  await page.keyboard.press("ArrowLeft");
  await expect(firstTopic).toBeFocused();
  await expect(firstTopic).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("ArrowUp");
  await expect(topics.nth(2)).toBeFocused();
  await expect(topics.nth(2)).toHaveAttribute("aria-checked", "true");

  await page.keyboard.press("ArrowDown");
  await expect(firstTopic).toBeFocused();
  await expect(firstTopic).toHaveAttribute("aria-checked", "true");
});

test("three real catalog topics stay ordered and a completed Korean-life set never repeats", async ({
  page,
}) => {
  await openFreshApp(page);
  await completeCoreQuiz(page);
  await openBonusOffer(page);

  const topics = page.getByRole("radio");
  await expect(topics).toHaveCount(3);
  expect(
    await topics.evaluateAll((radios) =>
      radios.map((radio) => radio.ariaLabel),
    ),
  ).toEqual(["추억·대중문화", "한국 생활사", "말·속담·맞춤법"]);

  await page.getByRole("radio", { name: "한국 생활사" }).click();
  await page.getByRole("button", { name: "첫 보너스 무료로 시작" }).click();
  await finishCatalogSetCorrectly(page, koreanLifeSets[0]);
  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  await expect(page.locator(".score-card")).toContainText("3 / 3");

  const firstProgress = await readLatestProgress(page);
  const firstCommand = Object.values(firstProgress.bonusStartCommands).find(
    (command) => command.sessionKey === "2026-07-29:bonus:korean-life",
  );
  const firstQuestionIds = koreanLifeSets[0].map((question) => question.id);
  expect(firstCommand?.setIndex).toBe(0);
  expect(firstCommand?.questionIds).toEqual(firstQuestionIds);

  await seedV4Progress(page, { bonusTicketCount: 1 });
  await page.clock.setFixedTime(new Date("2026-07-30T03:00:00.000Z"));
  await page.reload();
  await expect(
    page.getByRole("button", { name: "오늘의 3문제 시작" }),
  ).toBeVisible();
  await completeCoreQuiz(page);
  await openBonusOffer(page);
  await page.getByRole("radio", { name: "한국 생활사" }).click();
  await page.getByRole("button", { name: "보너스권으로 시작" }).click();

  await expect(
    page.getByRole("heading", { name: koreanLifeSets[1][0].prompt }),
  ).toBeVisible();
  for (const question of koreanLifeSets[0]) {
    await expect(page.getByText(question.prompt, { exact: true })).toHaveCount(
      0,
    );
  }
  const nextProgress = await readLatestProgress(page);
  const nextCommand = Object.values(nextProgress.bonusStartCommands).find(
    (command) => command.sessionKey === "2026-07-30:bonus:korean-life",
  );
  expect(nextCommand?.setIndex).toBe(1);
  expect(nextCommand?.questionIds).toEqual(
    koreanLifeSets[1].map((question) => question.id),
  );
  expect(
    nextCommand?.questionIds.some((questionId) =>
      firstQuestionIds.includes(questionId),
    ),
  ).toBe(false);
});

test("a concept answered in core persists the skip before a deferred reward and starts the next fixed set", async ({
  page,
}) => {
  const analytics = collectBrowserAnalytics(page);
  await openFreshRewardHarness(page);
  await completeCoreQuiz(page);
  await seedV4Progress(page, {
    answeredCoreConceptId: languageSets[0][0].conceptId,
    firstFreeUsed: true,
    rewardGrantIds: ["preexisting-reward"],
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();

  const beforeStart = await readLatestProgress(page);
  expect(beforeStart.bonus).toMatchObject({
    firstFreeUsed: true,
    ticketCount: 0,
  });
  expect(beforeStart.rewardGrantIds).toEqual(["preexisting-reward"]);
  expect(beforeStart.rewardAdTicketCount).toBe(0);
  expect((await readRewardHarnessState(page)).loadCount).toBeGreaterThanOrEqual(
    1,
  );

  await openBonusOffer(page);
  await page.getByRole("radio", { name: "말·속담·맞춤법" }).click();
  await page.getByRole("button", { name: "광고 보고 보너스 3문제" }).click();

  await expect
    .poll(
      async () =>
        (await readRewardHarnessState(page)).bonusSetResolutionPending,
    )
    .toBe(true);

  const beforeSetOneResolution = await readLatestProgress(page);
  expect(
    beforeSetOneResolution.bonusTopicProgress.language.skippedSetIndexes,
  ).toEqual([0]);
  expect(beforeSetOneResolution.bonus).toEqual(beforeStart.bonus);
  expect(beforeSetOneResolution.rewardGrantIds).toEqual(
    beforeStart.rewardGrantIds,
  );
  expect(beforeSetOneResolution.rewardAdTicketCount).toBe(
    beforeStart.rewardAdTicketCount,
  );
  expect((await readRewardHarnessState(page)).showCount).toBe(0);

  await expect
    .poll(() =>
      orderedAnalyticsEvents(analytics.events)
        .filter((event) => event.name === "bonus_set_skipped_seen_concept")
        .map((event) => event.params),
    )
    .toEqual([{ topic: "language", setIndex: 0 }]);

  const skipEvents = orderedAnalyticsEvents(analytics.events).filter(
    (event) => event.name === "bonus_set_skipped_seen_concept",
  );
  expect(skipEvents).toHaveLength(1);

  await resolveDeferredBonusSet(page);
  await expect
    .poll(async () => (await readRewardHarnessState(page)).showCount)
    .toBe(1);
  expect((await readRewardHarnessState(page)).rewardResolutionPending).toBe(
    true,
  );

  const beforeRewardResolution = await readLatestProgress(page);
  expect(beforeRewardResolution.bonus).toEqual(beforeStart.bonus);
  expect(beforeRewardResolution.rewardGrantIds).toEqual(
    beforeStart.rewardGrantIds,
  );
  expect(beforeRewardResolution.rewardAdTicketCount).toBe(
    beforeStart.rewardAdTicketCount,
  );

  const rewardGrantId = "e2e-look-ahead-reward";
  await resolveDeferredReward(page, rewardGrantId);
  await expect(
    page.getByRole("heading", { name: languageSets[1][0].prompt }),
  ).toBeVisible();
  await expect
    .poll(() =>
      orderedAnalyticsEvents(analytics.events).some(
        (event) => event.name === "bonus_start",
      ),
    )
    .toBe(true);

  await analytics.flush();
  const orderedEvents = orderedAnalyticsEvents(analytics.events);
  const startEvent = orderedEvents.find(
    (event) => event.name === "bonus_start",
  );
  expect(startEvent?.ordinal).toBeGreaterThan(skipEvents[0].ordinal);
  expect((await readRewardHarnessState(page)).showCount).toBe(1);

  const finalSkipEvents = orderedEvents.filter(
    (event) => event.name === "bonus_set_skipped_seen_concept",
  );
  expect(finalSkipEvents.map((event) => event.params)).toEqual([
    { topic: "language", setIndex: 0 },
  ]);
  for (const event of finalSkipEvents) {
    const serializedEvent = `${event.serialized}\n${JSON.stringify(event.params)}`;
    for (const sensitiveValue of [
      ...languageSets[0].flatMap((question) => [
        question.id,
        question.conceptId,
      ]),
      "selectedIndex",
      "isCorrect",
    ]) {
      expect(serializedEvent).not.toContain(sensitiveValue);
    }
  }

  const progress = await readLatestProgress(page);
  expect(progress.answerEvents[0]).toMatchObject({
    questionKind: "core",
    conceptId: languageSets[0][0].conceptId,
  });
  expect(progress.bonusTopicProgress.language.skippedSetIndexes).toEqual([0]);
  expect(progress.bonus.firstFreeUsed).toBe(true);
  expect(progress.bonus.ticketCount).toBe(0);
  expect(progress.rewardGrantIds).toEqual([
    ...beforeStart.rewardGrantIds,
    rewardGrantId,
  ]);
  expect(progress.rewardAdTicketCount).toBe(0);
  const startCommand = Object.values(progress.bonusStartCommands).find(
    (command) => command.topic === "language",
  );
  expect(startCommand).toMatchObject({
    setIndex: 1,
    source: "reward_ad",
    topic: "language",
  });
  expect(startCommand?.questionIds).toEqual(
    languageSets[1].map((question) => question.id),
  );
});

test("the real 30-set language inventory exhausts without spending a reward", async ({
  page,
}) => {
  const analytics = collectBrowserAnalytics(page);
  await openFreshApp(page);
  await completeCoreQuiz(page);
  await seedV4Progress(page, {
    exhaustedTopic: "language",
    exhaustedSetCount: 30,
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  const before = await readLatestProgress(page);
  await openBonusOffer(page);

  const exhausted = page.getByRole("radio", {
    name: "말·속담·맞춤법, 새 문제 준비 중",
  });
  await expect(exhausted).toBeDisabled();
  await expect(exhausted).toHaveAttribute("aria-checked", "false");
  await expect(exhausted).toHaveAttribute("tabindex", "-1");
  await expect(
    page.getByRole("radio", { name: "추억·대중문화" }),
  ).toHaveAttribute("tabindex", "0");

  const after = await readLatestProgress(page);
  expect(after.bonus).toEqual(before.bonus);
  expect(after.rewardAdTicketCount).toBe(before.rewardAdTicketCount);
  await analytics.flush();
  expect(
    analytics.events.some(
      (event) => event.name === "bonus_start" || event.name === "ad_offer_view",
    ),
  ).toBe(false);
});

test("first free bonus lets the user choose a topic and finish three questions", async ({
  page,
}) => {
  await openFreshApp(page);
  await completeCoreQuiz(page);
  await openBonusOffer(page);
  const nostalgiaTopic = page.getByRole("radio", { name: "추억·대중문화" });
  await nostalgiaTopic.click();
  await expect(nostalgiaTopic).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "첫 보너스 무료로 시작" }).click();
  await expect(page.locator(".quiz-screen")).toBeVisible();

  const progress: StoredProgress | null = await page.evaluate(() => {
    const slots = [
      localStorage.getItem("geuttae-yojeum:progress:v4:a"),
      localStorage.getItem("geuttae-yojeum:progress:v4:b"),
    ];
    const latest = slots
      .filter((raw): raw is string => raw != null)
      .map(
        (raw) =>
          JSON.parse(raw) as { revision: number; payload: StoredProgress },
      )
      .sort((left, right) => right.revision - left.revision)[0];
    return latest?.payload ?? null;
  });
  expect(progress).not.toBeNull();
  if (progress == null) {
    throw new Error("Expected persisted bonus progress");
  }

  const sessionKey = "2026-07-29:bonus:nostalgia";
  expect(progress.sessions[sessionKey]).toEqual({
    dateKey: sessionKey,
    currentIndex: 0,
    phase: "question",
    answers: [],
  });
  const startCommand = Object.values(progress.bonusStartCommands).find(
    (command) => command.sessionKey === sessionKey,
  );
  expect(startCommand).toMatchObject({
    sessionKey,
    topic: "nostalgia",
    setIndex: 0,
  });
  expect(startCommand?.questionIds).toHaveLength(3);
  expect(
    startCommand?.questionIds.every((questionId) =>
      questionId.startsWith("bonus-nostalgia-001-s00-"),
    ),
  ).toBe(true);

  await finishQuiz(page, 3);

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  await expect(page.getByText("첫 보너스 3문제는 무료예요")).toHaveCount(0);
});
