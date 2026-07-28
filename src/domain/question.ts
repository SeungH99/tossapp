export type CoreLens = "then" | "now" | "life";

export type BonusTopic =
  | "nostalgia"
  | "korean-life"
  | "language"
  | "digital"
  | "safety"
  | "nature-general";

export interface Question {
  id: string;
  dateKey?: string;
  lens: CoreLens;
  topic: BonusTopic;
  prompt: string;
  choices: [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  source: {
    name: string;
    url: string;
  };
}
