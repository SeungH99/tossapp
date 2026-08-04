import type { BonusQuestion, BonusTopic, CoreQuestion } from "../domain/question";
import type { ContentCatalog, ContentLoadResult } from "./content-catalog";

export type InMemoryCoreSets = Record<string, CoreQuestion[]>;
export type InMemoryBonusSets = Partial<
  Record<BonusTopic, Record<number, BonusQuestion[]>>
>;

export function createInMemoryContentCatalog(
  coreSets: InMemoryCoreSets,
  bonusSets: InMemoryBonusSets,
): ContentCatalog {
  return {
    async loadCoreSet(dateKey): Promise<ContentLoadResult<CoreQuestion[]>> {
      const questions = coreSets[dateKey];
      return questions
        ? { ok: true, value: questions, packId: `in-memory:core:${dateKey}` }
        : { ok: false, reason: "missing-set" };
    },

    async loadBonusSet(
      topic,
      setIndex,
    ): Promise<ContentLoadResult<BonusQuestion[]>> {
      const questions = bonusSets[topic]?.[setIndex];
      return questions
        ? {
            ok: true,
            value: questions,
            packId: `in-memory:bonus:${topic}:${setIndex}`,
          }
        : { ok: false, reason: "missing-set" };
    },
  };
}
