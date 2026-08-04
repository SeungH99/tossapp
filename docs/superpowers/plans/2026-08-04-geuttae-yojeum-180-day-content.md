# 그때. 요즘 180일 콘텐츠 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5060 사용자가 기본 퀴즈와 선택한 보너스 주제를 180일 동안 같은 기기에서 반복 없이 풀 수 있도록, 검수된 3,780문제와 지연 로딩 콘텐츠 플랫폼을 구축한다.

**Architecture:** 42개의 30일 JSON 팩과 작은 manifest를 정적 앱 번들에 포함하고 Vite의 import.meta.glob으로 필요한 팩만 지연 로딩한다. 문제 스키마, 팩 검증기, 버전 3 진행 상태, 주제별 하루 1세트 정책을 순수 도메인 계층에 두고 App은 ContentCatalog와 ProgressRepository 경계를 통해 사용한다. 모든 작업은 통합 브랜치에서 검증하며 42개 팩이 모두 reviewed가 되기 전에는 main에 병합하지 않는다.

**Tech Stack:** React 18, TypeScript 5.7, Vite 6, Vitest, Testing Library, Playwright, Apps in Toss Web Framework 3.0.1, JSON content packs, Node.js validation scripts

## Global Constraints

- 기본 퀴즈는 2026-07-28부터 2027-01-23까지 정확히 180일, 540문제다.
- 보너스는 6주제 x 180세트 x 3문제로 정확히 3,240문제다.
- 전체 콘텐츠는 정확히 3,780문제와 42개 팩이다.
- 기본 날짜와 모든 보너스 세트에는 gentle, steady, stretch가 각각 한 문제씩 있어야 한다.
- 보너스는 주제별 하루 1세트이며 다른 주제는 같은 날 이용할 수 있다.
- 다른 날짜나 다른 주제의 문제를 폴백으로 보여주지 않는다.
- 콘텐츠 로드 실패, 일일 제한, 세트 소진은 광고·이용권을 소비하기 전에 반환한다.
- 무반복은 같은 기기의 로컬 ProgressState가 유지되는 동안만 보장한다.
- 로그인, 백엔드, 런타임 문제 생성, 사용자 난이도 선택은 추가하지 않는다.
- 출처 URL, reviewedAt, contentVersion, reviewed 상태가 없는 문항은 출시할 수 없다.
- 모든 코드 변경은 실패하는 테스트를 먼저 확인하고 최소 구현 후 전체 품질 검증을 실행한다.
- 기존 30일 앱은 통합 작업이 완성될 때까지 main에서 유지한다.

## Integration Strategy

- 이 계획은 codex/content-180-day-integration 브랜치에서 실행한다.
- Task 1~5는 플랫폼과 저장 계약, Task 6~12는 콘텐츠 배치, Task 13~16은 통합과 출시다.
- 각 Task는 독립 리뷰가 가능한 커밋을 만든다.
- 콘텐츠 팩 커밋은 팩 한 개당 하나로 제한한다.
- 최종 Task 16 전에는 통합 브랜치를 main에 병합하지 않는다.

## File Structure

**Create**

- src/content/types.ts: manifest, 팩, 메타데이터 타입
- src/content/parse-content.ts: unknown JSON을 검증된 타입으로 변환
- src/content/parse-content.test.ts: JSON 스키마 파싱과 출시 상태 검증
- src/content/content-catalog.ts: 앱이 사용하는 비동기 콘텐츠 인터페이스
- src/content/in-memory-content-catalog.ts: 단위·E2E 테스트용 결정적 catalog
- src/content/vite-content-catalog.ts: import.meta.glob 기반 지연 로더
- src/content/content-catalog.test.ts: 지연 로드와 오류 계약
- src/content/manifest.json: 42개 팩 메타데이터와 체크섬
- src/content/legacy-map.json: 기존 보너스 ID의 명시적 V3 매핑
- src/content/core/pack-001.json부터 pack-006.json: 기본 540문제
- src/content/bonus/<topic>/pack-001.json부터 pack-006.json: 보너스 3,240문제
- src/content/fixtures/invalid-*.json: 검증기 실패 테스트용 최소 fixture
- src/domain/bonus-progress.ts: 일일 제한과 다음 미완료 세트 계산
- src/domain/bonus-progress.test.ts: 주제별 진행 정책 테스트
- src/data/content-pack-validation.ts: 팩·manifest·전역 품질 검사
- src/data/content-pack-validation.test.ts: 검증 코드 단위 테스트
- scripts/validate-content-pack.ts: 단일 팩 검증 CLI
- scripts/validate-content-library.ts: 42개 팩 릴리스 검증 CLI
- scripts/validate-content-library.test.ts: CLI 종료 코드 테스트

**Modify**

- src/domain/question.ts: CoreQuestion 난이도와 공통 검수 메타데이터
- src/domain/question.test.ts: 새 스키마 검증
- src/domain/progress-state.ts: ProgressState V2 보존과 V3 정의
- src/domain/progress-commands.ts: 명시적 setIndex 시작·완료 명령
- src/domain/progress-commands.test.ts: 권리 소비와 멱등성
- src/services/progress-repository.ts: V1/V2 -> V3 마이그레이션과 V3 슬롯
- src/services/progress-repository.test.ts: 저장 복구와 마이그레이션
- src/App.tsx: 비동기 콘텐츠 로딩, 오늘 완료 상태, 오류 복구
- src/App.test.tsx: 기본·보너스 통합 동작
- src/App.css: 완료 주제와 콘텐츠 오류 상태
- src/main.tsx: ViteContentCatalog 생성
- src/services/analytics.ts: 새 이벤트 분류
- src/data/questions.ts: 기존 배열 제거 후 호환 fixture 범위 축소
- src/data/questions.test.ts: 새 catalog 계약으로 전환
- src/data/content-validation.ts: 기존 30일 검증기를 새 검증기로 교체
- scripts/validate-content.ts: 새 library CLI 호출
- package.json: 팩·라이브러리 검증 명령
- tests/e2e/support/quiz-flow.ts: 비동기 로딩과 날짜 이동 helper
- tests/e2e/bonus-flow.spec.ts: 주제별 하루 1세트
- tests/e2e/resilience.spec.ts: 팩 로딩 실패
- tests/e2e/visual-regression.spec.ts: 오늘 완료와 로드 오류 상태
- .github/workflows/release-gate.yml: 전체 라이브러리와 lazy chunk 검증

---

### Task 1: Question Metadata and Manifest Types

**Files:**

