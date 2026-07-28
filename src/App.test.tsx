import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import QuizApp from "./App";
import { bonusQuestions as bundledBonusQuestions } from "./data/questions";
import { createBonusEntitlement } from "./domain/bonus-entitlement";
import type { Question } from "./domain/question";
import {
  advanceQuiz,
  answerCurrentQuestion,
  createQuizSession,
} from "./domain/quiz-session";
import {
  BrowserKeyValueStorage,
  ProgressRepository,
} from "./services/progress-repository";
import type { QuizShareGateway } from "./services/quiz-share";
import type { RewardAdGateway } from "./services/reward-ad";

const coreQuestions: Question[] = [
  {
    id: "then-phone",
    dateKey: "2026-07-28",
    lens: "then",
    topic: "nostalgia",
    prompt: "예전 공중전화에서 통화를 더 이어가려면 무엇을 넣었을까요?",
    choices: ["전화카드", "동전", "우표"],
    answerIndex: 1,
    explanation: "안내음이 들리면 동전을 더 넣어 통화를 이어갔어요.",
    source: {
      name: "국가기록원 생활사 자료",
      url: "https://www.archives.go.kr/",
    },
  },
  {
    id: "now-qr",
    dateKey: "2026-07-28",
    lens: "now",
    topic: "digital",
    prompt: "스마트폰 카메라로 네모난 무늬를 비추는 기능은 무엇일까요?",
    choices: ["QR 코드", "블루투스", "절전 모드"],
    answerIndex: 0,
    explanation: "QR 코드를 비추면 연결된 정보나 주소를 열 수 있어요.",
    source: {
      name: "디지털배움터",
      url: "https://www.xn--2z1bw8k1pjz5ccumkb.kr/",
    },
  },
  {
    id: "life-safety",
    dateKey: "2026-07-28",
    lens: "life",
    topic: "safety",
    prompt: "가스 냄새가 날 때 가장 먼저 할 일은 무엇일까요?",
    choices: ["전등 켜기", "창문 열기", "선풍기 켜기"],
    answerIndex: 1,
    explanation: "불꽃이나 전기 스위치를 피하고 창문을 열어 환기해요.",
    source: {
      name: "한국가스안전공사",
      url: "https://www.kgs.or.kr/",
    },
  },
];

function createCompletedSession(dateKey: string) {
  let session = createQuizSession(dateKey);
  for (const question of coreQuestions) {
    session = answerCurrentQuestion(
      session,
      question,
      question.answerIndex,
    );
    session = advanceQuiz(session, coreQuestions.length);
  }
  return session;
}

