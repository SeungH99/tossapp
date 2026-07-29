# 그때·요즘 E9 Release Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 콘텐츠·브라우저·접근성·Apps in Toss 빌드를 같은 명령으로 검증하고, 네 개의 필수 GitHub 검사와 샌드박스 실기기 체크리스트로 출시 후보를 차단하거나 승인한다.

**Architecture:** 순수 함수 `validateBundledContent()`를 Vitest와 CLI가 공유하고, Playwright가 고정된 서울 시간과 네 개의 브라우저/viewport 프로젝트에서 실제 Vite 앱을 검증한다. 로컬 `verify:release`는 전체 계약을 순서대로 실행하고, GitHub Actions는 동일한 하위 명령을 `quality`, `e2e-chromium`, `e2e-webkit`, `release-build` 네 작업으로 병렬 실행한다.

**Tech Stack:** React 18, TypeScript 5.7, Vitest 3, Apps in Toss Web Framework 2.10, Node 24, npm, `tsx` 4.23.1, Playwright Test 1.62.0, `@axe-core/playwright` 4.12.1, GitHub Actions.

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-07-29-geuttae-yojeum-release-gate-design.md`다.
- Node는 로컬 기준과 같은 major인 `24`로 고정하고 모든 설치는 `package-lock.json`과 `npm ci`를 사용한다.
- 출시 데이터는 핵심 `2026-07-28`~`2026-08-26` 30일 × 세 렌즈 = 90문제, 보너스 여섯 주제 × 15문제 = 90문제다.
- 기존 15개 테스트 파일의 115개 테스트는 모두 계속 통과해야 하며 새 테스트는 그 위에 추가한다.
- 사용자에게 보이는 화면·카피·퀴즈 규칙·광고 정책은 바꾸지 않는다. 답 선택 상태를 전달하는 `aria-pressed` 추가만 허용한다.
- Playwright 행렬은 `chromium-360`, `chromium-390`, `webkit-360`, `webkit-390` 네 프로젝트다.
- viewport 높이는 각각 800px와 844px, locale은 `ko-KR`, timezone은 `Asia/Seoul`, 앱 시간은 `2026-07-29T03:00:00.000Z`로 고정한다.
- axe의 `critical`과 `serious` 위반은 0개여야 한다.
- 200% 텍스트 검증은 계산된 글자 크기만 정확히 2배로 만들며 페이지 전체 확대를 사용하지 않는다.
- 시각 기준선은 홈·해설·결과·보너스 제안 네 화면만 커밋한다.
- CI와 로컬 브라우저 테스트는 테스트 광고 ID `ait-ad-test-rewarded-id`만 사용한다.
- 운영 광고 ID, 인증서, 토큰, 사용자 식별 정보는 저장소·로그·trace·artifact에 기록하지 않는다.
- CI는 `.ait`를 Apps in Toss 콘솔에 자동 업로드하지 않으며 artifact 보관 기간은 7일이다.
- `npm audit fix`와 `npm audit fix --force`는 실행하지 않는다. 기존 의존성 취약점은 별도 보안 작업으로 남긴다.
- 알림·리마인더와 Analytics outbox는 E9 범위 밖이다.

## File Structure

| 파일                                             | 책임                                                         |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `src/data/content-validation.ts`                 | 출시 데이터 상수, 구조화 오류 타입, 모든 콘텐츠 검증 규칙    |
| `src/data/content-validation.test.ts`            | 정상 번들과 깨진 고정 fixture의 validator 단위 테스트        |
| `src/data/questions.test.ts`                     | 실제 번들이 공유 출시 계약을 통과하는 통합 테스트            |
| `scripts/validate-content.ts`                    | 실제 번들 검증 CLI, 사람이 읽을 수 있는 출력과 종료 코드     |
| `scripts/validate-content.test.ts`               | CLI formatter와 성공/실패 종료 코드 테스트                   |
| `playwright.config.ts`                           | 네 브라우저 프로젝트, Vite webServer, artifact·snapshot 정책 |
| `tests/e2e/support/quiz-flow.ts`                 | 고정 시간 부팅과 핵심·보너스 퀴즈 진행 helper                |
| `tests/e2e/support/accessibility.ts`             | axe 실행과 blocking impact 필터                              |
| `tests/e2e/support/layout.ts`                    | 200% 텍스트 주입과 overflow 진단                             |
| `tests/e2e/smoke.spec.ts`                        | Playwright 연결과 고정 날짜 smoke test                       |
| `tests/e2e/core-flow.spec.ts`                    | 핵심 3문제, 해설, 결과 여정                                  |
| `tests/e2e/bonus-flow.spec.ts`                   | 첫 무료 보너스 선택과 3문제 여정                             |
| `tests/e2e/resilience.spec.ts`                   | reload 복원, 공유 clipboard fallback, 손상 저장소 보존       |
| `tests/e2e/keyboard.spec.ts`                     | 마우스 없는 전체 핵심 퀴즈 여정과 포커스 표시                |
| `tests/e2e/accessibility.spec.ts`                | 홈·해설·결과·보너스 제안 axe 검사                            |
| `tests/e2e/responsive.spec.ts`                   | 200% 텍스트에서 주요 네 화면 overflow 검사                   |
| `tests/e2e/visual-regression.spec.ts`            | 안정화한 네 화면 screenshot 비교                             |
| `tests/e2e/__screenshots__/`                     | 네 프로젝트별 커밋된 시각 기준선 16개                        |
| `src/App.tsx`                                    | 답 선택 버튼에 비시각적 `aria-pressed` 상태 제공             |
| `package.json`, `package-lock.json`              | 고정 dev dependency와 검증 스크립트                          |
| `tsconfig.node.json`                             | scripts·Playwright 파일까지 strict typecheck                 |
| `eslint.config.js`                               | Node와 브라우저가 함께 필요한 검증 파일의 globals            |
| `.gitignore`                                     | 로컬 Playwright 보고서와 실행 결과 제외                      |
| `.github/workflows/release-gate.yml`             | 네 개 병합 필수 검사와 artifact 업로드                       |
| `docs/release/apps-in-toss-sandbox-checklist.md` | 콘솔·광고·Storage·Analytics·QR 실기기 수동 게이트            |
| `README.md`                                      | 로컬 출시 명령과 수동 게이트 진입점                          |

---

### Task 1: 공유 콘텐츠 계약과 CLI

**Files:**

- Create: `src/data/content-validation.ts`
- Create: `src/data/content-validation.test.ts`
- Create: `scripts/validate-content.ts`
- Create: `scripts/validate-content.test.ts`
- Modify: `src/data/questions.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.node.json`
- Modify: `eslint.config.js`

**Interfaces:**

- Consumes: `CoreQuestion`, `BonusQuestion`, `CoreLens`, `BonusTopic`, `Question`, `validateQuestion`, `coreQuestions`, `bonusQuestions`.
- Produces:

```ts
export const RELEASE_DATE_KEYS: readonly string[];
export const RELEASE_CORE_LENSES: readonly CoreLens[];
export const RELEASE_BONUS_TOPICS: readonly BonusTopic[];