- Create: src/content/types.ts
- Create: src/content/parse-content.ts
- Create: src/content/parse-content.test.ts
- Test: src/domain/question.test.ts
- Modify: src/domain/question.ts:8-151

**Interfaces:**

- Produces: ContentVersion, ReviewStatus, ContentManifest, ContentPackDescriptor, CoreContentPack, BonusContentPack
- Produces: parseCorePack(value: unknown): CoreContentPack
- Produces: parseBonusPack(value: unknown): BonusContentPack
- Extends: CoreQuestion.internalDifficulty, QuestionBase.contentVersion, reviewStatus, reviewedAt, validThrough

- [ ] **Step 1: Write the failing schema tests**

~~~ts
it("검수 메타데이터와 핵심 난이도를 요구한다", () => {
  const question = {
    kind: "core",
    id: "2026-07-28-then-public-phone",
    dateKey: "2026-07-28",
    lens: "then",
    topic: "nostalgia",
    internalDifficulty: "gentle",
    prompt: "공중전화에서 안내음이 들린 뒤 통화를 계속하려면 무엇이 필요했을까요?",
    choices: ["수화기 교체", "동전 추가", "전화번호 재입력"],
    answerIndex: 1,
    explanation: "안내음 뒤 동전을 더 넣어 통화를 이어갔어요.",
    source: { name: "국가기록원", url: "https://www.archives.go.kr/" },
    contentVersion: "2026.08.180d",
    reviewStatus: "reviewed",
    reviewedAt: "2026-08-04",
  };

  expect(validateQuestion(question)).toEqual([]);
});

it("draft 상태와 잘못된 reviewedAt을 출시 문제로 거부한다", () => {
  expect(validateQuestion({ ...validCoreQuestion, reviewStatus: "draft" }))
    .toContain("question.reviewStatus");
  expect(validateQuestion({ ...validCoreQuestion, reviewedAt: "2026/08/04" }))
    .toContain("question.reviewedAt");
});
~~~

- [ ] **Step 2: Run the tests and confirm RED**

Run: npm.cmd test -- --run src/domain/question.test.ts

Expected: FAIL because CoreQuestion has no internalDifficulty and validateQuestion does not enforce review metadata.

- [ ] **Step 3: Add the exact type contract**

~~~ts
export type ReviewStatus = "draft" | "fact-checked" | "reviewed";

interface QuestionBase {
  id: string;
  lens: CoreLens;
  topic: BonusTopic;
  prompt: string;
  choices: [string, string, string];
  answerIndex: 0 | 1 | 2;
  explanation: string;
  source: QuestionSource;
  contentVersion: string;
  reviewStatus: ReviewStatus;
  reviewedAt: string;
  validThrough?: string;
}

export interface CoreQuestion extends QuestionBase {
  kind: "core";
  dateKey: string;
  internalDifficulty: InternalDifficulty;
}

export interface BonusQuestion extends QuestionBase {
  kind: "bonus";
  conceptId: string;
  variant: string;
  internalDifficulty: InternalDifficulty;
  setIndex: number;
}
~~~

Define ContentManifest with releaseStart, releaseEnd, contentVersion, corePacks, bonusPacks. Each ContentPackDescriptor contains id, kind, path, sha256, questionCount, reviewStatus, and either dateStart/dateEnd or topic/setStart/setEnd.

- [ ] **Step 4: Implement parsers and rerun focused tests**

Run: npm.cmd test -- --run src/domain/question.test.ts src/content/parse-content.test.ts

Expected: PASS.

- [ ] **Step 5: Run typecheck and commit**

Run: npm.cmd run typecheck

~~~bash
git add src/domain/question.ts src/domain/question.test.ts src/content/types.ts src/content/parse-content.ts src/content/parse-content.test.ts
git commit -m "feat: define 180-day content schema"
~~~

### Task 2: Lazy Content Catalog

**Files:**

- Create: src/content/content-catalog.ts
- Create: src/content/in-memory-content-catalog.ts
- Create: src/content/vite-content-catalog.ts
- Test: src/content/content-catalog.test.ts
- Modify: src/vite-env.d.ts

**Interfaces:**

- Consumes: ContentManifest, CoreContentPack, BonusContentPack
- Produces: ContentLoadResult<T>
- Produces: ContentCatalog.loadCoreSet(dateKey: string): Promise<ContentLoadResult<CoreQuestion[]>>
- Produces: ContentCatalog.loadBonusSet(topic: BonusTopic, setIndex: number): Promise<ContentLoadResult<BonusQuestion[]>>
- Produces: createPackedContentCatalog(manifest, importers): ContentCatalog
- Produces: createInMemoryContentCatalog(coreSets, bonusSets): ContentCatalog
- Produces: createViteContentCatalog(): ContentCatalog

- [ ] **Step 1: Write failing catalog tests**

~~~ts
it("요청한 기본 팩만 import한다", async () => {
  const calls: string[] = [];
  const catalog = createPackedContentCatalog(manifest, {
    "src/content/core/pack-001.json": async () => {
      calls.push("pack-001");
      return { default: corePack001 };
    },
    "src/content/core/pack-002.json": async () => {
      calls.push("pack-002");
      return { default: corePack002 };
    },
  });

  const result = await catalog.loadCoreSet("2026-07-28");
  expect(result).toMatchObject({ ok: true });
  expect(calls).toEqual(["pack-001"]);
});

it("없는 팩을 다른 날짜로 대체하지 않는다", async () => {
  const result = await emptyCatalog.loadCoreSet("2026-07-28");
  expect(result).toEqual({ ok: false, reason: "missing-pack" });
});
~~~

- [ ] **Step 2: Run focused tests and confirm RED**

Run: npm.cmd test -- --run src/content/content-catalog.test.ts

Expected: FAIL because the catalog modules do not exist.

- [ ] **Step 3: Implement registry-based loading**

~~~ts
export type ContentLoadFailure =
  | "missing-pack"
  | "invalid-pack"
  | "missing-set";

export type ContentLoadResult<T> =
  | { ok: true; value: T; packId: string }
  | { ok: false; reason: ContentLoadFailure; packId?: string };

export interface ContentCatalog {
  loadCoreSet(dateKey: string): Promise<ContentLoadResult<CoreQuestion[]>>;
  loadBonusSet(
    topic: BonusTopic,
    setIndex: number,
  ): Promise<ContentLoadResult<BonusQuestion[]>>;
}
~~~

Use an injectable PackModuleRegistry in tests. createViteContentCatalog builds the registry with import.meta.glob("./core/*.json") and import.meta.glob("./bonus/*/*.json"). Do not use eager: true.

