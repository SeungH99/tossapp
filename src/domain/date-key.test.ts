import { describe, expect, it } from "vitest";

import { toKstDateKey } from "./date-key";

describe("toKstDateKey", () => {
  it("UTC 날짜가 아직 전날이어도 한국 날짜를 사용한다", () => {
    const lateUtcEvening = new Date("2026-07-27T15:30:00.000Z");

    expect(toKstDateKey(lateUtcEvening)).toBe("2026-07-28");
  });
});
