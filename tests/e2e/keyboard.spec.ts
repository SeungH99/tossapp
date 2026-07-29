import { expect, test, type Locator, type Page } from "@playwright/test";

import { openFreshApp } from "./support/quiz-flow";

interface FocusVisual {
  boxShadow: string;
  outlineAlpha: number;
  outlineStyle: string;
  outlineWidth: number;
}

async function readFocusVisual(target: Locator): Promise<FocusVisual> {
  return target.evaluate((element) => {
    const style = getComputedStyle(element);
    const alphaMatch = style.outlineColor.match(
      /(?:,|\/)\s*([\d.]+)(%)?\s*\)$/,
    );
    const parsedAlpha = Number.parseFloat(alphaMatch?.[1] ?? "1");
    return {
      boxShadow: style.boxShadow,
      outlineAlpha:
        style.outlineColor === "transparent"
          ? 0
          : alphaMatch?.[2] === "%"
            ? parsedAlpha / 100
            : parsedAlpha,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
}

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

async function focusWithVisibleIndicator(
  page: Page,
  target: Locator,
): Promise<void> {
  const unfocused = await readFocusVisual(target);
  await tabTo(page, target);
  const focused = await readFocusVisual(target);
  const visibleOutline =
    focused.outlineStyle !== "none" &&
    focused.outlineWidth > 0 &&
    focused.outlineAlpha > 0 &&
    (focused.outlineStyle !== unfocused.outlineStyle ||
      focused.outlineWidth !== unfocused.outlineWidth ||
      focused.outlineAlpha !== unfocused.outlineAlpha);
  const newShadow =
    focused.boxShadow !== "none" &&
    focused.boxShadow !== unfocused.boxShadow;

  expect(
    visibleOutline || newShadow,
    `Keyboard focus must add a visible outline or a new box shadow: ${JSON.stringify(
      { focused, unfocused },
    )}`,
  ).toBe(true);
}

test("keyboard alone completes the core quiz with visible selected state", async ({
  page,
}) => {
  await openFreshApp(page);
  const start = page.getByRole("button", { name: "오늘의 3문제 시작" });
  await focusWithVisibleIndicator(page, start);
  await page.keyboard.press("Enter");

  for (let questionIndex = 0; questionIndex < 3; questionIndex += 1) {
    const firstAnswer = page.locator(".answer-button").first();
    await focusWithVisibleIndicator(page, firstAnswer);
    await page.keyboard.press("Space");
    await expect(firstAnswer).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".explanation-card")).toBeVisible();
    await expect(page.getByText("저장됐어요.")).toBeVisible();

    const source = page.locator(".explanation-card a");
    await focusWithVisibleIndicator(page, source);

    const next = page.getByRole("button", {
      name: questionIndex === 2 ? "결과 보기" : "다음 문제",
    });
    await focusWithVisibleIndicator(page, next);
    await page.keyboard.press("Enter");
  }

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
});