- [ ] **Step 4: Verify tests, typecheck, and web build**

Run: npm.cmd test -- --run src/content/content-catalog.test.ts

Run: npm.cmd run typecheck

Run: npm.cmd run build:web

Expected: all commands exit 0 and the test proves only one importer ran.

- [ ] **Step 5: Commit**

~~~bash
git add src/content/content-catalog.ts src/content/vite-content-catalog.ts src/content/content-catalog.test.ts src/vite-env.d.ts
git commit -m "feat: add lazy quiz content catalog"
~~~

### Task 3: Pack Validation and Authoring CLI

**Files:**

- Create: src/data/content-pack-validation.ts
- Create: src/data/content-pack-validation.test.ts
- Create: scripts/validate-content-pack.ts
- Create: scripts/validate-content-library.ts
- Create: scripts/validate-content-library.test.ts
- Create: src/content/fixtures/invalid-short-prompt.json
- Create: src/content/fixtures/invalid-similar-prompts.json
- Modify: package.json

**Interfaces:**

- Produces: validateContentPack(pack, descriptor): ContentValidationReport
- Produces: validateContentLibrary(manifest, packs): ContentValidationReport
- Produces issue codes: schema, count, date-range, set-range, difficulty-balance, answer-balance, duplicate-id, duplicate-prompt, similar-prompt, choice-duplicate, choice-length-outlier, answer-leak, negative-stack, concept-spacing, source-review, checksum

- [ ] **Step 1: Write failing validator tests**

~~~ts
it("유사 질문과 정답 길이 단서를 차단한다", () => {
  const report = validateContentPack(suspiciousPack, descriptor);
  expect(report.issues.map((issue) => issue.code)).toEqual(
    expect.arrayContaining(["similar-prompt", "choice-length-outlier"]),
  );
});

it("완전한 보너스 팩은 세트마다 난이도 세 개를 요구한다", () => {
  const report = validateContentPack(packWithDuplicateDifficulty, descriptor);
  expect(report.issues).toContainEqual(
    expect.objectContaining({ code: "difficulty-balance", scope: "digital:0" }),
  );
});
~~~

- [ ] **Step 2: Run tests and confirm RED**

Run: npm.cmd test -- --run src/data/content-pack-validation.test.ts scripts/validate-content-library.test.ts

Expected: FAIL because the new validator and CLIs do not exist.

- [ ] **Step 3: Implement hard checks and quality warnings**

Implement the exact thresholds from the design:

- prompt length below 14 non-space characters
- normalized answer substring of two or more characters in prompt
- one choice at least 1.8 times the other-choice average and at least 8 characters longer
- two or more negative-condition terms
- normalized character 3-gram Jaccard similarity at least 0.72
- same conceptId less than 30 set indexes apart

Use node:crypto SHA-256 in the CLI. The runtime catalog validates schema and counts; the CLI owns raw-file checksum validation.

`validate-content-pack.ts` accepts `--update-manifest`. It may update only the matching descriptor after the pack has zero hard issues and zero warnings, and writes `questionCount`, `setCount`, date/set range, `reviewStatus`, and SHA-256 checksum atomically. Add CLI tests proving an invalid pack leaves `manifest.json` byte-for-byte unchanged and a valid reviewed pack updates only its own descriptor.

- [ ] **Step 4: Add scripts and verify exit codes**

Add:

~~~json
{
  "validate:content:pack": "tsx scripts/validate-content-pack.ts",
  "validate:content:library": "tsx scripts/validate-content-library.ts"
}
~~~

Run: npm.cmd run validate:content:pack -- src/content/fixtures/invalid-short-prompt.json

Expected: non-zero with issue code short-prompt.

Run: npm.cmd test -- --run src/data/content-pack-validation.test.ts scripts/validate-content-library.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/data/content-pack-validation.ts src/data/content-pack-validation.test.ts scripts/validate-content-pack.ts scripts/validate-content-library.ts scripts/validate-content-library.test.ts src/content/fixtures package.json
git commit -m "feat: validate content packs and quality"
~~~

### Task 4: ProgressState V3 and Legacy Migration

**Files:**

- Modify: src/domain/progress-state.ts:41-73
- Modify: src/services/progress-repository.ts:25-230
- Test: src/services/progress-repository.test.ts
- Create: src/content/legacy-map.json

**Interfaces:**

- Produces: ProgressStateV2 as the current version 2 shape
- Produces: BonusTopicProgress { completedSetIndexes: number[]; lastCompletedDateKey?: string }
- Produces: ProgressState version 3 with bonusTopicProgress for all six topics
- Produces: migrateV2ToV3(progress: ProgressStateV2, legacyMap: LegacyQuestionMap): ProgressState
- Updates: ProgressLoadResult.fromVersion to 1 | 2

- [ ] **Step 1: Write failing migration tests**

~~~ts
it("완료된 기존 세 문제 전부가 매핑될 때만 새 세트를 완료 처리한다", () => {
  const migrated = migrateV2ToV3(
    v2ProgressWithCompletedIds(["old-a", "old-b", "old-c"]),
    {
      "old-a": { topic: "digital", setIndex: 0 },
      "old-b": { topic: "digital", setIndex: 0 },
      "old-c": { topic: "digital", setIndex: 0 },
    },
  );
  expect(migrated.bonusTopicProgress.digital.completedSetIndexes).toEqual([0]);
});

it("부분 매핑은 새 세트를 완료 처리하지 않는다", () => {
  const migrated = migrateV2ToV3(
    v2ProgressWithCompletedIds(["old-a", "old-b"]),
    {
      "old-a": { topic: "digital", setIndex: 0 },
      "old-b": { topic: "digital", setIndex: 0 },
      "old-c": { topic: "digital", setIndex: 0 },
    },
  );
  expect(migrated.bonusTopicProgress.digital.completedSetIndexes).toEqual([]);
});
~~~

- [ ] **Step 2: Run repository tests and confirm RED**

Run: npm.cmd test -- --run src/services/progress-repository.test.ts

Expected: FAIL because version 3 and migrateV2ToV3 do not exist.

- [ ] **Step 3: Implement V3 slots and normalization**

Add v3 slot keys geuttae-yojeum:progress:v3:a and geuttae-yojeum:progress:v3:b. Load valid V3 slots first, then V2 slots, then the V1 legacy key. Preserve unreadable raw values exactly as the current recovery contract does.

Do not persist nextSetIndex. The next index is always the smallest value in 0..179 not present in completedSetIndexes.

