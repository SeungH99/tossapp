import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type { ContentManifest, CoreContentPack } from "../src/content/types";
import { runLibraryValidation } from "./validate-content-library";
import { runPackValidation } from "./validate-content-pack";

const metadata = {
  contentVersion: "2026.08.180d",
  reviewStatus: "reviewed" as const,
  reviewedAt: "2026-08-04",
  source: { name: "National Archives", url: "https://www.archives.go.kr/" },
};

const validPack: CoreContentPack = {
  id: "core-001",
  kind: "core",
  contentVersion: metadata.contentVersion,
  reviewStatus: "reviewed",
  questions: (["gentle", "steady", "stretch"] as const).map(
    (internalDifficulty, index) => ({
      ...metadata,
      kind: "core" as const,
      id: `core-${index}`,
      dateKey: "2026-07-28",
      lens: (["then", "now", "life"] as const)[index],
      topic: "nostalgia" as const,
      internalDifficulty,
      prompt: [
        "공중전화 통화를 시작할 때 먼저 무엇을 넣었을까요?",
        "휴대전화 글자를 크게 보려면 어느 설정을 바꿀까요?",
        "낯선 송금 요청을 받으면 어떻게 사실을 확인할까요?",
      ][index],
      choices: [
        ["십 원짜리 동전", "종이 승차권", "우편 엽서"],
        ["화면 밝기", "글자 크기", "통화 음량"],
        ["바로 보내기", "문자 지우기", "직접 확인하기"],
      ][index] as [string, string, string],
      answerIndex: index as 0 | 1 | 2,
      explanation: "공식 자료를 바탕으로 확인한 설명입니다.",
    }),
  ),
};

function createWorkspace(pack: CoreContentPack) {
  const directory = mkdtempSync(join(tmpdir(), "content-pack-cli-"));
  const packPath = join(directory, "pack.json");
  const manifestPath = join(directory, "manifest.json");
  const untouchedDescriptor = {
    id: "core-untouched",
    kind: "core" as const,
    path: "other.json",
    sha256: "c".repeat(64),
    questionCount: 90,
    reviewStatus: "reviewed" as const,
    dateStart: "2026-08-27",
    dateEnd: "2026-09-25",
  };
  const manifest: ContentManifest = {
    releaseStart: "2026-07-28",
    releaseEnd: "2027-01-23",
    contentVersion: metadata.contentVersion,
    corePacks: [
      {
        id: pack.id,
        kind: "core",
        path: "pack.json",
        sha256: "stale",
        questionCount: 99,
        reviewStatus: "draft",
        dateStart: "2020-01-01",
        dateEnd: "2020-01-02",
      },
      untouchedDescriptor,
    ],
    bonusPacks: [],
  };
  writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { directory, manifest, manifestPath, packPath, untouchedDescriptor };
}

describe("validate-content-pack CLI", () => {
  it("rejects a raw file whose SHA-256 differs from the matching descriptor", async () => {
    const workspace = createWorkspace(validPack);

    const result = await runPackValidation({
      cwd: workspace.directory,
      packPath: workspace.packPath,
      manifestPath: workspace.manifestPath,
      writeLine: () => undefined,
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({ code: "checksum" }),
    );
  });

  it("leaves an invalid pack manifest byte-for-byte unchanged", async () => {
    const invalid = structuredClone(validPack);
    invalid.questions[0].prompt = "너무 짧은 질문";
    const workspace = createWorkspace(invalid);
    const before = readFileSync(workspace.manifestPath);

    const result = await runPackValidation({
      cwd: workspace.directory,
      packPath: workspace.packPath,
      manifestPath: workspace.manifestPath,
      updateManifest: true,
      writeLine: () => undefined,
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({ code: "short-prompt" }),
    );
    expect(readFileSync(workspace.manifestPath)).toEqual(before);
  });

  it("leaves the manifest byte-for-byte unchanged on content-version mismatch", async () => {
    const stale = structuredClone(validPack);
    stale.contentVersion = "stale-version";
    stale.questions = stale.questions.map((question) => ({
      ...question,
      contentVersion: "stale-version",
    }));
    const workspace = createWorkspace(stale);
    const before = readFileSync(workspace.manifestPath);

    const result = await runPackValidation({
      cwd: workspace.directory,
      packPath: workspace.packPath,
      manifestPath: workspace.manifestPath,
      updateManifest: true,
      writeLine: () => undefined,
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({
        code: "schema",
        scope: "pack:core-001:contentVersion",
      }),
    );
    expect(readFileSync(workspace.manifestPath)).toEqual(before);
  });

  it("atomically updates only the valid pack matching descriptor", async () => {
    const workspace = createWorkspace(validPack);

    const result = await runPackValidation({
      cwd: workspace.directory,
      packPath: workspace.packPath,
      manifestPath: workspace.manifestPath,
      updateManifest: true,
      writeLine: () => undefined,
    });
    const updated = JSON.parse(
      readFileSync(workspace.manifestPath, "utf8"),
    ) as ContentManifest & {
      corePacks: Array<
        ContentManifest["corePacks"][number] & { setCount: number }
      >;
    };

    expect(result).toMatchObject({ exitCode: 0, updatedManifest: true });
    expect(updated.corePacks[0]).toMatchObject({
      id: "core-001",
      questionCount: 3,
      setCount: 1,
      dateStart: "2026-07-28",
      dateEnd: "2026-07-28",
      reviewStatus: "reviewed",
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(updated.corePacks[1]).toEqual(workspace.untouchedDescriptor);
  });

  it("returns a non-zero process exit code and prints short-prompt", () => {
    let output = "";

    try {
      output = execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/validate-content-pack.ts",
          "src/content/fixtures/invalid-short-prompt.json",
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      throw new Error("CLI unexpectedly exited successfully");
    } catch (error) {
      const failure = error as {
        status?: number;
        stdout?: string;
        stderr?: string;
      };
      expect(failure.status).toBe(1);
      expect(`${failure.stdout ?? output}${failure.stderr ?? ""}`).toContain(
        "[short-prompt]",
      );
    }
  });
});

describe("validate-content-library CLI", () => {
  it("fails the empty default manifest with the exact full-library count", () => {
    const lines: string[] = [];

    const result = runLibraryValidation({
      writeLine: (line) => lines.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(result.report.issues).toContainEqual(
      expect.objectContaining({
        code: "count",
        scope: "library:descriptors",
        expected: 42,
        actual: 0,
      }),
    );
    expect(lines.join("\n")).toContain("[count] library:descriptors");
  });

  it("parses --scope core instead of treating it as a manifest path", () => {
    let output = "";

    try {
      output = execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/validate-content-library.ts",
          "--scope",
          "core",
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      throw new Error("CLI unexpectedly exited successfully");
    } catch (error) {
      const failure = error as {
        status?: number;
        stdout?: string;
        stderr?: string;
      };
      expect(failure.status).toBe(1);
      expect(`${failure.stdout ?? output}${failure.stderr ?? ""}`).toContain(
        "[count] library:core:descriptors",
      );
    }
  });
});
