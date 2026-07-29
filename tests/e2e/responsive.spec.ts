import { test } from "@playwright/test";

import { applyTextScale, expectNoHorizontalOverflow } from "./support/layout";
import {
  answerCurrentQuestion,
  finishQuiz,
  openBonusOffer,
  openFreshApp,
} from "./support/quiz-flow";

test("200% text keeps the four release screens inside the viewport", async ({
  page,
}) => {
  await openFreshApp(page);
  await applyTextScale(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await answerCurrentQuestion(page);
  await applyTextScale(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);
  await applyTextScale(page);
  await expectNoHorizontalOverflow(page);

  await openBonusOffer(page);
  await applyTextScale(page);
  await expectNoHorizontalOverflow(page);
});
