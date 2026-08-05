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
  if (bonusPath === "src/content/bonus.json") {
    writeFileSync(
      join(directory, "src", "content", "bonus.json"),
      `${JSON.stringify({ questions: bonusQuestions })}\n`,
      "utf8",
    );
  }
  return directory;
}

function runGenerator(directory: string) {
  return spawnSync(process.execPath, [tsxCli, scriptPath], {
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
});
