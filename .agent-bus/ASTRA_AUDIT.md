# ASTRA AUDIT

## Identity
- Task ID: ANF3-20260910-002
- Iteration: 7
- Verdict: CHANGES_REQUIRED

## Executive Result
Iteration 7 is not accepted. The reported automated suites are reproducible and the committed implementation is on `origin/main`, but the actual implementation still misses required List and Print behavior, violates confirmed CV Rinse data contracts, and does not provide atomic controlled replacement. Owner-only deployment, copied-release, browser, and artifact gates also remain open.

## Findings

### F1 — Print route still generates before Fill-in review
- Severity: blocking
- Evidence: `PrintPage` mounts `BatchPreview`; `BatchPreview` immediately calls `renderBatch()` from its mount effect. The new Fill-in drawer exists only inside record-detail `Actions`, not on `/print/...`.
- Expected: `/print/...` opens with generation stopped and a closed-by-default `Fill in / Edit before print` drawer/sheet for each queued worksheet. No PDF may be generated before explicit review/generation.
- Actual: queued documents generate automatically before the user can review or edit them.
- Required correction: move/integrate preflight drafts into the Print queue flow and make explicit Generate preview the first generation action. Preserve exact return state.
- Required re-test: browser/integration test proving zero `/api/pdfs` POSTs before Generate, then successful generation after editing/resetting each queued worksheet.

### F2 — Fill-in contract is incomplete and can expose implementation keys
- Severity: blocking
- Evidence: `printableFields()` derives labels from every non-hidden DOCX payload key. It hides printable `tagNoNN` and `GradeNN`, has no workflow-specific allowlisted schema, and `resultValueValid` is imported but unused. The dialog has no Cancel action, initial focus, focus trap, Escape handling, or focus restoration.
- Expected: workflow-owned human presentation schemas for all editable printable header/sample/result fields; locked identity/routing/sample shape; validation; Reset, Cancel, and Generate; accessible drawer/sheet behavior; no labels derived from storage or placeholder keys.
- Actual: arbitrary payload keys are auto-humanized, some printable fields cannot be edited, invalid input is not blocked, and the modal interaction contract is incomplete.
- Required correction: replace generic key humanization with allowlisted per-route schemas and connect validation and modal keyboard behavior. Add explicit DOM leakage tests for all routes/states and the forbidden tokens in the packet.
- Required re-test: all seven route schemas, existing-value editing, invalid result values, reset/cancel, keyboard/focus, draft invalidation, and forbidden-token DOM scans.

### F3 — Unified List does not satisfy URL/grouping/detail contract
- Severity: blocking
- Evidence: `ListPage` has local `q/from/to` state but never writes those values to the URL; `groupBy` is not implemented anywhere; rows navigate away rather than opening an in-List Details view. The return route is built from unchanged `searchParams`, so typed filters are not preserved.
- Expected: URL-backed `building/domain/workflow/q/from/to/groupBy`, required Building/Domain/Work grouping modes, lazy full-record Details with human sections, and an exact return query.
- Actual: grouping is fixed, typed filters are transient, and the requested Details interaction is absent.
- Required correction: implement the packet's URL state and grouping contract, lazy Details, and exact return behavior without rendering storage objects.
- Required re-test: URL reload/back-forward, both group modes, single-building grouping, lazy detail fetch, empty/loading/partial-error states, and exact return.

### F4 — Other-Water cannot expose WFI/PUS
- Severity: blocking
- Evidence: `other-water` is hard-wired to `workflow=pw-prw`; tests assert only that route. There is no WFI/PUS destination or section behind this binder.
- Expected: Other-Water exposes both PW/PRW and WFI/PUS with `building=Other`.
- Actual: WFI/PUS is unreachable through Other-Water.
- Required correction: provide an unambiguous two-workflow Other-Water entry while preserving one domain binder and logical Other routing.
- Required re-test: shelf/List parity and both Other-Water routes, including source-location display and selection compatibility.

### F5 — Controlled replacement commit is not atomic
- Severity: blocking
- Evidence: `server/pdf_server.py` promotes DOCX, PDF, and metadata through three sequential `os.replace` calls without backups or rollback. An executed fault-injection repro failed PDF promotion after DOCX promotion: HTTP 500, DOCX content changed, old PDF still served. Existing tests cover conversion failure only, before promotion.
- Expected: failed promotion leaves the complete previous DOCX/PDF/metadata set usable and mutually consistent.
- Actual: a mid-commit failure can leave the worksheet DOCX and PDF representing different content.
- Required correction: implement a recoverable atomic commit strategy under the document lock, with rollback for every promotion/removal failure. Remove superseded artifacts only after the new controlled set is committed.
- Required re-test: inject failure at each promotion and superseded-artifact cleanup step; verify byte-for-byte preservation or complete new-set commit and no orphaned sidecars.

