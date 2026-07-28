# Task 1 report — reward grants and atomic bonus starts

## Implemented

- Added `grantBonusTicketCommand(state, rewardGrantId)`, which rejects blank IDs and records each reward grant ID in the v2 payload so a ticket is granted exactly once.
- Added `startBonusSessionCommand(state, commandId, dateKey, topic, bonusQuestions)`, which preserves the existing entitlement order, leaves state unchanged when selection is empty or an ad is still required, and stores the selected question IDs, session, and command record in one next state.
- Added the public queued repository methods `grantBonusTicket` and `startBonusSession`. They load the latest state within the existing write queue, write once only for a state-changing command, and propagate storage failures.
- Extended v2 loading and v1 migration with safe defaults for `rewardGrantIds` and `bonusStartCommands`, without invalidating checksums created for older v2 payloads.

## Files changed

- `src/domain/progress-state.ts`
- `src/domain/progress-commands.ts`
- `src/domain/progress-commands.test.ts`
- `src/services/progress-repository.ts`
- `src/services/progress-repository.test.ts`

## TDD evidence

### RED

1. `npm.cmd run test:run -- src/domain/progress-commands.test.ts`
   - Expected and observed: two assertion failures because `grantBonusTicketCommand` and `startBonusSessionCommand` were not yet exported.
2. `npm.cmd run test:run -- src/services/progress-repository.test.ts`
   - Expected and observed: six failures because the two public repository methods were absent and a legacy v2 payload did not yet receive the new default fields.

These failures named missing behavior rather than test setup failures. They established the command APIs and compatibility behavior before their production implementations were added.

### GREEN

`npm.cmd run test:run -- src/domain/progress-commands.test.ts src/services/progress-repository.test.ts`

- Passed: 2 files, 20 tests.
- Covers duplicate grants across reloads, one-revision atomic starts, command retry idempotency, zero-selection non-consumption, write-failure reload safety, and v1/v2 defaulting.

## Verification

- `npm.cmd run test:run -- src/domain/progress-commands.test.ts src/services/progress-repository.test.ts` — passed, 20 tests.
- `npm.cmd run lint` — passed, no errors or warnings.
- `npm.cmd run typecheck` — passed.
- `git diff --check` — passed.
- `npm.cmd run test:run` — passed, 10 files and 55 tests.

## Self-review

- The command record is keyed by `commandId`, so retries return the original session and question IDs before attempting a new selection or entitlement change.
- The start command computes the selected questions before entitlement mutation; an empty selection leaves the original state reference intact.
- Repository saves occur only after an applied command result, so duplicate/no-question/ad-required results do not advance revision.
- Checksum verification uses the original serialized payload while returned legacy v2 state is normalized, avoiding a false checksum mismatch for valid old envelopes.
- Storage write failures reject before any new valid envelope is persisted; reload reads the prior complete slot state.

## Concerns

None for Task 1. Task 2 must consume `bonusStartCommands` for reload restoration and call `grantBonusTicket` after a rewarded-ad completion before calling `startBonusSession`.

## Follow-up fix — prototype-key command IDs

### Root cause and scope

- Review identified that `state.bonusStartCommands[commandId]` reads inherited `Object.prototype` members. A valid ID such as `__proto__` was therefore incorrectly treated as an already completed command.
- The fix limits duplicate detection to own records with `Object.hasOwn`; no entitlement, storage, or UI behavior was otherwise changed.

### Regression TDD evidence

- RED: `npm.cmd run test:run -- src/domain/progress-commands.test.ts` failed exactly once. The new `__proto__` test expected `{ applied: true, source: "first_free" }` but received `{ applied: false, source: undefined }`, proving that inherited lookup entered the duplicate branch.
- GREEN: `npm.cmd run test:run -- src/domain/progress-commands.test.ts src/services/progress-repository.test.ts` passed 2 files and 21 tests after the own-property guard was added.

### Follow-up verification

- `npm.cmd run lint` — passed, no errors or warnings.
- `npm.cmd run typecheck` — passed.
- `git diff --check` — passed.
- `npm.cmd run test:run` — passed, 10 files and 56 tests.

### Follow-up self-review

- The regression uses real command execution and proves both first-use behavior and retry idempotency for a prototype-key ID.
- `Object.hasOwn` leaves normal persisted command record lookup unchanged while excluding inherited object members.
