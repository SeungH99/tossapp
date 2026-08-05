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

type ConceptMap = Record<string, string>;

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

function readHistoricalConceptMap(cwd: string): ConceptMap {
  const path = "src/content/legacy-concept-map.json";
  let raw: string;
  try {
    raw = readFileSync(resolve(cwd, path), "utf8");
  } catch {
    throw new Error(`Unable to read historical concept map: ${path}`);
  }

  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed == null || Array.isArray(parsed)) {
    throw new TypeError(`Historical concept map must be an object: ${path}`);
  }

  const historicalConcepts = parsed as Record<string, unknown>;
  const result: ConceptMap = {};
  for (const questionId of Object.keys(historicalConcepts).sort(
    compareQuestionIdsOrdinal,
  )) {
    const conceptId = historicalConcepts[questionId];
    if (questionId.trim().length === 0) {
      throw new Error("Empty historical question ID");
    }
    if (typeof conceptId !== "string" || conceptId.trim().length === 0) {
      throw new Error(`Empty concept ID: ${questionId}`);
    }
    result[questionId] = conceptId;
  }
  return result;
}

function serializeConceptMap(conceptMap: ConceptMap): string {
  return `${JSON.stringify(conceptMap, null, 2)}\n`;
}

export function buildConceptMap(cwd = process.cwd()): ConceptMap {
  const manifest = JSON.parse(
    readFileSync(resolve(cwd, "src/content/manifest.json"), "utf8"),
  ) as ConceptManifest;
  const conceptEntries = new Map<string, string>(
    Object.entries(readHistoricalConceptMap(cwd)),
  );
  const currentQuestionIds = new Set<string>();

  for (const descriptor of [...manifest.corePacks, ...manifest.bonusPacks]) {
    for (const question of readDescriptorQuestions(cwd, descriptor)) {
      if (currentQuestionIds.has(question.id)) {
        throw new Error(`Duplicate question ID: ${question.id}`);
      }
      currentQuestionIds.add(question.id);
      if (
        typeof question.conceptId !== "string" ||
        question.conceptId.trim().length === 0
      ) {
        throw new Error(`Empty concept ID: ${question.id}`);
      }
      const historicalConceptId = conceptEntries.get(question.id);
      if (
        historicalConceptId != null &&
        historicalConceptId !== question.conceptId
      ) {
        throw new Error(
          `Conflicting concept mapping for question ID ${question.id}: ${historicalConceptId} !== ${question.conceptId}`,
        );
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

export function main(
  cwd = process.cwd(),
  args: readonly string[] = process.argv.slice(2),
): void {
  const unsupportedArgs = args.filter((arg) => arg !== "--check");
  if (unsupportedArgs.length > 0) {
    throw new Error(`Unsupported argument: ${unsupportedArgs[0]}`);
  }
  const conceptMap = buildConceptMap(cwd);
  const output = serializeConceptMap(conceptMap);
  const conceptMapPath = resolve(cwd, "src/content/concept-map.json");

  if (args.includes("--check")) {
    let committed: string;
    try {
      committed = readFileSync(conceptMapPath, "utf8");
    } catch {
      throw new Error(
        "Concept map is out of date: committed output is missing",
      );
    }
    if (committed !== output) {
      throw new Error(
        "Concept map is out of date. Run npm run build:concept-map.",
      );
    }
    console.log(
      `Concept map is up to date: ${Object.keys(conceptMap).length} question(s).`,
    );
    return;
  }

  writeFileSync(conceptMapPath, output, "utf8");
  console.log(
    `Concept map generated: ${Object.keys(conceptMap).length} question(s).`,
  );
}

if (
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.cwd(), process.argv.slice(2));
}
