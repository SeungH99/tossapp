import { expect, test } from "@playwright/test";

import {
  completeCoreQuiz,
  finishQuiz,
  openFreshApp,
  startFirstFreeBonus,
} from "./support/quiz-flow";

test("first free bonus lets the user choose a topic and finish three questions", async ({
  page,
}) => {
  await openFreshApp(page);
  await completeCoreQuiz(page);
  await startFirstFreeBonus(page, "한국 생활사");
  await finishQuiz(page, 3);

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  await expect(page.getByText("첫 보너스 3문제는 무료예요")).toHaveCount(0);
});
