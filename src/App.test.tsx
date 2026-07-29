import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import QuizApp from "./App";
import { bonusQuestions as bundledBonusQuestions } from "./data/questions";
import { createBonusEntitlement } from "./domain/bonus-entitlement";
import type { CoreQuestion } from "./domain/question";
import {
  advanceQuiz,
  answerCurrentQuestion,
  createQuizSession,
} from "./domain/quiz-session";
import {
  BrowserKeyValueStorage,
  ProgressRepository,
  progressStorageKeys,
  type KeyValueStorage,
} from "./services/progress-repository";
import type { QuizShareGateway } from "./services/quiz-share";
import type { RewardAdGateway } from "./services/reward-ad";

const coreQuestions: CoreQuestion[] = [
  {
    kind: "core",
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
    kind: "core",
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
    kind: "core",
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
    session = answerCurrentQuestion(session, question, question.answerIndex);
    session = advanceQuiz(session, coreQuestions.length);
  }
  return session;
}

class ControlledStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();
  private writeGate: Promise<void> | null = null;
  private failAfterSuccessfulWrites: number | null = null;
  failedWriteCount = 0;
  failWrites = false;
  writeAttempts = 0;

  getItem(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  async setItem(key: string, value: string): Promise<void> {
    this.writeAttempts += 1;
    if (this.failWrites) {
      this.failedWriteCount += 1;
      throw new Error("simulated storage failure");
    }
    if (this.failAfterSuccessfulWrites === 0) {
      this.failAfterSuccessfulWrites = null;
      this.failedWriteCount += 1;
      throw new Error("simulated one-time storage failure");
    }
    if (this.failAfterSuccessfulWrites != null) {
      this.failAfterSuccessfulWrites -= 1;
    }
    if (this.writeGate != null) {
      await this.writeGate;
    }
    this.values.set(key, value);
  }

  holdWrites(): () => void {
    let release = () => undefined;
    this.writeGate = new Promise<void>((resolve) => {
      release = () => {
        this.writeGate = null;
        resolve();
      };
    });
    return release;
  }

  failOnceAfter(successfulWrites: number): void {
    this.failAfterSuccessfulWrites = successfulWrites;
  }
}

class MutableTimeProvider {
  constructor(private value: Date) {}

  now(): Date {
    return this.value;
  }

  set(value: Date): void {
    this.value = value;
  }
}

