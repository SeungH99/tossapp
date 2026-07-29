import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import "./App.css";
import {
  createBonusEntitlement,
  grantStreakTicket,
} from "./domain/bonus-entitlement";
import { selectBonusQuestions } from "./domain/bonus-selection";
import { toKstDateKey } from "./domain/date-key";
import {
  applyAnswerCommand,
  grantBonusTicketCommand,
  startBonusSessionCommand,
  type AnswerCommand,
  type StartBonusSessionResult,
} from "./domain/progress-commands";
import type { ProgressState } from "./domain/progress-state";
import type {
  BonusQuestion,
  BonusTopic,
  CoreLens,
  CoreQuestion,
  Question,
} from "./domain/question";
import {
  advanceQuiz,
  createQuizSession,
  scoreQuiz,
  selectDailyCoreSet,
  type QuizSession,
} from "./domain/quiz-session";
import {
  calculateCompletionStreak,
  calculateVisibleStreakDay,
} from "./domain/streak";
import {
  createEmptyProgress,
  type ProgressRepository,
} from "./services/progress-repository";
import type { QuizShareGateway } from "./services/quiz-share";
import type { RewardAdGateway } from "./services/reward-ad";
import type { AnalyticsGateway, AnalyticsParams } from "./services/analytics";

type AppScreen = "home" | "quiz" | "result" | "bonus-topic" | "bonus-quiz";

interface QuizAppProps {
  now: Date;
  coreQuestions: CoreQuestion[];
  bonusQuestions: BonusQuestion[];
  repository?: ProgressRepository;
  rewardAd?: RewardAdGateway;
  shareGateway?: QuizShareGateway;
  analytics?: AnalyticsGateway;
}

type AdState = "loading" | "ready" | "unavailable";
type AnswerSaveStatus = "idle" | "saving" | "saved" | "error";
type BonusStartStatus = "idle" | "showing-ad" | "saving" | "error";

interface PendingBonusStart {
  commandId: string;
  topic: BonusTopic;
  rewardGrantId?: string;
}

function createBonusStartCommandId(dateKey: string, topic: BonusTopic): string {
  const suffix =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `bonus:${dateKey}:${topic}:${suffix}`;
}

function findBonusQuestionsById(
  questionIds: string[],
  bonusQuestions: BonusQuestion[],
): BonusQuestion[] | null {
  const byId = new Map(
    bonusQuestions.map((question) => [question.id, question]),
  );
  const selected = questionIds.map((questionId) => byId.get(questionId));

  return selected.every((question) => question != null)
    ? (selected as BonusQuestion[])
    : null;
}

const lensLabels: Record<CoreLens, string> = {
  then: "그때",
  now: "요즘",
  life: "생활",
};

const bonusTopics: Array<{ id: BonusTopic; label: string }> = [
  { id: "nostalgia", label: "추억·대중문화" },
  { id: "korean-life", label: "한국 생활사" },
  { id: "language", label: "말·속담·맞춤법" },
  { id: "digital", label: "디지털 생활" },
  { id: "safety", label: "생활안전" },
  { id: "nature-general", label: "자연·일반상식" },
];

