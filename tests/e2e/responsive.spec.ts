import { expect, test } from "@playwright/test";

import {
  applyTextScale,
  expectAppliedTextScale,
  expectNoHorizontalOverflow,
} from "./support/layout";
import {
  answerCurrentQuestion,
  finishQuiz,
  openBonusOffer,
  openFreshApp,
} from "./support/quiz-flow";

test("reapplying text scale stays at exactly 200% on persistent nodes", async ({
  page,
}) => {
  await openFreshApp(page);
  const baseline = await page
    .locator("body")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );

  await applyTextScale(page);
  await applyTextScale(page);

  const scaled = await page
    .locator("body")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
  expect(scaled).toBeCloseTo(baseline * 2, 1);
});

test("overflow diagnostics reject clipped text descendants", async ({
  page,
}) => {
  await page.setContent(`
    <main>
      <div style="width: 120px; overflow: hidden">
        <span style="display: block; width: 1000px">
          This clipped child must be reported by the overflow diagnostic.
        </span>
      </div>
    </main>
  `);

  await expect(expectNoHorizontalOverflow(page)).rejects.toThrow();
});

test("200% text reflows bonus topics into one readable column", async ({
  page,
}) => {
  await openFreshApp(page);
  await page.locator(".home-screen .primary-button").click();
  await finishQuiz(page, 3);
  await openBonusOffer(page);
  await applyTextScale(page);

  const topicBoxes = await page.locator(".topic-button").evaluateAll((topics) =>
    topics.map((topic) => {
      const box = topic.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }),
  );

  expect(topicBoxes.length).toBeGreaterThan(1);
  expect(Math.abs(topicBoxes[0].left - topicBoxes[1].left)).toBeLessThanOrEqual(
    1,
  );
  expect(topicBoxes[1].top).toBeGreaterThanOrEqual(topicBoxes[0].bottom);
  await expectNoHorizontalOverflow(page);
});

test("200% text keeps the four release screens inside the viewport", async ({
  page,
}) => {
  await openFreshApp(page);
  await applyTextScale(page);
  await expectAppliedTextScale(page.getByRole("heading", { name: "그때요즘" }));
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await answerCurrentQuestion(page);
  await applyTextScale(page);
  await expectAppliedTextScale(page.locator(".question-section h1"));
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);
  await applyTextScale(page);
  await expectAppliedTextScale(page.locator(".score-card h2"));
  await expectNoHorizontalOverflow(page);

  await openBonusOffer(page);
  await applyTextScale(page);
  await expectAppliedTextScale(
    page.getByRole("heading", { name: "보너스 주제 선택" }),
  );
  await expectNoHorizontalOverflow(page);
});
