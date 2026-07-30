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

test("home matches the approved snapshot", async ({ page }) => {
  await openFreshApp(page);
  await expect(page.locator("main")).toHaveScreenshot("home.png");
});

test("answer explanation matches the approved snapshot", async ({ page }) => {
  await openExplanationScreen(page);
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