### F6 — CV Rinse Apps Script payload mapping violates confirmed contracts
- Severity: blocking
- Evidence: `RPP2-cv-record.gs` maps `samplingPoint` into `tagNo`, blanks Pour `resultAvg`, and blanks membrane `result`. The same file's helper expectations require blank `tagNo`, Pour `resultAvg === 'TNTC'`, and membrane `result === '134'`.
- Expected: `tagNo` remains blank unless a real source tag exists; CV Pour keeps blank replicates and maps source Result to `resultAvg`; membrane keeps source `result`.
- Actual: sampling point is manufactured as a tag and source results are discarded.
- Required correction: restore the confirmed mapping without fabricating tags or replicates. Do not deploy.
- Required re-test: execute the local CV helper/contract tests for Pour and Membrane and inspect the resulting payload fields.

### F7 — Conflict confirmation does not show the changed fields
- Severity: major
- Evidence: the UI handles conflict with generic `window.confirm('This worksheet has a different generated document...')`; it does not show worksheet identity or human-readable changed fields.
- Expected: explicit per-worksheet confirmation showing human-readable changes before replacement.
- Actual: the operator cannot see what will be replaced or which worksheet is being confirmed.
- Required correction: return/derive a safe changed-field summary and present it through the same allowlisted presentation schema. Confirm the exact worksheet and conflict set.
- Required re-test: both cited CV IDs, cancel path, stale confirmation race, successful confirmation, and no technical-key leakage.

### F8 — Required read-only deployment smoke validator is absent
- Severity: blocking integration
- Evidence: no validator covers PW/PRW, WFI/PUS, EM, and CA across applicable B10/B12/B16/Other routes against configured deployments with cursor termination and returned-building checks. `test_legacy_air_contract.mjs` is a mocked EM/CA contract only.
- Expected: a cursor-aware, read-only deployment smoke validator that rejects cross-building rows and repeated/unterminated cursors.
- Actual: issues 2–5 cannot be proven after Owner deployment with the required evidence tool.
- Required correction: add the read-only validator and documented invocation; it must not mutate Sheets or deploy Apps Script.
- Required re-test: local deterministic fixtures first; after Owner New Version deployment, capture Water/Air (and CV if its mapping changes) read-only smoke output.

### F9 — Cabinet source-of-truth rows are semantically malformed
- Severity: major
- Evidence: `docs/CABINET_WORKFLOW_MATRIX.md` Other rows shift values into the wrong columns (for example `pw-prw` appears under Exact building filter and `Water` under Workflow). Code correctly uses `buildingFilter='Other'`. The validator checks IDs/count only and therefore passes malformed row semantics.
- Expected: matrix, typed registry, and manifest agree on exact building filter, workflow, label, and secondary filters.
- Actual: controlled documentation contradicts active code while validation reports PASS.
- Required correction: fix matrix columns and strengthen parity validation to compare semantic fields. Also reconcile stale release documentation that says the version was not changed.
- Required re-test: intentionally malformed fixture/row must fail the validator; current matrix/registry/manifest must pass.

### F10 — Required browser, installed-release, and document evidence is not complete
- Severity: blocking release gate
- Evidence: Luna explicitly reports Playwright/axe and new artifacts as NOT RUN; Owner visual checklist is unchecked. No isolated copy-down or application-opened-through-`START-ANF3.bat` evidence was supplied. No real cited CV artifacts exist locally.
- Expected: required viewport/zoom/theme/keyboard/accessibility browser matrix, copied Owner release, and seven representative document routes including the two cited conflicts.
- Actual: these gates remain NOT_TESTED. Live deployment remains an Owner-only external action.
- Required correction: after F1–F9, run the packet's safe local browser/copy-down/artifact checks. Do not deploy or mutate production; provide exact Owner commands for external gates.
- Required re-test: record screenshots/console/overflow/axe evidence, installed-release version, seven DOCX/PDF pairs with unresolved-placeholder and visual checks, then Owner post-deploy smoke.

## Verification Reviewed
- VERIFIED_BY_EXECUTION: `pnpm test` — 13 files / 93 tests passed.
- VERIFIED_BY_EXECUTION: `pnpm check` passed.
- VERIFIED_BY_EXECUTION: `pnpm build` passed; existing large-chunk advisory only.
- VERIFIED_BY_EXECUTION: `python -m pytest server/tests -q` — 14 passed.
- VERIFIED_BY_EXECUTION: launcher, non-game, CV, legacy-Air validators and `git diff --check` passed.
- VERIFIED_BY_EXECUTION: atomic-promotion fault injection reproduced a mismatched DOCX/old-PDF state.
- VERIFIED_BY_REPOSITORY_INSPECTION: Print auto-generation, missing Print Fill-in, generic field labels, missing validation/modal behavior, fixed List grouping, absent URL updates/Details, missing Other-WFI route, CV mapping contradiction, generic conflict confirmation, malformed matrix, and missing live smoke validator.
- VERIFIED_BY_REPOSITORY_INSPECTION: commit `d3c5d3f` equals `origin/main`; tracked worktree is clean; release identity is `7.1u`; no tracked generated document/debug artifact or obvious added credential was found.
- NOT_TESTED: live Water/Air/CV deployments, copied installed release, browser/axe matrix, real cited CV conflicts, and seven-route document visual gate.

## Scope Control
Luna must address only the concrete findings above. Do not deploy Apps Script, mutate production Sheets, rename legacy contracts, fabricate laboratory values, change authoritative DOCX layout, expose physical shard names, or redesign Games/archive content.

## Next State
READY_FOR_LUNA_FIX
