# Quiz Readability and Global Dedup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve mobile quiz readability, publish three reviewed bonus topics, and guarantee that an answered question or concept is never assigned again within the same persisted user profile.

**Architecture:** Keep the existing immutable JSON packs, fixed three-question bonus sets, lazy Vite catalog, and idempotent progress repository. Promote `conceptId` to every question, add version-4 seen ledgers and skipped bonus sets, expose topic inventory through the catalog, and reject or skip repeated content before consuming any bonus entitlement.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Vitest, Testing Library, Playwright, JSON content packs, Apps in Toss Web Framework 3.0.1

## Global Constraints

- Public bonus topics are exactly `nostalgia`, `korean-life`, and `language`.
- `korean-life` and `language` each require at least 30 sets and 90 reviewed questions before exposure.
- Every released question has one globally unique semantic `conceptId`.
- An answered `questionId` or `conceptId` cannot be assigned again in a new session.
- Restoring the same active session is allowed and must show its original questions.
- Duplicate and inventory checks complete before first-free, streak-ticket, or rewarded-ad entitlement consumption.
- Inventory exhaustion shows `새 문제 준비 중` and never recycles a question.
- The guarantee is device-profile local; cross-device synchronization is outside this plan.
- No runtime AI generation and no new difficulty selector.
- Keep all user-facing Korean copy plain and respectful for the 5060 audience.

---

## File Structure

- `src/App.tsx`: quiz title state, SVG answer mark, topic inventory UI, and duplicate-safe bonus loading orchestration.
- `src/App.css`: responsive title sizes, stable answer-button grid, fixed SVG mark, and exhausted-topic styles.
- `src/domain/question.ts`: shared required `conceptId` contract.
- `src/domain/progress-state.ts`: version-4 seen ledgers and skipped set indexes.
- `src/domain/progress-commands.ts`: answer-ledger updates, duplicate rejection, and idempotent set skipping.
- `src/domain/bonus-progress.ts`: next eligible fixed-set calculation bounded by released inventory.
- `src/services/progress-repository.ts`: V1/V2/V3 to V4 migration and V4 dual-slot persistence.
- `src/content/types.ts`: manifest topic metadata contract.
- `src/content/content-catalog.ts`: ordered topic metadata and released set counts.
- `src/content/concept-map.json`: generated old/new question ID to concept ID migration map.
- `scripts/build-concept-map.ts`: deterministic concept-map generator from released packs.
- `src/data/content-pack-validation.ts`: global concept uniqueness and three-topic release validation.
- `src/content/bonus/korean-life/pack-001.json`: 30 reviewed fixed sets.
- `src/content/bonus/language/pack-001.json`: 30 reviewed fixed sets.
- `src/content/manifest.json`: three public topics and their exact inventory.
- Existing colocated `*.test.ts`, `App.test.tsx`, and `tests/e2e/*.spec.ts`: regression coverage.

---

### Task 1: Stabilize Quiz Typography and Answer Geometry

**Files:**
- Modify: `src/App.tsx:209-288`
- Modify: `src/App.css:169-226`
- Modify: `src/App.test.tsx`
- Modify: `tests/e2e/visual-regression.spec.ts`

**Interfaces:**
- Consumes: `Question.prompt`, `Question.choices`, selected answer state.
- Produces: `isLongQuestion(prompt: string): boolean`, `.question-title.long`, `.answer-text`, and a fixed SVG `.answer-mark`.

- [ ] **Step 1: Write failing component tests for long titles and SVG marks**

Add a long prompt fixture and assert the rendered structure:

```tsx
it("marks a 42-character question as long and renders a fixed SVG answer mark", async () => {
  const longQuestion = {
    ...coreQuestions[0],
    prompt: "공용 컴퓨터에서 시크릿 창을 모두 닫아도 방문 사실을 확인할 수 있는 곳은 어디일까요?",
    choices: ["브라우저 방문 기록", "웹사이트와 네트워크 관리자", "자동 완성 목록"],
    answerIndex: 1,
  } satisfies CoreQuestion;

  const user = userEvent.setup();
  render(
    <QuizApp
      now={new Date("2026-07-28T03:00:00.000Z")}
      coreQuestions={[longQuestion, coreQuestions[1], coreQuestions[2]]}
      bonusQuestions={[]}
    />,
  );
  await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));

  const title = screen.getByRole("heading", { name: longQuestion.prompt });
  expect(title).toHaveClass("question-title", "long");

  await user.click(screen.getByRole("button", { name: longQuestion.choices[1] }));
  const mark = document.querySelector(".answer-mark");
  expect(mark?.querySelector("svg")).not.toBeNull();
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm.cmd test -- --run src/App.test.tsx -t "marks a 42-character question"`

Expected: FAIL because the heading has no `question-title long` classes and the mark is text rather than SVG.

- [ ] **Step 3: Add the title classifier and SVG markup**

Implement the exact boundary and markup:

```tsx
export function isLongQuestion(prompt: string): boolean {
  return Array.from(prompt.trim()).length >= 42;
}

<h1 className={`question-title${isLongQuestion(question.prompt) ? " long" : ""}`}>
  {question.prompt}
</h1>

<span className="answer-text">{choice}</span>
{isSelected ? (
  <span className="answer-mark" aria-hidden="true">
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="m6.5 12.5 3.4 3.4 7.6-8" />
    </svg>
  </span>
) : null}
```

- [ ] **Step 4: Replace centering and variable borders with stable CSS**

Use these layout values:

```css
.question-title {
  margin: 0;
  font-size: clamp(24px, 6.4vw, 28px);
  line-height: 1.38;
  letter-spacing: -0.025em;
}

.question-title.long {
  font-size: clamp(21px, 5.7vw, 24px);
  line-height: 1.42;
  letter-spacing: -0.018em;
}

.answer-button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  gap: 14px;
  min-height: 70px;
  align-items: start;
  padding: 18px 20px;
  border: 2px solid #d9dee5;
  text-align: left;
  font-size: 18px;
  line-height: 1.45;
}

.answer-mark {
  display: grid;
  width: 28px;
  min-width: 28px;
  height: 28px;
  min-height: 28px;
  aspect-ratio: 1;
  place-items: center;
  border-radius: 50%;
  background: #0064ff;
}

.answer-mark svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: #fff;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.5;
}
```

- [ ] **Step 5: Verify component tests and visual snapshots**

Run:

```powershell
npm.cmd test -- --run src/App.test.tsx
npm.cmd run test:e2e:update
npm.cmd run test:e2e:chromium -- tests/e2e/visual-regression.spec.ts
```

Expected: component tests pass; 360px and 390px screenshots show identical answer-text top offsets and circular checks.

- [ ] **Step 6: Commit the readable quiz layout**

```powershell
git add src/App.tsx src/App.css src/App.test.tsx tests/e2e/visual-regression.spec.ts tests/e2e/visual-regression.spec.ts-snapshots
git commit -m "fix: improve quiz answer readability"
```

---

### Task 2: Promote Concept Identity to Every Released Question

**Files:**
- Modify: `src/domain/question.ts`
- Modify: `src/domain/question.test.ts`
- Modify: `src/content/parse-content.test.ts`
- Modify: `src/data/content-pack-validation.ts`
- Modify: `src/data/content-pack-validation.test.ts`
- Modify: `src/content/core/pack-001.json` through `pack-006.json`

**Interfaces:**
- Consumes: current `QuestionBase` and JSON pack validation.
- Produces: `QuestionBase.conceptId: string` and a global `duplicate-concept` validation failure.

- [ ] **Step 1: Write failing domain tests for required core concept IDs**

```ts
it("requires a conceptId on core and bonus questions", () => {
  const coreWithoutConcept = { ...validCoreQuestion, conceptId: undefined };
  const bonusWithoutConcept = { ...validBonusQuestion, conceptId: undefined };

  expect(validateQuestion(coreWithoutConcept)).toContain("question.conceptId");
  expect(validateQuestion(bonusWithoutConcept)).toContain("question.conceptId");
});
```

