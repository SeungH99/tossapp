import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";

import "./App.css";
import type { ContentCatalog } from "./content/content-catalog";
import type { BonusTopicMetadata } from "./content/types";
import {
  createBonusEntitlement,
  grantStreakTicket,
} from "./domain/bonus-entitlement";
import { resolveBonusSetAvailability } from "./domain/bonus-progress";
import { selectBonusQuestions } from "./domain/bonus-selection";
import { toKstDateKey } from "./domain/date-key";
import { observeTime } from "./domain/time-confidence";
import {
  applyAnswerCommand,
  completeBonusSetCommand,
  findSeenQuestion,
  grantBonusTicketCommand,
  skipBonusSetCommand,
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
import type { BannerAdGateway } from "./services/banner-ad";

type AppScreen = "home" | "quiz" | "result" | "bonus-topic" | "bonus-quiz";

export interface TimeProvider {
  now(): Date;
}

export class SystemTimeProvider implements TimeProvider {
  now(): Date {
    return new Date();
  }
}

interface QuizAppProps {
  now?: Date;
  timeProvider?: TimeProvider;
  contentCatalog?: ContentCatalog;
  coreQuestions?: CoreQuestion[];
  bonusQuestions?: BonusQuestion[];
  repository?: ProgressRepository;
  rewardAd?: RewardAdGateway;
  bannerAd?: BannerAdGateway;
  shareGateway?: QuizShareGateway;
  analytics?: AnalyticsGateway;
}

function isLongQuestion(prompt: string): boolean {
  return Array.from(prompt.trim()).length >= 42;
}

const emptyCoreQuestions: CoreQuestion[] = [];
const emptyBonusQuestions: BonusQuestion[] = [];

type AdState = "loading" | "ready" | "unavailable";
type AnswerSaveStatus = "idle" | "saving" | "saved" | "error";
type BonusStartStatus =
  "idle" | "loading-content" | "showing-ad" | "saving" | "error";
type CoreContentStatus = "idle" | "loading" | "error" | "blocked-seen";

interface PendingBonusStart {
  commandId: string;
  dateKey: string;
  topic: BonusTopic;
  setIndex?: number;
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

const bonusTopicPresentation: Record<
  BonusTopic,
  { icon: string; className: string; fallbackLabel: string }
> = {
  nostalgia: {
    icon: "📻",
    className: "nostalgia",
    fallbackLabel: "추억·대중문화",
  },
  "korean-life": {
    icon: "🏡",
    className: "korean-life",
    fallbackLabel: "한국 생활사",
  },
  language: {
    icon: "가",
    className: "language",
    fallbackLabel: "말·속담·맞춤법",
  },
  digital: {
    icon: "📱",
    className: "digital",
    fallbackLabel: "디지털 생활",
  },
  safety: {
    icon: "🛟",
    className: "safety",
    fallbackLabel: "생활안전",
  },
  "nature-general": {
    icon: "🌿",
    className: "nature-general",
    fallbackLabel: "자연·일반상식",
  },
};

function createBundledBonusTopicMetadata(
  questions: readonly BonusQuestion[],
): BonusTopicMetadata[] {
  const releasedSetCounts = new Map<BonusTopic, number>();
  for (const question of questions) {
    releasedSetCounts.set(
      question.topic,
      Math.max(
        releasedSetCounts.get(question.topic) ?? 0,
        question.setIndex + 1,
      ),
    );
  }

  return [...releasedSetCounts].map(([id, setCount], order) => ({
    id,
    label: bonusTopicPresentation[id].fallbackLabel,
    order,
    setCount,
  }));
}

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
        aria-label="퀴즈 진행"
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
        <h1
          className={`question-title${isLongQuestion(question.prompt) ? " long" : ""}`}
        >
          {question.prompt}
        </h1>
        <div className="answer-list">
          {question.choices.map((choice, index) => {
            const isSelected = answer?.selectedIndex === index;
            const isCorrectChoice =
              isExplanation && index === question.answerIndex;

            return (
              <button
                aria-pressed={isSelected}
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
                <span className="answer-text">{choice}</span>
                {isSelected ? (
                  <span className="answer-mark" aria-hidden="true">
                    <svg viewBox="0 0 24 24" focusable="false">
                      <path d="m6.5 12.5 3.4 3.4 7.6-8" />
                    </svg>
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
          <a
            href={question.source.url}
            rel="noreferrer"
            style={{ color: "#4e5968" }}
            tabIndex={0}
            target="_blank"
          >
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
  bannerAd,
  entitlement,
  score,
  onBonus,
  onShare,
  persistenceNotice,
  shareStatus,
}: {
  bannerAd?: BannerAdGateway;
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

      {bannerAd == null ? null : <ResultBannerAd gateway={bannerAd} />}
    </main>
  );
}

function ResultBannerAd({ gateway }: { gateway: BannerAdGateway }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const target = containerRef.current;
    if (target == null) {
      return;
    }

    return gateway.attach(target, (event) => {
      if (event === "unavailable") {
        setUnavailable(true);
      }
    });
  }, [gateway]);

  if (unavailable) {
    return null;
  }

  return (
    <div
      aria-label="광고"
      className="result-banner-ad"
      ref={containerRef}
      role="region"
    />
  );
}

function BonusTopicScreen({
  topics,
  entitlement,
  adState,
  startStatus,
  startError,
  selectedTopic,
  onSelectTopic,
  onStart,
  persistenceNotice,
}: {
  topics: ReadonlyArray<BonusTopicMetadata & { exhausted: boolean }>;
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
  const selectedTopicIsExhausted = topics.some(
    (topic) => topic.id === selectedTopic && topic.exhausted,
  );
  const isStarting =
    startStatus === "loading-content" ||
    startStatus === "showing-ad" ||
    startStatus === "saving";
  const topicButtonRefs = useRef(new Map<BonusTopic, HTMLButtonElement>());
  const handleTopicKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    currentTopic: BonusTopic,
  ) => {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (direction === 0) {
      return;
    }

    event.preventDefault();
    const enabledTopics = topics.filter((topic) => !topic.exhausted);
    const currentIndex = enabledTopics.findIndex(
      (topic) => topic.id === currentTopic,
    );
    if (currentIndex < 0 || enabledTopics.length === 0) {
      return;
    }

    const nextIndex =
      (currentIndex + direction + enabledTopics.length) % enabledTopics.length;
    const nextTopic = enabledTopics[nextIndex];
    onSelectTopic(nextTopic.id);
    topicButtonRefs.current.get(nextTopic.id)?.focus();
  };
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

      <div className="topic-grid" role="radiogroup" aria-label="보너스 주제">
        {topics.map((topic) => {
          const isSelected = topic.id === selectedTopic;
          const presentation = bonusTopicPresentation[topic.id];
          return (
            <button
              aria-checked={isSelected}
              aria-label={
                topic.exhausted
                  ? `${topic.label}, 새 문제 준비 중`
                  : topic.label
              }
              className={`topic-button ${presentation.className}${
                isSelected ? " selected" : ""
              }${topic.exhausted ? " exhausted" : ""}`}
              disabled={isStarting || topic.exhausted}
              key={topic.id}
              onClick={() => onSelectTopic(topic.id)}
              onKeyDown={(event) => handleTopicKeyDown(event, topic.id)}
              ref={(element) => {
                if (element == null) {
                  topicButtonRefs.current.delete(topic.id);
                } else {
                  topicButtonRefs.current.set(topic.id, element);
                }
              }}
              role="radio"
              tabIndex={isSelected && !topic.exhausted ? 0 : -1}
              type="button"
            >
              <span className="topic-icon" aria-hidden="true">
                {presentation.icon}
              </span>
              <span className="topic-label">{topic.label}</span>
              {topic.exhausted ? (
                <span className="topic-status">새 문제 준비 중</span>
              ) : isSelected ? (
                <span className="topic-selected-mark" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <button
        className="primary-button"
        disabled={
          selectedTopic == null ||
          selectedTopicIsExhausted ||
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
  timeProvider,
  contentCatalog,
  coreQuestions: bundledCoreQuestions = emptyCoreQuestions,
  bonusQuestions = emptyBonusQuestions,
  repository,
  rewardAd,
  bannerAd,
  shareGateway,
  analytics,
}: QuizAppProps) {
  const initialNowRef = useRef<Date | null>(null);
  if (initialNowRef.current == null) {
    initialNowRef.current = timeProvider?.now() ?? now ?? new Date();
  }
  const initialNow = initialNowRef.current;
  const [currentNow, setCurrentNow] = useState(initialNow);
  const currentNowRef = useRef(initialNow);
  const dateKey = toKstDateKey(currentNow);
  const bonusTopicMetadata = useMemo(
    () =>
      contentCatalog == null
        ? createBundledBonusTopicMetadata(bonusQuestions)
        : [...(contentCatalog.bonusTopics ?? [])],
    [bonusQuestions, contentCatalog],
  );
  const initialDateKeyRef = useRef(dateKey);
  const initialDateKey = initialDateKeyRef.current;
  const [screen, setScreen] = useState<AppScreen>("home");
  const [session, setSession] = useState(() => createQuizSession(dateKey));
  const [coreQuestions, setCoreQuestions] = useState(bundledCoreQuestions);
  const [coreContentStatus, setCoreContentStatus] =
    useState<CoreContentStatus>("idle");
  const questions = useMemo(
    () =>
      coreQuestions.length === 0
        ? []
        : selectDailyCoreSet(session.dateKey, coreQuestions),
    [coreQuestions, session.dateKey],
  );
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
  const [resultSession, setResultSession] = useState<QuizSession | null>(null);
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
  const displayedBonusTopics = bonusTopicMetadata.map((topic) => ({
    ...topic,
    exhausted:
      resolveBonusSetAvailability(
        progressRef.current,
        topic.id,
        dateKey,
        topic.setCount,
      ).kind === "exhausted",
  }));
  const pendingAnswerRef = useRef<{
    command: AnswerCommand;
    target: "core" | "bonus";
  } | null>(null);
  const pendingCoreDateRef = useRef<string | null>(null);
  const bonusStartInFlightRef = useRef(false);
  const pendingBonusStartRef = useRef<PendingBonusStart | null>(null);

  const readCurrentTime = useCallback((): Date => {
    const observedNow = timeProvider?.now() ?? now ?? currentNowRef.current;
    currentNowRef.current = observedNow;
    setCurrentNow((previous) =>
      previous.getTime() === observedNow.getTime() ? previous : observedNow,
    );
    return observedNow;
  }, [now, timeProvider]);

  const observeCurrentTime = useCallback(
    (persistObservation = true): Date => {
      const observedNow = readCurrentTime();
      const timeObservation = observeTime(
        progressRef.current.timeObservation,
        observedNow,
      );
      const changed =
        timeObservation.lastObservedKstDate !==
          progressRef.current.timeObservation.lastObservedKstDate ||
        timeObservation.lastValidKstDate !==
          progressRef.current.timeObservation.lastValidKstDate ||
        timeObservation.confidence !==
          progressRef.current.timeObservation.confidence;
      if (changed) {
        progressRef.current = {
          ...progressRef.current,
          timeObservation,
        };
      }

      if (
        persistObservation &&
        repository != null &&
        hydrated &&
        persistenceWritable &&
        !noSaveMode
      ) {
        void repository
          .observeTime(observedNow)
          .then((persisted) => {
            progressRef.current = {
              ...progressRef.current,
              timeObservation: persisted.timeObservation,
            };
          })
          .catch(() => undefined);
      }
      return observedNow;
    },
    [hydrated, noSaveMode, persistenceWritable, readCurrentTime, repository],
  );

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
    if (!hydrated) {
      return;
    }

    const observeWhenVisible = () => {
      if (document.visibilityState === "visible") {
        observeCurrentTime();
      }
    };
    const observeOnPageShow = () => {
      observeCurrentTime();
    };

    document.addEventListener("visibilitychange", observeWhenVisible);
    window.addEventListener("pageshow", observeOnPageShow);
    return () => {
      document.removeEventListener("visibilitychange", observeWhenVisible);
      window.removeEventListener("pageshow", observeOnPageShow);
    };
  }, [hydrated, observeCurrentTime]);

  useEffect(() => {
    if (trackedAppOpen.current) {
      return;
    }
    trackedAppOpen.current = true;
    track("app_open");
  }, [track]);

  useEffect(() => {
    if (screen === "result") {
      track("result_view", { score: scoreQuiz(resultSession ?? session) });
    }
    if (screen === "bonus-topic") {
      track("bonus_offer_view");
      if (entitlement.firstFreeUsed && entitlement.ticketCount === 0) {
        track("ad_offer_view");
      }
    }
  }, [entitlement, resultSession, screen, session, track]);

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
      .then(async (result) => {
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
        const streak = calculateCompletionStreak(
          initialDateKey,
          progress.sessions,
        );
        const grantedEntitlement = grantStreakTicket(
          progress.bonus,
          streak.startDate,
          streak.days,
        );
        const hydratedProgress = {
          ...progress,
          bonus: grantedEntitlement,
          timeObservation: observeTime(progress.timeObservation, initialNow),
        };
        progressRef.current = hydratedProgress;
        setSavedSessions(progress.sessions);
        setEntitlement(grantedEntitlement);
        setCompletedBonusIds(progress.completedBonusIds);

        if (grantedEntitlement !== progress.bonus) {
          void repository
            .save({
              ...progress,
              bonus: grantedEntitlement,
            })
            .catch(() => undefined);
        }
        void repository
          .observeTime(initialNow)
          .then((persisted) => {
            if (active) {
              progressRef.current = {
                ...progressRef.current,
                timeObservation: persisted.timeObservation,
              };
            }
          })
          .catch(() => undefined);

        const activeBonusEntry = Object.entries(progress.sessions).find(
          ([key, storedSession]) =>
            key.startsWith(`${initialDateKey}:bonus:`) &&
            storedSession.phase !== "completed",
        );
        const restoredSession = progress.sessions[initialDateKey];

        if (activeBonusEntry != null) {
          const [bonusKey, restoredBonusSession] = activeBonusEntry;
          const topic = bonusKey.slice(
            `${initialDateKey}:bonus:`.length,
          ) as BonusTopic;
          const isKnownTopic = bonusTopicMetadata.some(
            (candidate) => candidate.id === topic,
          );

          if (isKnownTopic) {
            const storedStartId = progress.latestBonusStartCommandIds[bonusKey];
            const storedStart =
              storedStartId == null
                ? undefined
                : progress.bonusStartCommands[storedStartId];
            let availableBonusQuestions = bonusQuestions;
            if (contentCatalog != null) {
              if (storedStart?.setIndex == null) {
                setHydrated(true);
                return;
              }
              const loaded = await contentCatalog.loadBonusSet(
                topic,
                storedStart.setIndex,
              );
              if (!active) {
                return;
              }
              if (!loaded.ok) {
                setHydrated(true);
                return;
              }
              availableBonusQuestions = loaded.value;
            }
            const restoredQuestions =
              storedStart == null
                ? selectBonusQuestions(
                    topic,
                    availableBonusQuestions,
                    new Set(progress.completedBonusIds),
                  ).questions
                : findBonusQuestionsById(
                    storedStart.questionIds,
                    availableBonusQuestions,
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
          if (contentCatalog != null) {
            const loaded = await contentCatalog.loadCoreSet(
              restoredSession.dateKey,
            );
            if (!active) {
              return;
            }
            if (!loaded.ok) {
              setCoreContentStatus("error");
              setHydrated(true);
              return;
            }
            setCoreQuestions(loaded.value);
          }
          setSession(restoredSession);
          setResultSession(
            restoredSession.phase === "completed" ? restoredSession : null,
          );
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
  }, [
    bonusQuestions,
    bonusTopicMetadata,
    contentCatalog,
    initialDateKey,
    initialNow,
    repository,
    storageRetry,
  ]);

  const persistSnapshot = (progress: ProgressState, observedAt?: Date) => {
    progressRef.current = progress;
    setSavedSessions(progress.sessions);
    if (repository != null && persistenceWritable) {
      void repository.save(progress, observedAt).catch(() => {
        setPersistenceWritable(false);
      });
    }
  };

  const submitAnswer = (
    command: AnswerCommand,
    target: "core" | "bonus",
    observedAt: Date,
  ) => {
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
      .commitAnswer(command, observedAt)
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
    const observedAt = observeCurrentTime(false);
    submitAnswer(pending.command, pending.target, observedAt);
  };

  const handleStartCore = async () => {
    const startedAt = observeCurrentTime();
    const startedDateKey =
      pendingCoreDateRef.current ?? toKstDateKey(startedAt);
    let availableCoreQuestions = coreQuestions;
    if (contentCatalog != null) {
      pendingCoreDateRef.current = startedDateKey;
      setCoreContentStatus("loading");
      const loaded = await contentCatalog.loadCoreSet(startedDateKey);
      if (!loaded.ok) {
        track("content_pack_load_failed", {
          packType: "core",
          packId: loaded.packId ?? "unknown",
          reasonCode: loaded.reason,
        });
        setCoreContentStatus("error");
        return;
      }
      availableCoreQuestions = loaded.value;
    }

    const candidateQuestions = selectDailyCoreSet(
      startedDateKey,
      availableCoreQuestions,
    );
    if (findSeenQuestion(progressRef.current, candidateQuestions) != null) {
      track("core_set_blocked_seen_concept");
      setCoreContentStatus("blocked-seen");
      return;
    }

    setCoreQuestions(availableCoreQuestions);
    pendingCoreDateRef.current = null;
    setSession(createQuizSession(startedDateKey));
    setAnswerSaveStatus("idle");
    pendingAnswerRef.current = null;
    track("quiz_start");
    setCoreContentStatus("idle");
    setScreen("quiz");
  };

  const handleAnswer = (selectedIndex: number) => {
    if (session.phase !== "question") {
      return;
    }
    const answeredAt = observeCurrentTime(false);
    const question = questions[session.currentIndex];
    track("core_answer");
    submitAnswer(
      {
        attemptId: `core:${session.dateKey}:${question.id}:${session.currentIndex}`,
        sessionKey: session.dateKey,
        session,
        question,
        selectedIndex,
        answeredAt: answeredAt.toISOString(),
      },
      "core",
      answeredAt,
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
    let completedAt: Date | undefined;
    const nextSessions = {
      ...progressRef.current.sessions,
      [session.dateKey]: next,
    };
    if (next.phase === "completed") {
      completedAt = observeCurrentTime(false);
      const streak = calculateCompletionStreak(session.dateKey, nextSessions);
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
      setResultSession(next);
      setScreen("result");
    }
    persistSnapshot(
      {
        ...progressRef.current,
        sessions: nextSessions,
        bonus: nextEntitlement,
      },
      completedAt,
    );
  };

  const handleShare = () => {
    if (shareGateway == null || shareStatus === "sharing") {
      setShareStatus("error");
      return;
    }

    const resultScore = scoreQuiz(resultSession ?? session);
    track("share_attempt", { score: resultScore });
    setShareStatus("sharing");
    void shareGateway.shareScore(resultScore).then((shared) => {
      setShareStatus(shared ? "shared" : "error");
      if (shared) {
        track("share_complete", { score: resultScore });
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
    availableQuestions: BonusQuestion[],
  ) => {
    if (!result.applied && result.reason !== "duplicate") {
      failBonusStart(
        result.reason === "seen-question" || result.reason === "seen-concept"
          ? "새 문제 준비 중"
          : result.reason === "no-questions"
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
      availableQuestions,
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

    const startedAt = observeCurrentTime();
    const startedDateKey = toKstDateKey(startedAt);
    const topic = selectedTopic;
    const topicMetadata = bonusTopicMetadata.find(
      (candidate) => candidate.id === topic,
    );
    if (contentCatalog != null && topicMetadata == null) {
      failBonusStart("준비된 보너스 문제가 없어요");
      return;
    }

    let pending =
      pendingBonusStartRef.current?.topic === topic
        ? pendingBonusStartRef.current
        : null;
    if (pending == null && contentCatalog != null && topicMetadata != null) {
      const availability = resolveBonusSetAvailability(
        progressRef.current,
        topic,
        startedDateKey,
        topicMetadata.setCount,
      );
      if (availability.kind !== "available") {
        track("bonus_topic_daily_locked", {
          topic,
          reason: availability.kind,
        });
        failBonusStart(
          availability.kind === "daily-limit"
            ? "오늘은 이 주제를 이미 풀었어요"
            : availability.kind === "exhausted"
              ? "새 문제 준비 중"
              : "진행 중인 보너스 퀴즈가 있어요",
        );
        return;
      }
      pending = {
        commandId: createBonusStartCommandId(startedDateKey, topic),
        dateKey: startedDateKey,
        topic,
        setIndex: availability.setIndex,
      };
    }
    if (pending == null) {
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
      pending = {
        commandId: createBonusStartCommandId(startedDateKey, topic),
        dateKey: startedDateKey,
        topic,
      };
    }
    pendingBonusStartRef.current = pending;
    bonusStartInFlightRef.current = true;
    setBonusStartError(null);

    const useRepository =
      repository != null && persistenceWritable && !noSaveMode;
    const activePending = pending;

    void (async () => {
      let shouldReloadRewardAd = false;

      try {
        let availableQuestions = bonusQuestions;
        if (contentCatalog != null && topicMetadata != null) {
          setBonusStartStatus("loading-content");
          let acceptedQuestions: BonusQuestion[] | null = null;
          let candidateSetIndex = activePending.setIndex;

          for (
            let attempt = 0;
            attempt < topicMetadata.setCount;
            attempt += 1
          ) {
            if (candidateSetIndex == null) {
              const availability = resolveBonusSetAvailability(
                progressRef.current,
                topic,
                activePending.dateKey,
                topicMetadata.setCount,
              );
              if (availability.kind !== "available") {
                track("bonus_topic_daily_locked", {
                  topic,
                  reason: availability.kind,
                });
                pendingBonusStartRef.current = null;
                failBonusStart(
                  availability.kind === "daily-limit"
                    ? "오늘은 이 주제를 이미 풀었어요"
                    : availability.kind === "exhausted"
                      ? "새 문제 준비 중"
                      : "진행 중인 보너스 퀴즈가 있어요",
                );
                return;
              }
              candidateSetIndex = availability.setIndex;
              activePending.setIndex = candidateSetIndex;
            }

            const loaded = await contentCatalog.loadBonusSet(
              topic,
              candidateSetIndex,
            );
            if (!loaded.ok) {
              track("content_pack_load_failed", {
                packType: "bonus",
                packId: loaded.packId ?? "unknown",
                reasonCode: loaded.reason,
              });
              failBonusStart("준비된 보너스 문제를 불러오지 못했어요");
              return;
            }

            const seenQuestion = findSeenQuestion(
              progressRef.current,
              loaded.value,
            );
            if (seenQuestion == null) {
              acceptedQuestions = loaded.value;
              break;
            }

            const skipObservedAt = observeCurrentTime(false);
            const skippedState = skipBonusSetCommand(
              progressRef.current,
              topic,
              candidateSetIndex,
            );
            if (skippedState !== progressRef.current) {
              if (useRepository) {
                await repository.save(skippedState, skipObservedAt);
              }
              progressRef.current = skippedState;
              analytics?.track("bonus_set_skipped_seen_concept", {
                topic,
                setIndex: candidateSetIndex,
              });
            }
            candidateSetIndex = undefined;
            activePending.setIndex = undefined;
          }

          if (acceptedQuestions == null) {
            track("bonus_topic_daily_locked", {
              topic,
              reason: "exhausted",
            });
            pendingBonusStartRef.current = null;
            failBonusStart("새 문제 준비 중");
            return;
          }
          availableQuestions = acceptedQuestions;
        }

        let state = progressRef.current;
        const requiresRewardAd =
          state.bonus.firstFreeUsed && state.bonus.ticketCount === 0;
        if (requiresRewardAd) {
          if (activePending.rewardGrantId == null) {
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
            activePending.rewardGrantId = reward.rewardGrantId;
          }

          setBonusStartStatus("saving");
          const grantObservedAt = observeCurrentTime(false);
          state = progressRef.current;
          const grant = useRepository
            ? await repository.grantBonusTicket(
                activePending.rewardGrantId,
                grantObservedAt,
              )
            : grantBonusTicketCommand(state, activePending.rewardGrantId);
          state = grant.state;
          progressRef.current = grant.state;
        }

        setBonusStartStatus("saving");
        const startObservedAt = observeCurrentTime(false);
        state = progressRef.current;
        const result = useRepository
          ? activePending.setIndex == null
            ? await repository.startBonusSession(
                activePending.commandId,
                activePending.dateKey,
                topic,
                availableQuestions,
                startObservedAt,
              )
            : await repository.startBonusSession(
                activePending.commandId,
                activePending.dateKey,
                topic,
                activePending.setIndex,
                availableQuestions,
                startObservedAt,
              )
          : activePending.setIndex == null
            ? startBonusSessionCommand(
                state,
                activePending.commandId,
                activePending.dateKey,
                topic,
                availableQuestions,
              )
            : startBonusSessionCommand(
                state,
                activePending.commandId,
                activePending.dateKey,
                topic,
                activePending.setIndex,
                availableQuestions,
              );
        applyStartedBonus(topic, result, availableQuestions);
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
    const answeredAt = observeCurrentTime(false);
    const question = bonusSet[bonusSession.currentIndex];
    submitAnswer(
      {
        attemptId: `bonus:${bonusSession.dateKey}:${question.id}:${bonusSession.currentIndex}`,
        sessionKey: bonusSession.dateKey,
        session: bonusSession,
        question,
        selectedIndex,
        answeredAt: answeredAt.toISOString(),
      },
      "bonus",
      answeredAt,
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
    let completedAt: Date | undefined;
    const completedSetIndex = bonusSet[0]?.setIndex;
    const usesCatalogProgress =
      contentCatalog != null &&
      selectedTopic != null &&
      completedSetIndex != null;
    if (next.phase === "completed") {
      completedAt = observeCurrentTime(false);
      if (!usesCatalogProgress) {
        nextCompletedBonusIds = [
          ...new Set([
            ...completedBonusIds,
            ...bonusSet.map((question) => question.id),
          ]),
        ];
        setCompletedBonusIds(nextCompletedBonusIds);
      }
      track("bonus_complete", {
        topic: selectedTopic ?? "unknown",
        score: scoreQuiz(next),
      });
      if (
        usesCatalogProgress &&
        selectedTopic != null &&
        completedSetIndex != null
      ) {
        track("bonus_topic_daily_complete", {
          topic: selectedTopic,
          setIndex: completedSetIndex,
          score: scoreQuiz(next),
        });
      }
      setResultSession(next);
      setScreen("result");
    }

    let nextProgress: ProgressState = {
      ...progressRef.current,
      sessions: {
        ...progressRef.current.sessions,
        [next.dateKey]: next,
      },
      completedBonusIds: nextCompletedBonusIds,
    };

    if (
      next.phase === "completed" &&
      usesCatalogProgress &&
      completedAt != null &&
      selectedTopic != null &&
      completedSetIndex != null
    ) {
      const completedDateKey = toKstDateKey(completedAt);
      if (repository == null || !persistenceWritable || noSaveMode) {
        const completed = completeBonusSetCommand(
          nextProgress,
          next.dateKey,
          selectedTopic,
          completedSetIndex,
          completedDateKey,
        );
        nextProgress = completed.state;
        setCompletedBonusIds(completed.state.completedBonusIds);
        persistSnapshot(nextProgress, completedAt);
        return;
      }

      persistSnapshot(nextProgress, completedAt);
      void repository
        .completeBonusSet(
          next.dateKey,
          selectedTopic,
          completedSetIndex,
          completedDateKey,
          completedAt,
        )
        .then((completed) => {
          progressRef.current = completed.state;
          setSavedSessions(completed.state.sessions);
          setCompletedBonusIds(completed.state.completedBonusIds);
        })
        .catch(() => undefined);
      return;
    }

    persistSnapshot(nextProgress, completedAt);
  };

  if (!hydrated) {
    return (
      <main className="app-shell loading-screen" aria-live="polite">
        오늘 퀴즈를 불러오고 있어요.
      </main>
    );
  }

  if (coreContentStatus === "loading") {
    return (
      <main className="app-shell loading-screen" role="status">
        문제를 준비하고 있어요.
      </main>
    );
  }

  if (coreContentStatus === "error") {
    return (
      <main className="app-shell storage-error-screen">
        <p role="alert">오늘 문제를 불러오지 못했어요.</p>
        <button
          className="primary-button"
          type="button"
          onClick={handleStartCore}
        >
          다시 불러오기
        </button>
      </main>
    );
  }

  if (coreContentStatus === "blocked-seen") {
    return (
      <main className="app-shell storage-error-screen">
        <p role="alert">오늘 문제를 준비하지 못했어요</p>
        <p>새 문제를 확인한 뒤 다시 안내할게요.</p>
        <button
          className="primary-button"
          type="button"
          onClick={handleStartCore}
        >
          다시 확인하기
        </button>
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
        now={currentNow}
        onStart={handleStartCore}
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
        bannerAd={bannerAd}
        entitlement={entitlement}
        score={scoreQuiz(resultSession ?? session)}
        onBonus={() => {
          setBonusStartStatus("idle");
          setBonusStartError(null);
          setSelectedTopic(
            displayedBonusTopics.find((topic) => !topic.exhausted)?.id ?? null,
          );
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
      topics={displayedBonusTopics}
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