- [ ] **Step 4: Verify migration, corruption recovery, and size tests**

Run: npm.cmd test -- --run src/services/progress-repository.test.ts

Expected: PASS for V1, V2, V3, one-bad-slot recovery, and unrecoverable preservation.

- [ ] **Step 5: Commit**

~~~bash
git add src/domain/progress-state.ts src/services/progress-repository.ts src/services/progress-repository.test.ts src/content/legacy-map.json
git commit -m "feat: migrate quiz progress to version 3"
~~~

### Task 5: Topic Daily Cap and Atomic Bonus Sets

**Files:**

- Create: src/domain/bonus-progress.ts
- Create: src/domain/bonus-progress.test.ts
- Modify: src/domain/progress-commands.ts:35-260
- Modify: src/domain/progress-commands.test.ts
- Modify: src/services/progress-repository.ts:555-690
- Test: src/services/progress-repository.test.ts

**Interfaces:**

- Produces: resolveBonusSetAvailability(progress, topic, dateKey): BonusSetAvailability
- Produces: BonusSetAvailability = available | daily-limit | exhausted | active-session
- Changes: startBonusSessionCommand(state, commandId, dateKey, topic, setIndex, questions)
- Produces: completeBonusSetCommand(state, sessionKey, topic, setIndex, completedDateKey)
- Changes: ProgressRepository.startBonusSession accepts setIndex and exactly three questions
- Produces: ProgressRepository.completeBonusSet with serialized save

- [ ] **Step 1: Write failing policy tests**

~~~ts
it("같은 주제는 완료한 날 다시 열지 않고 다른 주제는 연다", () => {
  const progress = completedTopicProgress("digital", "2026-08-04", 0);
  expect(resolveBonusSetAvailability(progress, "digital", "2026-08-04"))
    .toEqual({ kind: "daily-limit" });
  expect(resolveBonusSetAvailability(progress, "language", "2026-08-04"))
    .toEqual({ kind: "available", setIndex: 0 });
});

it("완료되지 않은 세트 중 가장 작은 번호를 선택한다", () => {
  const progress = progressWithCompletedSets("digital", [0, 2]);
  expect(resolveBonusSetAvailability(progress, "digital", "2026-08-05"))
    .toEqual({ kind: "available", setIndex: 1 });
});
~~~

- [ ] **Step 2: Write failing atomic command tests**

Prove that daily-limit, active-session, set-mismatch, and no-questions return before unlockBonus. Prove duplicate commandId returns the original session and does not consume a second ticket. Prove completeBonusSetCommand adds one set index only after a completed session.

Run: npm.cmd test -- --run src/domain/bonus-progress.test.ts src/domain/progress-commands.test.ts

Expected: FAIL with missing functions and result reasons.

- [ ] **Step 3: Implement pure policy and commands**

~~~ts
export type BonusSetAvailability =
  | { kind: "available"; setIndex: number }
  | { kind: "daily-limit" }
  | { kind: "exhausted" }
  | { kind: "active-session"; sessionKey: string };
~~~

Require exactly three questions, one topic, one setIndex, and three distinct difficulty values before unlockBonus. Add setIndex to BonusStartCommandRecord.

- [ ] **Step 4: Serialize repository operations and verify**

Run: npm.cmd test -- --run src/domain/bonus-progress.test.ts src/domain/progress-commands.test.ts src/services/progress-repository.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/domain/bonus-progress.ts src/domain/bonus-progress.test.ts src/domain/progress-commands.ts src/domain/progress-commands.test.ts src/domain/progress-state.ts src/services/progress-repository.ts src/services/progress-repository.test.ts
git commit -m "feat: enforce daily bonus topic sets"
~~~

### Task 6: Author Six Core Content Packs

**Files:**

- Create: src/content/core/pack-001.json (2026-07-28..2026-08-26)
- Create: src/content/core/pack-002.json (2026-08-27..2026-09-25)
- Create: src/content/core/pack-003.json (2026-09-26..2026-10-25)
- Create: src/content/core/pack-004.json (2026-10-26..2026-11-24)
- Create: src/content/core/pack-005.json (2026-11-25..2026-12-24)
- Create: src/content/core/pack-006.json (2026-12-25..2027-01-23)
- Modify: src/content/manifest.json

**Interfaces:**

- Consumes: CoreContentPack and validate:content:pack
- Produces: 540 reviewed CoreQuestion records
- Guarantees: each date has then, now, life and gentle, steady, stretch exactly once

- [ ] **Step 1: Confirm the complete-library gate is RED**

Run: npm.cmd run validate:content:library

Expected: non-zero with six missing core pack descriptors or files.

- [ ] **Step 2: Author, validate, and commit pack-001**

Retain existing questions only when they pass the approved difficulty rules. Replace obvious-answer items with sourced recall, comparison, or situation questions. Every record must use a source that directly supports the answer and explanation.

Run: npm.cmd run validate:content:pack -- src/content/core/pack-001.json --update-manifest

Expected: 90 questions, 30 dates, 30 of each lens, 30 of each difficulty, balanced answer positions, zero unresolved warnings.

~~~bash
git add src/content/core/pack-001.json src/content/manifest.json
git commit -m "content: add core days 1 through 30"
~~~

- [ ] **Step 3: Author, validate, and commit pack-002**

Run: npm.cmd run validate:content:pack -- src/content/core/pack-002.json --update-manifest

Expected: 2026-08-27 through 2026-09-25, 90 reviewed questions, zero issues.

~~~bash
git add src/content/core/pack-002.json src/content/manifest.json
git commit -m "content: add core days 31 through 60"
~~~

- [ ] **Step 4: Author, validate, and commit pack-003**

Run: npm.cmd run validate:content:pack -- src/content/core/pack-003.json --update-manifest

Expected: 2026-09-26 through 2026-10-25, 90 reviewed questions, zero issues.

~~~bash
git add src/content/core/pack-003.json src/content/manifest.json
git commit -m "content: add core days 61 through 90"
~~~

- [ ] **Step 5: Author, validate, and commit pack-004**

Run: npm.cmd run validate:content:pack -- src/content/core/pack-004.json --update-manifest

Expected: 2026-10-26 through 2026-11-24, 90 reviewed questions, zero issues.

~~~bash
git add src/content/core/pack-004.json src/content/manifest.json
git commit -m "content: add core days 91 through 120"
~~~

- [ ] **Step 6: Author, validate, and commit pack-005**

Run: npm.cmd run validate:content:pack -- src/content/core/pack-005.json --update-manifest

