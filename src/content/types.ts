import type {
  BonusQuestion,
  BonusTopic,
  CoreQuestion,
  ReviewStatus,
} from "../domain/question";

export type ContentVersion = string;

export interface ContentPackBase {
  id: string;
  contentVersion: ContentVersion;
  reviewStatus: ReviewStatus;
}

export interface CoreContentPack extends ContentPackBase {
  kind: "core";
  questions: CoreQuestion[];
}

export interface BonusContentPack extends ContentPackBase {
  kind: "bonus";
  questions: BonusQuestion[];
}

interface ContentPackDescriptorBase {
  id: string;
  path: string;
  sha256: string;
  questionCount: number;
  reviewStatus: ReviewStatus;
}

export interface CoreContentPackDescriptor extends ContentPackDescriptorBase {
  kind: "core";
  dateStart: string;
  dateEnd: string;
}

export interface BonusContentPackDescriptor extends ContentPackDescriptorBase {
  kind: "bonus";
  topic: BonusTopic;
  setStart: number;
  setEnd: number;
}

export type ContentPackDescriptor =
  CoreContentPackDescriptor | BonusContentPackDescriptor;

export interface ContentManifest {
  releaseStart: string;
  releaseEnd: string;
  contentVersion: ContentVersion;
  corePacks: CoreContentPackDescriptor[];
  bonusPacks: BonusContentPackDescriptor[];
}