- [ ] **Step 2: Run the domain test and verify RED**

Run: `npm.cmd test -- --run src/domain/question.test.ts -t "requires a conceptId"`

Expected: FAIL because core questions do not currently require the field.

- [ ] **Step 3: Move `conceptId` into the shared base contract**

Use this type shape:

```ts
interface QuestionBase {
  id: string;
  conceptId: string;
  lens: CoreLens;
  topic: BonusTopic;
  // existing fields remain unchanged
}

export interface BonusQuestion extends QuestionBase {
  kind: "bonus";
  variant: string;
  internalDifficulty: InternalDifficulty;
  setIndex: number;
}
```

`validateQuestion` must add `question.conceptId` when the trimmed value is empty or missing. Legacy TypeScript factories may default `conceptId` to `input.id`, but parsed release JSON must contain an explicit value.

- [ ] **Step 4: Write a failing library test that rejects any repeated concept**

```ts
it("rejects a concept repeated anywhere in the released library", () => {
  const first = question({ id: "core-a", conceptId: "shared-kimjang" });
  const second = question({ id: "bonus-b", conceptId: "shared-kimjang" });

  expect(validateContentLibrary([pack(first), pack(second)]).issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "duplicate-concept" }),
    ]),
  );
});
```

- [ ] **Step 5: Replace the 30-set concept-spacing allowance**

Change the validator so every second occurrence of a released `conceptId` yields `duplicate-concept`, regardless of topic, kind, or set distance. Keep exact and similar prompt checks.

- [ ] **Step 6: Backfill explicit semantic IDs in all six core packs**

Each ID must be a stable lowercase kebab-case fact key, not the dated question ID. Examples:

```json
{
  "id": "2026-08-14-then-18-v1",
  "conceptId": "korean-life-kimjang-community-winter-preparation"
}
```

```json
{
  "id": "2026-08-19-now-23-v1",
  "conceptId": "digital-incognito-network-visibility"
}
```

Review all 540 core rows against the released nostalgia concepts. When two rows ask the same fact, retain the stronger question and replace the other with a reviewed unique fact rather than inventing a suffix.

- [ ] **Step 7: Run question and library validation**

Run:

```powershell
npm.cmd test -- --run src/domain/question.test.ts src/content/parse-content.test.ts src/data/content-pack-validation.test.ts
npm.cmd run validate:content:library -- --scope all
```

Expected: PASS with zero missing or repeated concepts.

- [ ] **Step 8: Commit the global concept contract**

```powershell
git add src/domain/question.ts src/domain/question.test.ts src/content/parse-content.test.ts src/data/content-pack-validation.ts src/data/content-pack-validation.test.ts src/content/core src/data
git commit -m "feat: add global question concept identity"
```

---

### Task 3: Add Version-4 Seen Ledgers and Safe Migration

**Files:**
- Modify: `src/domain/progress-state.ts`
- Modify: `src/domain/progress-commands.ts`
- Modify: `src/domain/progress-commands.test.ts`
- Modify: `src/services/progress-repository.ts`
- Modify: `src/services/progress-repository.test.ts`
- Create: `scripts/build-concept-map.ts`
- Create: `scripts/build-concept-map.test.ts`
- Create: `src/content/concept-map.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: V1, V2, V3 progress, released question packs, and `AnswerCommand.question.conceptId`.
- Produces: `ProgressState` V4 with `seenQuestionIds`, `seenConceptIds`, and per-topic `skippedSetIndexes`.

- [ ] **Step 1: Write failing answer-ledger tests**

```ts
it("records an answered question and concept immediately", () => {
  const result = applyAnswerCommand(createEmptyProgress(), answerCommand({
    question: { ...bonusQuestions[0], conceptId: "language-wenil-spelling" },
  }));

  expect(result.state.seenQuestionIds).toContain(bonusQuestions[0].id);
  expect(result.state.seenConceptIds).toContain("language-wenil-spelling");
});
```

- [ ] **Step 2: Verify the answer-ledger test fails**

Run: `npm.cmd test -- --run src/domain/progress-commands.test.ts -t "records an answered question"`

Expected: FAIL because V3 has neither ledger.

- [ ] **Step 3: Define the V4 state**

```ts
export interface BonusTopicProgress {
  completedSetIndexes: number[];
  skippedSetIndexes: number[];
  lastCompletedDateKey?: string;
}