describe("QuizApp", () => {
  it("홈에서 한 번 눌러 첫 문제를 시작하고 답안 뒤 해설을 보여 준다", async () => {
    const user = userEvent.setup();
    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "오늘의 3문제 시작" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "예전 공중전화에서 통화를 더 이어가려면 무엇을 넣었을까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "동전" }));

    expect(screen.getByText("정답이에요")).toBeInTheDocument();
    expect(
      screen.getByText(
        "안내음이 들리면 동전을 더 넣어 통화를 이어갔어요.",
      ),
    ).toBeInTheDocument();
  });

  it("세 문제를 마치면 점수와 첫 무료 보너스 주제 선택을 보여 준다", async () => {
    const user = userEvent.setup();
    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "오늘의 3문제 시작" }),
    );
    await user.click(screen.getByRole("button", { name: "동전" }));
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    await user.click(
      screen.getByRole("button", { name: "블루투스" }),
    );
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    await user.click(screen.getByRole("button", { name: "창문 열기" }));
    await user.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(
      screen.getByRole("heading", { name: "오늘 결과" }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("오늘 점수 2 / 3"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: "원하는 주제로 보너스 3문제",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "보너스 주제 선택" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "디지털 생활" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "첫 보너스 무료로 시작" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "디지털 생활" }),
    );

    expect(
      screen.getByRole("button", { name: "첫 보너스 무료로 시작" }),
    ).toBeEnabled();
  });

  it("저장된 오늘 진행이 있으면 다음 문제부터 복구한다", async () => {
    window.localStorage.clear();
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    let session = createQuizSession("2026-07-28");
    session = answerCurrentQuestion(session, coreQuestions[0], 1);
    session = advanceQuiz(session, coreQuestions.length);
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": session },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "스마트폰 카메라로 네모난 무늬를 비추는 기능은 무엇일까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("선택한 주제의 첫 보너스 세 문제를 광고 없이 시작한다", async () => {
    const user = userEvent.setup();
    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "오늘의 3문제 시작" }),
    );
    await user.click(screen.getByRole("button", { name: "동전" }));
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    await user.click(screen.getByRole("button", { name: "QR 코드" }));
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    await user.click(screen.getByRole("button", { name: "창문 열기" }));
    await user.click(screen.getByRole("button", { name: "결과 보기" }));
    await user.click(
      screen.getByRole("button", {
        name: "원하는 주제로 보너스 3문제",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "디지털 생활" }),
    );
    await user.click(
      screen.getByRole("button", { name: "첫 보너스 무료로 시작" }),
    );

    expect(
      screen.getByRole("heading", {
        name: "와이파이 표시가 뜻하는 것은 무엇일까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/광고/)).not.toBeInTheDocument();
  });

  it("진행 중인 보너스 문제와 이전 날짜 기록을 함께 복원한다", async () => {
    window.localStorage.clear();
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const digitalQuestions = bundledBonusQuestions.filter(
      (question) => question.topic === "digital",
    );
    let coreSession = createQuizSession("2026-07-28");
    for (const question of coreQuestions) {
      coreSession = answerCurrentQuestion(
        coreSession,
        question,
        question.answerIndex,
      );
      coreSession = advanceQuiz(coreSession, coreQuestions.length);
    }
    let bonusSession = createQuizSession("2026-07-28:bonus:digital");
    bonusSession = answerCurrentQuestion(
      bonusSession,
      digitalQuestions[0],
      digitalQuestions[0].answerIndex,
    );
    bonusSession = advanceQuiz(bonusSession, digitalQuestions.length);

    await repository.save({
      version: 1,
      sessions: {
        "2026-07-27": createQuizSession("2026-07-27"),
        "2026-07-28": coreSession,
        [bonusSession.dateKey]: bonusSession,
      },
      bonus: {
        ...createBonusEntitlement(),
        firstFreeUsed: true,
      },
      completedBonusIds: [],
    });

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "문자 속 주소를 눌러 개인정보를 빼내는 사기는 무엇일까요?",
      }),
    ).toBeInTheDocument();

    await waitFor(async () => {
      const restored = await repository.load();
      expect(restored.sessions["2026-07-27"]).toBeDefined();
    });
  });

  it("첫 무료 보너스 이후에는 보상형 광고 완료 뒤 다음 문제를 연다", async () => {
    window.localStorage.clear();
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    let coreSession = createQuizSession("2026-07-28");
    for (const question of coreQuestions) {
      coreSession = answerCurrentQuestion(
        coreSession,
        question,
        question.answerIndex,
      );
      coreSession = advanceQuiz(coreSession, coreQuestions.length);
    }
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": coreSession },
      bonus: {
        ...createBonusEntitlement(),
        firstFreeUsed: true,
      },
      completedBonusIds: [],
    });
    const rewardAd: RewardAdGateway = {
      load: async () => true,
      show: async () => true,
    };
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
        rewardAd={rewardAd}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "원하는 주제로 보너스 3문제",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "디지털 생활" }),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "광고 보고 보너스 3문제",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "와이파이 표시가 뜻하는 것은 무엇일까요?",
      }),
    ).toBeInTheDocument();
  });

  it("결과 점수와 같은 문제 링크를 친구에게 공유한다", async () => {
    window.localStorage.clear();
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    let coreSession = createQuizSession("2026-07-28");
    for (const question of coreQuestions) {
      coreSession = answerCurrentQuestion(
        coreSession,
        question,
        question.answerIndex,
      );
      coreSession = advanceQuiz(coreSession, coreQuestions.length);
    }
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": coreSession },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });
    const sharedScores: number[] = [];
    const shareGateway: QuizShareGateway = {
      shareScore: async (score) => {
        sharedScores.push(score);
        return true;
      },
    };
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
        shareGateway={shareGateway}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "친구에게 같은 문제 보내기",
      }),
    );

    expect(
      await screen.findByText("공유할 내용을 열었어요."),
    ).toHaveAttribute("role", "status");
    expect(sharedScores).toEqual([3]);
  });

  it("3일 연속 완료 시 보너스권을 한 번만 지급하고 다시 열어도 중복 지급하지 않는다", async () => {
    window.localStorage.clear();
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save({
      version: 1,
      sessions: {
        "2026-07-28": createCompletedSession("2026-07-28"),
        "2026-07-29": createCompletedSession("2026-07-29"),
        "2026-07-30": createCompletedSession("2026-07-30"),
      },
      bonus: {
        ...createBonusEntitlement(),
        firstFreeUsed: true,
      },
      completedBonusIds: [],
    });

    const firstRender = render(
      <QuizApp
        now={new Date("2026-07-30T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
      />,
    );

    expect(
      await screen.findByText("보너스권 1장이 있어요"),
    ).toBeInTheDocument();
    await waitFor(async () => {
      const progress = await repository.load();
      expect(progress.bonus.ticketCount).toBe(1);
      expect(progress.bonus.grantedMilestones).toEqual([
        "2026-07-28:3",
      ]);
    });

    firstRender.unmount();
    render(
      <QuizApp
        now={new Date("2026-07-30T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
      />,
    );

    expect(
      await screen.findByText("보너스권 1장이 있어요"),
    ).toBeInTheDocument();
    await waitFor(async () => {
      const progress = await repository.load();
      expect(progress.bonus.ticketCount).toBe(1);
    });
  });

  it("핵심 퀴즈 퍼널을 개인정보 없이 분석 이벤트로 기록한다", async () => {
    const events: Array<{
      name: string;
      params?: Record<string, string | number | boolean>;
    }> = [];
    const analytics = {
      track: (
        name: string,
        params?: Record<string, string | number | boolean>,
      ) => {
        events.push({ name, params });
      },
    };
    const shareGateway: QuizShareGateway = {
      shareScore: async () => true,
    };
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        analytics={analytics}
        shareGateway={shareGateway}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "오늘의 3문제 시작" }),
    );
    for (const [index, question] of coreQuestions.entries()) {
      await user.click(
        screen.getByRole("button", {
          name: question.choices[question.answerIndex],
        }),
      );
      await user.click(
        screen.getByRole("button", {
          name:
            index === coreQuestions.length - 1
              ? "결과 보기"
              : "다음 문제",
        }),
      );
    }
    await user.click(
      screen.getByRole("button", {
        name: "친구에게 같은 문제 보내기",
      }),
    );

    await waitFor(() => {
      expect(events.map((event) => event.name)).toEqual([
        "app_open",
        "quiz_start",
        "core_answer",
        "core_answer",
        "core_answer",
        "core_complete",
        "result_view",
        "share_attempt",
        "share_complete",
      ]);
    });
    expect(events[2].params).toMatchObject({
      dateKey: "2026-07-28",
      lens: "then",
      questionId: "then-phone",
      selectedIndex: 1,
      isCorrect: true,
      mode: "current",
    });
    expect(events.flatMap((event) => Object.keys(event.params ?? {}))).not
      .toContain("userId");
  });
});
