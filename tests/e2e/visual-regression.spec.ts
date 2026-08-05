import { expect, type Page, test } from "@playwright/test";

import {
  answerCurrentQuestion,
  finishQuiz,
  openBonusOffer,
  openFreshApp,
} from "./support/quiz-flow";

async function openExplanationScreen(page: Page): Promise<void> {
  await openFreshApp(page);
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await answerCurrentQuestion(page);
}

async function openResultScreen(page: Page): Promise<void> {
  await openExplanationScreen(page);
  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);
}

async function expectStableAnswerGeometry(page: Page): Promise<void> {
  const measurements = await page
    .locator(".answer-button")
    .evaluateAll((buttons) =>
      buttons.map((button) => {
        const text = button.querySelector<HTMLElement>(".answer-text");
        const buttonBox = button.getBoundingClientRect();
        const textBox = text?.getBoundingClientRect();
        const style = getComputedStyle(button);
        const borderTop = Number.parseFloat(style.borderTopWidth);
        const paddingTop = Number.parseFloat(style.paddingTop);
        return {
          expectedTextY: buttonBox.y + borderTop + paddingTop,
          paddingTop,
          textY: textBox?.y ?? null,
        };
      }),
    );

  expect(measurements).toHaveLength(3);
  for (const measurement of measurements) {
    expect(measurement.paddingTop).toBe(18);
    expect(measurement.textY).not.toBeNull();
    expect(
      Math.abs((measurement.textY as number) - measurement.expectedTextY),
    ).toBeLessThanOrEqual(1);
  }

  const markBox = await page.locator(".answer-mark").boundingBox();
  expect(markBox).not.toBeNull();
  expect(
    Math.abs((markBox?.width ?? 0) - (markBox?.height ?? 0)),
  ).toBeLessThanOrEqual(1);
}

test("home matches the approved snapshot", async ({ page }) => {
  await openFreshApp(page);
  await expect(page.locator("main")).toHaveScreenshot("home.png");
});

test("answer explanation matches the approved snapshot", async ({ page }) => {
  await openExplanationScreen(page);
  await expectStableAnswerGeometry(page);
  await expect(page.locator("main")).toHaveScreenshot("explanation.png");
});

test("core result matches the approved snapshot", async ({ page }) => {
  await openResultScreen(page);
  await expect(page.locator("main")).toHaveScreenshot("result.png");
});

test("bonus offer matches the approved snapshot", async ({ page }) => {
  await openResultScreen(page);
  await openBonusOffer(page);
  await expect(page.locator("main")).toHaveScreenshot("bonus-offer.png");
});
