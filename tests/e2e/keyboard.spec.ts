import { expect, test, type Locator, type Page } from "@playwright/test";

import { openFreshApp } from "./support/quiz-flow";

async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
  }
  throw new Error(`Keyboard focus did not reach: ${await target.innerText()}`);
}

async function expectVisibleFocus(target: Locator): Promise<void> {
  const focusStyle = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(
    focusStyle.outlineStyle !== "none" || focusStyle.boxShadow !== "none",
  ).toBe(true);
}

test("keyboard alone completes the core quiz with visible selected state", async ({
  page,
}) => {
  await openFreshApp(page);
  const start = page.getByRole("button", { name: "오늘의 3문제 시작" });
  await tabTo(page, start);
  await expectVisibleFocus(start);
  await page.keyboard.press("Enter");

  for (let questionIndex = 0; questionIndex < 3; questionIndex += 1) {
    const firstAnswer = page.locator(".answer-button").first();
    await tabTo(page, firstAnswer);
    await expectVisibleFocus(firstAnswer);
    await page.keyboard.press("Space");
    await expect(firstAnswer).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".explanation-card")).toBeVisible();
    await expect(page.getByText("저장됐어요.")).toBeVisible();

    const next = page.getByRole("button", {
      name: questionIndex === 2 ? "결과 보기" : "다음 문제",
    });
    await tabTo(page, next);
    await expectVisibleFocus(next);
    await page.keyboard.press("Enter");
  }

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
});
