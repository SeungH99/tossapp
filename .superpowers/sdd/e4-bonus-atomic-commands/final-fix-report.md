# E4 Final Review Fix Report

Date: 2026-07-29
Branch: `codex/bonus-atomic-commands`
Status: DONE

## Scope

Implemented only the four final-review findings for E4:

1. Preserve verified reward-ad provenance through the atomic bonus start.
2. Reuse a durably granted reward after a following start-save failure and topic change.
3. Restore repeated same-topic sessions through explicit latest-command metadata.
4. Strengthen reload coverage by advancing through all three persisted prompts.

The ad SDK and SSV design were not changed. The existing two-slot
checksum/revision repository, serialized write queue, and atomic command
boundaries remain in place.

## Implemented changes

### Reward provenance

- Added `rewardAdTicketCount` to `ProgressState`.
- `grantBonusTicketCommand` increments both the generic entitlement count and
  the reward-ad provenance count while retaining `rewardGrantIds` solely as
  the private idempotency ledger.
- `unlockBonus` now accepts the source of a consumed ticket. A verified
  reward-ad ticket therefore produces `source: "reward_ad"` in its unlock
  attempt, atomic start result, and persisted `BonusStartCommandRecord`.
- `startBonusSessionCommand` decrements reward-ad provenance in the same state
  transition that consumes the entitlement, creates the session, records the
  selected questions, and records the command.
- Neither `BonusStartCommandRecord` nor `bonus_start` analytics contains the
  reward grant ID. Analytics contains only `dateKey`, `mode`, `topic`, and
  `unlockSource`.

### Durable grant followed by failed start

- After `grantBonusTicket` resolves, `progressRef.current` is synchronized to
  the returned durable state.
- Rendered entitlement remains unchanged until `startBonusSession` persistence
  succeeds, so the UI does not show consumption or transition early.
- If the start write fails, changing topic and retrying uses the authoritative
  durable ticket without showing a second ad.

### Explicit latest command metadata

- Added `latestBonusStartCommandIds`, keyed by bonus session key.
- A successful atomic start updates the metadata in the same state revision as
  entitlement consumption, session creation, question selection, and command
  persistence.
- Hydration resolves the restored question order through this metadata instead
  of `Object.values(...).reverse()`.
- Integer-like command IDs (`"10"` then `"2"`) are covered because JavaScript
  property enumeration order no longer determines chronology.

### Migration and normalization

- v1 migration initializes both new fields.
- Old v2 payloads with missing fields normalize without invalidating their
  original checksum. Checksum verification still uses the serialized raw
  payload; normalization occurs only after validation.
- Missing latest-command metadata is deterministically reconstructed per
  session from existing command records.
- Missing reward-ad count is inferred from aggregate ticket state using the
  maintained reward-first consumption policy:
  `min(reward grants, max(0, current tickets - granted streak milestones))`.
  This distinguishes an old ad-backed start that was previously mislabeled
  `streak_ticket` from a later still-available streak ticket.
- Supplied reward-ad counts must be non-negative integers and cannot exceed the
  generic ticket count.

## Strict TDD evidence

### Initial RED

Command:

```text
npm.cmd run test:run -- src/domain/progress-commands.test.ts src/services/progress-repository.test.ts src/App.test.tsx
```

Result: exit 1; 3 test files failed, 9 tests failed, 33 passed.

Expected failures covered:

- missing `rewardAdTicketCount`;
- ad-backed starts persisted/emitted as `streak_ticket`;
- missing `latestBonusStartCommandIds`;
- missing v1/v2 defaults;
- durable grant plus failed start caused a second ad after topic change;
- integer-like IDs restored the older question sequence.

### Initial GREEN

Same focused command after the minimal implementation:

```text
Test Files  3 passed (3)
Tests       42 passed (42)
```

### Migration-edge RED/GREEN from self-review

Self-review exposed a legacy v2 edge: a consumed old ad ticket followed by a
new streak ticket could be misclassified as an outstanding ad ticket.