function requiredButton(selector: string): HTMLButtonElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected button for selector: ${selector}`);
  }
  return element;
}

describe("QuizApp", () => {
  it("observes the mutable time provider at initialization and a pageshow hint", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    const timeProvider = new MutableTimeProvider(
      new Date("2026-07-28T03:00:00.000Z"),
    );

    render(
      <QuizApp
        timeProvider={timeProvider}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.timeObservation.lastObservedKstDate).toBe(
          "2026-07-28",
        );
      }
    });

    timeProvider.set(new Date("2026-07-29T03:00:00.000Z"));
    fireEvent(window, new Event("pageshow"));

    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.timeObservation).toMatchObject({
          lastObservedKstDate: "2026-07-29",
          lastValidKstDate: "2026-07-29",
          confidence: "normal",
        });
      }
    });
  });

  it("uses a fresh date for a new core session without moving it after midnight", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    const timeProvider = new MutableTimeProvider(
      new Date("2026-07-28T14:59:00.000Z"),
    );
    const user = userEvent.setup();

    render(
      <QuizApp
        timeProvider={timeProvider}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    await screen.findByRole("button", { name: "오늘의 3문제 시작" });
    timeProvider.set(new Date("2026-07-28T15:01:00.000Z"));
    fireEvent(window, new Event("pageshow"));
    await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));

    timeProvider.set(new Date("2026-07-29T15:00:00.000Z"));
    fireEvent(window, new Event("pageshow"));
    await user.click(screen.getByRole("button", { name: "동전" }));

    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.sessions).toHaveProperty("2026-07-29");
        expect(loaded.state.sessions).not.toHaveProperty("2026-07-30");
        expect(loaded.state.answerEvents[0].answeredAt).toBe(
          "2026-07-29T15:00:00.000Z",
        );
      }
    });
  });

  it("reads time at a visibility hint, answer retry, and core completion", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    const timeProvider = new MutableTimeProvider(
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const user = userEvent.setup();

    render(
      <QuizApp
        timeProvider={timeProvider}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector(".home-screen")).not.toBeNull();
    });
    timeProvider.set(new Date("2026-07-29T03:00:00.000Z"));
    fireEvent(document, new Event("visibilitychange"));
    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.timeObservation.lastObservedKstDate).toBe(
          "2026-07-29",
        );
      }
    });

    storage.failWrites = true;
    timeProvider.set(new Date("2026-07-30T03:00:00.000Z"));
    await user.click(requiredButton(".home-screen .primary-button"));
    timeProvider.set(new Date("2026-07-31T03:00:00.000Z"));
    await user.click(
      screen.getByRole("button", {
        name: coreQuestions[0].choices[coreQuestions[0].answerIndex],
      }),
    );
    await waitFor(() => {
      expect(document.querySelector(".answer-save-error")).not.toBeNull();
    });

    storage.failWrites = false;
    timeProvider.set(new Date("2026-08-01T03:00:00.000Z"));
    await user.click(requiredButton(".answer-save-error button"));
    await waitFor(() => {
      expect(requiredButton(".quiz-screen .primary-button")).toBeEnabled();
    });
    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.timeObservation.lastObservedKstDate).toBe(
          "2026-08-01",
        );
      }
    });

    await user.click(requiredButton(".quiz-screen .primary-button"));
    await user.click(
      screen.getByRole("button", {
        name: coreQuestions[1].choices[coreQuestions[1].answerIndex],
      }),
    );
    await waitFor(() => {
      expect(requiredButton(".quiz-screen .primary-button")).toBeEnabled();
    });
    await user.click(requiredButton(".quiz-screen .primary-button"));
    await user.click(
      screen.getByRole("button", {
        name: coreQuestions[2].choices[coreQuestions[2].answerIndex],
      }),
    );
    await waitFor(() => {
      expect(requiredButton(".quiz-screen .primary-button")).toBeEnabled();
    });

    timeProvider.set(new Date("2026-08-02T03:00:00.000Z"));
    await user.click(requiredButton(".quiz-screen .primary-button"));

    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.sessions).toHaveProperty("2026-07-30");
        expect(loaded.state.timeObservation.lastObservedKstDate).toBe(
          "2026-08-02",
        );
      }
    });
  });

  it("merges a resume observation behind an in-flight answer command", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    const timeProvider = new MutableTimeProvider(
      new Date("2026-07-28T03:00:00.000Z"),
    );

    render(
      <QuizApp
        timeProvider={timeProvider}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector(".home-screen")).not.toBeNull();
    });
    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.timeObservation.lastObservedKstDate).toBe(
          "2026-07-28",
        );
      }
    });

    const session = createQuizSession("2026-07-28");
    const writesBeforeCommand = storage.writeAttempts;
    const releaseWrite = storage.holdWrites();
    const answerWrite = repository.commitAnswer({
      attemptId: "external-core:2026-07-28:then-phone:0",
      sessionKey: session.dateKey,
      session,
      question: coreQuestions[0],
      selectedIndex: coreQuestions[0].answerIndex,
      answeredAt: "2026-07-28T03:00:00.000Z",
    });
    await waitFor(() => {
      expect(storage.writeAttempts).toBeGreaterThan(writesBeforeCommand);
    });

    timeProvider.set(new Date("2026-07-29T03:00:00.000Z"));
    fireEvent(window, new Event("pageshow"));
    releaseWrite();
    await answerWrite;

    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.answerEvents).toHaveLength(1);
        expect(loaded.state.sessions["2026-07-28"].answers).toHaveLength(1);
        expect(loaded.state.timeObservation.lastObservedKstDate).toBe(
          "2026-07-29",
        );
      }
    });
  });

  it("merges a midnight resume observation behind an in-flight bonus start", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": createCompletedSession("2026-07-28") },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });
    const timeProvider = new MutableTimeProvider(
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const user = userEvent.setup();

    render(
      <QuizApp
        timeProvider={timeProvider}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector(".result-screen")).not.toBeNull();
    });
    await user.click(requiredButton(".result-actions .outline-button"));
    const digitalTopicButton = document.querySelectorAll(".topic-button")[3];
    if (!(digitalTopicButton instanceof HTMLButtonElement)) {
      throw new Error("Expected the digital bonus topic button");
    }
    await user.click(digitalTopicButton);

    const writesBeforeCommand = storage.writeAttempts;
    const releaseWrite = storage.holdWrites();
    await user.click(requiredButton(".bonus-topic-screen .primary-button"));
    await waitFor(() => {
      expect(storage.writeAttempts).toBeGreaterThan(writesBeforeCommand);
    });

    timeProvider.set(new Date("2026-07-29T03:00:00.000Z"));
    fireEvent(window, new Event("pageshow"));
    releaseWrite();

    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.bonus.firstFreeUsed).toBe(true);
        expect(loaded.state.sessions).toHaveProperty(
          "2026-07-28:bonus:digital",
        );
        expect(Object.keys(loaded.state.bonusStartCommands)).toHaveLength(1);
        expect(loaded.state.timeObservation.lastObservedKstDate).toBe(
          "2026-07-29",
        );
      }
    });
  });

  it("commits a fresh low-confidence observation with the next answer after an observation write fails", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": createQuizSession("2026-07-28") },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });
    const timeProvider = new MutableTimeProvider(
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const user = userEvent.setup();

    render(
      <QuizApp
        timeProvider={timeProvider}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector(".quiz-screen")).not.toBeNull();
    });
    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.timeObservation.lastValidKstDate).toBe(
          "2026-07-28",
        );
      }
    });

    storage.failOnceAfter(0);
    timeProvider.set(new Date("2026-08-10T03:00:00.000Z"));
    fireEvent(window, new Event("pageshow"));
    await waitFor(() => {
      expect(storage.failedWriteCount).toBe(1);
    });

    await user.click(
      screen.getByRole("button", {
        name: coreQuestions[0].choices[coreQuestions[0].answerIndex],
      }),
    );
    await waitFor(() => {
      expect(
        document.querySelector(".answer-save-status.saved"),
      ).not.toBeNull();
    });

    const loaded = await repository.load();
    expect(loaded.kind).not.toBe("unrecoverable");
    if (loaded.kind !== "unrecoverable") {
      expect(loaded.state.answerEvents).toHaveLength(1);
      expect(loaded.state.timeObservation).toEqual({
        lastObservedKstDate: "2026-08-10",
        lastValidKstDate: "2026-07-28",
        confidence: "lowConfidence",
      });
    }
  });

  it("reads time for bonus start retries and preserves an active bonus session across rollover", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": createCompletedSession("2026-07-28") },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });
    const timeProvider = new MutableTimeProvider(
      new Date("2026-07-28T03:00:00.000Z"),
    );
    const user = userEvent.setup();
    const firstDigitalQuestion = bundledBonusQuestions.find(
      (question) => question.topic === "digital",
    );
    if (firstDigitalQuestion == null) {
      throw new Error("Expected a bundled digital bonus question");
    }

    render(
      <QuizApp
        timeProvider={timeProvider}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
      />,
    );

    await waitFor(() => {
      expect(document.querySelector(".result-screen")).not.toBeNull();
    });
    await user.click(requiredButton(".result-actions .outline-button"));
    const digitalTopicButton = document.querySelectorAll(".topic-button")[3];
    if (!(digitalTopicButton instanceof HTMLButtonElement)) {
      throw new Error("Expected the digital bonus topic button");
    }
    await user.click(digitalTopicButton);

    storage.failWrites = true;
    await user.click(requiredButton(".bonus-topic-screen .primary-button"));
    await waitFor(() => {
      expect(document.querySelector(".bonus-start-error")).not.toBeNull();
    });

    storage.failWrites = false;
    timeProvider.set(new Date("2026-07-29T03:00:00.000Z"));
    await user.click(requiredButton(".bonus-topic-screen .primary-button"));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: firstDigitalQuestion.prompt }),
      ).toBeInTheDocument();
    });
    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.timeObservation.lastObservedKstDate).toBe(
          "2026-07-29",
        );
      }
    });

    timeProvider.set(new Date("2026-07-30T03:00:00.000Z"));
    fireEvent(window, new Event("pageshow"));
    timeProvider.set(new Date("2026-07-31T03:00:00.000Z"));
    await user.click(
      screen.getByRole("button", {
        name: firstDigitalQuestion.choices[firstDigitalQuestion.answerIndex],
      }),
    );

    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.sessions).toHaveProperty(
          "2026-07-28:bonus:digital",
        );
        expect(loaded.state.sessions).not.toHaveProperty(
          "2026-07-31:bonus:digital",
        );
        expect(loaded.state.answerEvents.at(-1)).toMatchObject({
          sessionKey: "2026-07-28:bonus:digital",
          answeredAt: "2026-07-31T03:00:00.000Z",
        });
      }
    });
  });

  it("답을 누르면 해설은 즉시 보이지만 저장 성공 전까지 다음 문제를 잠근다", async () => {
    const storage = new ControlledStorage();
    const releaseWrite = storage.holdWrites();
    const repository = new ProgressRepository(storage);
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "오늘의 3문제 시작" }),
    );
    await user.click(screen.getByRole("button", { name: "동전" }));

    expect(screen.getByText("정답이에요")).toBeInTheDocument();
    expect(screen.getByText("기록을 저장하고 있어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 문제" })).toBeDisabled();

    releaseWrite();

    expect(await screen.findByText("저장됐어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 문제" })).toBeEnabled();
  });

  it("저장 실패 시 다음을 잠그고 같은 답변을 안전하게 다시 저장한다", async () => {
    const storage = new ControlledStorage();
    storage.failWrites = true;
    const repository = new ProgressRepository(storage);
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "오늘의 3문제 시작" }),
    );
    await user.click(screen.getByRole("button", { name: "동전" }));

    expect(await screen.findByText("기록을 남기지 못했어요")).toHaveAttribute(
      "role",
      "alert",
    );
    expect(screen.getByRole("button", { name: "다음 문제" })).toBeDisabled();

    storage.failWrites = false;
    await user.click(screen.getByRole("button", { name: "다시 저장" }));

    expect(await screen.findByText("저장됐어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 문제" })).toBeEnabled();
    const restored = await repository.load();
    expect(restored.kind).not.toBe("unrecoverable");
    if (restored.kind !== "unrecoverable") {
      expect(restored.state.answerEvents).toHaveLength(1);
    }
  });

  it("홈에서 한 번 눌러 첫 문제를 시작하고 답안 뒤 해설을 보여 준다", async () => {
    const user = userEvent.setup();
    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));

    expect(
      screen.getByRole("heading", {
        name: "예전 공중전화에서 통화를 더 이어가려면 무엇을 넣었을까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "동전" }));

    expect(screen.getByText("정답이에요")).toBeInTheDocument();
    expect(
      screen.getByText("안내음이 들리면 동전을 더 넣어 통화를 이어갔어요."),
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

    await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));
    await user.click(screen.getByRole("button", { name: "동전" }));
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    await user.click(screen.getByRole("button", { name: "블루투스" }));
    await user.click(screen.getByRole("button", { name: "다음 문제" }));
    await user.click(screen.getByRole("button", { name: "창문 열기" }));
    await user.click(screen.getByRole("button", { name: "결과 보기" }));

    expect(
      screen.getByRole("heading", { name: "오늘 결과" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("오늘 점수 2 / 3")).toBeInTheDocument();

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

    await user.click(screen.getByRole("button", { name: "디지털 생활" }));

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

  it("이전 유효 슬롯으로 복구하면 현재 화면 상단에 한 번 안내한다", async () => {
    window.localStorage.clear();
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    await repository.save({
      version: 1,
      sessions: {
        "2026-07-28": createQuizSession("2026-07-28"),
      },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });
    await repository.save({
      version: 1,
      sessions: {
        "2026-07-28": createQuizSession("2026-07-28"),
      },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });
    window.localStorage.setItem(progressStorageKeys.slotA, "{broken");
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
      />,
    );

    expect(
      await screen.findByText("기록을 확인해 불러왔어요."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "확인" }));
    expect(
      screen.queryByText("기록을 확인해 불러왔어요."),
    ).not.toBeInTheDocument();
  });

  it("전체 복구가 불가능하면 원본을 보존한 채 저장 없는 퀴즈만 허용한다", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(progressStorageKeys.slotA, "{slot-a");
    window.localStorage.setItem(progressStorageKeys.slotB, "{slot-b");
    window.localStorage.setItem(progressStorageKeys.legacy, "{legacy");
    const preserved = {
      slotA: window.localStorage.getItem(progressStorageKeys.slotA),
      slotB: window.localStorage.getItem(progressStorageKeys.slotB),
      legacy: window.localStorage.getItem(progressStorageKeys.legacy),
    };
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const user = userEvent.setup();

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
        name: "기록을 안전하게 열지 못했어요",
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "저장 없이 오늘 퀴즈 보기",
      }),
    );

    expect(screen.getByText("이번 기록은 저장되지 않아요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));
    await user.click(screen.getByRole("button", { name: "동전" }));
    expect(screen.getByRole("button", { name: "다음 문제" })).toBeEnabled();
    expect({
      slotA: window.localStorage.getItem(progressStorageKeys.slotA),
      slotB: window.localStorage.getItem(progressStorageKeys.slotB),
      legacy: window.localStorage.getItem(progressStorageKeys.legacy),
    }).toEqual(preserved);
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

    await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));
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
    await user.click(screen.getByRole("button", { name: "디지털 생활" }));
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
      expect(restored.kind).not.toBe("unrecoverable");
      if (restored.kind !== "unrecoverable") {
        expect(restored.state.sessions["2026-07-27"]).toBeDefined();
      }
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
      show: async () => ({ rewardGrantId: "reward-ad-existing-test" }),
    };
    const analyticsEvents: Array<{
      name: string;
      params?: Record<string, string | number | boolean>;
    }> = [];
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
        rewardAd={rewardAd}
        analytics={{
          track: (name, params) => analyticsEvents.push({ name, params }),
        }}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "원하는 주제로 보너스 3문제",
      }),
    );
    await user.click(screen.getByRole("button", { name: "디지털 생활" }));
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
    const restored = await repository.load();
    expect(restored.kind).not.toBe("unrecoverable");
    if (restored.kind !== "unrecoverable") {
      const [storedStart] = Object.values(restored.state.bonusStartCommands);
      expect(storedStart).toMatchObject({ source: "reward_ad" });
      expect(JSON.stringify(storedStart)).not.toContain(
        "reward-ad-existing-test",
      );
    }
    expect(
      analyticsEvents.filter((event) => event.name === "bonus_start"),
    ).toEqual([
      {
        name: "bonus_start",
        params: {
          dateKey: "2026-07-28",
          mode: "current",
          topic: "digital",
          unlockSource: "reward_ad",
        },
      },
    ]);
  });

  it("보너스 시작 저장이 끝날 때까지 화면을 유지하고 빠른 중복 클릭으로는 한 세션만 만든다", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    const analyticsEvents: Array<{
      name: string;
      params?: Record<string, string | number | boolean>;
    }> = [];
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": createCompletedSession("2026-07-28") },
      bonus: createBonusEntitlement(),
      completedBonusIds: [],
    });
    const releaseWrite = storage.holdWrites();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
        analytics={{
          track: (name, params) => analyticsEvents.push({ name, params }),
        }}
      />,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: "원하는 주제로 보너스 3문제",
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "디지털 생활" }));
    const start = screen.getByRole("button", {
      name: "첫 보너스 무료로 시작",
    });

    fireEvent.click(start);
    fireEvent.click(start);

    expect(screen.getByText("보너스를 시작하고 있어요")).toHaveAttribute(
      "role",
      "status",
    );
    expect(
      screen.getByRole("heading", { name: "보너스 주제 선택" }),
    ).toBeInTheDocument();

    releaseWrite();

    expect(
      await screen.findByRole("heading", {
        name: "와이파이 표시가 뜻하는 것은 무엇일까요?",
      }),
    ).toBeInTheDocument();
    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(Object.keys(loaded.state.bonusStartCommands)).toHaveLength(1);
      }
    });
    expect(
      analyticsEvents.filter((event) => event.name === "bonus_start"),
    ).toEqual([
      {
        name: "bonus_start",
        params: {
          dateKey: "2026-07-28",
          mode: "current",
          topic: "digital",
          unlockSource: "first_free",
        },
      },
    ]);
  });

  it("광고 보상 저장 실패 뒤 현재 권리를 유지하고 같은 보상 ID로 다시 시도한다", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": createCompletedSession("2026-07-28") },
      bonus: {
        ...createBonusEntitlement(),
        firstFreeUsed: true,
      },
      completedBonusIds: [],
    });
    storage.failWrites = true;
    let showCount = 0;
    const rewardAd: RewardAdGateway = {
      load: async () => true,
      show: async () => {
        showCount += 1;
        return { rewardGrantId: "reward-ad-retry" };
      },
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
    await user.click(screen.getByRole("button", { name: "디지털 생활" }));
    await user.click(
      await screen.findByRole("button", { name: "광고 보고 보너스 3문제" }),
    );

    expect(
      await screen.findByText("보너스를 시작하지 못했어요"),
    ).toHaveAttribute("role", "alert");
    expect(
      screen.getByRole("heading", { name: "보너스 주제 선택" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("보너스권 1장이 있어요")).not.toBeInTheDocument();

    storage.failWrites = false;
    await user.click(
      screen.getByRole("button", { name: "광고 보고 보너스 3문제" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "와이파이 표시가 뜻하는 것은 무엇일까요?",
      }),
    ).toBeInTheDocument();
    expect(showCount).toBe(1);
  });

  it("광고 보상 저장 뒤 시작 저장만 실패하면 주제를 바꿔 광고 없이 다시 시작한다", async () => {
    const storage = new ControlledStorage();
    const repository = new ProgressRepository(storage);
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": createCompletedSession("2026-07-28") },
      bonus: {
        ...createBonusEntitlement(),
        firstFreeUsed: true,
      },
      completedBonusIds: [],
    });
    let showCount = 0;
    const rewardAd: RewardAdGateway = {
      load: async () => true,
      show: async () => {
        showCount += 1;
        storage.failOnceAfter(1);
        return { rewardGrantId: "durable-reward-before-start-failure" };
      },
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
    await user.click(screen.getByRole("button", { name: "디지털 생활" }));
    await user.click(
      await screen.findByRole("button", { name: "광고 보고 보너스 3문제" }),
    );

    expect(
      await screen.findByText("보너스를 시작하지 못했어요"),
    ).toHaveAttribute("role", "alert");
    expect(screen.queryByText("보너스권 1장이 있어요")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "생활안전" }));
    await user.click(
      screen.getByRole("button", { name: "광고 보고 보너스 3문제" }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "화재나 구조가 필요할 때 신고하는 번호는 무엇일까요?",
      }),
    ).toBeInTheDocument();
    expect(showCount).toBe(1);
  });

  it("선택할 보너스 문제가 없으면 광고 보상이나 이용권을 만들지 않는다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    window.localStorage.clear();
    await repository.save({
      version: 1,
      sessions: { "2026-07-28": createCompletedSession("2026-07-28") },
      bonus: {
        ...createBonusEntitlement(),
        firstFreeUsed: true,
      },
      completedBonusIds: [],
    });
    let showCount = 0;
    const rewardAd: RewardAdGateway = {
      load: async () => true,
      show: async () => {
        showCount += 1;
        return { rewardGrantId: "unused-reward" };
      },
    };
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[]}
        repository={repository}
        rewardAd={rewardAd}
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "원하는 주제로 보너스 3문제",
      }),
    );
    await user.click(screen.getByRole("button", { name: "디지털 생활" }));
    await user.click(
      await screen.findByRole("button", { name: "광고 보고 보너스 3문제" }),
    );

    expect(
      await screen.findByText("준비된 보너스 문제가 없어요"),
    ).toHaveAttribute("role", "alert");
    expect(
      screen.getByRole("heading", { name: "보너스 주제 선택" }),
    ).toBeInTheDocument();
    expect(showCount).toBe(0);
    await waitFor(async () => {
      const loaded = await repository.load();
      expect(loaded.kind).not.toBe("unrecoverable");
      if (loaded.kind !== "unrecoverable") {
        expect(loaded.state.bonus.ticketCount).toBe(0);
        expect(loaded.state.rewardGrantIds).toEqual([]);
      }
    });
  });

  it("저장된 보너스 명령의 문제 순서로 진행 중인 세션을 다시 불러온다", async () => {
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    window.localStorage.clear();
    await repository.startBonusSession(
      "bonus-start-for-reload",
      "2026-07-28",
      "digital",
      bundledBonusQuestions,
    );

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={[...bundledBonusQuestions].reverse()}
        repository={repository}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "와이파이 표시가 뜻하는 것은 무엇일까요?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("같은 날짜와 주제로 다시 시작한 보너스는 가장 최근 저장 명령의 문제 순서로 복원한다", async () => {
    window.localStorage.clear();
    const repository = new ProgressRepository(
      new BrowserKeyValueStorage(window.localStorage),
    );
    const firstStart = await repository.startBonusSession(
      "10",
      "2026-07-28",
      "digital",
      bundledBonusQuestions,
    );
    expect(firstStart.applied).toBe(true);
    if (!firstStart.applied) {
      return;
    }

    const afterFirstStart = await repository.load();
    expect(afterFirstStart.kind).not.toBe("unrecoverable");
    if (afterFirstStart.kind === "unrecoverable") {
      return;
    }
    await repository.save({
      ...afterFirstStart.state,
      sessions: {
        ...afterFirstStart.state.sessions,
        [firstStart.session.dateKey]: {
          ...firstStart.session,
          currentIndex: 3,
          phase: "completed",
        },
      },
      bonus: {
        ...afterFirstStart.state.bonus,
        ticketCount: 1,
      },
      completedBonusIds: firstStart.questionIds,
    });
    const secondStart = await repository.startBonusSession(
      "2",
      "2026-07-28",
      "digital",
      bundledBonusQuestions,
    );
    expect(secondStart.applied).toBe(true);
    if (!secondStart.applied) {
      return;
    }
    expect(secondStart.questionIds).toEqual([
      "bonus-digital-4",
      "bonus-digital-5",
      "bonus-digital-6",
    ]);
    const restoredQuestions = secondStart.questionIds.map((questionId) => {
      const question = bundledBonusQuestions.find(
        (candidate) => candidate.id === questionId,
      );
      if (question == null) {
        throw new Error(`Missing fixture question ${questionId}`);
      }
      return question;
    });
    const user = userEvent.setup();

    render(
      <QuizApp
        now={new Date("2026-07-28T03:00:00.000Z")}
        coreQuestions={coreQuestions}
        bonusQuestions={bundledBonusQuestions}
        repository={repository}
      />,
    );

    for (const [index, question] of restoredQuestions.entries()) {
      expect(
        await screen.findByRole("heading", { name: question.prompt }),
      ).toBeInTheDocument();
      expect(screen.getByText(`${index + 1} / 3`)).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", {
          name: question.choices[question.answerIndex],
        }),
      );
      await screen.findByText("저장됐어요.");
      await user.click(
        screen.getByRole("button", {
          name:
            index === restoredQuestions.length - 1 ? "결과 보기" : "다음 문제",
        }),
      );
    }
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

    expect(await screen.findByText("공유할 내용을 열었어요.")).toHaveAttribute(
      "role",
      "status",
    );
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
      expect(progress.kind).not.toBe("unrecoverable");
      if (progress.kind !== "unrecoverable") {
        expect(progress.state.bonus.ticketCount).toBe(1);
        expect(progress.state.bonus.grantedMilestones).toEqual([
          "2026-07-28:3",
        ]);
      }
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
      expect(progress.kind).not.toBe("unrecoverable");
      if (progress.kind !== "unrecoverable") {
        expect(progress.state.bonus.ticketCount).toBe(1);
      }
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

    await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));
    for (const [index, question] of coreQuestions.entries()) {
      await user.click(
        screen.getByRole("button", {
          name: question.choices[question.answerIndex],
        }),
      );
      await user.click(
        screen.getByRole("button", {
          name: index === coreQuestions.length - 1 ? "결과 보기" : "다음 문제",
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
    expect(events[2].params).toEqual({
      dateKey: "2026-07-28",
      mode: "current",
    });
    const outboundFields = events.flatMap((event) =>
      Object.keys(event.params ?? {}),
    );
    expect(outboundFields).not.toEqual(
      expect.arrayContaining([
        "userId",
        "questionId",
        "conceptId",
        "selectedIndex",
        "isCorrect",
        "answeredAt",
      ]),
    );
  });
});
