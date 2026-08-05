import { expect, test } from "@playwright/test";

import { expectNoBlockingAxeViolations } from "./support/accessibility";
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

test("home, question, explanation, result, and bonus offer have no blocking axe issues", async ({
  page,
}) => {
  await openFreshApp(page);
  await expectNoBlockingAxeViolations(page);

  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await expectNoBlockingAxeViolations(page);
  await answerCurrentQuestion(page);
  await expectNoBlockingAxeViolations(page);

  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);
  await expectNoBlockingAxeViolations(page);

  await openBonusOffer(page);
  await expectNoBlockingAxeViolations(page);
});

test("a long question stays readable and its explanation controls remain reachable at 200%", async ({
  page,
}) => {
  await openFreshApp(page);
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  const title = page.locator(".question-title");
  await expect(title).toHaveClass(/\blong\b/);
  await applyTextScale(page);
  await expectAppliedTextScale(title);
  await expectNoHorizontalOverflow(page);

  await answerCurrentQuestion(page, 2);
  await applyTextScale(page);
  const explanation = page.locator(".explanation-card");
  const next = page.getByRole("button", { name: "다음 문제" });
  await explanation.scrollIntoViewIfNeeded();
  await expect(explanation).toBeInViewport();
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  await expect(next).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  await expectNoBlockingAxeViolations(page);

  await next.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("progressbar", { name: "퀴즈 진행" }),
  ).toHaveAttribute("aria-valuenow", "2");
});