export type ContentValidationCode =
  | "question-schema"
  | "duplicate-id"
  | "duplicate-prompt"
  | "core-count"
  | "core-date-range"
  | "core-date-lens-count"
  | "bonus-count"
  | "bonus-topic-count"
  | "answer-balance";

export interface ContentValidationIssue {
  code: ContentValidationCode;
  scope: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
}

export interface ContentValidationReport {
  coreCount: number;
  bonusCount: number;
  issues: ContentValidationIssue[];
}

export function validateBundledContent(
  core: readonly CoreQuestion[],
  bonus: readonly BonusQuestion[],
): ContentValidationReport;

export function printContentValidationReport(
  report: ContentValidationReport,
  writeLine?: (line: string) => void,
): 0 | 1;
```

- Later tasks rely on: `npm run validate:content` returning `0` only when `issues.length === 0`.

- [ ] **Step 1: Install the TypeScript CLI runner at an exact version**

Run:

```powershell
npm.cmd install --save-dev --save-exact tsx@4.23.1
```

Expected: `package.json` contains `"tsx": "4.23.1"` and the lock file changes only for this dependency graph.

- [ ] **Step 2: Write failing validator tests**

Create `src/data/content-validation.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { bonusQuestions, coreQuestions } from "./questions";
import { validateBundledContent } from "./content-validation";

describe("validateBundledContent", () => {
  it("accepts the bundled 90 core and 90 bonus questions", () => {
    expect(validateBundledContent(coreQuestions, bonusQuestions)).toEqual({
      coreCount: 90,
      bonusCount: 90,
      issues: [],
    });
  });

  it("returns every release-contract error from one broken fixture", () => {
    const brokenCore = coreQuestions.map((question) => ({ ...question }));
    brokenCore[0] = {
      ...brokenCore[0],
      id: brokenCore[1].id,
      prompt: bonusQuestions[0].prompt,
      dateKey: "2026-08-27",
    };
    const brokenBonus = bonusQuestions.slice(0, -1);

    const report = validateBundledContent(brokenCore, brokenBonus);
    const codes = report.issues.map((issue) => issue.code);

    expect(codes).toEqual(
      expect.arrayContaining([
        "duplicate-id",
        "duplicate-prompt",
        "core-date-range",
        "core-date-lens-count",
        "bonus-count",
        "bonus-topic-count",
      ]),
    );
    expect(report.issues.every((issue) => issue.scope.length > 0)).toBe(true);
    expect(report.issues.every((issue) => issue.message.length > 0)).toBe(true);
  });
});
```

Create `scripts/validate-content.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { ContentValidationReport } from "../src/data/content-validation";
import { printContentValidationReport } from "./validate-content";

describe("printContentValidationReport", () => {
  it("prints counts and returns zero for a valid report", () => {
    const lines: string[] = [];
    const code = printContentValidationReport(
      { coreCount: 90, bonusCount: 90, issues: [] },
      (line) => lines.push(line),
    );

    expect(code).toBe(0);
    expect(lines).toEqual(["콘텐츠 검증 통과: 핵심 90개, 보너스 90개"]);
  });

  it("prints structured failures and returns one", () => {
    const report: ContentValidationReport = {
      coreCount: 89,
      bonusCount: 90,
      issues: [
        {
          code: "core-count",
          scope: "core",
          message: "핵심 문제 수가 출시 계약과 다릅니다.",
          expected: 90,
          actual: 89,
        },
      ],
    };
    const lines: string[] = [];

    expect(
      printContentValidationReport(report, (line) => lines.push(line)),
    ).toBe(1);
    expect(lines).toEqual([
      "[core-count] core: 핵심 문제 수가 출시 계약과 다릅니다. (expected=90, actual=89)",
      "콘텐츠 검증 실패: 1개 위반",
    ]);
  });
});
```

- [ ] **Step 3: Run the tests and verify the new public interfaces are missing**

Run:

```powershell
npm.cmd run test:run -- src/data/content-validation.test.ts scripts/validate-content.test.ts
```

Expected: FAIL because `src/data/content-validation.ts` and `scripts/validate-content.ts` do not exist.

- [ ] **Step 4: Implement the shared release validator**

Create `src/data/content-validation.ts` with these exact constants and rules:

```ts
import {
  type BonusQuestion,
  type BonusTopic,
  type CoreLens,
  type CoreQuestion,
  type Question,
  validateQuestion,
} from "../domain/question";

const DAY_MS = 24 * 60 * 60 * 1000;
const RELEASE_START_UTC = Date.UTC(2026, 6, 28);

export const RELEASE_DATE_KEYS = Array.from({ length: 30 }, (_, index) =>
  new Date(RELEASE_START_UTC + index * DAY_MS).toISOString().slice(0, 10),
);
export const RELEASE_CORE_LENSES = [
  "then",
  "now",
  "life",
] as const satisfies readonly CoreLens[];
export const RELEASE_BONUS_TOPICS = [
  "nostalgia",
  "korean-life",
  "language",
  "digital",
  "safety",
  "nature-general",
] as const satisfies readonly BonusTopic[];

export type ContentValidationCode =
  | "question-schema"
  | "duplicate-id"
  | "duplicate-prompt"
  | "core-count"
  | "core-date-range"
  | "core-date-lens-count"
  | "bonus-count"
  | "bonus-topic-count"
  | "answer-balance";

