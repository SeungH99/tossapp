import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { ContentManifest } from "../src/content/types";
import { bonusQuestions } from "../src/data/questions";
import type { BonusTopic } from "../src/domain/question";

export interface LegacyQuestionRecord {
  id: string;
}

export interface NewBonusQuestionRecord {
  id: string;
  topic: BonusTopic;
  setIndex: number;
}

export interface LegacySetMapping {
  topic: BonusTopic;
  setIndex: number;
  legacyQuestionIds: string[];
}

export interface LegacyQuestionTarget {
  topic: BonusTopic;
  setIndex: number;
}

export interface LegacyMapBuildResult {
  legacyMap: Record<string, LegacyQuestionTarget>;
  completeSets: LegacySetMapping[];
  partialMappings: LegacySetMapping[];
  unmappedIds: string[];
}

function compareMappings(left: LegacySetMapping, right: LegacySetMapping) {
  return left.topic.localeCompare(right.topic) || left.setIndex - right.setIndex;
}

export function buildLegacyMap(
  oldQuestions: readonly LegacyQuestionRecord[],
  newQuestions: readonly NewBonusQuestionRecord[],
): LegacyMapBuildResult {
  const newById = new Map(newQuestions.map((question) => [question.id, question]));
  const grouped = new Map<string, LegacySetMapping>();
  const unmappedIds: string[] = [];

  for (const questionId of new Set(oldQuestions.map(({ id }) => id))) {
    const target = newById.get(questionId);
    if (target == null) {
      unmappedIds.push(questionId);
      continue;
    }
    const key = `${target.topic}:${target.setIndex}`;
    const mapping = grouped.get(key) ?? {
      topic: target.topic,
      setIndex: target.setIndex,
      legacyQuestionIds: [],
    };
    mapping.legacyQuestionIds.push(questionId);
    grouped.set(key, mapping);
  }

  const mappings = [...grouped.values()].map((mapping) => ({
    ...mapping,
    legacyQuestionIds: mapping.legacyQuestionIds.sort(),
  }));
  const completeSets = mappings
    .filter(({ legacyQuestionIds }) => legacyQuestionIds.length === 3)
    .sort(compareMappings);
  const partialMappings = mappings
    .filter(({ legacyQuestionIds }) => legacyQuestionIds.length !== 3)
    .sort(compareMappings);
  const legacyMap: Record<string, LegacyQuestionTarget> = {};
  for (const { topic, setIndex, legacyQuestionIds } of completeSets) {
    for (const questionId of legacyQuestionIds) {
      legacyMap[questionId] = { topic, setIndex };
    }
  }

  return {
    legacyMap,
    completeSets,
    partialMappings,
    unmappedIds: unmappedIds.sort(),
  };
}

function loadNewBonusQuestions(cwd: string): NewBonusQuestionRecord[] {
  const manifest = JSON.parse(
    readFileSync(resolve(cwd, "src/content/manifest.json"), "utf8"),
  ) as ContentManifest;
  return manifest.bonusPacks.flatMap((descriptor) => {
    const pack = JSON.parse(
      readFileSync(resolve(cwd, descriptor.path), "utf8"),
    ) as { questions: NewBonusQuestionRecord[] };
    return pack.questions;
  });
}

export function main(cwd = process.cwd()): void {
  const result = buildLegacyMap(bonusQuestions, loadNewBonusQuestions(cwd));
  writeFileSync(
    resolve(cwd, "src/content/legacy-map.json"),
    `${JSON.stringify(result.legacyMap, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `Legacy map generated: ${result.completeSets.length} complete set(s), ${result.partialMappings.length} partial mapping(s), ${result.unmappedIds.length} unmapped ID(s).`,
  );
}

if (
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
