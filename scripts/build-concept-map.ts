import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

interface ContentDescriptor {
  path: string;
}

interface ConceptManifest {
  corePacks: ContentDescriptor[];
  bonusPacks: ContentDescriptor[];
}

interface ConceptQuestion {
  id: string;
  conceptId?: unknown;
}

function compareQuestionIdsOrdinal(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function readDescriptorQuestions(
  cwd: string,
  descriptor: ContentDescriptor,
): ConceptQuestion[] {
  let raw: string;
  try {
    raw = readFileSync(resolve(cwd, descriptor.path), "utf8");
  } catch {
    throw new Error(`Unable to read descriptor path: ${descriptor.path}`);
  }
  const pack = JSON.parse(raw) as { questions?: unknown };
  if (!Array.isArray(pack.questions)) {
    throw new TypeError(`Descriptor has no question array: ${descriptor.path}`);
  }
  return pack.questions as ConceptQuestion[];
}

export function buildConceptMap(cwd = process.cwd()): Record<string, string> {
  const manifest = JSON.parse(
    readFileSync(resolve(cwd, "src/content/manifest.json"), "utf8"),
  ) as ConceptManifest;
  const conceptEntries = new Map<string, string>();

  for (const descriptor of [...manifest.corePacks, ...manifest.bonusPacks]) {
    for (const question of readDescriptorQuestions(cwd, descriptor)) {
      if (conceptEntries.has(question.id)) {
        throw new Error(`Duplicate question ID: ${question.id}`);
      }
      if (
        typeof question.conceptId !== "string" ||
        question.conceptId.trim().length === 0
      ) {
        throw new Error(`Empty concept ID: ${question.id}`);
      }
      conceptEntries.set(question.id, question.conceptId);
    }
  }

  return Object.fromEntries(
    [...conceptEntries.entries()].sort(([left], [right]) =>
      compareQuestionIdsOrdinal(left, right),
    ),
  );
}

export function main(cwd = process.cwd()): void {
  const conceptMap = buildConceptMap(cwd);
  writeFileSync(
    resolve(cwd, "src/content/concept-map.json"),
    `${JSON.stringify(conceptMap, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Concept map generated: ${Object.keys(conceptMap).length} question(s).`,
  );
}

if (
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
