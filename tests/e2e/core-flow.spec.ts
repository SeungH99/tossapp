import { expect, test } from "@playwright/test";

import { answerCurrentQuestion, openFreshApp } from "./support/quiz-flow";

test("home to three core answers to explanation to result", async ({
  page,
}) => {
  await openFreshApp(page);
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();

  await answerCurrentQuestion(page, 2);
  await expect(page.locator(".explanation-card a")).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await expect(page.locator(".explanation-card")).toContainText(
    "세계에서 가장 오래된 현존 금속활자 인쇄본",
  );
  await page.getByRole("button", { name: "다음 문제" }).click();
  await answerCurrentQuestion(page, 2);
  await page.getByRole("button", { name: "다음 문제" }).click();
  await answerCurrentQuestion(page, 1);
  await page.getByRole("button", { name: "결과 보기" }).click();

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  await expect(page.locator(".score-card")).toContainText("3 / 3");
});