export interface ContentValidationIssue {
  code: ContentValidationCode;
  scope: string;
  message: string;
  expected?: string | number;
  actual?: string | number;
}

export interface ContentValidationReport {
  coreCount: number;
  bonusCount: number;
  issues: ContentValidationIssue[];
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ").toLocaleLowerCase("ko-KR");
}

function addDuplicateIssues(
  questions: readonly Question[],
  issues: ContentValidationIssue[],
): void {
  const ids = new Map<string, string>();
  const prompts = new Map<string, string>();

  for (const question of questions) {
    const priorId = ids.get(question.id);
    if (priorId != null) {
      issues.push({
        code: "duplicate-id",
        scope: `question:${question.id}`,
        message: `문제 ID가 ${priorId}와 중복됩니다.`,
      });
    } else {
      ids.set(question.id, question.id);
    }

    const normalized = normalizePrompt(question.prompt);
    const priorPromptId = prompts.get(normalized);
    if (priorPromptId != null) {
      issues.push({
        code: "duplicate-prompt",
        scope: `question:${question.id}`,
        message: `질문 문장이 ${priorPromptId}와 중복됩니다.`,
      });
    } else {
      prompts.set(normalized, question.id);
    }
  }
}

function addAnswerBalanceIssue(
  scope: "core" | "bonus",
  questions: readonly Question[],
  issues: ContentValidationIssue[],
): void {
  const counts = [0, 1, 2].map(
    (answerIndex) =>
      questions.filter((question) => question.answerIndex === answerIndex)
        .length,
  );
  const spread = Math.max(...counts) - Math.min(...counts);

  if (spread > 2) {
    issues.push({
      code: "answer-balance",
      scope,
      message: "정답 위치의 최대·최소 개수 차이가 2를 초과합니다.",
      expected: "<=2",
      actual: `${counts[0]},${counts[1]},${counts[2]}`,
    });
  }
}

export function validateBundledContent(
  core: readonly CoreQuestion[],
  bonus: readonly BonusQuestion[],
): ContentValidationReport {
  const issues: ContentValidationIssue[] = [];
  const allQuestions: readonly Question[] = [...core, ...bonus];

  for (const [index, question] of allQuestions.entries()) {
    for (const field of validateQuestion(question)) {
      issues.push({
        code: "question-schema",
        scope: `question:${question.id || index}`,
        message: `필수 필드가 유효하지 않습니다: ${field}`,
      });
    }
  }

  if (core.length !== 90) {
    issues.push({
      code: "core-count",
      scope: "core",
      message: "핵심 문제 수가 출시 계약과 다릅니다.",
      expected: 90,
      actual: core.length,
    });
  }
  if (bonus.length !== 90) {
    issues.push({
      code: "bonus-count",
      scope: "bonus",
      message: "보너스 문제 수가 출시 계약과 다릅니다.",
      expected: 90,
      actual: bonus.length,
    });
  }

  const releaseDateSet = new Set(RELEASE_DATE_KEYS);
  for (const question of core) {
    if (!releaseDateSet.has(question.dateKey)) {
      issues.push({
        code: "core-date-range",
        scope: `question:${question.id}`,
        message: "핵심 문제 날짜가 출시 30일 범위 밖입니다.",
        expected: `${RELEASE_DATE_KEYS[0]}..${RELEASE_DATE_KEYS.at(-1)}`,
        actual: question.dateKey,
      });
    }
  }

  for (const dateKey of RELEASE_DATE_KEYS) {
    for (const lens of RELEASE_CORE_LENSES) {
      const count = core.filter(
        (question) => question.dateKey === dateKey && question.lens === lens,
      ).length;
      if (count !== 1) {
        issues.push({
          code: "core-date-lens-count",
          scope: `core:${dateKey}:${lens}`,
          message: "날짜·렌즈 조합은 정확히 한 문제여야 합니다.",
          expected: 1,
          actual: count,
        });
      }
    }
  }

  for (const topic of RELEASE_BONUS_TOPICS) {
    const count = bonus.filter((question) => question.topic === topic).length;
    if (count !== 15) {
      issues.push({
        code: "bonus-topic-count",
        scope: `bonus:${topic}`,
        message: "보너스 주제는 정확히 15문제여야 합니다.",
        expected: 15,
        actual: count,
      });
    }
  }

  addDuplicateIssues(allQuestions, issues);
  addAnswerBalanceIssue("core", core, issues);
  addAnswerBalanceIssue("bonus", bonus, issues);

  return { coreCount: core.length, bonusCount: bonus.length, issues };
}
```

- [ ] **Step 5: Implement the CLI and deterministic exit code**

Create `scripts/validate-content.ts`:

```ts
import { pathToFileURL } from "node:url";

import {
  type ContentValidationIssue,
  type ContentValidationReport,
  validateBundledContent,
} from "../src/data/content-validation";
import { bonusQuestions, coreQuestions } from "../src/data/questions";

function formatIssue(issue: ContentValidationIssue): string {
  const values =
    issue.expected == null && issue.actual == null
      ? ""
      : ` (expected=${String(issue.expected)}, actual=${String(issue.actual)})`;
  return `[${issue.code}] ${issue.scope}: ${issue.message}${values}`;
}

export function printContentValidationReport(
  report: ContentValidationReport,
  writeLine: (line: string) => void = console.log,
): 0 | 1 {
  if (report.issues.length === 0) {
    writeLine(
      `콘텐츠 검증 통과: 핵심 ${report.coreCount}개, 보너스 ${report.bonusCount}개`,
    );
    return 0;
  }

  for (const issue of report.issues) {
    writeLine(formatIssue(issue));
  }
  writeLine(`콘텐츠 검증 실패: ${report.issues.length}개 위반`);
  return 1;
}

export function main(): 0 | 1 {
  return printContentValidationReport(
    validateBundledContent(coreQuestions, bonusQuestions),
  );
}