Expected: 2026-11-25 through 2026-12-24, 90 reviewed questions, zero issues.

~~~bash
git add src/content/core/pack-005.json src/content/manifest.json
git commit -m "content: add core days 121 through 150"
~~~

- [ ] **Step 7: Author, validate, and commit pack-006**

Run: npm.cmd run validate:content:pack -- src/content/core/pack-006.json --update-manifest

Expected: 2026-12-25 through 2027-01-23, 90 reviewed questions, zero issues.

~~~bash
git add src/content/core/pack-006.json src/content/manifest.json
git commit -m "content: add core days 151 through 180"
~~~

- [ ] **Step 8: Run cross-pack core validation**

Run: npm.cmd run validate:content:library -- --scope core

Expected: 540 questions, 180 consecutive dates, no global duplicate or similarity warning.

### Task 7: Author Nostalgia Bonus Packs

**Files:**

- Create: src/content/bonus/nostalgia/pack-001.json through pack-006.json
- Modify: src/content/manifest.json

**Interfaces:**

- Produces: nostalgia setIndex 0..179, 540 reviewed questions
- Each file owns 30 consecutive set indexes: 0..29, 30..59, 60..89, 90..119, 120..149, 150..179

- [ ] **Step 1: Confirm nostalgia scope is RED**

Run: npm.cmd run validate:content:library -- --scope bonus:nostalgia

Expected: non-zero with missing-set coverage for 0..179.

- [ ] **Step 2: Produce six validated pack commits**

For each file, create 30 sets with one gentle, one steady, and one stretch question per set. Use distinct conceptId values or keep variants at least 30 set indexes apart.

Run and commit in this exact order:

~~~bash
npm.cmd run validate:content:pack -- src/content/bonus/nostalgia/pack-001.json --update-manifest
git add src/content/bonus/nostalgia/pack-001.json src/content/manifest.json
git commit -m "content: add nostalgia sets 1 through 30"
npm.cmd run validate:content:pack -- src/content/bonus/nostalgia/pack-002.json --update-manifest
git add src/content/bonus/nostalgia/pack-002.json src/content/manifest.json
git commit -m "content: add nostalgia sets 31 through 60"
npm.cmd run validate:content:pack -- src/content/bonus/nostalgia/pack-003.json --update-manifest
git add src/content/bonus/nostalgia/pack-003.json src/content/manifest.json
git commit -m "content: add nostalgia sets 61 through 90"
npm.cmd run validate:content:pack -- src/content/bonus/nostalgia/pack-004.json --update-manifest
git add src/content/bonus/nostalgia/pack-004.json src/content/manifest.json
git commit -m "content: add nostalgia sets 91 through 120"
npm.cmd run validate:content:pack -- src/content/bonus/nostalgia/pack-005.json --update-manifest
git add src/content/bonus/nostalgia/pack-005.json src/content/manifest.json
git commit -m "content: add nostalgia sets 121 through 150"
npm.cmd run validate:content:pack -- src/content/bonus/nostalgia/pack-006.json --update-manifest
git add src/content/bonus/nostalgia/pack-006.json src/content/manifest.json
git commit -m "content: add nostalgia sets 151 through 180"
~~~

- [ ] **Step 3: Verify the topic**

Run: npm.cmd run validate:content:library -- --scope bonus:nostalgia

Expected: 540 questions, 180 complete sets, 180 questions per difficulty, zero issues.

### Task 8: Author Korean Life Bonus Packs

**Files:**

- Create: src/content/bonus/korean-life/pack-001.json through pack-006.json
- Modify: src/content/manifest.json

**Interfaces:**

- Produces: korean-life setIndex 0..179, 540 reviewed questions

- [ ] **Step 1: Confirm the topic gate is RED**

Run: npm.cmd run validate:content:library -- --scope bonus:korean-life

Expected: non-zero with missing-set coverage.

- [ ] **Step 2: Produce six validated pack commits**

~~~bash
npm.cmd run validate:content:pack -- src/content/bonus/korean-life/pack-001.json --update-manifest
git add src/content/bonus/korean-life/pack-001.json src/content/manifest.json
git commit -m "content: add Korean life sets 1 through 30"
npm.cmd run validate:content:pack -- src/content/bonus/korean-life/pack-002.json --update-manifest
git add src/content/bonus/korean-life/pack-002.json src/content/manifest.json
git commit -m "content: add Korean life sets 31 through 60"
npm.cmd run validate:content:pack -- src/content/bonus/korean-life/pack-003.json --update-manifest
git add src/content/bonus/korean-life/pack-003.json src/content/manifest.json
git commit -m "content: add Korean life sets 61 through 90"
npm.cmd run validate:content:pack -- src/content/bonus/korean-life/pack-004.json --update-manifest
git add src/content/bonus/korean-life/pack-004.json src/content/manifest.json
git commit -m "content: add Korean life sets 91 through 120"
npm.cmd run validate:content:pack -- src/content/bonus/korean-life/pack-005.json --update-manifest
git add src/content/bonus/korean-life/pack-005.json src/content/manifest.json
git commit -m "content: add Korean life sets 121 through 150"
npm.cmd run validate:content:pack -- src/content/bonus/korean-life/pack-006.json --update-manifest
git add src/content/bonus/korean-life/pack-006.json src/content/manifest.json
git commit -m "content: add Korean life sets 151 through 180"
~~~

- [ ] **Step 3: Verify the topic**

Run: npm.cmd run validate:content:library -- --scope bonus:korean-life

Expected: 540 questions, 180 complete sets, zero issues.

### Task 9: Author Language Bonus Packs

**Files:**

- Create: src/content/bonus/language/pack-001.json through pack-006.json
- Modify: src/content/manifest.json

**Interfaces:**

- Produces: language setIndex 0..179, 540 reviewed questions

- [ ] **Step 1: Confirm the topic gate is RED**

Run: npm.cmd run validate:content:library -- --scope bonus:language

Expected: non-zero with missing-set coverage.

- [ ] **Step 2: Produce six validated pack commits**

