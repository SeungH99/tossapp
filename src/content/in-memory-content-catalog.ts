import type { BonusQuestion, BonusTopic, CoreQuestion } from "../domain/question";
import type { ContentCatalog, ContentLoadResult } from "./content-catalog";
import type { BonusTopicMetadata } from "./types";

export type InMemoryCoreSets = Record<string, CoreQuestion[]>;
export type InMemoryBonusSets = Partial<
  Record<BonusTopic, Record<number, BonusQuestion[]>>
>;

export function createInMemoryContentCatalog(
  coreSets: InMemoryCoreSets,
  bonusSets: InMemoryBonusSets,
  bonusTopics?: readonly BonusTopicMetadata[],
): ContentCatalog {
  const orderedBonusTopics = [...(bonusTopics ?? [])].sort(
    (left, right) => left.order - right.order,
  );
  const availableBonusTopics = bonusTopics == null
    ? (Object.keys(bonusSets) as BonusTopic[])
    : orderedBonusTopics.map(({ id }) => id);

  return {
    bonusTopics: orderedBonusTopics,
    availableBonusTopics,
    async loadCoreSet(dateKey): Promise<ContentLoadResult<CoreQuestion[]>> {
      const questions = coreSets[dateKey];
      return questions && questions.length > 0
        ? { ok: true, value: questions, packId: `in-memory:core:${dateKey}` }
        : { ok: false, reason: "missing-set" };
    },

    async loadBonusSet(
      topic,
      setIndex,
    ): Promise<ContentLoadResult<BonusQuestion[]>> {
      const questions = bonusSets[topic]?.[setIndex];
      return questions && questions.length > 0
        ? {
            ok: true,
            value: questions,
            packId: `in-memory:bonus:${topic}:${setIndex}`,
          }
        : { ok: false, reason: "missing-set" };
    },
  };
}
