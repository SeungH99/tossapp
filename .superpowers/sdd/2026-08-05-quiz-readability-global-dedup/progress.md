# SDD ledger — plan: docs/superpowers/plans/2026-08-05-quiz-readability-global-dedup.md

Baseline: f6efce0; verify:quality passed (25 files, 223 tests).
Pre-flight ruling: Task 5 keeps production nostalgia-only until Task 6 registers validated new packs; Task 4 uses releasedSetCount=180 default until Task 7 passes catalog inventory; Task 2 updates all direct typed fixtures required by typecheck.
Task 1: dispatched at base f6efce0 to /root/task1_readability.
Task 1: complete (commits f6efce0..a46c9f4, review clean).
Task 2: dispatched at base a46c9f4 to /root/task2_concepts.
Task 2: fix round 1/5 (3 addressed, 0 open; commits 495bf7f..48b56c3).
Task 1: minor (deferred): `isLongQuestion` export in App.tsx triggers one react-refresh warning; remove or move it when Task 7 next edits App.tsx, and require pristine lint at Task 9.
Task 2: complete (commits a46c9f4..48b56c3, review clean).
Task 3: dispatched at base 48b56c3 to /root/task3_progress_v4.
Task 3: minor (deferred): V4 shadow-audit rejection tests use schemaVersion 3 envelopes and may reject before payload normalization; final review must decide whether to add a V4 envelope helper.
Task 3: minor (deferred): concept-map sorting uses localeCompare instead of an explicit ordinal comparator; final review must triage reproducibility risk.
Task 3: complete (commits 48b56c3..5fdc658, review clean with 2 deferred minors).
Task 4: dispatched at base 5fdc658 to /root/task4_skip_sets.
Task 4: complete (commits 5fdc658..8771f5b, review clean).
Task 5: dispatched at base 8771f5b to /root/task5_catalog.
Task 5: complete (commits 8771f5b..69e22e5, review clean).
Task 6: dispatched at base 69e22e5 to /root/task6_content.
Task 6: initial implementation complete (commits 032c803, 59b93bf; 12 packs, 1080 questions, 360 sets).
Task 6: review round 1 found invalid dictionary listings, ambiguous language answers, and weak stretch distractors; addressed in 5381c469.
Task 6: review round 2 narrowed to categorical listing rejection and three Korean-life stretch items; addressed in 017236bf.
Task 6: final surgical salt-preservation difficulty fix addressed in 78600756.
Task 6: complete (commits 69e22e5..78600756, final review clean; focused 30/30, full 26 files/251 tests, typecheck and full content validation passed).
Task 7: dispatched at base 78600756 to /root/task7_app_wiring.
Task 7: initial implementation c760864; review found 200% reflow, radio keyboard, and stale E2E selector issues.
Task 7: accessibility/E2E fix 5d785699; re-review found exhausted-selected-topic tab-stop edge case.
Task 7: final radio fallback fix 95dd389; review clean.
Task 7: complete (commits 78600756..95dd389; App 45/45, full 26 files/257 tests, typecheck, scoped lint, content validation 12/1080/360, Chromium 360/390 accessibility flows passed).
Task 8: dispatched at base 95dd389 to /root/task8_e2e.
Task 8: initial E2E commit 751a556; review found invalid locally-generated windows-ci snapshot provenance and two browser-proof gaps.
Task 8: local fix fbc660a strengthened reward-order/privacy proofs and restored windows-ci baselines; local review clean.
Task 8: local verification complete (Chromium 24/24, WebKit 24/24, full local E2E 84/84, Vitest 257/257, typecheck/lint/content validation passed).
Task 8: external pending: push/PR required to run windows-latest, collect and visually approve four runner-produced bonus-offer windows-ci baselines, then commit them.
Task 8: PR #9 run 30998050274 produced deterministic runner actuals for eight affected windows-ci snapshots (bonus-offer and explanation across Chromium/WebKit at 360/390); visually approved and committed in fddfc95 with provenance report 04d3495.
Task 8: complete after PR #9 run 30998763833 passed quality, e2e-chromium, e2e-webkit, and release-build.
Task 9: complete (commit c706057; task review clean; release documentation, final V4 shadow-audit fixture coverage, and locale-independent concept-map ordering complete; raw lint only remains obstructed by protected `.gstack` deletion, while scoped pristine-source lint passed).
Final review fix wave: seven findings reproduced and addressed without changing the 12-pack / 1,080-question / 360-set release contract.
Final review fix wave: historical concept and stable-row restoration committed in e30f15c; released-inventory and measured V4 storage-budget fixes committed in 247a798; exact cross-day restore and grapheme-boundary fixes committed in 16657fb.
Final review fix wave: focused verification passed (concept/migration/generator/content, storage-domain 91/91, App 54/54).
Final review fix wave: full local gate passed — lint excluding only protected `.gstack`, typecheck, content 12/1080/360, non-mutating concept map 1260, Vitest 29 files/282 tests, Playwright 84/84, and production `.ait` build. Artifact 417,718 bytes, SHA-256 F3C474C8A1A7CD6335B2236A8E93084BB4743B3EFBD7A717B4B62D88A1E8AE78, deployment 019fd1dc-658a-74e1-b7a5-f2dab3c79e55.