~~~bash
npm.cmd run validate:content:pack -- src/content/bonus/language/pack-001.json --update-manifest
git add src/content/bonus/language/pack-001.json src/content/manifest.json
git commit -m "content: add language sets 1 through 30"
npm.cmd run validate:content:pack -- src/content/bonus/language/pack-002.json --update-manifest
git add src/content/bonus/language/pack-002.json src/content/manifest.json
git commit -m "content: add language sets 31 through 60"
npm.cmd run validate:content:pack -- src/content/bonus/language/pack-003.json --update-manifest
git add src/content/bonus/language/pack-003.json src/content/manifest.json
git commit -m "content: add language sets 61 through 90"
npm.cmd run validate:content:pack -- src/content/bonus/language/pack-004.json --update-manifest
git add src/content/bonus/language/pack-004.json src/content/manifest.json
git commit -m "content: add language sets 91 through 120"
npm.cmd run validate:content:pack -- src/content/bonus/language/pack-005.json --update-manifest
git add src/content/bonus/language/pack-005.json src/content/manifest.json
git commit -m "content: add language sets 121 through 150"
npm.cmd run validate:content:pack -- src/content/bonus/language/pack-006.json --update-manifest
git add src/content/bonus/language/pack-006.json src/content/manifest.json
git commit -m "content: add language sets 151 through 180"
~~~

- [ ] **Step 3: Verify the topic**

Run: npm.cmd run validate:content:library -- --scope bonus:language

Expected: 540 questions, 180 complete sets, zero issues.

### Task 10: Author Digital Bonus Packs

**Files:**

- Create: src/content/bonus/digital/pack-001.json through pack-006.json
- Modify: src/content/manifest.json

**Interfaces:**

- Produces: digital setIndex 0..179, 540 reviewed questions

- [ ] **Step 1: Confirm the topic gate is RED**

Run: npm.cmd run validate:content:library -- --scope bonus:digital

Expected: non-zero with missing-set coverage.

- [ ] **Step 2: Produce six validated pack commits**

~~~bash
npm.cmd run validate:content:pack -- src/content/bonus/digital/pack-001.json --update-manifest
git add src/content/bonus/digital/pack-001.json src/content/manifest.json
git commit -m "content: add digital sets 1 through 30"
npm.cmd run validate:content:pack -- src/content/bonus/digital/pack-002.json --update-manifest
git add src/content/bonus/digital/pack-002.json src/content/manifest.json
git commit -m "content: add digital sets 31 through 60"
npm.cmd run validate:content:pack -- src/content/bonus/digital/pack-003.json --update-manifest
git add src/content/bonus/digital/pack-003.json src/content/manifest.json
git commit -m "content: add digital sets 61 through 90"
npm.cmd run validate:content:pack -- src/content/bonus/digital/pack-004.json --update-manifest
git add src/content/bonus/digital/pack-004.json src/content/manifest.json
git commit -m "content: add digital sets 91 through 120"
npm.cmd run validate:content:pack -- src/content/bonus/digital/pack-005.json --update-manifest
git add src/content/bonus/digital/pack-005.json src/content/manifest.json
git commit -m "content: add digital sets 121 through 150"
npm.cmd run validate:content:pack -- src/content/bonus/digital/pack-006.json --update-manifest
git add src/content/bonus/digital/pack-006.json src/content/manifest.json
git commit -m "content: add digital sets 151 through 180"
~~~

- [ ] **Step 3: Verify the topic**

Run: npm.cmd run validate:content:library -- --scope bonus:digital

Expected: 540 questions, 180 complete sets, zero issues.

### Task 11: Author Safety Bonus Packs

**Files:**

- Create: src/content/bonus/safety/pack-001.json through pack-006.json
- Modify: src/content/manifest.json

**Interfaces:**

- Produces: safety setIndex 0..179, 540 reviewed questions

- [ ] **Step 1: Confirm the topic gate is RED**

Run: npm.cmd run validate:content:library -- --scope bonus:safety

Expected: non-zero with missing-set coverage.

- [ ] **Step 2: Produce six validated pack commits**

~~~bash
npm.cmd run validate:content:pack -- src/content/bonus/safety/pack-001.json --update-manifest
git add src/content/bonus/safety/pack-001.json src/content/manifest.json
git commit -m "content: add safety sets 1 through 30"
npm.cmd run validate:content:pack -- src/content/bonus/safety/pack-002.json --update-manifest
git add src/content/bonus/safety/pack-002.json src/content/manifest.json
git commit -m "content: add safety sets 31 through 60"
npm.cmd run validate:content:pack -- src/content/bonus/safety/pack-003.json --update-manifest
git add src/content/bonus/safety/pack-003.json src/content/manifest.json
git commit -m "content: add safety sets 61 through 90"
npm.cmd run validate:content:pack -- src/content/bonus/safety/pack-004.json --update-manifest
git add src/content/bonus/safety/pack-004.json src/content/manifest.json
git commit -m "content: add safety sets 91 through 120"
npm.cmd run validate:content:pack -- src/content/bonus/safety/pack-005.json --update-manifest
git add src/content/bonus/safety/pack-005.json src/content/manifest.json
git commit -m "content: add safety sets 121 through 150"
npm.cmd run validate:content:pack -- src/content/bonus/safety/pack-006.json --update-manifest
git add src/content/bonus/safety/pack-006.json src/content/manifest.json
git commit -m "content: add safety sets 151 through 180"
~~~

- [ ] **Step 3: Verify the topic**

Run: npm.cmd run validate:content:library -- --scope bonus:safety

Expected: 540 questions, 180 complete sets, zero issues.

### Task 12: Author Nature and General Knowledge Bonus Packs

**Files:**

- Create: src/content/bonus/nature-general/pack-001.json through pack-006.json
- Modify: src/content/manifest.json

**Interfaces:**

- Produces: nature-general setIndex 0..179, 540 reviewed questions

- [ ] **Step 1: Confirm the topic gate is RED**

Run: npm.cmd run validate:content:library -- --scope bonus:nature-general

Expected: non-zero with missing-set coverage.

- [ ] **Step 2: Produce six validated pack commits**

~~~bash
npm.cmd run validate:content:pack -- src/content/bonus/nature-general/pack-001.json --update-manifest
git add src/content/bonus/nature-general/pack-001.json src/content/manifest.json
git commit -m "content: add nature sets 1 through 30"
npm.cmd run validate:content:pack -- src/content/bonus/nature-general/pack-002.json --update-manifest
git add src/content/bonus/nature-general/pack-002.json src/content/manifest.json
git commit -m "content: add nature sets 31 through 60"
npm.cmd run validate:content:pack -- src/content/bonus/nature-general/pack-003.json --update-manifest
git add src/content/bonus/nature-general/pack-003.json src/content/manifest.json
git commit -m "content: add nature sets 61 through 90"
npm.cmd run validate:content:pack -- src/content/bonus/nature-general/pack-004.json --update-manifest
git add src/content/bonus/nature-general/pack-004.json src/content/manifest.json
git commit -m "content: add nature sets 91 through 120"
npm.cmd run validate:content:pack -- src/content/bonus/nature-general/pack-005.json --update-manifest
git add src/content/bonus/nature-general/pack-005.json src/content/manifest.json
git commit -m "content: add nature sets 121 through 150"
npm.cmd run validate:content:pack -- src/content/bonus/nature-general/pack-006.json --update-manifest
git add src/content/bonus/nature-general/pack-006.json src/content/manifest.json
git commit -m "content: add nature sets 151 through 180"
~~~

