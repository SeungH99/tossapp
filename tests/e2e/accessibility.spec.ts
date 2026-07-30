import { test } from "@playwright/test";

import { expectNoBlockingAxeViolations } from "./support/accessibility";
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