RED command:

```text
npm.cmd run test:run -- src/services/progress-repository.test.ts
```

RED result: exit 1; 1 failed, 16 passed. The restored
`rewardAdTicketCount` was `1` instead of `0`.

After changing the inference to the reward-first aggregate rule, the same
command was GREEN: 17/17 passed.

## Regression coverage added

- Domain command idempotency now also asserts reward-ad provenance count.
- Domain start test asserts `source: "reward_ad"`, count consumption, private
  grant-ID exclusion, and latest session metadata.
- Repository test asserts the exact persisted ad-backed command record,
  explicit latest metadata, count consumption, and grant-ID exclusion.
- Repository migration tests cover v1 defaults, old v2 defaults, and the
  consumed-old-ad/later-streak boundary.
- UI analytics test asserts the exact `bonus_start` reward-ad payload.
- UI fault-injection test allows the grant write, fails only the following
  start write, changes topic, and proves success with one total ad display.
- Same-topic reload uses integer-like command IDs and advances through all
  three prompts in the persisted second-start order.

## Files changed

- `src/App.tsx`
- `src/App.test.tsx`
- `src/domain/bonus-entitlement.ts`
- `src/domain/progress-commands.ts`
- `src/domain/progress-commands.test.ts`
- `src/domain/progress-state.ts`
- `src/services/progress-repository.ts`
- `src/services/progress-repository.test.ts`
- `.superpowers/sdd/e4-bonus-atomic-commands/final-fix-report.md`

## Final verification

### Full tests

Command:

```text
npm.cmd run test:run
```

Result: exit 0; 11 test files passed, 67 tests passed.

### Lint

Command:

```text
npm.cmd run lint
```

Result: exit 0; ESLint reported no errors.

### Typecheck

Command:

```text
npm.cmd run typecheck
```

Result: exit 0; `tsc -b --pretty false` reported no errors.

### Production build

Command:

```text
npm.cmd run build
```

The sandboxed attempt failed because Vite could not read the config path above
the restricted workspace. Re-running the identical command with approved
filesystem access succeeded:

- 48 modules transformed;
- Vite production bundle completed;
- RN 0.84.0 and RN 0.72.6 targets completed;
- `geuttae-yojeum.ait` created;
- exit 0.

### Responsive browser check

Used the local development build and inspected the bonus-topic screen at:

- 320 x 844
- 390 x 844
- 480 x 844

At every width, `documentWidth === clientWidth === viewportWidth`; no heading,
paragraph, or button crossed the viewport bounds. Screenshots showed the topic
grid, disabled first-free start button, and explanatory copy fully visible.

### Diff hygiene

`git diff --check` passed. Temporary browser-server logs were removed and the
temporary development server was stopped.

## Self-review

### Migration/checksum compatibility

- Envelope schema version, revision selection, slot alternation, checksum
  input, size budget, and raw-payload checksum verification are unchanged.
- v1/v2 old payloads receive bounded defaults after raw checksum verification.

### Idempotency

- `rewardGrantIds` still prevents duplicate grants across retries/reloads.
- Duplicate bonus command IDs still return the persisted result without a new
  write or extra entitlement consumption.
- Latest metadata updates only on an applied start.

### Partial failure

- Grant persistence and start persistence remain separately queued commands.
- A successful grant is authoritative in memory but not rendered as consumed.
- A rejected start write cannot expose a session, analytics event, entitlement
  consumption, or screen transition.
- The durable grant remains usable for the next topic/start attempt.

### Analytics privacy

- `rewardGrantId` exists only in the gateway/pending command and private
  repository idempotency state.
- `bonus_start` emits no grant ID and no answer/question payload.
- The event is still emitted only after an applied, durably saved start.

### Scope

- No ad SDK, SSV, storage architecture, visual design, or unrelated quiz flow
  was redesigned.

## Concerns

None remaining.
