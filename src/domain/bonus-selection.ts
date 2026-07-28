import type { BonusTopic, Question } from "./question";

export interface BonusSelection {
  questions: Question[];
  includesOtherTopics: boolean;
}

export function selectBonusQuestions(
  topic: BonusTopic,
  questions: Question[],
  completedQuestionIds: ReadonlySet<string>,
): BonusSelection {
  const unseen = questions.filter(
    (question) => !completedQuestionIds.has(question.id),
  );
  const preferred = unseen.filter((question) => question.topic === topic);
  const fallback = unseen.filter((question) => question.topic !== topic);
  const selected = [...preferred, ...fallback].slice(0, 3);

  return {
    questions: selected,
    includesOtherTopics: selected.some(
      (question) => question.topic !== topic,
    ),
  };
}