if (
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  process.exitCode = main();
}
```

Add the package script:

```json
"validate:content": "tsx scripts/validate-content.ts"
```

Extend `tsconfig.node.json`:

```json
"include": [
  "vite.config.ts",
  "granite.config.ts",
  "scripts/**/*.ts"
]
```

Add a final flat ESLint config block:

```js
{
  files: ["scripts/**/*.ts"],
  languageOptions: {
    globals: globals.node,
  },
},
```

- [ ] **Step 6: Replace duplicated bundle assertions with the shared report**

In `src/data/questions.test.ts`, retain the kind-discrimination test and replace the local release date/topic/duplicate/balance assertions with:

```ts
import {
  RELEASE_BONUS_TOPICS,
  RELEASE_CORE_LENSES,
  RELEASE_DATE_KEYS,
  validateBundledContent,
} from "./content-validation";

it("공유 출시 계약이 실제 번들 전체를 승인한다", () => {
  expect(RELEASE_DATE_KEYS).toHaveLength(30);
  expect(RELEASE_CORE_LENSES).toEqual(["then", "now", "life"]);
  expect(RELEASE_BONUS_TOPICS).toEqual([
    "nostalgia",
    "korean-life",
    "language",
    "digital",
    "safety",
    "nature-general",
  ]);
  expect(validateBundledContent(coreQuestions, bonusQuestions)).toEqual({
    coreCount: 90,
    bonusCount: 90,
    issues: [],
  });
});
```

The new `content-validation.test.ts` owns the broken fixture coverage; `questions.test.ts` owns only actual bundle integration.

- [ ] **Step 7: Run the content contract and all static/unit checks**

Run:

```powershell
npm.cmd run validate:content
npm.cmd run test:run
npm.cmd run typecheck
npm.cmd run lint
```

Expected:

```text
콘텐츠 검증 통과: 핵심 90개, 보너스 90개
```

Vitest reports all existing 115 tests plus the new validator/CLI tests as passing. Typecheck and lint exit 0.

- [ ] **Step 8: Commit the content gate**

```powershell
git add package.json package-lock.json tsconfig.node.json eslint.config.js src/data/content-validation.ts src/data/content-validation.test.ts src/data/questions.test.ts scripts/validate-content.ts scripts/validate-content.test.ts
git commit -m "test: add shared content release contract"
```

---

### Task 2: Playwright 브라우저 행렬과 smoke 기반

**Files:**

- Create: `playwright.config.ts`
- Create: `tests/e2e/support/quiz-flow.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.node.json`
- Modify: `eslint.config.js`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: `npm run dev:web`, browser `localStorage`, home button accessible name.
- Produces:

```ts
export const FIXED_NOW: Date;
export async function openFreshApp(page: Page): Promise<void>;
export async function answerCurrentQuestion(
  page: Page,
  choiceIndex?: number,
): Promise<void>;
export async function finishQuiz(
  page: Page,
  questionCount: number,
): Promise<void>;
export async function completeCoreQuiz(page: Page): Promise<void>;
export async function openBonusOffer(page: Page): Promise<void>;
export async function startFirstFreeBonus(
  page: Page,
  topicLabel?: string,
): Promise<void>;
```

- Later tasks rely on: four exact project names and `playwright-report/`, `test-results/`.

- [ ] **Step 1: Install exact Playwright and axe packages**

Run:

```powershell
npm.cmd install --save-dev --save-exact @playwright/test@1.62.0 @axe-core/playwright@4.12.1
```

Expected: exact versions appear in `devDependencies`; no application dependency changes.

- [ ] **Step 2: Write the smoke test before configuration**

Create `tests/e2e/smoke.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { openFreshApp } from "./support/quiz-flow";

test("@smoke opens the fixed launch day home screen", async ({ page }) => {
  await openFreshApp(page);

  await expect(page.getByRole("heading", { name: "그때요즘" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "오늘의 3문제 시작" }),
  ).toBeVisible();
  await expect(page.locator(".date-label")).toContainText("7월 29일");
});
```

- [ ] **Step 3: Run the missing Playwright script and verify failure**

Run:

```powershell
npm.cmd run test:e2e:chromium -- --grep @smoke
```

Expected: FAIL with `Missing script: "test:e2e:chromium"`.

- [ ] **Step 4: Add the fixed-time browser helper**

Create `tests/e2e/support/quiz-flow.ts`:

```ts
import { expect, type Page } from "@playwright/test";

export const FIXED_NOW = new Date("2026-07-29T03:00:00.000Z");

export async function openFreshApp(page: Page): Promise<void> {
  await page.clock.setFixedTime(FIXED_NOW);
  await page.goto("/");
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("button", { name: "오늘의 3문제 시작" }),
  ).toBeVisible();
}

export async function answerCurrentQuestion(
  page: Page,
  choiceIndex = 0,
): Promise<void> {
  await page.locator(".answer-button").nth(choiceIndex).click();
  await expect(page.locator(".explanation-card")).toBeVisible();
  await expect(page.getByText("저장됐어요.")).toBeVisible();
}

export async function finishQuiz(
  page: Page,
  questionCount: number,
): Promise<void> {
  for (let index = 0; index < questionCount; index += 1) {
    await answerCurrentQuestion(page);
    await page
      .getByRole("button", {
        name: index === questionCount - 1 ? "결과 보기" : "다음 문제",
      })
      .click();
  }
}

export async function completeCoreQuiz(page: Page): Promise<void> {
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await finishQuiz(page, 3);
  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
}

export async function openBonusOffer(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "원하는 주제로 보너스 3문제" })
    .click();
  await expect(
    page.getByRole("heading", { name: "보너스 주제 선택" }),
  ).toBeVisible();
}