- [ ] **Step 3: Verify the topic**

Run: npm.cmd run validate:content:library -- --scope bonus:nature-general

Expected: 540 questions, 180 complete sets, zero issues.

### Task 13: Global Audit and Legacy Mapping

**Files:**

- Create: scripts/build-legacy-map.ts
- Create: scripts/build-legacy-map.test.ts
- Modify: src/content/legacy-map.json
- Modify: src/content/manifest.json
- Test: src/data/content-pack-validation.test.ts

**Interfaces:**

- Consumes: legacy coreQuestions and bonusQuestions exports, all 42 reviewed packs
- Produces: LegacyQuestionMap keyed by old bonus question ID
- Produces: a complete manifest with SHA-256 for 42 packs

- [ ] **Step 1: Write the failing legacy mapping tests**

~~~ts
it("세 문제 전부가 같은 새 세트에 있을 때만 완전한 legacy 세트로 기록한다", () => {
  const result = buildLegacyMap(oldQuestions, newQuestions);
  expect(result.completeSets).toContainEqual({
    topic: "digital",
    setIndex: 0,
    legacyQuestionIds: ["bonus-digital-1", "bonus-digital-2", "bonus-digital-3"],
  });
  expect(result.partialMappings).toEqual([]);
});
~~~

- [ ] **Step 2: Run tests and confirm RED**

Run: npm.cmd test -- --run scripts/build-legacy-map.test.ts

Expected: FAIL because buildLegacyMap does not exist.

- [ ] **Step 3: Implement explicit mapping generation**

Match by retained question ID only. Do not infer mappings from prompt similarity. Emit partial and unmapped IDs as audit output; only complete groups of three can migrate a completed set.

Run: npm.cmd test -- --run scripts/build-legacy-map.test.ts

Expected: PASS.

- [ ] **Step 4: Run the full 3,780-question audit**

Run: npm.cmd run validate:content:library

Expected:

- coreCount 540
- bonusCount 3240
- totalCount 3780
- packCount 42
- six topics with 180 complete sets each
- zero hard issues
- zero unresolved quality warnings
- every descriptor checksum matches its file

- [ ] **Step 5: Generate the reviewed legacy map and commit**

Run: npm.cmd exec tsx scripts/build-legacy-map.ts

Run: npm.cmd run validate:content:library

~~~bash
git add scripts/build-legacy-map.ts scripts/build-legacy-map.test.ts src/content/legacy-map.json src/content/manifest.json
git commit -m "content: finalize 180-day library audit"
~~~

### Task 14: Wire Content Catalog and V3 Progress into QuizApp

**Files:**

- Modify: src/App.tsx:64-1275
- Modify: src/App.test.tsx
- Modify: src/main.tsx
- Modify: src/services/progress-repository.ts
- Test: src/content/content-catalog.test.ts

**Interfaces:**

- Consumes: ContentCatalog, ProgressRepository V3, resolveBonusSetAvailability
- Changes: QuizAppProps replaces coreQuestions and bonusQuestions with contentCatalog
- Produces: ContentStatus = idle | loading | ready | error
- Produces: retryCoreContent() and retryBonusContent(topic)

- [ ] **Step 1: Write failing core loading tests**

~~~ts
it("오늘 팩 로드가 끝난 뒤 기본 퀴즈를 시작한다", async () => {
  const catalog = controlledCatalog();
  render(<QuizApp contentCatalog={catalog} now={launchDate} />);

  await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));
  expect(screen.getByRole("status")).toHaveTextContent("문제를 준비하고 있어요");

  catalog.resolveCore(coreQuestions);
  expect(await screen.findByText("1 / 3")).toBeInTheDocument();
});