export interface ProgressStateV3 extends Omit<ProgressStateV2, "version"> {
  version: 3;
  bonusTopicProgress: Record<BonusTopic, Omit<BonusTopicProgress, "skippedSetIndexes">>;
}

export interface ProgressState extends Omit<ProgressStateV3, "version" | "bonusTopicProgress"> {
  version: 4;
  seenQuestionIds: string[];
  seenConceptIds: string[];
  bonusTopicProgress: Record<BonusTopic, BonusTopicProgress>;
}
```

Update `applyAnswerCommand` with insertion-order-preserving `Set` conversion after the duplicate-attempt guard.

- [ ] **Step 4: Write failing V3-to-V4 migration tests**

```ts
it("migrates answered IDs and mapped concepts from V3", () => {
  const migrated = migrateV3ToV4(v3ProgressWithAnswers, {
    "old-core-id": "korean-life-kimjang-community-winter-preparation",
  });

  expect(migrated.version).toBe(4);
  expect(migrated.seenQuestionIds).toContain("old-core-id");
  expect(migrated.seenConceptIds).toContain(
    "korean-life-kimjang-community-winter-preparation",
  );
});
```

- [ ] **Step 5: Generate and validate the concept migration map**

`build-concept-map.ts` must read every descriptor in `src/content/manifest.json`, parse the corresponding JSON file, and emit sorted JSON shaped as:

```json
{
  "2026-08-14-then-18-v1": "korean-life-kimjang-community-winter-preparation",
  "bonus-nostalgia-001-s00-gentle-family-plan-start": "nostalgia-family-plan-start-1962"
}
```

Fail on duplicate question IDs, empty concepts, or a descriptor path that cannot be read. Add `"build:concept-map": "tsx scripts/build-concept-map.ts"` to `package.json`.

- [ ] **Step 6: Implement V4 dual-slot persistence**

Add `v3SlotA` and `v3SlotB` preservation keys, use new V4 keys for active writes, set envelope `schemaVersion: 4`, and return `fromVersion: 1 | 2 | 3`. Never overwrite unreadable preserved slots.

- [ ] **Step 7: Run migration and repository tests**

Run:

```powershell
npm.cmd run build:concept-map
npm.cmd test -- --run scripts/build-concept-map.test.ts src/domain/progress-commands.test.ts src/services/progress-repository.test.ts
```

Expected: all migrations preserve sessions, entitlements, answer events, completed sets, and reward command IDs.

- [ ] **Step 8: Commit V4 progress**

```powershell
git add src/domain/progress-state.ts src/domain/progress-commands.ts src/domain/progress-commands.test.ts src/services/progress-repository.ts src/services/progress-repository.test.ts scripts/build-concept-map.ts scripts/build-concept-map.test.ts src/content/concept-map.json package.json
git commit -m "feat: persist seen question concepts"
```

---

### Task 4: Bound Inventory and Skip Seen Fixed Sets Before Unlock

**Files:**
- Modify: `src/domain/bonus-progress.ts`
- Modify: `src/domain/bonus-progress.test.ts`
- Modify: `src/domain/progress-commands.ts`
- Modify: `src/domain/progress-commands.test.ts`

**Interfaces:**
- Consumes: `ProgressState`, `releasedSetCount`, and a loaded three-question set.
- Produces: bounded availability, `findSeenQuestion`, and `skipBonusSetCommand`.

- [ ] **Step 1: Write failing bounded-inventory tests**

```ts
it("returns exhausted after all released sets are completed or skipped", () => {
  const progress = progressWithTopic({
    completedSetIndexes: [0],
    skippedSetIndexes: [1],
  });

  expect(resolveBonusSetAvailability(progress, "language", "2026-08-05", 2)).toEqual({
    kind: "exhausted",
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- --run src/domain/bonus-progress.test.ts -t "all released sets"`

Expected: FAIL because availability is hard-coded to 180 and ignores skipped sets.

- [ ] **Step 3: Implement bounded availability**

Use this signature:

```ts
export function resolveBonusSetAvailability(
  progress: ProgressState,
  topic: BonusTopic,
  dateKey: string,
  releasedSetCount: number,
): BonusSetAvailability;
```

Search indexes `0 <= index < releasedSetCount` and exclude both completed and skipped indexes. Preserve active-session and daily-limit precedence.

- [ ] **Step 4: Write failing duplicate-set and entitlement tests**

```ts
it("skips a set containing an answered concept without consuming entitlement", () => {
  const state = progressWithSeenConcept("language-wenil-spelling");
  const match = findSeenQuestion(
    state,
    setWithConcept("language-wenil-spelling"),
  );
  const next = skipBonusSetCommand(state, "language", 0);

  expect(match).toEqual({ kind: "concept-id", value: "language-wenil-spelling" });
  expect(next.bonus).toEqual(state.bonus);
  expect(next.bonusTopicProgress.language.skippedSetIndexes).toEqual([0]);
});
```

- [ ] **Step 5: Implement pure duplicate inspection and idempotent skip**

```ts
export function findSeenQuestion(
  state: ProgressState,
  questions: readonly Question[],
): { kind: "question-id" | "concept-id"; value: string } | undefined;

export function skipBonusSetCommand(
  state: ProgressState,
  topic: BonusTopic,
  setIndex: number,
): ProgressState;
```

`skipBonusSetCommand` appends once, sorts ascending, and does not alter entitlement, rewards, active sessions, or `lastCompletedDateKey`.

- [ ] **Step 6: Add defense in `startBonusSessionCommand`**

Before `unlockBonus`, return `{ applied: false, reason: "seen-question" | "seen-concept", state }` if the loaded candidate contains a seen value. This is a final guard even though the app orchestrator normally skips first.

- [ ] **Step 7: Run domain tests and commit**

```powershell
npm.cmd test -- --run src/domain/bonus-progress.test.ts src/domain/progress-commands.test.ts
git add src/domain/bonus-progress.ts src/domain/bonus-progress.test.ts src/domain/progress-commands.ts src/domain/progress-commands.test.ts
git commit -m "feat: skip repeated bonus sets"
```

---

### Task 5: Expose Ordered Topic Inventory Through the Catalog

**Files:**
- Modify: `src/content/types.ts`
- Modify: `src/content/content-catalog.ts`
- Modify: `src/content/content-catalog.test.ts`
- Modify: `src/content/in-memory-content-catalog.ts`
- Modify: `src/content/manifest.json`

**Interfaces:**
- Consumes: manifest `releaseContract.bonusTopics`.
- Produces: `ContentCatalog.bonusTopics: readonly BonusTopicMetadata[]`.

- [ ] **Step 1: Write a failing catalog metadata test**

```ts
it("exposes ordered public topic labels and released set counts", () => {
  const catalog = createPackedContentCatalog(manifestWithThreeTopics, {});

  expect(catalog.bonusTopics).toEqual([
    { id: "nostalgia", label: "추억·대중문화", order: 0, setCount: 120 },
    { id: "korean-life", label: "한국 생활사", order: 1, setCount: 30 },
    { id: "language", label: "말·속담·맞춤법", order: 2, setCount: 30 },
  ]);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm.cmd test -- --run src/content/content-catalog.test.ts -t "ordered public topic"`

Expected: FAIL because only `availableBonusTopics` exists.

- [ ] **Step 3: Define and return exact metadata**

```ts
export interface BonusTopicReleaseContract {
  topic: BonusTopic;
  label: string;
  order: number;
  packCount: number;
  setCount: number;
  questionCount: number;
}

export interface BonusTopicMetadata {
  id: BonusTopic;
  label: string;
  order: number;
  setCount: number;
}
```

Reject empty labels, repeated orders, negative counts, and release counts that disagree with descriptors. Sort catalog metadata by `order`.

- [ ] **Step 4: Update in-memory catalogs and tests**

Test fixtures must declare topic metadata explicitly so tests exercise the same availability contract as production.

- [ ] **Step 5: Run catalog and manifest tests, then commit**

```powershell
npm.cmd test -- --run src/content/content-catalog.test.ts src/data/content-pack-validation.test.ts
git add src/content/types.ts src/content/content-catalog.ts src/content/content-catalog.test.ts src/content/in-memory-content-catalog.ts src/content/manifest.json src/data/content-pack-validation.ts src/data/content-pack-validation.test.ts
git commit -m "feat: expose bonus topic inventory"
```

---

### Task 6: Produce the Korean-Life and Language Launch Packs

**Files:**
- Create: `src/content/bonus/korean-life/pack-001.json`
- Create: `src/content/bonus/language/pack-001.json`
- Modify: `src/content/manifest.json`
- Regenerate: `src/content/concept-map.json`

**Interfaces:**
- Consumes: bonus pack schema, global concept validation, and authoritative public sources.
- Produces: 30 fixed sets and 90 reviewed questions per new topic.

- [ ] **Step 1: Create the exact content matrices**

Use 90 distinct concepts per topic with these quotas:

```text
korean-life
  seasonal customs and holidays: 15
  food preparation and preservation: 15
  housing and household tools: 15
  clothing and crafts: 15
  community customs and rites: 15
  transport, markets, and communication history: 15

language
  frequently confused spelling: 18
  spacing and word forms: 12
  proverbs and their meanings: 15
  idioms and 관용구: 15
  standard pronunciation and loanword notation: 12
  honorifics, counters, and sentence usage: 18
```

Every concept appears once across the full release library. Sources are limited to primary or authoritative references such as 국립민속박물관, 국가유산청, 한국민족문화대백과사전, 국립국어원 표준국어대사전, and 국립국어원 온라인가나다.

- [ ] **Step 2: Verify both missing packs fail validation before creation**

Run:

```powershell
npm.cmd run validate:content:pack -- src/content/bonus/korean-life/pack-001.json
npm.cmd run validate:content:pack -- src/content/bonus/language/pack-001.json
```

Expected: both commands fail because the files do not exist. This is the RED gate for the data artifacts; the existing pack validator supplies schema, count, set-balance, source, and duplication assertions.

- [ ] **Step 3: Author `korean-life/pack-001.json`**

Every set uses this exact three-row structure with different concepts:

```json
[
  { "setIndex": 0, "internalDifficulty": "gentle" },
  { "setIndex": 0, "internalDifficulty": "steady" },
  { "setIndex": 0, "internalDifficulty": "stretch" }
]
```

All questions include `kind`, `id`, `conceptId`, `variant`, `setIndex`, `lens`, `topic`, `internalDifficulty`, `prompt`, three `choices`, `answerIndex`, `explanation`, `source`, `contentVersion`, `reviewStatus: "reviewed"`, and `reviewedAt: "2026-08-05"`.

- [ ] **Step 4: Validate and register the Korean-life pack**

```powershell
npm.cmd run validate:content:pack -- src/content/bonus/korean-life/pack-001.json --update-manifest
npm.cmd run validate:content:library -- --scope bonus:korean-life
```

Expected: 90 questions, 30 sets, no duplicate/similar concepts or prompt failures.

- [ ] **Step 5: Author and validate `language/pack-001.json`**

Use the same schema and set balance, then run:

```powershell
npm.cmd run validate:content:pack -- src/content/bonus/language/pack-001.json --update-manifest
npm.cmd run validate:content:library -- --scope bonus:language
```

- [ ] **Step 6: Run cross-library validation and regenerate the map**

```powershell
npm.cmd run validate:content:library -- --scope all
npm.cmd run build:concept-map
```

Any cross-topic semantic collision is resolved by replacing the weaker question, not by renaming its concept ID.

- [ ] **Step 7: Commit each reviewed pack separately**

```powershell
git add src/content/bonus/korean-life/pack-001.json src/content/manifest.json src/content/concept-map.json
git commit -m "content: add Korean life bonus pack"
git add src/content/bonus/language/pack-001.json src/content/manifest.json src/content/concept-map.json
git commit -m "content: add Korean language bonus pack"
```

---

### Task 7: Wire Three Topics and Duplicate-Safe Loading Into the App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `ContentCatalog.bonusTopics`, bounded availability, duplicate inspection, and repository skip command.
- Produces: three-topic UI, exhausted states, and entitlement-safe look-ahead loading.

- [ ] **Step 1: Write failing app tests for three topics and exhaustion**

```tsx
it("shows the three catalog topics in order and disables exhausted inventory", async () => {
  renderApp({ contentCatalog: catalogWithThreeTopics, progress: exhaustedLanguage });

  expect(screen.getAllByRole("radio").map((node) => node.textContent)).toEqual([
    expect.stringContaining("추억·대중문화"),
    expect.stringContaining("한국 생활사"),
    expect.stringContaining("말·속담·맞춤법"),
  ]);
  expect(screen.getByRole("radio", { name: /말·속담·맞춤법/ })).toBeDisabled();
  expect(screen.getByText("새 문제 준비 중")).toBeInTheDocument();
});
```

- [ ] **Step 2: Write a failing look-ahead test**

Configure set 0 with a seen concept and set 1 with three unseen concepts. Assert that set 0 is skipped, set 1 starts, and `rewardAdGateway.show` is not called until set 1 is loaded and accepted.

- [ ] **Step 3: Verify both tests fail**

Run: `npm.cmd test -- --run src/App.test.tsx -t "three catalog topics|look-ahead"`

- [ ] **Step 4: Replace the hard-coded public topic array**

Render `contentCatalog.bonusTopics` directly. Keep an exhaustive icon/style map keyed by `BonusTopic`, but do not use it to decide public availability.

- [ ] **Step 5: Implement bounded look-ahead loading**

For the selected topic, repeatedly resolve the next available index, load its pack, inspect seen IDs/concepts, persist an idempotent skip when needed, and continue until an unseen set or exhaustion. Only then call the existing entitlement/reward flow.

Use a maximum loop count equal to `topicMetadata.setCount`; do not use an unbounded `while` loop.

- [ ] **Step 6: Guard core loading**

After restoring an existing session, allow its original questions. Before creating a new core session, run `findSeenQuestion`; if validation drift is detected, show `오늘 문제를 준비하지 못했어요` and track `core_set_blocked_seen_concept` without displaying the repeated problem.

- [ ] **Step 7: Run app tests and commit**

```powershell
npm.cmd test -- --run src/App.test.tsx
git add src/App.tsx src/App.css src/App.test.tsx
git commit -m "feat: prevent repeated quiz assignments"
```

---

### Task 8: Add End-to-End Coverage for Layout, Topics, and No-Repeat Behavior

**Files:**
- Modify: `tests/e2e/bonus-flow.spec.ts`
- Modify: `tests/e2e/core-flow.spec.ts`
- Modify: `tests/e2e/visual-regression.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts`
- Modify: `tests/e2e/__screenshots__/visual-regression.spec.ts/win32/*.png`
- Modify: `tests/e2e/__screenshots__/visual-regression.spec.ts/windows-ci/*.png`

**Interfaces:**
- Consumes: complete app behavior from Tasks 1-7.
- Produces: browser proof at 360px and 390px in Chromium and WebKit.

- [ ] **Step 1: Add a three-topic journey**

Assert labels and order, complete a Korean-life set, reload, reopen the topic, and assert none of the first set's three question IDs are rendered again.

- [ ] **Step 2: Add a cross-kind concept regression**

Seed V4 progress with a concept answered in core, open bonus, and assert the catalog's next unseen fixed set is used before any ad show event.

- [ ] **Step 3: Add long-answer geometry assertions**

At 360px and 390px, compare every `.answer-text` bounding-box `y` to its button `y + 18` within one CSS pixel and assert `.answer-mark` width equals height.

- [ ] **Step 4: Add the 200% zoom and privacy-safe analytics checks**

Set the page viewport scale to 200%, complete a long question, and assert the explanation and next button remain reachable. When a seen set is skipped, assert `bonus_set_skipped_seen_concept` contains only `topic` and `setIndex`; it must not contain question IDs, concept IDs, selected answers, or correctness.

- [ ] **Step 5: Run focused browser tests**

```powershell
npm.cmd run test:e2e:chromium -- tests/e2e/core-flow.spec.ts tests/e2e/bonus-flow.spec.ts tests/e2e/visual-regression.spec.ts tests/e2e/accessibility.spec.ts
npm.cmd run test:e2e:webkit -- tests/e2e/core-flow.spec.ts tests/e2e/bonus-flow.spec.ts tests/e2e/visual-regression.spec.ts tests/e2e/accessibility.spec.ts
```

- [ ] **Step 6: Commit browser coverage**

```powershell
git add tests/e2e
git commit -m "test: cover quiz dedup and readability"
```

---

### Task 9: Run the Release Gate and Update Operations Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/release/apps-in-toss-sandbox-checklist.md`
- Modify: `docs/roadmaps/2026-08-05-post-launch-content-expansion.md`

**Interfaces:**
- Consumes: verified feature and content counts.
- Produces: exact sandbox checks and an updated remaining-topic roadmap.

- [ ] **Step 1: Document V4 storage and three-topic inventory**

Record 120 nostalgia sets, 30 Korean-life sets, 30 language sets, the local-profile dedup guarantee, and the `새 문제 준비 중` behavior. Move the remaining three topics to the future roadmap.

- [ ] **Step 2: Run the complete quality and release gates**

```powershell
npm.cmd run verify:quality
npm.cmd run test:e2e
npm.cmd run build
```

Expected:

- lint and TypeScript pass
- content validation reports the exact manifest counts
- all Vitest suites pass
- Chromium and WebKit pass at 360px and 390px
- `.ait` build succeeds

- [ ] **Step 3: Inspect the built artifact and git diff**

```powershell
git diff --check
git status --short
Get-ChildItem *.ait | Select-Object Name,Length,LastWriteTime
```

- [ ] **Step 4: Commit release documentation**

```powershell
git add README.md docs/release/apps-in-toss-sandbox-checklist.md docs/roadmaps/2026-08-05-post-launch-content-expansion.md
git commit -m "docs: update three-topic release checks"
```

---

## Final Acceptance Checklist

- [ ] Long prompts use the 21-24px class and normal prompts use 24-28px.
- [ ] One-line and wrapped answer text starts at the same 18px top inset.
- [ ] The selected SVG mark remains a 28px circle.
- [ ] The catalog exposes only nostalgia, Korean life, and language.
- [ ] Korean life and language each contain 30 sets and 90 reviewed questions.
- [ ] Every released core and bonus row has a globally unique semantic `conceptId`.
- [ ] V1/V2/V3 progress migrates to V4 without losing sessions or rewards.
- [ ] Answer submission immediately records question and concept IDs.
- [ ] Repeated fixed sets are skipped before entitlement consumption.
- [ ] Active session restoration is unchanged.
- [ ] Exhausted topics show `새 문제 준비 중` and never recycle content.
- [ ] 360px/390px Chromium and WebKit, accessibility, content, unit, type, lint, and build gates pass.
