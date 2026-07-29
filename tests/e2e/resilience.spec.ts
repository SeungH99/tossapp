import { expect, test } from "@playwright/test";

import {
  answerCurrentQuestion,
  completeCoreQuiz,
  corruptAllProgressSlots,
  installClipboardFallback,
  openFreshApp,
} from "./support/quiz-flow";

test("reload restores an answered in-progress core question", async ({
  page,
}) => {
  await openFreshApp(page);
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  const prompt = await page.locator(".question-section h1").innerText();
  const selectedChoice = page.locator(".answer-button").nth(1);
  const selectedChoiceText = await selectedChoice.innerText();
  await answerCurrentQuestion(page, 1);
  const answerStatus = await page.locator(".explanation-card strong").innerText();
  const explanation = await page
    .locator(".explanation-card > p:not(.answer-save-status)")
    .innerText();

  await page.reload();

  await expect(page.locator(".question-section h1")).toHaveText(prompt);
  await expect(
    page.getByRole("button", { name: selectedChoiceText }),
  ).toHaveClass(/(^|\s)selected(\s|$)/);
  await expect(page.locator(".explanation-card strong")).toHaveText(answerStatus);
  await expect(
    page.locator(".explanation-card > p:not(.answer-save-status)"),
  ).toHaveText(explanation);
  await expect(page.locator(".explanation-card")).toBeVisible();
});

test("browser share falls back to clipboard and keeps the result usable", async ({
  page,
}) => {
  await installClipboardFallback(page);
  await openFreshApp(page);
  await completeCoreQuiz(page);

  await page
    .getByRole("button", { name: "친구에게 같은 문제 보내기" })
    .click();

  await expect(page.getByText("공유할 내용을 열었어요.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("e2e:clipboard")),
  ).toContain("오늘 그때요즘 퀴즈에서");
});

test("corrupt progress is preserved while no-save recovery returns home", async ({
  page,
}) => {
  await openFreshApp(page);
  const preservedSlots = await corruptAllProgressSlots(page);
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "기록을 안전하게 열지 못했어요" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "저장 없이 오늘 퀴즈 보기" })
    .click();
  await expect(
    page.getByRole("button", { name: "오늘의 3문제 시작" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await page.locator(".answer-button").first().click();
  await expect(page.locator(".explanation-card")).toBeVisible();
  expect(
    await page.evaluate(() => ({
      slotA: localStorage.getItem("geuttae-yojeum:progress:v2:a"),
      slotB: localStorage.getItem("geuttae-yojeum:progress:v2:b"),
      legacy: localStorage.getItem("geuttae-yojeum:progress"),
    })),
  ).toEqual(preservedSlots);
});