export async function startFirstFreeBonus(
  page: Page,
  topicLabel = "디지털 생활",
): Promise<void> {
  await openBonusOffer(page);
  await page.getByRole("button", { name: topicLabel }).click();
  await page.getByRole("button", { name: "첫 보너스 무료로 시작" }).click();
  await expect(page.locator(".quiz-screen")).toBeVisible();
}
```

- [ ] **Step 5: Add the four-project Playwright configuration**

Create `playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  outputDir: "test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFileName}/{arg}{-projectName}{ext}",
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:5173",
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    trace: "on-first-retry",
    screenshot: { mode: "only-on-failure", fullPage: true },
    video: "off",
  },
  projects: [
    {
      name: "chromium-360",
      use: { browserName: "chromium", viewport: { width: 360, height: 800 } },
    },
    {
      name: "chromium-390",
      use: { browserName: "chromium", viewport: { width: 390, height: 844 } },
    },
    {
      name: "webkit-360",
      use: { browserName: "webkit", viewport: { width: 360, height: 800 } },
    },
    {
      name: "webkit-390",
      use: { browserName: "webkit", viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npm run dev:web",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120_000,
  },
});
```

- [ ] **Step 6: Add scripts and type/lint coverage**

Add to `package.json`:

```json
"test:e2e:install": "playwright install chromium webkit",
"test:e2e": "playwright test",
"test:e2e:chromium": "playwright test --project=chromium-360 --project=chromium-390",
"test:e2e:webkit": "playwright test --project=webkit-360 --project=webkit-390",
"test:e2e:update": "playwright test tests/e2e/visual-regression.spec.ts --update-snapshots"
```

Extend `tsconfig.node.json`:

```json
"lib": ["ES2023", "DOM", "DOM.Iterable"],
"types": ["node", "@playwright/test"],
"include": [
  "vite.config.ts",
  "granite.config.ts",
  "playwright.config.ts",
  "scripts/**/*.ts",
  "tests/e2e/**/*.ts"
]
```

Add a final ESLint config block:

```js
{
  files: ["playwright.config.ts", "scripts/**/*.ts", "tests/e2e/**/*.ts"],
  languageOptions: {
    globals: { ...globals.node, ...globals.browser },
  },
},
```

Add to `.gitignore`:

```gitignore
playwright-report/
test-results/
```

- [ ] **Step 7: Install browsers and run the smoke test in all four projects**

Run:

```powershell
npm.cmd run test:e2e:install
npm.cmd run test:e2e -- --grep @smoke
npm.cmd run typecheck
npm.cmd run lint
```

Expected: four smoke tests pass, one for each project. Typecheck and lint exit 0.

- [ ] **Step 8: Commit the browser test foundation**

```powershell
git add package.json package-lock.json playwright.config.ts tsconfig.node.json eslint.config.js .gitignore tests/e2e/support/quiz-flow.ts tests/e2e/smoke.spec.ts
git commit -m "test: add cross-browser Playwright foundation"
```

---

### Task 3: 핵심·보너스·복원·공유 E2E 여정

**Files:**

- Create: `tests/e2e/core-flow.spec.ts`
- Create: `tests/e2e/bonus-flow.spec.ts`
- Create: `tests/e2e/resilience.spec.ts`
- Modify: `tests/e2e/support/quiz-flow.ts`

**Interfaces:**

- Consumes: Task 2의 `openFreshApp`, `answerCurrentQuestion`, `finishQuiz`, `completeCoreQuiz`, `startFirstFreeBonus`.
- Produces:

```ts
export async function installClipboardFallback(page: Page): Promise<void>;
export async function corruptAllProgressSlots(page: Page): Promise<void>;
```

- Later tasks rely on: 결과·보너스 상태로 이동하는 helper와 안정화된 실제 사용자 여정.

- [ ] **Step 1: Write the three failing journey specs**

Create `tests/e2e/core-flow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import {
  answerCurrentQuestion,
  finishQuiz,
  openFreshApp,
} from "./support/quiz-flow";

test("home → three core answers → explanation → result", async ({ page }) => {
  await openFreshApp(page);
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();

  await answerCurrentQuestion(page);
  await expect(page.locator(".explanation-card a")).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  await expect(page.locator(".score-card")).toContainText("/ 3");
});
```

Create `tests/e2e/bonus-flow.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import {
  completeCoreQuiz,
  finishQuiz,
  openFreshApp,
  startFirstFreeBonus,
} from "./support/quiz-flow";

test("first free bonus lets the user choose a topic and finish three questions", async ({
  page,
}) => {
  await openFreshApp(page);
  await completeCoreQuiz(page);
  await startFirstFreeBonus(page, "디지털 생활");
  await finishQuiz(page, 3);

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  await expect(page.getByText("첫 보너스 3문제는 무료예요")).toHaveCount(0);
});
```

Create `tests/e2e/resilience.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import {
  answerCurrentQuestion,
  completeCoreQuiz,
  corruptAllProgressSlots,
  installClipboardFallback,
  openFreshApp,
} from "./support/quiz-flow";

test("reload restores an answered in-progress core question", async ({
  page,
}) => {
  await openFreshApp(page);
  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  const prompt = await page.locator(".question-section h1").innerText();
  await answerCurrentQuestion(page, 1);

  await page.reload();

  await expect(page.locator(".question-section h1")).toHaveText(prompt);
  await expect(page.locator(".answer-button.selected")).toHaveCount(1);
  await expect(page.locator(".explanation-card")).toBeVisible();
});

test("browser share falls back to clipboard and keeps the result usable", async ({
  page,
}) => {
  await installClipboardFallback(page);
  await openFreshApp(page);
  await completeCoreQuiz(page);

  await page.getByRole("button", { name: "친구에게 같은 문제 보내기" }).click();

  await expect(page.getByText("공유할 내용을 열었어요.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("e2e:clipboard")),
  ).toContain("오늘 그때요즘 퀴즈에서");
});

test("corrupt progress is preserved while no-save recovery returns home", async ({
  page,
}) => {
  await openFreshApp(page);
  await corruptAllProgressSlots(page);
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "기록을 안전하게 열지 못했어요" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "저장 없이 오늘 퀴즈 보기" }).click();
  await expect(
    page.getByRole("button", { name: "오늘의 3문제 시작" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("geuttae-yojeum:progress:v2:a"),
    ),
  ).toBe("{broken-a");
});
```

- [ ] **Step 2: Run Chromium journeys and verify missing helpers fail**

Run:

```powershell
npm.cmd run test:e2e:chromium -- tests/e2e/core-flow.spec.ts tests/e2e/bonus-flow.spec.ts tests/e2e/resilience.spec.ts
```

Expected: FAIL because `installClipboardFallback` and `corruptAllProgressSlots` are not exported.

- [ ] **Step 3: Add the production-adapter browser fixtures**

Append to `tests/e2e/support/quiz-flow.ts`:

```ts
export async function installClipboardFallback(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          localStorage.setItem("e2e:clipboard", value);
        },
      },
    });
  });
}

