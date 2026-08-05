import { expect, test } from "@playwright/test";

import {
  completeCoreQuiz,
  finishQuiz,
  openFreshApp,
  openBonusOffer,
} from "./support/quiz-flow";

interface StoredBonusSession {
  dateKey: string;
  currentIndex: number;
  phase: string;
  answers: unknown[];
}

interface StoredBonusCommand {
  sessionKey: string;
  topic: string;
  setIndex: number;
  questionIds: string[];
}

interface StoredProgress {
  sessions: Record<string, StoredBonusSession>;
  bonusStartCommands: Record<string, StoredBonusCommand>;
}

test("first free bonus lets the user choose a topic and finish three questions", async ({
  page,
}) => {
  await openFreshApp(page);
  await completeCoreQuiz(page);
  await openBonusOffer(page);
  const nostalgiaTopic = page.getByRole("button", { name: "추억·대중문화" });
  await nostalgiaTopic.click();
  await expect(nostalgiaTopic).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "첫 보너스 무료로 시작" }).click();
  await expect(page.locator(".quiz-screen")).toBeVisible();

  const progress: StoredProgress | null = await page.evaluate(() => {
    const slots = [
      localStorage.getItem("geuttae-yojeum:progress:v3:a"),
      localStorage.getItem("geuttae-yojeum:progress:v3:b"),
    ];
    const latest = slots
      .filter((raw): raw is string => raw != null)
      .map((raw) => JSON.parse(raw) as { revision: number; payload: StoredProgress })
      .sort((left, right) => right.revision - left.revision)[0];
    return latest?.payload ?? null;
  });
  expect(progress).not.toBeNull();
  if (progress == null) {
    throw new Error("Expected persisted bonus progress");
  }

  const sessionKey = "2026-07-29:bonus:nostalgia";
  expect(progress.sessions[sessionKey]).toEqual({
    dateKey: sessionKey,
    currentIndex: 0,
    phase: "question",
    answers: [],
  });
  const startCommand = Object.values(progress.bonusStartCommands).find(
    (command) => command.sessionKey === sessionKey,
  );
  expect(startCommand).toMatchObject({
    sessionKey,
    topic: "nostalgia",
    setIndex: 0,
  });
  expect(startCommand?.questionIds).toHaveLength(3);
  expect(
    startCommand?.questionIds.every((questionId) =>
      questionId.startsWith("bonus-nostalgia-001-s00-"),
    ),
  ).toBe(true);

  await finishQuiz(page, 3);

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  await expect(page.getByText("첫 보너스 3문제는 무료예요")).toHaveCount(0);
});
