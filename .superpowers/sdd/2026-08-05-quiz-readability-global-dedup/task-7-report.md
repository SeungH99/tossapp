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
