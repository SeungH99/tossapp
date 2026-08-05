# Task 8 Report: End-to-end proof for topics, readability, and no-repeat behavior

## Outcome

- Added a real-catalog three-topic journey that verifies the released label order, completes Korean-life set 0 with a 3/3 result, advances to the next KST day, and proves set 1 is assigned without rendering or persisting any of set 0's three question IDs.
- Added V4 browser fixtures that preserve the real dual-slot checksum contract. A bonus concept is recorded on a real core answer event, language set 0 is skipped, set 1 is assigned, and the skip remains persisted after reload.
- Verified `bonus_set_skipped_seen_concept` is exactly `{ topic, setIndex }`, precedes `bonus_start`, and carries no question IDs, concept IDs, selected-answer data, or correctness.
- Verified the real 30-set language boundary produces a disabled, untabbable `새 문제 준비 중` radio without consuming entitlement or reward state.
- Extended radio proof to all four arrow keys with wraparound and correct roving `tabindex`/`aria-checked` behavior.
- Added exact long-answer geometry checks at every configured 360px/390px Chromium and WebKit project. Computed `padding-top` must remain 18px, every answer text first line must start at that inset from the inner border edge within one CSS pixel, and the selected answer mark must remain circular within one CSS pixel.
- Added a 200% text-scale flow proving a long question, explanation, source, and enabled next control remain readable, reachable, horizontally unclipped, keyboard-operable, and free of blocking axe violations.
- Tightened the core journey to answer the released 2026-07-29 set correctly and verify readable explanation copy plus the exact 3/3 result.
- Updated the stale V4 corruption helper so the existing resilience contract continues to corrupt and preserve every V4/V3/V2/legacy storage slot.

## TDD evidence

### RED

The first focused Chromium run produced 14 passes and 10 expected failures:

- the new geometry assertion exposed the two-pixel border between the button border box and the approved 18px content padding;
- the three-topic second-day journey exposed that a fresh browser fixture needs an explicit persisted bonus ticket after the first-free entitlement is used;
- the 200% keyboard assertion used a stale `.quiz-progress` selector instead of the real progressbar contract;
- the core explanation literal did not match the released catalog wording;
- all four local bonus-offer snapshots were stale after the three-topic catalog UI.

The first full E2E run then produced 80 passes and 4 failures because the existing corruption helper covered V3/V2/legacy slots but left valid V4 slots intact. The helper was updated minimally to include V4 `a`/`b`; no resilience expectation or production behavior changed.

### GREEN

- Focused resilience after the V4 helper repair: 12/12 passed.
- Required focused Chromium matrix: 24/24 passed.
- Required focused WebKit matrix: 24/24 passed.
- Full Playwright matrix: 84/84 passed across Chromium/WebKit at 360px/390px.

## Snapshot review

Visually inspected the four generated bonus-offer actuals for Chromium and WebKit at 360px and 390px before accepting them. Each approved image shows exactly three cards in manifest order, the selected nostalgia check remains circular, labels are unclipped, and the first-free CTA/support copy remain visible.

Only these baselines changed in each environment:

- `bonus-offer-chromium-360.png`
- `bonus-offer-chromium-390.png`
- `bonus-offer-webkit-360.png`
- `bonus-offer-webkit-390.png`

The same four approved baselines were refreshed under both `win32` and `windows-ci`. Temporary CI generation rewrote other screens because of environment rendering; those unintended home/explanation/result files were restored, leaving exactly eight intended snapshot changes.

## Files changed

- `tests/e2e/bonus-flow.spec.ts`
- `tests/e2e/core-flow.spec.ts`
- `tests/e2e/visual-regression.spec.ts`
- `tests/e2e/accessibility.spec.ts`
- `tests/e2e/support/quiz-flow.ts`
- eight approved `bonus-offer-*.png` snapshots under `win32` and `windows-ci`
- `.superpowers/sdd/2026-08-05-quiz-readability-global-dedup/task-8-report.md`

## Final verification

- `npm.cmd run test:e2e:chromium -- tests/e2e/core-flow.spec.ts tests/e2e/bonus-flow.spec.ts tests/e2e/visual-regression.spec.ts tests/e2e/accessibility.spec.ts` — passed: 24 tests.
- `npm.cmd run test:e2e:webkit -- tests/e2e/core-flow.spec.ts tests/e2e/bonus-flow.spec.ts tests/e2e/visual-regression.spec.ts tests/e2e/accessibility.spec.ts` — passed: 24 tests.
- `npm.cmd run test:e2e` — passed: 84 tests.
- `npm.cmd test -- --run --reporter=dot` — passed: 26 files, 257 tests.
- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint -- --ignore-pattern .gstack` — passed with zero warnings/errors.
- `npm.cmd run validate:content:library` — passed: 12 packs, 1,080 questions, 360 sets.
- `npx.cmd prettier --check tests/e2e/bonus-flow.spec.ts tests/e2e/core-flow.spec.ts tests/e2e/visual-regression.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/support/quiz-flow.ts` — passed.
- `git diff --check -- tests/e2e` — passed.

The protected pre-existing `.gitignore` modification and `.gstack/design.json` deletion were left untouched and unstaged.