export async function corruptAllProgressSlots(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.setItem("geuttae-yojeum:progress:v2:a", "{broken-a");
    localStorage.setItem("geuttae-yojeum:progress:v2:b", "{broken-b");
    localStorage.setItem("geuttae-yojeum:progress", "{broken-legacy");
  });
}
```

These helpers alter browser APIs and storage only; application code receives the same `BrowserQuizShareGateway` and `ProgressRepository` used in development.

- [ ] **Step 4: Run all functional journeys in Chromium and WebKit**

Run:

```powershell
npm.cmd run test:e2e:chromium -- tests/e2e/core-flow.spec.ts tests/e2e/bonus-flow.spec.ts tests/e2e/resilience.spec.ts
npm.cmd run test:e2e:webkit -- tests/e2e/core-flow.spec.ts tests/e2e/bonus-flow.spec.ts tests/e2e/resilience.spec.ts
npm.cmd run test:run
npm.cmd run typecheck
npm.cmd run lint
```

Expected: 24 functional E2E cases pass across four projects, existing unit/component tests pass, static checks exit 0.

- [ ] **Step 5: Commit the functional browser journeys**

```powershell
git add tests/e2e/support/quiz-flow.ts tests/e2e/core-flow.spec.ts tests/e2e/bonus-flow.spec.ts tests/e2e/resilience.spec.ts
git commit -m "test: cover release-critical quiz journeys"
```

---

### Task 4: 키보드·axe·200% 텍스트·시각 회귀

**Files:**

- Create: `tests/e2e/support/accessibility.ts`
- Create: `tests/e2e/support/layout.ts`
- Create: `tests/e2e/keyboard.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Create: `tests/e2e/visual-regression.spec.ts`
- Create: `tests/e2e/__screenshots__/visual-regression.spec.ts/*.png`
- Modify: `src/App.tsx`

**Interfaces:**

- Consumes: Task 3의 완료된 실제 여정 helper.
- Produces:

```ts
export async function expectNoBlockingAxeViolations(page: Page): Promise<void>;
export async function applyTextScale(page: Page, scale?: number): Promise<void>;
export async function expectNoHorizontalOverflow(page: Page): Promise<void>;
```

- CI relies on: 0 critical/serious axe violations, 200% text overflow 0, committed 16 snapshot baselines.

- [ ] **Step 1: Write a failing selected-state and keyboard-only test**

Create `tests/e2e/keyboard.spec.ts`:

```ts
import { expect, test, type Locator, type Page } from "@playwright/test";

import { openFreshApp } from "./support/quiz-flow";

async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
  }
  throw new Error(`Keyboard focus did not reach: ${await target.innerText()}`);
}

async function expectVisibleFocus(target: Locator): Promise<void> {
  const focusStyle = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      boxShadow: style.boxShadow,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(
    focusStyle.outlineStyle !== "none" || focusStyle.boxShadow !== "none",
  ).toBe(true);
}

test("keyboard alone completes the core quiz with visible selected state", async ({
  page,
}) => {
  await openFreshApp(page);
  const start = page.getByRole("button", { name: "오늘의 3문제 시작" });
  await tabTo(page, start);
  await expectVisibleFocus(start);
  await page.keyboard.press("Enter");

  for (let questionIndex = 0; questionIndex < 3; questionIndex += 1) {
    const firstAnswer = page.locator(".answer-button").first();
    await tabTo(page, firstAnswer);
    await expectVisibleFocus(firstAnswer);
    await page.keyboard.press("Space");
    await expect(firstAnswer).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".explanation-card")).toBeVisible();
    await expect(page.getByText("저장됐어요.")).toBeVisible();

    const next = page.getByRole("button", {
      name: questionIndex === 2 ? "결과 보기" : "다음 문제",
    });
    await tabTo(page, next);
    await expectVisibleFocus(next);
    await page.keyboard.press("Enter");
  }

  await expect(page.getByRole("heading", { name: "오늘 결과" })).toBeVisible();
});
```

Run:

```powershell
npm.cmd run test:e2e:chromium -- tests/e2e/keyboard.spec.ts
```

Expected: FAIL because answer buttons do not expose `aria-pressed`.

- [ ] **Step 2: Expose answer selection without changing the visual UI**

In the answer button in `src/App.tsx`, add:

```tsx
aria-pressed={isSelected}
```

Run:

```powershell
npm.cmd run test:e2e:chromium -- tests/e2e/keyboard.spec.ts
npm.cmd run test:e2e:webkit -- tests/e2e/keyboard.spec.ts
```

Expected: four keyboard tests pass and every focused button or link has a visible outline or box shadow.

- [ ] **Step 3: Add the axe blocking-impact helper and spec**

Create `tests/e2e/support/accessibility.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function expectNoBlockingAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  const blocking = results.violations
    .filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    )
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      targets: violation.nodes.flatMap((node) => node.target),
    }));

  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
}
```

Create `tests/e2e/accessibility.spec.ts`:

```ts
import { test } from "@playwright/test";

import { expectNoBlockingAxeViolations } from "./support/accessibility";
import {
  answerCurrentQuestion,
  finishQuiz,
  openBonusOffer,
  openFreshApp,
} from "./support/quiz-flow";

test("home, explanation, result, and bonus offer have no blocking axe issues", async ({
  page,
}) => {
  await openFreshApp(page);
  await expectNoBlockingAxeViolations(page);

  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await answerCurrentQuestion(page);
  await expectNoBlockingAxeViolations(page);

  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);
  await expectNoBlockingAxeViolations(page);

  await openBonusOffer(page);
  await expectNoBlockingAxeViolations(page);
});
```

- [ ] **Step 4: Add deterministic 200% text and overflow diagnostics**

Create `tests/e2e/support/layout.ts`:

```ts
import { expect, type Page } from "@playwright/test";

export async function applyTextScale(page: Page, scale = 2): Promise<void> {
  await page.evaluate((requestedScale) => {
    const elements = [
      document.documentElement,
      document.body,
      ...document.querySelectorAll<HTMLElement>("body *"),
    ];
    const sizes = elements.map((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    elements.forEach((element, index) => {
      element.style.setProperty(
        "font-size",
        `${sizes[index] * requestedScale}px`,
        "important",
      );
    });
  }, scale);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const result = await page.evaluate(() => {
    const selectors =
      "main, button, h1, h2, .explanation-card, .score-card, .topic-grid";
    const offenders = [...document.querySelectorAll<HTMLElement>(selectors)]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          selector:
            element.className || element.tagName.toLocaleLowerCase("en-US"),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter(({ left, right }) => left < -1 || right > window.innerWidth + 1);

    return {
      offenders,
      scrollWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      viewportWidth: window.innerWidth,
    };
  });

  expect(result.offenders, JSON.stringify(result, null, 2)).toEqual([]);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth + 1);
}
```

