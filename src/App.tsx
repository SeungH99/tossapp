import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./App.css";
import {
  createBonusEntitlement,
  grantStreakTicket,
  unlockBonus,
} from "./domain/bonus-entitlement";
import { selectBonusQuestions } from "./domain/bonus-selection";
import { toKstDateKey } from "./domain/date-key";
import type { BonusTopic, CoreLens, Question } from "./domain/question";
import {
  advanceQuiz,
  answerCurrentQuestion,
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
import type {
  AnalyticsGateway,
  AnalyticsParams,
} from "./services/analytics";

type AppScreen =
  | "home"
  | "quiz"
  | "result"
  | "bonus-topic"
  | "bonus-quiz";

interface QuizAppProps {
  now: Date;
  coreQuestions: Question[];
  bonusQuestions: Question[];
  repository?: ProgressRepository;
  rewardAd?: RewardAdGateway;
  shareGateway?: QuizShareGateway;
  analytics?: AnalyticsGateway;
}

type AdState = "loading" | "ready" | "unavailable";

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

function HomeScreen({
  now,
  onStart,
  streakDay,
}: {
  now: Date;
  onStart: () => void;
  streakDay: number;
}) {
  return (
    <main className="app-shell home-screen">
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
}: {
  questions: Question[];
  session: QuizSession;
  onAnswer: (selectedIndex: number) => void;
  onNext: () => void;
}) {
  const question = questions[session.currentIndex];
  const answer = session.answers[session.currentIndex];
  const isExplanation = session.phase === "explanation";
  const isLastQuestion = session.currentIndex === questions.length - 1;

  return (
    <main className="app-shell quiz-screen">
      <header className="quiz-header">
        <strong>{lensLabels[question.lens]}</strong>
        <span aria-label={`진행 ${session.currentIndex + 1} / ${questions.length}`}>
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
        </section>
      ) : null}

      {isExplanation ? (
        <button className="primary-button" type="button" onClick={onNext}>
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
  shareStatus,
}: {
  entitlement: ReturnType<typeof createBonusEntitlement>;
  score: number;
  onBonus: () => void;
  onShare: () => void;
  shareStatus: "idle" | "sharing" | "shared" | "error";
}) {
  return (
    <main className="app-shell result-screen">
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
  selectedTopic,
  onSelectTopic,
  onStart,
}: {
  entitlement: ReturnType<typeof createBonusEntitlement>;
  adState: AdState;
  selectedTopic: BonusTopic | null;
  onSelectTopic: (topic: BonusTopic) => void;
  onStart: () => void;
}) {
  const needsRewardAd =
    entitlement.firstFreeUsed && entitlement.ticketCount === 0;
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
          (needsRewardAd && adState !== "ready")
        }
        onClick={onStart}
        type="button"
      >
        {startLabel}
      </button>
      <p className="support-copy">{supportCopy}</p>
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
  const [selectedTopic, setSelectedTopic] = useState<BonusTopic | null>(null);
  const [bonusSet, setBonusSet] = useState<Question[]>([]);
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

    void repository.load().then((progress) => {
      if (!active) {
        return;
      }

      setSavedSessions(progress.sessions);
      const streak = calculateCompletionStreak(
        dateKey,
        progress.sessions,
      );
      setEntitlement(
        grantStreakTicket(
          progress.bonus,
          streak.startDate,
          streak.days,
        ),
      );
      setCompletedBonusIds(progress.completedBonusIds);

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
          const selection = selectBonusQuestions(
            topic,
            bonusQuestions,
            new Set(progress.completedBonusIds),
          );
          setSelectedTopic(topic);
          setBonusSet(selection.questions);
          setBonusSession(restoredBonusSession);
          setScreen("bonus-quiz");
        }
      } else if (restoredSession != null) {
        setSession(restoredSession);
        setScreen(
          restoredSession.phase === "completed" ? "result" : "quiz",
        );
      }
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, [bonusQuestions, dateKey, repository]);

  useEffect(() => {
    if (!hydrated || repository == null) {
      return;
    }

    const progress = createEmptyProgress();
    progress.sessions = {
      ...savedSessions,
      [dateKey]: session,
    };
    if (bonusSession != null) {
      progress.sessions[bonusSession.dateKey] = bonusSession;
    }
    progress.bonus = entitlement;
    progress.completedBonusIds = completedBonusIds;
    void repository.save(progress);
  }, [
    completedBonusIds,
    dateKey,
    entitlement,
    hydrated,
    repository,
    savedSessions,
    session,
    bonusSession,
  ]);

  const handleAnswer = (selectedIndex: number) => {
    if (session.phase !== "question") {
      return;
    }
    const question = questions[session.currentIndex];
    track("core_answer", {
      questionId: question.id,
      lens: question.lens,
      selectedIndex,
      isCorrect: selectedIndex === question.answerIndex,
    });
    setSession((current) =>
      answerCurrentQuestion(
        current,
        questions[current.currentIndex],
        selectedIndex,
      ),
    );
  };

  const handleNext = () => {
    const next = advanceQuiz(session, questions.length);
    if (next === session) {
      return;
    }

    setSession(next);
    if (next.phase === "completed") {
      const sessionsWithCompletion = {
        ...savedSessions,
        [dateKey]: next,
      };
      const streak = calculateCompletionStreak(
        dateKey,
        sessionsWithCompletion,
      );
      setEntitlement((currentEntitlement) =>
        grantStreakTicket(
          currentEntitlement,
          streak.startDate,
          streak.days,
        ),
      );
      track("core_complete", {
        score: scoreQuiz(next),
        streakDays: streak.days,
      });
      setScreen("result");
    }
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

  const beginBonus = (
    topic: BonusTopic,
    nextEntitlement: ReturnType<typeof createBonusEntitlement>,
  ) => {
    const selection = selectBonusQuestions(
      topic,
      bonusQuestions,
      new Set(completedBonusIds),
    );

    if (selection.questions.length === 0) {
      return;
    }

    setEntitlement(nextEntitlement);
    setBonusSet(selection.questions);
    setBonusSession(
      createQuizSession(`${dateKey}:bonus:${topic}`),
    );
    track("bonus_start", { topic });
    setScreen("bonus-quiz");
  };

  const handleStartBonus = () => {
    if (selectedTopic == null) {
      return;
    }

    const topic = selectedTopic;
    const unlock = unlockBonus(
      entitlement,
      `bonus:${dateKey}:${topic}:${completedBonusIds.length}`,
    );

    if (unlock.source !== "reward_ad") {
      track("bonus_unlock", {
        topic,
        unlockSource: unlock.source,
      });
      beginBonus(topic, unlock.state);
      return;
    }

    if (rewardAd == null || adState !== "ready") {
      return;
    }

    setAdState("loading");
    track("reward_ad_start", { topic });
    void rewardAd.show().then((rewarded) => {
      if (rewarded) {
        track("reward_ad_complete", { topic });
        track("bonus_unlock", {
          topic,
          unlockSource: "reward_ad",
        });
        beginBonus(topic, entitlement);
      } else {
        track("reward_ad_fail", { topic });
      }

      return rewardAd.load().then((loaded) => {
        setAdState(loaded ? "ready" : "unavailable");
      });
    });
  };

  const handleBonusAnswer = (selectedIndex: number) => {
    setBonusSession((current) => {
      if (current == null) {
        return current;
      }

      return answerCurrentQuestion(
        current,
        bonusSet[current.currentIndex],
        selectedIndex,
      );
    });
  };

  const handleBonusNext = () => {
    setBonusSession((current) => {
      if (current == null) {
        return current;
      }

      const next = advanceQuiz(current, bonusSet.length);
      if (next.phase === "completed") {
        setCompletedBonusIds((ids) => [
          ...new Set([...ids, ...bonusSet.map((question) => question.id)]),
        ]);
        track("bonus_complete", {
          topic: selectedTopic ?? "unknown",
          score: scoreQuiz(next),
        });
        setScreen("result");
      }
      return next;
    });
  };

  if (!hydrated) {
    return (
      <main className="app-shell loading-screen" aria-live="polite">
        오늘 퀴즈를 불러오고 있어요.
      </main>
    );
  }

  if (screen === "home") {
    return (
      <HomeScreen
        now={now}
        onStart={() => {
          track("quiz_start");
          setScreen("quiz");
        }}
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
      />
    );
  }

  if (screen === "result") {
    return (
      <ResultScreen
        entitlement={entitlement}
        score={scoreQuiz(session)}
        onBonus={() => setScreen("bonus-topic")}
        onShare={handleShare}
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
      />
    );
  }

  return (
    <BonusTopicScreen
      adState={adState}
      entitlement={entitlement}
      selectedTopic={selectedTopic}
      onSelectTopic={(topic) => {
        setSelectedTopic(topic);
        track("bonus_topic_select", { topic });
      }}
      onStart={handleStartBonus}
    />
  );
}
