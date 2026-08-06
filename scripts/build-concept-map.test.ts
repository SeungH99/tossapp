import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

const directories: string[] = [];
const repositoryRoot = process.cwd();
const tsxCli = resolve(repositoryRoot, "node_modules/tsx/dist/cli.mjs");
const scriptPath = resolve(repositoryRoot, "scripts/build-concept-map.ts");

function createLibrary(
  coreQuestions: unknown[],
  bonusQuestions: unknown[],
  bonusPath = "src/content/bonus.json",
  historicalConcepts: Record<string, string> = {},
): string {
  const directory = mkdtempSync(join(tmpdir(), "concept-map-"));
  directories.push(directory);
  mkdirSync(join(directory, "src", "content"), { recursive: true });
  writeFileSync(
    join(directory, "src", "content", "manifest.json"),
    `${JSON.stringify({
      corePacks: [{ path: "src/content/core.json" }],
      bonusPacks: [{ path: bonusPath }],
    })}\n`,
    "utf8",
  );
  writeFileSync(
    join(directory, "src", "content", "core.json"),
    `${JSON.stringify({ questions: coreQuestions })}\n`,
    "utf8",
  );
  writeFileSync(
    join(directory, "src", "content", "legacy-concept-map.json"),
    `${JSON.stringify(historicalConcepts, null, 2)}\n`,
    "utf8",
  );
  if (bonusPath === "src/content/bonus.json") {
    writeFileSync(
      join(directory, "src", "content", "bonus.json"),
      `${JSON.stringify({ questions: bonusQuestions })}\n`,
      "utf8",
    );
  }
  return directory;
}

function runGenerator(directory: string, args: string[] = []) {
  return spawnSync(process.execPath, [tsxCli, scriptPath, ...args], {
    cwd: directory,
    encoding: "utf8",
  });
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("build-concept-map", () => {
  it("reads every manifest descriptor and emits a sorted concept map", () => {
    const directory = createLibrary(
      [
        {
          id: "2026-08-14-then-18-v1",
          conceptId: "korean-life-kimjang-community-winter-preparation",
        },
      ],
      [
        {
          id: "bonus-nostalgia-001-s00-gentle-family-plan-start",
          conceptId: "nostalgia-family-plan-start-1962",
        },
      ],
    );

    const result = runGenerator(directory);

    expect(result.status).toBe(0);
    expect(
      readFileSync(
        join(directory, "src", "content", "concept-map.json"),
        "utf8",
      ),
    ).toBe(
      '{\n  "2026-08-14-then-18-v1": "korean-life-kimjang-community-winter-preparation",\n  "bonus-nostalgia-001-s00-gentle-family-plan-start": "nostalgia-family-plan-start-1962"\n}\n',
    );
  });

  it("merges the append-only historical input without mutating it", () => {
    const directory = createLibrary(
      [{ id: "current-z", conceptId: "concept-current-z" }],
      [{ id: "current-a", conceptId: "concept-current-a" }],
      "src/content/bonus.json",
      {
        "legacy-language-z": "language-legacy-z",
        "bonus-language-2": "language-spelling-wenil-unexpected-event",
      },
    );
    const historicalPath = join(
      directory,
      "src",
      "content",
      "legacy-concept-map.json",
    );
    const historicalBefore = readFileSync(historicalPath, "utf8");

    const result = runGenerator(directory);

    expect(result.status).toBe(0);
    expect(
      readFileSync(
        join(directory, "src", "content", "concept-map.json"),
        "utf8",
      ),
    ).toBe(
      '{\n  "bonus-language-2": "language-spelling-wenil-unexpected-event",\n  "current-a": "concept-current-a",\n  "current-z": "concept-current-z",\n  "legacy-language-z": "language-legacy-z"\n}\n',
    );
    expect(readFileSync(historicalPath, "utf8")).toBe(historicalBefore);
  });

  it("sorts question IDs by locale-independent ordinal code units", () => {
    const directory = createLibrary(
      [
        { id: "concept-z", conceptId: "concept-z" },
        { id: "concept-ä", conceptId: "concept-a-umlaut" },
      ],
      [{ id: "concept-a", conceptId: "concept-a" }],
    );

    const result = runGenerator(directory);

    expect(result.status).toBe(0);
    expect(
      readFileSync(
        join(directory, "src", "content", "concept-map.json"),
        "utf8",
      ),
    ).toBe(
      '{\n  "concept-a": "concept-a",\n  "concept-z": "concept-z",\n  "concept-ä": "concept-a-umlaut"\n}\n',
    );
  });

  it("fails when descriptors contain duplicate question IDs", () => {
    const directory = createLibrary(
      [{ id: "duplicate", conceptId: "concept-a" }],
      [{ id: "duplicate", conceptId: "concept-b" }],
    );

    const result = runGenerator(directory);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "Duplicate question ID: duplicate",
    );
  });

  it("fails when a current descriptor conflicts with a historical mapping", () => {
    const directory = createLibrary(
      [{ id: "reused-id", conceptId: "concept-current" }],
      [],
      "src/content/bonus.json",
      { "reused-id": "concept-historical" },
    );

    const result = runGenerator(directory);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "Conflicting concept mapping for question ID reused-id",
    );
  });

  it("fails when a question has an empty concept", () => {
    const directory = createLibrary(
      [{ id: "empty-concept", conceptId: "   " }],
      [],
    );

    const result = runGenerator(directory);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "Empty concept ID: empty-concept",
    );
  });

  it("fails when a descriptor path cannot be read", () => {
    const directory = createLibrary(
      [{ id: "valid", conceptId: "concept-valid" }],
      [],
      "src/content/missing.json",
    );

    const result = runGenerator(directory);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "Unable to read descriptor path: src/content/missing.json",
    );
  });

  it("checks a matching committed map without writing it", () => {
    const directory = createLibrary(
      [{ id: "current", conceptId: "concept-current" }],
      [],
      "src/content/bonus.json",
      { legacy: "concept-legacy" },
    );
    const conceptMapPath = join(
      directory,
      "src",
      "content",
      "concept-map.json",
    );
    const committed =
      '{\n  "current": "concept-current",\n  "legacy": "concept-legacy"\n}\n';
    writeFileSync(conceptMapPath, committed, "utf8");

    const result = runGenerator(directory, ["--check"]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Concept map is up to date");
    expect(readFileSync(conceptMapPath, "utf8")).toBe(committed);
  });

  it("rejects a stale committed map without rewriting it", () => {
    const directory = createLibrary(
      [{ id: "current", conceptId: "concept-current" }],
      [],
      "src/content/bonus.json",
      { legacy: "concept-legacy" },
    );
    const conceptMapPath = join(
      directory,
      "src",
      "content",
      "concept-map.json",
    );
    const stale = '{\n  "stale": "concept-stale"\n}\n';
    writeFileSync(conceptMapPath, stale, "utf8");

    const result = runGenerator(directory, ["--check"]);

    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain(
      "Concept map is out of date",
    );
    expect(readFileSync(conceptMapPath, "utf8")).toBe(stale);
  });
});