Create `tests/e2e/responsive.spec.ts`:

```ts
import { test } from "@playwright/test";

import { applyTextScale, expectNoHorizontalOverflow } from "./support/layout";
import {
  answerCurrentQuestion,
  finishQuiz,
  openBonusOffer,
  openFreshApp,
} from "./support/quiz-flow";

test("200% text keeps the four release screens inside the viewport", async ({
  page,
}) => {
  await openFreshApp(page);
  await applyTextScale(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await answerCurrentQuestion(page);
  await applyTextScale(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);
  await applyTextScale(page);
  await expectNoHorizontalOverflow(page);

  await openBonusOffer(page);
  await applyTextScale(page);
  await expectNoHorizontalOverflow(page);
});
```

- [ ] **Step 5: Write the four-screen visual regression spec**

Create `tests/e2e/visual-regression.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import {
  answerCurrentQuestion,
  finishQuiz,
  openBonusOffer,
  openFreshApp,
} from "./support/quiz-flow";

test("stable release screens match approved snapshots", async ({ page }) => {
  await openFreshApp(page);
  await expect(page.locator("main")).toHaveScreenshot("home.png");

  await page.getByRole("button", { name: "오늘의 3문제 시작" }).click();
  await answerCurrentQuestion(page);
  await expect(page.locator("main")).toHaveScreenshot("explanation.png");

  await page.getByRole("button", { name: "다음 문제" }).click();
  await finishQuiz(page, 2);
  await expect(page.locator("main")).toHaveScreenshot("result.png");

  await openBonusOffer(page);
  await expect(page.locator("main")).toHaveScreenshot("bonus-offer.png");
});
```

- [ ] **Step 6: Verify missing snapshots fail, then generate and review all 16 baselines**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/visual-regression.spec.ts
```

Expected: FAIL with missing snapshot messages for the four project names.

Generate:

```powershell
npm.cmd run test:e2e:update
```

Inspect all PNG files under:

```text
tests/e2e/__screenshots__/visual-regression.spec.ts/
```

There must be exactly 16 files: four screen names × four project names. Each image must show the intended state without loading text, transient save text, clipped content, or OS dialogs.

- [ ] **Step 7: Run the complete accessibility, responsive, keyboard, and visual suite**

Run:

```powershell
npm.cmd run test:e2e -- tests/e2e/keyboard.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts tests/e2e/visual-regression.spec.ts
npm.cmd run test:run
npm.cmd run typecheck
npm.cmd run lint
```

Expected: all four projects pass, axe reports no blocking violations, 200% text has no offender, snapshots match, and unit/static checks remain green.

- [ ] **Step 8: Commit accessibility and visual gates**

```powershell
git add src/App.tsx tests/e2e/support/accessibility.ts tests/e2e/support/layout.ts tests/e2e/keyboard.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts tests/e2e/visual-regression.spec.ts tests/e2e/__screenshots__
git commit -m "test: gate accessibility and visual regressions"
```

---

### Task 5: 공통 출시 명령, GitHub Actions, 샌드박스 체크리스트

**Files:**

- Create: `.github/workflows/release-gate.yml`
- Create: `docs/release/apps-in-toss-sandbox-checklist.md`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**

- Consumes: Tasks 1~4의 `validate:content`, Vitest, 네 Playwright 프로젝트, Apps in Toss `npm run build`.
- Produces:

```text
npm run verify:quality
npm run verify:release
quality
e2e-chromium
e2e-webkit
release-build
```

- Repository administrator relies on the four job names as required status checks.

- [ ] **Step 1: Add the shared local release scripts**

Add to `package.json`:

```json
"verify:quality": "npm run lint && npm run typecheck && npm run validate:content && npm run test:run",
"verify:release": "npm run verify:quality && npm run test:e2e:install && npm run test:e2e && npm run build"
```

Run:

```powershell
npm.cmd run verify:quality
```

Expected: lint, typecheck, content CLI, and all Vitest tests pass from one command.

- [ ] **Step 2: Create the four-job merge-blocking workflow**

Create `.github/workflows/release-gate.yml`:

```yaml
name: Release Gate

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: release-gate-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: "24"
          cache: npm
      - run: npm ci
      - name: Run quality contract
        shell: bash
        run: npm run verify:quality 2>&1 | tee quality.log
      - name: Upload quality log
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: quality-${{ github.sha }}
          path: quality.log
          retention-days: 7
          if-no-files-found: error

  e2e-chromium:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: "24"
          cache: npm
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run test:e2e:chromium
      - name: Upload Chromium report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-chromium-${{ github.sha }}
          path: playwright-report/
          retention-days: 7
          if-no-files-found: error
      - name: Upload Chromium failure evidence
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-chromium-failure-${{ github.sha }}
          path: test-results/
          retention-days: 7
          if-no-files-found: warn

  e2e-webkit:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: "24"
          cache: npm
      - run: npm ci
      - run: npx playwright install webkit
      - run: npm run test:e2e:webkit
      - name: Upload WebKit report
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-webkit-${{ github.sha }}
          path: playwright-report/
          retention-days: 7
          if-no-files-found: error
      - name: Upload WebKit failure evidence
        if: failure()
        uses: actions/upload-artifact@v7
        with:
          name: playwright-webkit-failure-${{ github.sha }}
          path: test-results/
          retention-days: 7
          if-no-files-found: warn

  release-build:
    runs-on: ubuntu-latest
    env:
      VITE_REWARDED_AD_GROUP_ID: ait-ad-test-rewarded-id
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v7
        with:
          node-version: "24"
          cache: npm
      - run: npm ci
      - name: Build Apps in Toss artifact
        shell: bash
        run: npm run build 2>&1 | tee build.log
      - name: Upload Apps in Toss build
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: geuttae-yojeum-ait-${{ github.sha }}
          path: |
            geuttae-yojeum.ait
            build.log
          retention-days: 7
          if-no-files-found: warn
