import { describe, expect, it } from "vitest";

import { createPackedContentCatalog } from "./content-catalog";
import { createInMemoryContentCatalog } from "./in-memory-content-catalog";
import { createViteContentCatalog } from "./vite-content-catalog";
import type { BonusContentPack, ContentManifest, CoreContentPack } from "./types";

const metadata = {
  contentVersion: "2026.08.180d",
  reviewStatus: "reviewed" as const,
  reviewedAt: "2026-08-04",
  source: { name: "National Archives", url: "https://www.archives.go.kr/" },
};

const corePack001: CoreContentPack = {
  id: "core-001",
  kind: "core",
  contentVersion: metadata.contentVersion,
  reviewStatus: "reviewed",
  questions: [
    {
      ...metadata,
      kind: "core",
      id: "2026-07-28-phone",
      dateKey: "2026-07-28",
      lens: "then",
      topic: "nostalgia",
      internalDifficulty: "gentle",
      prompt: "Which coin kept the public phone call going?",
      choices: ["A phone card", "A coin", "A stamp"],
      answerIndex: 1,
      explanation: "A coin was needed for the call.",
    },
  ],
};

const corePack002: CoreContentPack = {
  ...corePack001,
  id: "core-002",
  questions: [{ ...corePack001.questions[0], id: "2026-07-29-phone", dateKey: "2026-07-29" }],
};

const bonusPack001: BonusContentPack = {
  id: "bonus-digital-001",
  kind: "bonus",
  contentVersion: metadata.contentVersion,
  reviewStatus: "reviewed",
  questions: [
    {
      ...metadata,
      kind: "bonus",
      id: "digital-0-text-size",
      conceptId: "text-size",
      variant: "gentle",
      internalDifficulty: "gentle",
      setIndex: 0,
      lens: "now",
      topic: "digital",
      prompt: "How can you make phone text larger?",
      choices: ["Adjust text size", "Turn off sound", "Close the app"],
      answerIndex: 0,
      explanation: "Text size is available in settings.",
    },
  ],
};

const manifest: ContentManifest = {
  releaseStart: "2026-07-28",
  releaseEnd: "2026-07-29",
  contentVersion: metadata.contentVersion,
  corePacks: [
    {
      id: "core-001", kind: "core", path: "src/content/core/pack-001.json", sha256: "one", questionCount: 1,
      reviewStatus: "reviewed", dateStart: "2026-07-28", dateEnd: "2026-07-28",
    },
    {
      id: "core-002", kind: "core", path: "src/content/core/pack-002.json", sha256: "two", questionCount: 1,
      reviewStatus: "reviewed", dateStart: "2026-07-29", dateEnd: "2026-07-29",
    },
  ],
  bonusPacks: [
    {
      id: "bonus-digital-001", kind: "bonus", path: "src/content/bonus/digital/pack-001.json", sha256: "three", questionCount: 1,
      reviewStatus: "reviewed", topic: "digital", setStart: 0, setEnd: 0,
    },
  ],
};

describe("content catalog", () => {
  it("imports only the requested core pack", async () => {
    const calls: string[] = [];
    const catalog = createPackedContentCatalog(manifest, {
      "src/content/core/pack-001.json": async () => { calls.push("pack-001"); return { default: corePack001 }; },
      "src/content/core/pack-002.json": async () => { calls.push("pack-002"); return { default: corePack002 }; },
    });

    await expect(catalog.loadCoreSet("2026-07-28")).resolves.toMatchObject({ ok: true, packId: "core-001" });
    expect(calls).toEqual(["pack-001"]);
  });

  it("does not substitute another date when the selected pack is unavailable", async () => {
    const catalog = createPackedContentCatalog(manifest, {
      "src/content/core/pack-002.json": async () => ({ default: corePack002 }),
    });

    await expect(catalog.loadCoreSet("2026-07-28")).resolves.toEqual({ ok: false, reason: "missing-pack", packId: "core-001" });
  });

  it("reports a missing set when no core descriptor covers the date", async () => {
    const catalog = createPackedContentCatalog(manifest, {});

    await expect(catalog.loadCoreSet("2026-08-01")).resolves.toEqual({ ok: false, reason: "missing-set" });
  });

  it("returns invalid-pack when a loaded core pack fails review parsing", async () => {
    const catalog = createPackedContentCatalog(manifest, {
      "src/content/core/pack-001.json": async () => ({ default: { ...corePack001, reviewStatus: "draft" } }),
    });

    await expect(catalog.loadCoreSet("2026-07-28")).resolves.toEqual({ ok: false, reason: "invalid-pack", packId: "core-001" });
  });

  it("loads an in-memory bonus set by topic and index", async () => {
    const catalog = createInMemoryContentCatalog(
      { "2026-07-28": corePack001.questions },
      { digital: { 0: bonusPack001.questions } },
    );

    await expect(catalog.loadBonusSet("digital", 0)).resolves.toEqual({ ok: true, value: bonusPack001.questions, packId: "in-memory:bonus:digital:0" });
  });

  it("reports missing-set for an empty in-memory core set", async () => {
    const catalog = createInMemoryContentCatalog(
      { "2026-07-28": [] },
      {},
    );

    await expect(catalog.loadCoreSet("2026-07-28")).resolves.toEqual({
      ok: false,
      reason: "missing-set",
    });
  });

  it("reports missing-set for an empty in-memory bonus set", async () => {
    const catalog = createInMemoryContentCatalog(
      {},
      { digital: { 0: [] } },
    );

    await expect(catalog.loadBonusSet("digital", 0)).resolves.toEqual({
      ok: false,
      reason: "missing-set",
    });
  });

  it("creates a Vite catalog with the empty manifest", async () => {
    const catalog = createViteContentCatalog();

    await expect(catalog.loadCoreSet("2026-07-28")).resolves.toEqual({
      ok: false,
      reason: "missing-set",
    });
  });
});
