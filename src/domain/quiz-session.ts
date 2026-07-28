import type { CoreLens, Question } from "./question";

const coreLensOrder: CoreLens[] = ["then", "now", "life"];

export interface QuizAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
}

export interface QuizSession {
  dateKey: string;
  currentIndex: number;
  phase: "question" | "explanation" | "completed";
  answers: QuizAnswer[];
}

export function selectDailyCoreSet(
  dateKey: string,
  questions: Question[],
): Question[] {
  return coreLensOrder.map((lens) => {
    const datedQuestion = questions.find(
      (candidate) =>
        candidate.dateKey === dateKey && candidate.lens === lens,
    );

    if (datedQuestion != null) {
      return datedQuestion;
    }

    const availableQuestions = questions.filter(
      (candidate) => candidate.lens === lens,
    );
    if (availableQuestions.length === 0) {
      throw new Error(`Missing ${lens} question for ${dateKey}`);
    }

    const rotationSeed = [...`${dateKey}:${lens}`].reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    );
    return availableQuestions[rotationSeed % availableQuestions.length];
  });
}

export function createQuizSession(dateKey: string): QuizSession {
  return {
    dateKey,
    currentIndex: 0,
    phase: "question",
    answers: [],
  };
}

export function answerCurrentQuestion(
  session: QuizSession,
  question: Question,
  selectedIndex: number,
): QuizSession {
  if (session.phase !== "question") {
    return session;
  }

  return {
    ...session,
    phase: "explanation",
    answers: [
      ...session.answers,
      {
        questionId: question.id,
        selectedIndex,
        isCorrect: selectedIndex === question.answerIndex,
      },
    ],
  };
}

export function advanceQuiz(
  session: QuizSession,
  questionCount: number,
): QuizSession {
  if (session.phase !== "explanation") {
    return session;
  }

  if (session.currentIndex >= questionCount - 1) {
    return { ...session, phase: "completed" };
  }

  return {
    ...session,
    currentIndex: session.currentIndex + 1,
    phase: "question",
  };
}

export function scoreQuiz(session: QuizSession): number {
  return session.answers.filter((answer) => answer.isCorrect).length;
}