```

The two E2E jobs use `windows-latest` so committed Windows screenshot baselines and CI rendering use the same OS family. Quality and Apps in Toss build remain on Ubuntu.

- [ ] **Step 3: Write the executable Apps in Toss manual gate**

Create `docs/release/apps-in-toss-sandbox-checklist.md` with this structure and exact checks:

```md
# Apps in Toss 샌드박스 출시 체크리스트

## 실행 정보

- 커밋 SHA:
- `.ait` artifact 이름:
- 확인자:
- 확인일:
- iOS 기기·OS:
- Android 기기·OS:

## 자동 게이트

- [ ] `quality` 성공
- [ ] `e2e-chromium` 성공
- [ ] `e2e-webkit` 성공
- [ ] `release-build` 성공
- [ ] artifact의 `geuttae-yojeum.ait` 다운로드와 파일 열기 성공

## 콘솔·환경 설정

- [ ] 콘솔 앱 이름과 `granite.config.ts`의 `appName`이 `geuttae-yojeum`으로 일치
- [ ] 운영 빌드에 실제 보상형 광고 그룹 ID가 주입됨
- [ ] 운영 빌드가 `ait-ad-test-rewarded-id`를 사용하지 않음
- [ ] 저장소·로그·trace·artifact에 인증서·토큰·사용자 식별 정보가 없음
- [ ] `quiz_start`, `answer_submitted`, `quiz_completed`, `bonus_start` 이벤트가 Analytics 콘솔에 수신됨

## 네이티브 기능

- [ ] Storage에 첫 답이 저장되고 앱 재진입 후 같은 해설 화면이 복원됨
- [ ] 보상형 광고 끝까지 시청 시 보너스가 정확히 한 번 열림
- [ ] 보상형 광고 취소 시 보너스가 열리지 않고 다시 시도할 수 있음
- [ ] 보상 콜백 중복 발생 시 보너스권 또는 세션이 중복 지급되지 않음
- [ ] 공유 완료 후 앱 재진입 시 결과 화면과 저장 상태가 유지됨
- [ ] Storage·Analytics·광고·공유 중 하나가 실패해도 핵심 퀴즈를 계속 풀 수 있음

## iOS QR

- [ ] 360px급 화면에서 홈·해설·결과·보너스 제안 잘림 없음
- [ ] 시스템 글자 크기 200%에서 가로 스크롤과 주요 버튼 잘림 없음
- [ ] 핵심 3문제 완료
- [ ] 첫 무료 보너스 3문제 완료
- [ ] 공유 후 재진입

## Android QR

- [ ] 360px급 화면에서 홈·해설·결과·보너스 제안 잘림 없음
- [ ] 시스템 글자 크기 200%에서 가로 스크롤과 주요 버튼 잘림 없음
- [ ] 핵심 3문제 완료
- [ ] 첫 무료 보너스 3문제 완료
- [ ] 공유 후 재진입

## GitHub main 보호 설정

저장소 관리자 권한으로 Settings → Rules → Rulesets에서 `main` 대상 규칙을 만들고
Require status checks to pass를 켠 뒤 아래 네 검사를 정확히 추가한다.

- [ ] `quality`
- [ ] `e2e-chromium`
- [ ] `e2e-webkit`
- [ ] `release-build`

## 최종 승인

- [ ] 위 항목이 모두 완료됨
- 출시 승인자:
- 승인 시각:
```

- [ ] **Step 4: Link the release gate from README**

Add a `## 출시 후보 검증` section to `README.md`:

````md
## 출시 후보 검증

Node 24에서 의존성을 잠금 파일 그대로 설치하고 전체 출시 계약을 실행합니다.

```bash
npm ci
npm run verify:release
```

자동 검사가 끝나면
[`docs/release/apps-in-toss-sandbox-checklist.md`](docs/release/apps-in-toss-sandbox-checklist.md)를
iOS와 Android Apps in Toss 샌드박스 QR에서 완료해야 합니다. CI의 `.ait`는 테스트
광고 ID를 사용하므로 콘솔 업로드 전에 운영 광고 그룹 ID로 다시 빌드합니다.
````

- [ ] **Step 5: Validate workflow formatting and the complete local release contract**

Run:

```powershell
npx.cmd prettier --check .github/workflows/release-gate.yml docs/release/apps-in-toss-sandbox-checklist.md README.md package.json
npm.cmd run verify:release
```

Expected:

- Prettier reports all four files formatted.
- lint, typecheck, content validation, all Vitest tests, all four Playwright projects, and Apps in Toss build pass.
- `geuttae-yojeum.ait` exists at the repository root.
- `playwright-report/` exists locally but is ignored by Git.

- [ ] **Step 6: Verify the release surface contains no secret or scope leak**

Run:

```powershell
rg -n "BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}" .github docs tests scripts src package.json
rg -n "reminder|notification|outbox|audit fix --force" .github tests scripts src
git status --short
```

Expected:

- The secret scan returns no matches.
- The scope scan returns no implementation references.
- Git status shows only the files listed in Task 5 plus intended snapshot and configuration changes from earlier tasks; `.ait`, reports, traces, and test results remain ignored.

- [ ] **Step 7: Commit the release contract**

```powershell
git add package.json .github/workflows/release-gate.yml docs/release/apps-in-toss-sandbox-checklist.md README.md
git commit -m "ci: enforce E9 release gate"
```

- [ ] **Step 8: Final branch verification**

Run:

```powershell
npm.cmd run verify:release
git log --oneline -5
git status --short
```

Expected:

- The complete release command exits 0.
- The five implementation commits are visible in order.
- Worktree status is clean.

## Execution Completion Record

At implementation completion, report:

```text
Content: core 90, bonus 90, issues 0
Vitest: existing 115 tests plus new tests passed
Playwright: Chromium/WebKit × 360/390 passed
Axe: critical 0, serious 0
Text scale: 200% overflow 0
Snapshots: 16 passed
Build: geuttae-yojeum.ait created
CI checks: quality, e2e-chromium, e2e-webkit, release-build
Manual gate: checklist ready; console/QR execution remains a release-owner action
```
