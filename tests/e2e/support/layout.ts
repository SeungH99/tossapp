import { expect, type Page } from "@playwright/test";

export async function applyTextScale(page: Page, scale = 2): Promise<void> {
  await page.evaluate((requestedScale) => {
    const elements = [
      document.documentElement,
      document.body,
      ...document.querySelectorAll<HTMLElement>("body *"),
    ];
    const sizes = elements.map((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    elements.forEach((element, index) => {
      element.style.setProperty(
        "font-size",
        `${sizes[index] * requestedScale}px`,
        "important",
      );
    });
  }, scale);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const selectors =
      "main, button, h1, h2, .explanation-card, .score-card, .topic-grid";
    const offenders = [...document.querySelectorAll<HTMLElement>(selectors)]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector:
            element.className || element.tagName.toLocaleLowerCase("en-US"),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1);

    return {
      offenders,
      scrollWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      viewportWidth: window.innerWidth,
    };
  });

  expect(result.offenders, JSON.stringify(result, null, 2)).toEqual([]);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth + 1);
}