function formatKoreanDate(date: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function RecoveredNotice({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section className="recovered-notice" role="status">
      <div>
        <strong>기록을 확인해 불러왔어요.</strong>
        <p>마지막 답변이 보이지 않으면 다시 선택해주세요.</p>
      </div>
      <button type="button" onClick={onDismiss}>
        확인
      </button>
    </section>
  );
}

function NoSaveNotice() {
  return (
    <section className="no-save-notice" role="status">
      <strong>이번 기록은 저장되지 않아요</strong>
      <p>점수는 볼 수 있지만 연속 참여와 보너스권에는 반영되지 않아요.</p>
    </section>
  );
}

function HomeScreen({
  now,
  onStart,
  persistenceNotice,
  streakDay,
}: {
  now: Date;
  onStart: () => void;
  persistenceNotice?: ReactNode;
  streakDay: number;
}) {
  return (
    <main className="app-shell home-screen">
      {persistenceNotice}
      <div className="date-label">
        <span>{formatKoreanDate(now)}</span>
        <span className="yellow-rule" aria-hidden="true" />
      </div>

      <section className="home-hero" aria-labelledby="brand-title">
        <h1 id="brand-title">그때요즘</h1>
        <p>그때 · 요즘 · 생활</p>
      </section>

      <section className="streak-card" aria-label="연속 참여 현황">
        <strong>
          연속 참여 <span>{streakDay}일째</span>
        </strong>
        <p>오늘 세 문제부터 편안하게 시작해요</p>
      </section>

      <button className="primary-button" type="button" onClick={onStart}>
        오늘의 3문제 시작
      </button>
    </main>
  );
}

function QuizScreen({
  questions,
  session,
  onAnswer,
  onNext,
  onRetrySave,
  persistenceNotice,
  saveStatus,
}: {
  questions: Question[];
  session: QuizSession;
  onAnswer: (selectedIndex: number) => void;
  onNext: () => void;
  onRetrySave: () => void;
  persistenceNotice?: ReactNode;
  saveStatus: AnswerSaveStatus;
}) {
  const question = questions[session.currentIndex];
  const answer = session.answers[session.currentIndex];
  const isExplanation = session.phase === "explanation";
  const isLastQuestion = session.currentIndex === questions.length - 1;

  return (
    <main className="app-shell quiz-screen">
      {persistenceNotice}
      <header className="quiz-header">
        <strong>{lensLabels[question.lens]}</strong>
        <span
          aria-label={`진행 ${session.currentIndex + 1} / ${questions.length}`}
        >
          {session.currentIndex + 1} / {questions.length}
        </span>
      </header>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-valuenow={session.currentIndex + 1}
      >
        <span
          style={{
            width: `${((session.currentIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      <section className="question-section">
        <h1>{question.prompt}</h1>
        <div className="answer-list">
          {question.choices.map((choice, index) => {
            const isSelected = answer?.selectedIndex === index;
            const isCorrectChoice =
              isExplanation && index === question.answerIndex;

            return (
              <button
                className={[
                  "answer-button",
                  isSelected ? "selected" : "",
                  isCorrectChoice ? "correct" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                disabled={isExplanation}
                key={choice}
                onClick={() => onAnswer(index)}
                type="button"
              >
                <span>{choice}</span>
                {isSelected ? (
                  <span className="answer-mark" aria-hidden="true">
                    ✓
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {isExplanation && answer != null ? (
        <section
          className={`explanation-card ${answer.isCorrect ? "success" : "retry"}`}
          aria-live="polite"
        >
          <strong>{answer.isCorrect ? "정답이에요" : "아쉬워요"}</strong>
          <p>{question.explanation}</p>
          <a href={question.source.url} rel="noreferrer" target="_blank">
            {question.source.name}
          </a>
          {saveStatus === "saving" ? (
            <p className="answer-save-status" role="status">
              기록을 저장하고 있어요
            </p>
          ) : null}
          {saveStatus === "saved" ? (
            <p className="answer-save-status saved" role="status">
              저장됐어요.
            </p>
          ) : null}
          {saveStatus === "error" ? (
            <div className="answer-save-error">
              <p role="alert">기록을 남기지 못했어요</p>
              <p>연결을 확인한 뒤 다시 저장해주세요.</p>
              <button type="button" onClick={onRetrySave}>
                다시 저장
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {isExplanation ? (
        <button
          className="primary-button"
          disabled={saveStatus === "saving" || saveStatus === "error"}
          type="button"
          onClick={onNext}
        >
          {isLastQuestion ? "결과 보기" : "다음 문제"}
        </button>
      ) : null}
    </main>
  );
}

function ResultScreen({
  entitlement,
  score,
  onBonus,
  onShare,
  persistenceNotice,
  shareStatus,
}: {
  entitlement: ReturnType<typeof createBonusEntitlement>;
  score: number;
  onBonus: () => void;
  onShare: () => void;
  persistenceNotice?: ReactNode;
  shareStatus: "idle" | "sharing" | "shared" | "error";
}) {
  return (
    <main className="app-shell result-screen">
      {persistenceNotice}
      <div className="result-heading">
        <h1>오늘 결과</h1>
        <span className="yellow-rule" aria-hidden="true" />
      </div>

      <section className="score-card" aria-label={`오늘 점수 ${score} / 3`}>
        <p>
          <strong>{score}</strong> / 3
        </p>
        <span className="yellow-rule" aria-hidden="true" />
        <h2>아는 것도, 새로 배운 것도 좋아요.</h2>
      </section>

      <div className="result-actions">
        <button
          className="primary-button"
          disabled={shareStatus === "sharing"}
          onClick={onShare}
          type="button"
        >
          {shareStatus === "sharing"
            ? "공유 준비 중"
            : "친구에게 같은 문제 보내기"}
        </button>
        <button className="outline-button" type="button" onClick={onBonus}>
          원하는 주제로 보너스 3문제
        </button>
      </div>

      {shareStatus === "shared" ? (
        <p className="share-status" role="status">
          공유할 내용을 열었어요.
        </p>
      ) : null}
      {shareStatus === "error" ? (
        <p className="share-status error" role="status">
          지금은 공유할 수 없어요. 잠시 뒤 다시 해주세요.
        </p>
      ) : null}

      <div className="ticket-note">
        <span aria-hidden="true">🎟</span>
        <strong>
          {!entitlement.firstFreeUsed
            ? "첫 보너스 3문제는 무료예요"
            : entitlement.ticketCount > 0
              ? `보너스권 ${entitlement.ticketCount}장이 있어요`
              : "다음 보너스는 광고를 보고 열 수 있어요"}
        </strong>
      </div>
    </main>
  );
}

function BonusTopicScreen({
  entitlement,
  adState,
  startStatus,
  startError,
  selectedTopic,
  onSelectTopic,
  onStart,
  persistenceNotice,
}: {
  entitlement: ReturnType<typeof createBonusEntitlement>;
  adState: AdState;
  startStatus: BonusStartStatus;
  startError: string | null;
  selectedTopic: BonusTopic | null;
  onSelectTopic: (topic: BonusTopic) => void;
  onStart: () => void;
  persistenceNotice?: ReactNode;
}) {
  const needsRewardAd =
    entitlement.firstFreeUsed && entitlement.ticketCount === 0;
  const isStarting = startStatus === "showing-ad" || startStatus === "saving";
  const startLabel = !entitlement.firstFreeUsed
    ? "첫 보너스 무료로 시작"
    : entitlement.ticketCount > 0
      ? "보너스권으로 시작"
      : adState === "ready"
        ? "광고 보고 보너스 3문제"
        : adState === "loading"
          ? "광고 준비 중"
          : "토스에서 광고 이용 가능";
  const supportCopy = !entitlement.firstFreeUsed
    ? "첫 보너스는 광고 없이 시작해요"
    : entitlement.ticketCount > 0
      ? `사용할 수 있는 보너스권 ${entitlement.ticketCount}장`
      : adState === "ready"
        ? "기본 3문제와 첫 보너스 3문제 뒤에만 광고가 나와요"
        : adState === "loading"
          ? "광고를 준비하고 있어요"
          : "광고는 토스 앱에서만 불러올 수 있어요";

  return (
    <main className="app-shell bonus-topic-screen">
      {persistenceNotice}
      <header className="bonus-heading">
        <h1>보너스 주제 선택</h1>
        <span className="yellow-rule" aria-hidden="true" />
        <p>좋아하는 주제로 3문제를 더 풀어요</p>
      </header>

      <div className="topic-grid" role="group" aria-label="보너스 주제">
        {bonusTopics.map((topic) => {
          const isSelected = topic.id === selectedTopic;
          return (
            <button
              aria-pressed={isSelected}
              className={isSelected ? "topic-button selected" : "topic-button"}
              disabled={isStarting}
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              type="button"
            >
              <span>{topic.label}</span>
              {isSelected ? <span aria-hidden="true">✓</span> : null}
            </button>
          );
        })}
      </div>

      <button
        className="primary-button"
        disabled={
          selectedTopic == null ||
          isStarting ||
          (needsRewardAd && adState !== "ready")
        }
        onClick={onStart}
        type="button"
      >
        {startLabel}
      </button>
      <p className="support-copy">{supportCopy}</p>
      {isStarting ? (
        <p className="bonus-start-status" role="status">
          보너스를 시작하고 있어요
        </p>
      ) : null}
      {startStatus === "error" && startError != null ? (
        <p className="bonus-start-error" role="alert">
          {startError}
        </p>
      ) : null}
    </main>
  );
}

export default function QuizApp({
  now,
  coreQuestions,
  bonusQuestions,
  repository,
  rewardAd,
  shareGateway,
  analytics,
}: QuizAppProps) {
  const dateKey = toKstDateKey(now);
  const questions = useMemo(
    () => selectDailyCoreSet(dateKey, coreQuestions),
    [coreQuestions, dateKey],
  );
  const [screen, setScreen] = useState<AppScreen>("home");
  const [session, setSession] = useState(() => createQuizSession(dateKey));
  const [entitlement, setEntitlement] = useState(createBonusEntitlement);
  const [completedBonusIds, setCompletedBonusIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(repository == null);
  const [persistenceWritable, setPersistenceWritable] = useState(true);
  const [storageRetry, setStorageRetry] = useState(0);
  const [showRecoveredNotice, setShowRecoveredNotice] = useState(false);
  const [noSaveMode, setNoSaveMode] = useState(false);
  const [answerSaveStatus, setAnswerSaveStatus] =
    useState<AnswerSaveStatus>("idle");
  const [selectedTopic, setSelectedTopic] = useState<BonusTopic | null>(null);
  const [bonusStartStatus, setBonusStartStatus] =
    useState<BonusStartStatus>("idle");
  const [bonusStartError, setBonusStartError] = useState<string | null>(null);
  const [bonusSet, setBonusSet] = useState<BonusQuestion[]>([]);
  const [bonusSession, setBonusSession] = useState<QuizSession | null>(null);
  const [savedSessions, setSavedSessions] = useState<
    Record<string, QuizSession>
  >({});
  const [adState, setAdState] = useState<AdState>(
    rewardAd == null ? "unavailable" : "loading",
  );
  const [shareStatus, setShareStatus] = useState<
    "idle" | "sharing" | "shared" | "error"
  >("idle");
  const trackedAppOpen = useRef(false);
  const progressRef = useRef<ProgressState>(createEmptyProgress());
  const pendingAnswerRef = useRef<{
    command: AnswerCommand;
    target: "core" | "bonus";
  } | null>(null);
  const bonusStartInFlightRef = useRef(false);
  const pendingBonusStartRef = useRef<PendingBonusStart | null>(null);

  const track = useCallback(
    (name: string, params: AnalyticsParams = {}) => {
      analytics?.track(name, {
        dateKey,
        mode: "current",
        ...params,
      });
    },
    [analytics, dateKey],
  );

  useEffect(() => {
    if (trackedAppOpen.current) {
      return;
    }
    trackedAppOpen.current = true;
    track("app_open");
  }, [track]);

  useEffect(() => {
    if (screen === "result") {
      track("result_view", { score: scoreQuiz(session) });
    }
    if (screen === "bonus-topic") {
      track("bonus_offer_view");
      if (entitlement.firstFreeUsed && entitlement.ticketCount === 0) {
        track("ad_offer_view");
      }
    }
  }, [entitlement, screen, session, track]);

  useEffect(() => {
    if (rewardAd == null) {
      setAdState("unavailable");
      return;
    }

    let active = true;
    setAdState("loading");
    void rewardAd.load().then((loaded) => {
      if (active) {
        setAdState(loaded ? "ready" : "unavailable");
      }
    });

    return () => {
      active = false;
    };
  }, [rewardAd]);

  useEffect(() => {
    if (repository == null) {
      return;
    }

    let active = true;

    void repository
      .load()
      .then((result) => {
        if (!active) {
          return;
        }

        if (result.kind === "unrecoverable") {
          setPersistenceWritable(false);
          setHydrated(true);
          return;
        }

        const progress = result.state;
        setShowRecoveredNotice(result.kind === "recovered-slot");
        const streak = calculateCompletionStreak(dateKey, progress.sessions);
        const grantedEntitlement = grantStreakTicket(
          progress.bonus,
          streak.startDate,
          streak.days,
        );
        const hydratedProgress = {
          ...progress,
          bonus: grantedEntitlement,
        };
        progressRef.current = hydratedProgress;
        setSavedSessions(progress.sessions);
        setEntitlement(grantedEntitlement);
        setCompletedBonusIds(progress.completedBonusIds);

        if (grantedEntitlement !== progress.bonus) {
          void repository.save(hydratedProgress);
        }

        const activeBonusEntry = Object.entries(progress.sessions).find(
          ([key, storedSession]) =>
            key.startsWith(`${dateKey}:bonus:`) &&
            storedSession.phase !== "completed",
        );
        const restoredSession = progress.sessions[dateKey];

        if (activeBonusEntry != null) {
          const [bonusKey, restoredBonusSession] = activeBonusEntry;
          const topic = bonusKey.slice(
            `${dateKey}:bonus:`.length,
          ) as BonusTopic;
          const isKnownTopic = bonusTopics.some(
            (candidate) => candidate.id === topic,
          );

          if (isKnownTopic) {
            const storedStartId =
              progress.latestBonusStartCommandIds[bonusKey];
            const storedStart =
              storedStartId == null
                ? undefined
                : progress.bonusStartCommands[storedStartId];
            const restoredQuestions =
              storedStart == null
                ? selectBonusQuestions(
                    topic,
                    bonusQuestions,
                    new Set(progress.completedBonusIds),
                  ).questions
                : findBonusQuestionsById(
                    storedStart.questionIds,
                    bonusQuestions,
                  );

            if (restoredQuestions == null || restoredQuestions.length === 0) {
              setHydrated(true);
              return;
            }

            setBonusStartStatus("idle");
            setBonusStartError(null);
            setSelectedTopic(topic);
            setBonusSet(restoredQuestions);
            setBonusSession(restoredBonusSession);
            setScreen("bonus-quiz");
          }
        } else if (restoredSession != null) {
          setSession(restoredSession);
          setScreen(restoredSession.phase === "completed" ? "result" : "quiz");
        }
        setHydrated(true);
      })
      .catch(() => {
        if (active) {
          setPersistenceWritable(false);
          setHydrated(true);
        }
      });

    return () => {
      active = false;
    };
  }, [bonusQuestions, dateKey, repository, storageRetry]);

  const persistSnapshot = (progress: ProgressState) => {
    progressRef.current = progress;
    setSavedSessions(progress.sessions);
    if (repository != null && persistenceWritable) {
      void repository.save(progress).catch(() => {
        setPersistenceWritable(false);
      });
    }
  };

  const submitAnswer = (command: AnswerCommand, target: "core" | "bonus") => {
    const optimistic = applyAnswerCommand(progressRef.current, command);
    progressRef.current = optimistic.state;
    pendingAnswerRef.current = { command, target };

    if (target === "core") {
      setSession(optimistic.session);
    } else {
      setBonusSession(optimistic.session);
    }

    if (repository == null) {
      setAnswerSaveStatus("saved");
      return;
    }
    if (!persistenceWritable) {
      setAnswerSaveStatus("idle");
      return;
    }

    setAnswerSaveStatus("saving");
    void repository
      .commitAnswer(command)
      .then((result) => {
        progressRef.current = result.state;
        setSavedSessions(result.state.sessions);
        if (target === "core") {
          setSession(result.session);
        } else {
          setBonusSession(result.session);
        }
        setAnswerSaveStatus("saved");
      })
      .catch(() => {
        setAnswerSaveStatus("error");
      });
  };

  const retryPendingAnswer = () => {
    const pending = pendingAnswerRef.current;
    if (pending == null || answerSaveStatus === "saving") {
      return;
    }
    submitAnswer(pending.command, pending.target);
  };

  const handleAnswer = (selectedIndex: number) => {
    if (session.phase !== "question") {
      return;
    }
    const question = questions[session.currentIndex];
    track("core_answer");
    submitAnswer(
      {
        attemptId: `core:${dateKey}:${question.id}:${session.currentIndex}`,
        sessionKey: dateKey,
        session,
        question,
        selectedIndex,
        answeredAt: now.toISOString(),
      },
      "core",
    );
  };

  const handleNext = () => {
    if (answerSaveStatus === "saving" || answerSaveStatus === "error") {
      return;
    }
    const next = advanceQuiz(session, questions.length);
    if (next === session) {
      return;
    }

    setSession(next);
    setAnswerSaveStatus("idle");
    pendingAnswerRef.current = null;
    let nextEntitlement = entitlement;
    const nextSessions = {
      ...progressRef.current.sessions,
      [dateKey]: next,
    };
    if (next.phase === "completed") {
      const streak = calculateCompletionStreak(dateKey, nextSessions);
      nextEntitlement = grantStreakTicket(
        entitlement,
        streak.startDate,
        streak.days,
      );
      setEntitlement(nextEntitlement);
      track("core_complete", {
        score: scoreQuiz(next),
        streakDays: streak.days,
      });
      setScreen("result");
    }
    persistSnapshot({
      ...progressRef.current,
      sessions: nextSessions,
      bonus: nextEntitlement,
    });
  };

  const handleShare = () => {
    if (shareGateway == null || shareStatus === "sharing") {
      setShareStatus("error");
      return;
    }

    track("share_attempt", { score: scoreQuiz(session) });
    setShareStatus("sharing");
    void shareGateway.shareScore(scoreQuiz(session)).then((shared) => {
      setShareStatus(shared ? "shared" : "error");
      if (shared) {
        track("share_complete", { score: scoreQuiz(session) });
      }
    });
  };

  const failBonusStart = (message: string) => {
    bonusStartInFlightRef.current = false;
    setBonusStartStatus("error");
    setBonusStartError(message);
  };

  const applyStartedBonus = (
    topic: BonusTopic,
    result: StartBonusSessionResult,
  ) => {
    if (!result.applied && result.reason !== "duplicate") {
      failBonusStart(
        result.reason === "no-questions"
          ? "준비된 보너스 문제가 없어요"
          : "광고 보상을 확인하지 못했어요",
      );
      return;
    }

    if (result.session == null || result.questionIds == null) {
      failBonusStart("보너스를 시작하지 못했어요");
      return;
    }

    const selectedQuestions = findBonusQuestionsById(
      result.questionIds,
      bonusQuestions,
    );
    if (selectedQuestions == null || selectedQuestions.length === 0) {
      failBonusStart("준비된 보너스 문제를 불러오지 못했어요");
      return;
    }

    progressRef.current = result.state;
    setSavedSessions(result.state.sessions);
    setEntitlement(result.state.bonus);
    setCompletedBonusIds(result.state.completedBonusIds);
    setSelectedTopic(topic);
    setBonusSet(selectedQuestions);
    setBonusSession(result.session);
    pendingBonusStartRef.current = null;
    bonusStartInFlightRef.current = false;
    setBonusStartStatus("idle");
    setBonusStartError(null);
    if (result.applied) {
      track("bonus_start", { topic, unlockSource: result.source });
    }
    setScreen("bonus-quiz");
  };

  const handleStartBonus = () => {
    if (selectedTopic == null || bonusStartInFlightRef.current) {
      return;
    }

    const topic = selectedTopic;
    if (
      selectBonusQuestions(
        topic,
        bonusQuestions,
        new Set(progressRef.current.completedBonusIds),
      ).questions.length === 0
    ) {
      failBonusStart("준비된 보너스 문제가 없어요");
      return;
    }

    const pending =
      pendingBonusStartRef.current?.topic === topic
        ? pendingBonusStartRef.current
        : {
            commandId: createBonusStartCommandId(dateKey, topic),
            topic,
          };
    pendingBonusStartRef.current = pending;
    bonusStartInFlightRef.current = true;
    setBonusStartError(null);

    const requiresRewardAd =
      progressRef.current.bonus.firstFreeUsed &&
      progressRef.current.bonus.ticketCount === 0;
    const useRepository =
      repository != null && persistenceWritable && !noSaveMode;

    void (async () => {
      let shouldReloadRewardAd = false;

      try {
        let state = progressRef.current;
        if (requiresRewardAd) {
          if (pending.rewardGrantId == null) {
            if (rewardAd == null || adState !== "ready") {
              failBonusStart("광고를 준비하지 못했어요");
              return;
            }

            shouldReloadRewardAd = true;
            setBonusStartStatus("showing-ad");
            setAdState("loading");
            const reward = await rewardAd.show();
            if (reward == null) {
              failBonusStart("광고 보상을 확인하지 못했어요");
              return;
            }
            pending.rewardGrantId = reward.rewardGrantId;
          }

          setBonusStartStatus("saving");
          const grant = useRepository
            ? await repository.grantBonusTicket(pending.rewardGrantId)
            : grantBonusTicketCommand(state, pending.rewardGrantId);
          state = grant.state;
          progressRef.current = grant.state;
        }

        setBonusStartStatus("saving");
        const result = useRepository
          ? await repository.startBonusSession(
              pending.commandId,
              dateKey,
              topic,
              bonusQuestions,
            )
          : startBonusSessionCommand(
              state,
              pending.commandId,
              dateKey,
              topic,
              bonusQuestions,
            );
        applyStartedBonus(topic, result);
      } catch {
        failBonusStart("보너스를 시작하지 못했어요");
      } finally {
        if (shouldReloadRewardAd && rewardAd != null) {
          void rewardAd.load().then((loaded) => {
            setAdState(loaded ? "ready" : "unavailable");
          });
        }
      }
    })();
  };

  const handleBonusAnswer = (selectedIndex: number) => {
    if (bonusSession == null || bonusSession.phase !== "question") {
      return;
    }
    const question = bonusSet[bonusSession.currentIndex];
    submitAnswer(
      {
        attemptId: `bonus:${bonusSession.dateKey}:${question.id}:${bonusSession.currentIndex}`,
        sessionKey: bonusSession.dateKey,
        session: bonusSession,
        question,
        selectedIndex,
        answeredAt: now.toISOString(),
      },
      "bonus",
    );
  };

  const handleBonusNext = () => {
    if (
      bonusSession == null ||
      answerSaveStatus === "saving" ||
      answerSaveStatus === "error"
    ) {
      return;
    }

    const next = advanceQuiz(bonusSession, bonusSet.length);
    if (next === bonusSession) {
      return;
    }

    setBonusSession(next);
    setAnswerSaveStatus("idle");
    pendingAnswerRef.current = null;
    let nextCompletedBonusIds = completedBonusIds;
    if (next.phase === "completed") {
      nextCompletedBonusIds = [
        ...new Set([
          ...completedBonusIds,
          ...bonusSet.map((question) => question.id),
        ]),
      ];
      setCompletedBonusIds(nextCompletedBonusIds);
      track("bonus_complete", {
        topic: selectedTopic ?? "unknown",
        score: scoreQuiz(next),
      });
      setScreen("result");
    }

    persistSnapshot({
      ...progressRef.current,
      sessions: {
        ...progressRef.current.sessions,
        [next.dateKey]: next,
      },
      completedBonusIds: nextCompletedBonusIds,
    });
  };

  if (!hydrated) {
    return (
      <main className="app-shell loading-screen" aria-live="polite">
        오늘 퀴즈를 불러오고 있어요.
      </main>
    );
  }

  if (!persistenceWritable && !noSaveMode) {
    return (
      <main className="app-shell storage-error-screen">
        <p className="storage-error-brand">그때요즘</p>
        <h1>기록을 안전하게 열지 못했어요</h1>
        <p>기존 기록은 덮어쓰지 않고 그대로 보관하고 있어요.</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            setHydrated(false);
            setPersistenceWritable(true);
            setNoSaveMode(false);
            setStorageRetry((value) => value + 1);
          }}
        >
          다시 불러오기
        </button>
        <button
          className="outline-button"
          type="button"
          onClick={() => {
            setNoSaveMode(true);
            setScreen("home");
          }}
        >
          저장 없이 오늘 퀴즈 보기
        </button>
      </main>
    );
  }

  const persistenceNotice = noSaveMode ? (
    <NoSaveNotice />
  ) : showRecoveredNotice ? (
    <RecoveredNotice onDismiss={() => setShowRecoveredNotice(false)} />
  ) : undefined;

  if (screen === "home") {
    return (
      <HomeScreen
        now={now}
        onStart={() => {
          track("quiz_start");
          setScreen("quiz");
        }}
        persistenceNotice={persistenceNotice}
        streakDay={calculateVisibleStreakDay(dateKey, {
          ...savedSessions,
          [dateKey]: session,
        })}
      />
    );
  }

  if (screen === "quiz") {
    return (
      <QuizScreen
        questions={questions}
        session={session}
        onAnswer={handleAnswer}
        onNext={handleNext}
        onRetrySave={retryPendingAnswer}
        persistenceNotice={persistenceNotice}
        saveStatus={answerSaveStatus}
      />
    );
  }

  if (screen === "result") {
    return (
      <ResultScreen
        entitlement={entitlement}
        score={scoreQuiz(session)}
        onBonus={() => {
          setBonusStartStatus("idle");
          setBonusStartError(null);
          setScreen("bonus-topic");
        }}
        onShare={handleShare}
        persistenceNotice={persistenceNotice}
        shareStatus={shareStatus}
      />
    );
  }

  if (screen === "bonus-quiz" && bonusSession != null) {
    return (
      <QuizScreen
        questions={bonusSet}
        session={bonusSession}
        onAnswer={handleBonusAnswer}
        onNext={handleBonusNext}
        onRetrySave={retryPendingAnswer}
        persistenceNotice={persistenceNotice}
        saveStatus={answerSaveStatus}
      />
    );
  }

  return (
    <BonusTopicScreen
      adState={adState}
      entitlement={entitlement}
      startError={bonusStartError}
      startStatus={bonusStartStatus}
      selectedTopic={selectedTopic}
      onSelectTopic={(topic) => {
        if (bonusStartInFlightRef.current) {
          return;
        }
        if (topic !== selectedTopic) {
          pendingBonusStartRef.current = null;
          setBonusStartStatus("idle");
          setBonusStartError(null);
        }
        setSelectedTopic(topic);
        track("bonus_topic_select", { topic });
      }}
      onStart={handleStartBonus}
      persistenceNotice={persistenceNotice}
    />
  );
}
