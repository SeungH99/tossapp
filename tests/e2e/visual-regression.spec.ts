import { expect, test } from "@playwright/test";

import {
  answerCurrentQuestion,
  finishQuiz,
  openBonusOffer,
  openFreshApp,
} from "./support/quiz-flow";

test("stable release screens match approved snapshots", async ({ page }) => {
  await openFreshApp(page);
  await expect(page.locator("main")).toHaveScreenshot("home.png");

  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await answerCurrentQuestion(page);
  await expect(page.locator("main")).toHaveScreenshot("explanation.png");

  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);
  await expect(page.locator("main")).toHaveScreenshot("result.png");

  await openBonusOffer(page);
  await expect(page.locator("main")).toHaveScreenshot("bonus-offer.png");
});
