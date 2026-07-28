import { beforeEach, describe, expect, it } from "vitest";

import { createBonusEntitlement } from "../domain/bonus-entitlement";
import { createQuizSession } from "../domain/quiz-session";
import {
  BrowserKeyValueStorage,
  ProgressRepository,
} from "./progress-repository";

describe("ProgressRepository", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("오늘 진행과 보너스 권한을 하나의 버전 문서로 저장하고 복구한다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const session = createQuizSession("2026-07-28");
    const progress = {
      version: 1 as const,
      sessions: { "2026-07-28": session },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    };

    await repository.save(progress);

    expect(await repository.load()).toEqual(progress);
  });

  it("손상된 저장값은 앱을 막지 않고 빈 진행으로 복구한다", async () => {
    window.localStorage.setItem("geuttae-yojeum:progress", "{broken");
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );

    const restored = await repository.load();

    expect(restored.version).toBe(1);
    expect(restored.sessions).toEqual({});
    expect(restored.bonus.firstFreeUsed).toBe(false);
  });
});
