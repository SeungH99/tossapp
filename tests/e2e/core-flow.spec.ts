import { expect, test } from "@playwright/test";

import {
  answerCurrentQuestion,
  finishQuiz,
  openFreshApp,
} from "./support/quiz-flow";

test("home to three core answers to explanation to result", async ({ page }) => {
  await openFreshApp(page);
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();

  await answerCurrentQuestion(page);
  await expect(page.locator(".explanation-card a")).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  await expect(page.locator(".score-card")).toContainText("/ 3");
});
