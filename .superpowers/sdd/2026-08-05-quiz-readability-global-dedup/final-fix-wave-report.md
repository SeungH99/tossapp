# Final Review Fix Wave Report

## Status

All seven final-review findings are implemented and the full local release gate is green. The release inventory remains exactly 12 packs, 1,080 questions, and 360 sets.

## Commits

- `e30f15c` — preserve historical question concepts
- `247a798` — enforce released bonus inventory and V4 storage budgets
- `16657fb` — restore cross-day quiz sessions exactly and count title graphemes

## Finding closure

### 1. Stable ID semantic history

- Restored `2026-08-14-then-18-v1` to the exact pre-range 김장 JSON row from commit `495bf7f`; the current JSON object matches that historical fixture exactly.
- Restored `korean-life-kimjang-community-winter-preparation`; the later salt meaning no longer occupies the stable ID.
- Added an active V3 explanation-session migration proof that preserves the session and resolves both question and concept history.
- Recomputed the `core-001` manifest SHA with the repository's pack validator after formatting.

### 2. Append-only historical concept map

- Added `src/content/legacy-concept-map.json` with 181 audited mappings covering all 180 legacy production questions plus the pre-range stable 김장 ID.
- `bonus-language-2` and `bonus-language-5` both map to `language-spelling-wenil-unexpected-event` (`웬일`).
- The generator seeds from history, merges all 1,080 current IDs, emits 1,260 sorted entries, accepts identical overlaps, and fails conflicting ID meanings.
- Unknown historical IDs remain question-only during V3→V4 migration.
- `check:concept-map` compares canonical committed bytes without writing and is part of `verify:quality`.

### 3. V4 storage budget

- Kept the 512 KiB per-envelope safety cap and added the explicit 1 MiB dual-slot budget.
- Persistence compacts only answer arrays that are redundant after completion: historical completed core sessions except the latest completed result, and bonus sessions whose topic/set completion is already recorded.
- Active core/bonus answers, the latest core result, completed-but-not-yet-recorded bonus answers, all session keys, 180-day streak state, seen IDs/concepts, checkpoint, 512-event tail, reward grants, entitlements, start-command history, and topic progress remain restorable.
- The deterministic maximum-release fixture uses all real 540 core and 540 bonus IDs, 180 legacy-only IDs, 1,260 seen question IDs, 1,243 seen concept IDs, 748 checkpoint rows, 630 completed bonus IDs, 180 bonus commands/sessions, and deterministic UUID-shaped command/reward IDs.
- Measured result: 499,798 bytes per slot and 999,596 bytes across both slots, leaving 24,490 bytes per slot and 48,980 bytes total.
- Archived completion retries return `duplicate`; the oversized-envelope guard still rejects genuinely oversized payloads without overwriting the valid slot.

### 4. Cross-day active restoration

- Hydration first finds the newest incomplete bonus session across dates, then the newest incomplete core session, before considering the current date.
- A stored bonus start command is authoritative for topic, set index, and ordered question IDs. Catalog content is loaded for the stored set and reordered to the exact saved ID list.
- Remount tests cross a KST date boundary, verify no reward ad or new `bonus_start`, compare entitlement/reward/command ledgers before and after, and complete the original session 3/3 without creating a next-day session.
- The core regression likewise resumes and completes the original date without creating a next-day core session.

### 5. Released inventory contract

- Removed the domain default and legacy overloads. `releasedSetCount` is required through availability resolution, the start command, repository, and App caller.
- The App passes manifest/catalog topic `setCount` for catalog and bundled content.
- Domain and repository tests prove set index 30 is `exhausted` for a 30-set language inventory with entitlement, reward, session, and command state unchanged.

### 6. Grapheme title threshold

- The 42-character long-title boundary now uses `Intl.Segmenter("ko", { granularity: "grapheme" })`.
- A deterministic fallback groups Unicode marks, variation selectors, emoji modifiers, CRLF, regional-indicator pairs, and ZWJ sequences.
- UI tests cover exact 41/42 boundaries for ASCII, decomposed characters, and family ZWJ emoji with both Segmenter and forced fallback.

### 7. Non-mutating generated-map gate

- `npm run check:concept-map` is included in `verify:quality`.
- Generator tests prove a current map passes without mutation and a stale map fails without being rewritten.
- Direct verification recorded the same SHA-256 before and after the check: `7114BD2F56971F31812E0E4A554CD562BA1450397A5A030E8E00DF068F80C8D3`.

## Focused RED/GREEN evidence

- Historical semantic corruption: the current stable row differed from `495bf7f`; after restoration the full JSON object matches and migration tests pass.
- Concept history: before the source map, legacy `bonus-language-2` had no concept; the generator/migration suite now passes 13 focused tests and the current map reports 1,260 entries.
- Storage: the uncompressed full-release profile was 571,257 bytes and failed the 524,288-byte cap; the first core-only compaction was still 531,958 bytes. Audited compaction produces 499,798 bytes and all storage-domain focused tests pass.
- Released inventory: the old default accepted a set-30 request for a 30-set topic; the required-count domain/repository regression now rejects it unchanged.
- Graphemes and cross-day restore: the new tests failed against code-point counting/current-day-only hydration; the App suite now passes 54/54.

## Verification

- Focused integration: 8 files, 156 tests passed.
- Storage-domain rerun after preservation coverage: 5 files, 91 tests passed.
- App: 54/54 passed.
- TypeScript, scoped ESLint, Prettier, exact historical-row comparison, content validation, and non-mutating concept-map verification passed.
- Source lint excluding only protected `.gstack` passed with no warnings or errors.
- TypeScript passed.
- Content validation passed: 12 packs, 1,080 questions, 360 sets.
- The non-mutating concept-map check passed: 1,260 entries and identical file SHA before/after.
- Full Vitest passed: 29 files, 282 tests.
- Full Playwright passed: 84/84 across Chromium and WebKit at 360px and 390px.
- Production build passed: Vite transformed 116 modules and Apps in Toss emitted deployment ID `019fd1dc-658a-74e1-b7a5-f2dab3c79e55`.

## Artifact

- Name: `geuttae-yojeum.ait`
- Size: 417,718 bytes
- Build time: 2026-08-05 21:18:29 KST
- SHA-256: `F3C474C8A1A7CD6335B2236A8E93084BB4743B3EFBD7A717B4B62D88A1E8AE78`

## Protected dirty state

The pre-existing ` M .gitignore` and ` D .gstack/design.json` changes remain unedited and unstaged.
