# Task 7 Report: Wire catalog topics and guard repeated assignments

## Outcome

- Replaced the hard-coded six-topic bonus chooser with the ordered topic metadata and exact set counts supplied by the content catalog.
- Exposed the released topics in catalog order: `nostalgia`, `korean-life`, then `language`.
- Disabled exhausted topics and presented the 5060-friendly `새 문제 준비 중` state.
- Added a final global seen-question/seen-concept guard before a new core session can open.
- Added bounded bonus look-ahead that persists skipped seen sets before loading the next set, and defers ad/ticket work until an unseen set is accepted.
- Kept skip analytics privacy-safe with only `topic` and `setIndex`.
- Made `isLongQuestion` file-local to clear the deferred React Fast Refresh lint warning.

## TDD evidence

### RED

The first valid focused run failed four new expectations:

- the topic chooser did not use catalog metadata/order or expose exhausted topics as disabled radios;
- bonus start did not skip a globally seen concept and look ahead to the next set;
- core start still opened when a question ID had already been seen;
- core start still opened when a concept ID had already been seen.

After the look-ahead implementation, an additional tightened analytics assertion failed because the shared tracker added `dateKey` and `mode`. The implementation was then changed to emit the privacy event directly with the exact allowed fields.

### GREEN

- Focused Task 7 tests: 4 passed, 38 skipped.
- Focused privacy regression: 1 passed, 41 skipped.
- Full `src/App.test.tsx`: 42 passed.

## Files changed

- `src/App.tsx`
- `src/App.css`
- `src/App.test.tsx`
- `.superpowers/sdd/2026-08-05-quiz-readability-global-dedup/task-7-report.md`

## Final verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint -- --ignore-pattern .gstack` — passed with zero warnings/errors.
- `npm.cmd test -- --run` — passed: 26 test files, 254 tests.
- `npm.cmd run validate:content:library` — passed: 12 packs, 1,080 questions, 360 sets.
- `npx.cmd prettier --check src/App.tsx src/App.css src/App.test.tsx` — passed.
- `git diff --check -- src/App.tsx src/App.css src/App.test.tsx` — passed.

The plan's literal `npm.cmd run validate:content:library -- --scope all` invocation was rejected because the validator has no `all` scope. Running the unscoped script is the full-library validation and produced the inventory totals above.

The raw `npm.cmd run lint` command could not scan the protected, pre-existing deleted `.gstack` path (`EPERM`). Re-running the same full lint while excluding only `.gstack` passed. The unrelated pre-existing `.gitignore` modification and `.gstack/design.json` deletion were left untouched and unstaged.

## Reviewer fix round 1

### Changes

- Replaced the fixed `42px` topic-icon column with a content-sized track, allowed long labels to wrap, and reflowed the topic grid to one column at widths up to 420px. This covers both 360px and 390px viewports at 200% text scale.
- Added roving radio behavior for all four arrow keys with wraparound and disabled-topic skipping. The first enabled topic is selected when the chooser opens, and only the checked enabled topic has `tabindex="0"`.
- Updated bonus E2E selectors from button/`aria-pressed` to radio/`aria-checked`, and updated the same flow's persisted-progress lookup to the current V4 slots.
- Hardened the overflow diagnostic to describe SVG elements through their class attribute instead of assuming `className` is a string.

### RED/GREEN evidence

- RED component run: 2 failed as expected because no topic was initially selected/tabbable and arrow keys did not move focus or selection.
- RED responsive run: Chromium 360 and 390 both failed because adjacent cards remained 169px and 178px apart horizontally at 200% text scale.
- RED bonus-flow run: timed out on the stale `getByRole("button", { name: "추억·대중문화" })` selector.
- GREEN component run: 2 focused radio tests passed; full `src/App.test.tsx` passed 44/44.
- GREEN focused Chromium run: bonus keyboard/selector flows and 200% reflow passed at both 360px and 390px.

### Fix-round verification

- `npm.cmd test -- --run src/App.test.tsx src/domain` — passed: 14 files, 143 tests.
- `npx.cmd playwright test tests/e2e/bonus-flow.spec.ts tests/e2e/responsive.spec.ts --project=chromium-360 --project=chromium-390` — passed: 12 tests.
- `npm.cmd test -- --run` — passed: 26 files, 256 tests.
- `npm.cmd run typecheck` — passed.
- `npm.cmd run lint -- --ignore-pattern .gstack` — passed with zero warnings/errors.
- `npm.cmd run validate:content:library` — passed: 12 packs, 1,080 questions, 360 sets.

The protected pre-existing `.gitignore` modification and `.gstack/design.json` deletion remained untouched and unstaged throughout this fix round.

## Final narrow radio fallback fix

- Added a regression that exhausts the currently selected nostalgia topic during seen-concept look-ahead. RED showed the disabled topic remained checked and every remaining enabled radio had `tabindex="-1"`.
- After exhaustion, selection now moves deterministically to the first non-exhausted topic in catalog order. If no non-exhausted topic remains, the prior selection is preserved.
- The regression verifies the exhausted topic is disabled, unchecked, and removed from the tab order; Korean life becomes the sole checked and tabbable enabled radio; only nostalgia set 0 is loaded; no reward ad is shown; and entitlement/reward state is unchanged.

Verification for the final narrow fix:

- Focused RED: 1 expected failure (`aria-checked` remained `true` on the exhausted topic).
- Focused GREEN: 1 passed.
- Full `src/App.test.tsx`: 45 passed.
- Chromium radio flow at 360px and 390px: 2 passed.
- Full Vitest: 26 files, 257 tests passed.
- Typecheck and lint excluding only protected `.gstack`: passed.
- Content validation: 12 packs, 1,080 questions, 360 sets.

The protected pre-existing `.gitignore` modification and `.gstack/design.json` deletion remained untouched and unstaged.