it("기본 팩 실패 시 다른 날짜 문제 없이 재시도한다", async () => {
  const catalog = failingCoreCatalog();
  render(<QuizApp contentCatalog={catalog} now={launchDate} />);

  await user.click(screen.getByRole("button", { name: "오늘의 3문제 시작" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "오늘 문제를 불러오지 못했어요",
  );
  expect(screen.queryByText("1 / 3")).not.toBeInTheDocument();
});
~~~

- [ ] **Step 2: Write failing bonus entitlement tests**

Prove the app calls loadBonusSet before rewardAd.show or repository.startBonusSession. Prove missing-pack, daily-limit, and exhausted states never call either method. Prove a retry loads the same topic and setIndex.

Run: npm.cmd test -- --run src/App.test.tsx

Expected: FAIL because QuizApp still consumes eager arrays.

- [ ] **Step 3: Replace eager arrays with ContentCatalog**

~~~ts
interface QuizAppProps {
  now?: Date;
  timeProvider?: TimeProvider;
  contentCatalog: ContentCatalog;
  repository?: ProgressRepository;
  rewardAd?: RewardAdGateway;
  shareGateway?: QuizShareGateway;
  analytics?: AnalyticsGateway;
}
~~~

Load the core set on start or restore. Load a bonus set only after resolveBonusSetAvailability returns available and before any unlock action. Keep the selected ContentLoadResult in component state so retry cannot switch topic or set index.

- [ ] **Step 4: Complete bonus sets through the repository**

Replace the manual completedBonusIds snapshot update in handleBonusNext with ProgressRepository.completeBonusSet. Keep resultSession as the source for visible score, sharing, and result_view.

Run: npm.cmd test -- --run src/App.test.tsx src/services/progress-repository.test.ts

Expected: PASS.

- [ ] **Step 5: Wire the production catalog and commit**

Create one ViteContentCatalog in main.tsx and inject it into QuizApp.

Run: npm.cmd run typecheck

Run: npm.cmd run build:web

~~~bash
git add src/App.tsx src/App.test.tsx src/main.tsx src/services/progress-repository.ts src/services/progress-repository.test.ts
git commit -m "feat: load quiz content packs on demand"
~~~

### Task 15: Daily Topic UI, Analytics, and Legacy Removal

**Files:**

- Modify: src/App.tsx:399-495
- Modify: src/App.css
- Modify: src/App.test.tsx
- Modify: src/services/analytics.ts
- Modify: src/data/questions.ts
- Modify: src/data/questions.test.ts

**Interfaces:**

- Consumes: BonusSetAvailability for all six topics
- Produces events bonus_topic_daily_complete, bonus_topic_daily_locked, content_pack_load_failed
- Preserves: result score, rewarded ad, ticket, share, persistence copy

- [ ] **Step 1: Write failing topic state tests**

~~~ts
it("완료한 주제만 오늘 완료로 잠그고 다른 주제는 연다", async () => {
  renderCompletedDigitalBonusResult();
  await user.click(screen.getByRole("button", {
    name: "원하는 주제로 보너스 3문제",
  }));

  expect(screen.getByRole("button", { name: "디지털 생활 오늘 완료" }))
    .toBeDisabled();
  expect(screen.getByRole("button", { name: "말·속담·맞춤법" }))
    .toBeEnabled();
});
~~~

- [ ] **Step 2: Write failing analytics tests**

Assert exact property allowlists:

- bonus_topic_daily_complete: topic, setIndex, score
- bonus_topic_daily_locked: topic, reason
- content_pack_load_failed: packType, packId, reasonCode

Assert prompt, choices, source URL, free text, phone, and ad identifiers never appear.

Run: npm.cmd test -- --run src/App.test.tsx

Expected: FAIL because the UI and events do not exist.

- [ ] **Step 3: Implement accessible topic states and error copy**

Use disabled buttons with an accessible name containing 오늘 완료. Show 새 문제를 준비하고 있어요 for exhausted and 문제를 다시 불러와 주세요 for load errors. Do not expose gentle, steady, or stretch labels.

- [ ] **Step 4: Disconnect legacy eager content**

Move every test fixture to `createInMemoryContentCatalog`, remove every production import of the expanded TypeScript modules, and keep the now-unreferenced files until Task 16 switches the release validator. Keep legacy-map.json as the sole migration bridge.

Run: npm.cmd test -- --run src/App.test.tsx src/data/questions.test.ts

Expected: PASS and no production import references either expanded content module.

- [ ] **Step 5: Commit**

~~~bash
git add src/App.tsx src/App.css src/App.test.tsx src/services/analytics.ts src/data/questions.ts src/data/questions.test.ts src/content/legacy-map.json
git commit -m "feat: show daily bonus topic availability"
~~~

### Task 16: E2E, Lazy-Bundle Gate, and Release Candidate

**Files:**

- Create: scripts/check-content-chunks.mjs
- Create: scripts/check-content-chunks.test.ts
- Modify: vite.config.ts
- Modify: package.json
- Modify: tests/e2e/support/quiz-flow.ts
- Modify: tests/e2e/bonus-flow.spec.ts
- Modify: tests/e2e/resilience.spec.ts
- Modify: tests/e2e/visual-regression.spec.ts
- Modify: .github/workflows/release-gate.yml
- Modify: scripts/validate-content.ts
- Modify: src/data/content-validation.ts
- Delete: src/data/core-questions-august.ts
- Delete: src/data/bonus-questions-expanded.ts

**Interfaces:**

- Produces: check:content-chunks command
- Changes: validate:content to require the complete 42-pack release contract
- Produces: CI artifacts for library validation log and final .ait

- [ ] **Step 1: Write failing E2E scenarios**

Add scenarios for:

- complete digital set, return to topics, digital is disabled and language is enabled
- advance KST date, digital opens setIndex 1
- refresh after completion, daily lock remains
- inject a failing bonus importer, retry appears and rewarded ad is not requested
- exhaust topic fixture, exhausted copy appears without cross-topic fallback

Run: npm.cmd run test:e2e:chromium

Expected: FAIL on the new daily-cap and load-error assertions.

- [ ] **Step 2: Make E2E fixtures deterministic and pass**

Inject InMemoryContentCatalog fixtures through the existing E2E bootstrap rather than intercepting arbitrary network requests. Update screenshots only for the approved 오늘 완료 and load-error states.

Run: npm.cmd run test:e2e:chromium

Run: npm.cmd run test:e2e:webkit

Expected: PASS.

- [ ] **Step 3: Write and verify the lazy-chunk gate**

Set build.manifest to true in vite.config.ts. check-content-chunks.mjs reads dist/.vite/manifest.json and verifies:

- all 42 content pack modules exist as dynamic entries
- the main entry does not statically import those entries
- the manifest JSON is included
- no old expanded TypeScript content module is bundled

Run: npm.cmd run build:web

Run: npm.cmd run check:content-chunks

Expected: PASS.

- [ ] **Step 4: Make the complete library part of verify:quality**

Set validate:content to tsx scripts/validate-content-library.ts, then delete the two unreferenced expanded TypeScript content modules. Add check:content-chunks after build:web in the release-build job. Upload content-validation-${{ github.sha }}.log even on failure.

Run: npm.cmd run verify:quality

Expected: lint, typecheck, 3,780-question validation, and all Vitest suites pass.

- [ ] **Step 5: Build the actual Apps in Toss artifact**

Run: npm.cmd run build

Expected: Vite build succeeds and geuttae-yojeum.ait is created.

Run: npm.cmd audit --omit=dev

Expected: zero production vulnerabilities.

- [ ] **Step 6: Final diff and release commit**

Run: git diff --check

Run: git status --short

Run: npm.cmd run verify:release

Expected: all Chromium, WebKit, unit, content, type, lint, and .ait build gates pass.

~~~bash
git add .github/workflows/release-gate.yml package.json vite.config.ts scripts src tests
git commit -m "feat: activate 180-day quiz content"
~~~

## Final Acceptance Checklist

- [ ] manifest reports 42 reviewed packs and matching SHA-256 values
- [ ] core library has 540 questions over 180 consecutive dates
- [ ] bonus library has 3,240 questions and 180 sets per topic
- [ ] all daily and bonus sets contain one question per difficulty
- [ ] no unresolved duplicate, similarity, answer-leak, source, or review warning
- [ ] V1 and V2 progress migrate to V3 without raw-data loss
- [ ] same-topic daily replay is blocked before entitlement consumption
- [ ] other topics remain available on the same day
- [ ] missing or exhausted packs never cross-fallback
- [ ] App, sharing, and analytics use the same result score
- [ ] initial entry does not eager-load all content packs
- [ ] verify:release and production audit pass
- [ ] only the CI artifact from the final main commit is uploaded to Apps in Toss
