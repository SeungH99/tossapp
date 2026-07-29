import { expect, type Page } from "@playwright/test";

export const FIXED_NOW = new Date("2026-07-29T03:00:00.000Z");

export async function openFreshApp(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("button", { name: "오늘의 3문제 시작" }),
  ).toBeVisible();
}

export async function answerCurrentQuestion(
  page: Page,
  choiceIndex = 0,
): Promise<void> {
  await page.locator(".answer-button").nth(choiceIndex).click();
  await expect(page.locator(".explanation-card")).toBeVisible();
  await expect(page.getByText("저장됐어요.")).toBeVisible();
}

export async function finishQuiz(
  page: Page,
  questionCount: number,
): Promise<void> {
  for (let index = 0; index < questionCount; index += 1) {
    await answerCurrentQuestion(page);
    await page
      .getByRole("button", {
        name: index === questionCount - 1 ? "결과 보기" : "다음 문제",
      })
      .click();
  }
}

export async function completeCoreQuiz(page: Page): Promise<void> {
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await finishQuiz(page, 3);
  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
}

export async function openBonusOffer(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "원하는 주제로 보너스 3문제" })
    .click();
  await expect(
    page.getByRole("heading", { name: "보너스 주제 선택" }),
  ).toBeVisible();
}

export async function startFirstFreeBonus(
  page: Page,
  topicLabel = "한국 생활사",
): Promise<void> {
  await openBonusOffer(page);
  await page.getByRole("button", { name: topicLabel }).click();
  await page.getByRole("button", { name: "첫 보너스 무료로 시작" }).click();
  await expect(page.locator(".quiz-screen")).toBeVisible();
}

export async function installClipboardFallback(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          localStorage.setItem("e2e:clipboard", value);
        },
      },
    });
  });
}

export interface CorruptedProgressSlots {
  slotA: string | null;
  slotB: string | null;
  legacy: string | null;
}

export async function corruptAllProgressSlots(
  page: Page,
): Promise<CorruptedProgressSlots> {
  return page.evaluate(() => {
    localStorage.setItem("geuttae-yojeum:progress:v2:a", "{broken-a");
    localStorage.setItem("geuttae-yojeum:progress:v2:b", "{broken-b");
    localStorage.setItem("geuttae-yojeum:progress", "{broken-legacy");
    return {
      slotA: localStorage.getItem("geuttae-yojeum:progress:v2:a"),
      slotB: localStorage.getItem("geuttae-yojeum:progress:v2:b"),
      legacy: localStorage.getItem("geuttae-yojeum:progress"),
    };
  });
}
