import type { BonusQuestion, BonusTopic, CoreQuestion } from "../domain/question";
import { parseBonusPack, parseCorePack } from "./parse-content";
import type {
  BonusContentPack,
  BonusContentPackDescriptor,
  ContentManifest,
  CoreContentPack,
  CoreContentPackDescriptor,
} from "./types";

export type ContentLoadFailure =
  | "missing-pack"
  | "invalid-pack"
  | "missing-set";

export type ContentLoadResult<T> =
  | { ok: true; value: T; packId: string }
  | { ok: false; reason: ContentLoadFailure; packId?: string };

export interface ContentCatalog {
  readonly availableBonusTopics?: readonly BonusTopic[];
  loadCoreSet(dateKey: string): Promise<ContentLoadResult<CoreQuestion[]>>;
  loadBonusSet(
    topic: BonusTopic,
    setIndex: number,
  ): Promise<ContentLoadResult<BonusQuestion[]>>;
}

export type PackModule = { default: unknown };
export type PackModuleImporter = () => Promise<unknown>;
export type PackModuleRegistry = Record<string, PackModuleImporter>;

function selectCoreDescriptor(
  manifest: ContentManifest,
  dateKey: string,
): CoreContentPackDescriptor | undefined {
  return manifest.corePacks.find(
    (pack) => pack.dateStart <= dateKey && dateKey <= pack.dateEnd,
  );
}

function selectBonusDescriptor(
  manifest: ContentManifest,
  topic: BonusTopic,
  setIndex: number,
): BonusContentPackDescriptor | undefined {
  return manifest.bonusPacks.find(
    (pack) =>
      pack.topic === topic &&
      pack.setStart <= setIndex &&
      setIndex <= pack.setEnd,
  );
}

async function loadPack<TPack>(
  packId: string,
  path: string,
  importers: PackModuleRegistry,
  parse: (value: unknown) => TPack,
): Promise<ContentLoadResult<TPack>> {
  const importer = importers[path];
  if (!importer) {
    return { ok: false, reason: "missing-pack", packId };
  }

  try {
    const module = await importer();
    if (
      typeof module !== "object" ||
      module === null ||
      !("default" in module)
    ) {
      return { ok: false, reason: "invalid-pack", packId };
    }
    return {
      ok: true,
      value: parse((module as PackModule).default),
      packId,
    };
  } catch {
    return { ok: false, reason: "invalid-pack", packId };
  }
}

function isValidCorePack(
  pack: CoreContentPack,
  descriptor: CoreContentPackDescriptor,
): boolean {
  return pack.id === descriptor.id && pack.questions.length === descriptor.questionCount;
}

function isValidBonusPack(
  pack: BonusContentPack,
  descriptor: BonusContentPackDescriptor,
): boolean {
  return pack.id === descriptor.id && pack.questions.length === descriptor.questionCount;
}

export function createPackedContentCatalog(
  manifest: ContentManifest,
  importers: PackModuleRegistry,
): ContentCatalog {
  return {
    availableBonusTopics: [
      ...new Set(manifest.bonusPacks.map((pack) => pack.topic)),
    ],
    async loadCoreSet(dateKey) {
      const descriptor = selectCoreDescriptor(manifest, dateKey);
      if (!descriptor) {
        return { ok: false, reason: "missing-set" };
      }

      const loaded = await loadPack(
        descriptor.id,
        descriptor.path,
        importers,
        parseCorePack,
      );
      if (!loaded.ok) {
        return loaded;
      }
      if (!isValidCorePack(loaded.value, descriptor)) {
        return { ok: false, reason: "invalid-pack", packId: descriptor.id };
      }

      const questions = loaded.value.questions.filter(
        (question) => question.dateKey === dateKey,
      );
      return questions.length > 0
        ? { ok: true, value: questions, packId: descriptor.id }
        : { ok: false, reason: "missing-set", packId: descriptor.id };
    },

    async loadBonusSet(topic, setIndex) {
      const descriptor = selectBonusDescriptor(manifest, topic, setIndex);
      if (!descriptor) {
        return { ok: false, reason: "missing-set" };
      }

      const loaded = await loadPack(
        descriptor.id,
        descriptor.path,
        importers,
        parseBonusPack,
      );
      if (!loaded.ok) {
        return loaded;
      }
      if (!isValidBonusPack(loaded.value, descriptor)) {
        return { ok: false, reason: "invalid-pack", packId: descriptor.id };
      }

      const questions = loaded.value.questions.filter(
        (question) => question.topic === topic && question.setIndex === setIndex,
      );
      return questions.length > 0
        ? { ok: true, value: questions, packId: descriptor.id }
        : { ok: false, reason: "missing-set", packId: descriptor.id };
    },
  };
}
