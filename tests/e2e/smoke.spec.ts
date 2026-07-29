import { expect, test } from "@playwright/test";

import { openFreshApp } from "./support/quiz-flow";

test("@smoke opens the fixed launch day home screen", async ({ page }) => {
  await openFreshApp(page);

  await expect(page.getByRole("heading", { name: "그때요즘" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "오늘의 3문제 시작" }),
  ).toBeVisible();
  await expect(page.locator(".date-label")).toContainText("7월 29일");
});
