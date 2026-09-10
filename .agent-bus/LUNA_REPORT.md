# LUNA IMPLEMENTATION REPORT

## Identity
- Task ID: ANF3-20260910-002
- Iteration: 6
- Status: IMPLEMENTATION_COMPLETE

## Files Changed
- `js/print-em-air.js`, `js/print-compressed-air.js`, `validation/test_legacy_air_contract.mjs`
- `apps/web/src/appData.ts`, `apps/web/src/appData.test.ts`, `apps/web/src/App.tsx`
- `apps/web/src/printQueue.ts`, `apps/web/src/printQueue.test.ts`
- `server/pdf_server.py`, `server/tests/test_pdf_server.py`, `validation/benchmark_print_payload.mjs`

## Implementation Summary
- Legacy EM/CA follows every logical `nextCursor` page with repeated-cursor protection, without physical shard names.
- EM/CA detail fetch fails closed: malformed/failed detail clears selection, disables controlled actions, shows an error, and retries by reselecting the row; summaries cannot print.
- Folder/List/Print routes retain building, workflow, secondary filters, and queue-persisted return route.
- Word availability requires a real COM startup/quit probe; null Hwnd is safe; failed Word conversion disables it for this server session before LibreOffice fallback.
- Benchmark accepts a fresh local worksheet number.

## Evidence Rechecked During Implementation
- `RPP2-air-record.gs` already supplies `items` and `nextCursor`; no Apps Script edit/deployment or Sheet mutation.
- Current local `/api/status` reports Word and LibreOffice; Word COM currently starts successfully.
- Seven synthetic/local Iteration 4 Owner DOCX/PDF pairs remain present; Owner checklist was not changed.

## Tests / Commands Run
1. `node validation/test_legacy_air_contract.mjs`
   - Result: PASS
   - Notes: executes EM/CA 101-item pagination and repeated-cursor rejection.
2. `pnpm test`
   - Result: PASS
   - Notes: 12 files, 88 tests, including scoped routes/queue return.
3. `pnpm check` and `pnpm build`
   - Result: PASS
   - Notes: existing large-chunk advisory only.
4. `python -m pytest server/tests -q`
   - Result: PASS
   - Notes: 12 tests, including broken Word + LibreOffice, LibreOffice-only, no converter, PID timeout cleanup, cache.
5. `node validation/validate_launchers.mjs`, `node validation/validate_non_game_contract.mjs`, `node validation/test_cv_contract.mjs`, `git diff --check`
   - Result: PASS

## Artifacts Inspected
- Existing seven `AUDIT-I4-*` synthetic/local DOCX/PDF pairs in `words/` and `pdfs/` remain for Owner visual inspection.
- Fresh local benchmark: `words/pw-prw/BENCH-I5-PW.docx` and matching ignored PDF cache artifact.

## Regression Checks
- Logical Air pagination/detail safety, scoped List/Print navigation, converter fallback/cache, CV/launcher/non-game contracts: PASS.

## Performance Evidence
- Historical Astra baseline: broken Word then LibreOffice CA request about 5.38 s; direct LibreOffice same DOCX about 3.51 s.
- Deterministic server regression proves `Cannot convert null to System.IntPtr` tries Word once, then LibreOffice; the next request skips Word.
- Current capability-probed working-Word local PW fixture: fresh request-to-PDF 6668.66 ms; cache hit 35.14 ms. This is not claimed as a direct before/after comparison to the historical broken-Word+LibreOffice path.

## Diff Review
- Unrelated changes: Existing Iterations 1-4 changes remain; Iteration 5 changes are limited to audit findings and tests.
- Generated artifacts accidentally tracked: NONE.
- Debug residue: NONE.
- Secrets/sensitive data: NONE added.

## Known Limitations
- Owner visual results for seven pairs are not yet recorded; Luna did not certify them.
- Broken Word cannot be reproduced on this machine because the COM probe now succeeds; it is covered by deterministic server regression.

## Unresolved Questions
- Owner must complete `.agent-bus/OWNER_VISUAL_CHECK.md`.

## Iteration 6 Correction

### Files Changed
- `VERSION.txt`
- `apps/web/src/App.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/appData.test.ts`
- `apps/web/src/recordScope.test.ts`

### Implementation Summary
- Release identity is now `7.1u`; `START-ANF3.bat` sees a different master/local version and performs its existing safe copy-down before launch. No installed local copy was edited.
- Water, Air, and Cleaning Validation rail entries open the unified `/list` with the current Building and domain scope.
- `ListPage` now requests only the selected domain where present and applies `filterRecordScope()` before grouping, so an old Water/Air deployment returning mixed buildings cannot display another building's records.
- Unified List now has independent row checkboxes, Select all, selected count, Clear, and Print selected. One print queue may contain one workflow only; selecting more than one Work gives a visible safe error rather than creating a mixed workflow print. The stored return route remains the exact List query.
- Added List toolbar/row intrinsic layout rules to contain controls without global clipping.

### Apps Script Deployment Readiness
- Local `google/app-scripts/RPP2-water-record.gs` and `RPP2-air-record.gs` retain their logical building-filter implementation; no local Apps Script change or external deployment was needed.
- Owner action, not performed by Luna: in the Water Apps Script project and separately in the Air Apps Script project, use **Deploy -> Manage deployments -> Edit -> Version: New version -> Deploy**. Then perform read-only `action=search` checks for B10/B12/B16/Other for PW/WFI/EM/CA and verify every returned `building` remains in the requested segment.

### Tests / Commands Run
1. `pnpm test`
   - Result: PASS — 12 files, 90 tests.
2. `pnpm check`
   - Result: PASS.
3. `pnpm build`
   - Result: PASS — rebuilt release `dist`; existing large-chunk advisory only.
4. `python -m pytest server/tests -q`
   - Result: PASS — 12 tests.
5. `node validation/validate_launchers.mjs`
   - Result: PASS.
6. `node validation/test_legacy_air_contract.mjs`
   - Result: PASS.
7. `node validation/validate_non_game_contract.mjs`
   - Result: PASS.
8. `git diff --check`
   - Result: PASS.

### Regression Checks
- `recordScope.test.ts` now proves client-side removal of mixed B10/B12/Other summaries.
- `appData.test.ts` retains scoped binder list-route coverage.
- Existing print queue return-route tests remain part of the 90-test frontend run.

### Known Limitations
- Copied `%LOCALAPPDATA%` release and live Water/Air building response cannot be declared verified until Owner runs the launcher after publishing Water/Air as a New Version; Luna did not deploy or edit that local installed release.
- Owner visual document checklist remains open and was not certified by Luna.

## Requested Next State
READY_FOR_ASTRA_AUDIT

## Iteration 7 Correction

### Identity
- Task ID: ANF3-20260910-002
- Iteration: 7
- Status: IMPLEMENTATION_COMPLETE

### Files Changed
- `apps/web/src/App.tsx`, `appData.ts`, `presentation.ts`, `printFill.ts`, and focused tests
- `server/pdf_server.py`, `server/tests/test_pdf_server.py`
- `google/app-scripts/RPP2-cv-record.gs`
- active legacy print/list pages and shared print scripts
- `DESIGN.md`, cabinet matrix/manifest, and validation contracts

### Implementation Summary
- Split Other into Water, Air, CA, and CV binders while retaining logical `Other` filtering and source-building display.
- Added searchable List fields, per-workflow errors, compatible-only selection, scoped return routes, and readable record/sample labels.
- Added a closed Fill in / Edit before print drawer with local-only drafts, reset, explicit preview generation, and preview invalidation on edits.
- Added controlled server replacement: a typed conflict response, exact-ID confirmation, temporary DOCX/PDF/sidecar validation, atomic promotion, and rollback safety on failed conversion.
- Preserved CV Rinse blank initial results/replicates and the tag-to-sampling-point contract in the local Apps Script source.

### Tests / Commands Run
1. `pnpm test` — PASS (13 files, 93 tests)
2. `pnpm check` — PASS
3. `pnpm build` — PASS (existing large-chunk advisory)
4. `python -m pytest server/tests -q` — PASS (14 tests; includes Contact/Rinse conflict and rollback)
5. `node validation/validate_launchers.mjs` — PASS
6. `node validation/validate_non_game_contract.mjs` — PASS
7. `node validation/test_cv_contract.mjs` — PASS
8. `node validation/test_legacy_air_contract.mjs` — PASS
9. `git diff --check` — PASS

### Artifacts Inspected
- NONE newly generated. Existing document artifacts were not regenerated because the task must not overwrite controlled output as a test.

### Regression Checks
- Typed cabinet/list contract, logical CV routing, legacy Air pagination, server conversion fallback, and non-game freeze checks: PASS.

### Diff Review
- Unrelated changes: pre-existing Iterations 1–6 work remains in the shared dirty checkout and is included only where it belongs to this delivery.
- Generated artifacts accidentally tracked: NONE.
- Debug residue: removed `audit-list-1366.png`; no new debug logs.
- Secrets/sensitive data: NONE added.

### Known Limitations
- Owner-only validation remains: deploy Water/Air (for their already-local read filters) and CV (for this Rinse payload correction) as New Version, then run read-only smoke checks and copied-release browser checks.
- Playwright screenshots/axe and seven real route artifacts were NOT RUN in this session; no claim of their completion is made.
- Astra must audit the committed/pushed state; Luna does not issue final PASS.

### Unresolved Questions
- NONE.

## Launcher Performance Correction

### Files Changed
- `START-ANF3.bat`
- `validation/validate_launchers.mjs`

### Root Cause and Fix
- Root cause: before Flask starts, `:find_server` and every `:wait_for_server` retry spawned one PowerShell `Invoke-WebRequest -TimeoutSec 2` per port for ports 8000–8039. A no-server scan exceeded 30 seconds locally and looked like a hang.
- Fix: one PowerShell process now scans the same complete port range with 50 ms loopback TCP probes and calls `/api/status` only when a port is open. It still checks a recorded port first, validates ANF3 rather than accepting another service, and keeps the 30-second startup deadline.

### Verification
1. Original sequential scan reproduction
   - Result: exceeded 30 seconds before completion.
2. New one-process scan over closed ports
   - Result: 2758 ms locally.
3. `node validation/validate_launchers.mjs`
   - Result: PASS.
4. `git diff --check`
   - Result: PASS.
# LUNA IMPLEMENTATION REPORT

## Identity
- Task ID: ANF3-20260910-002
- Iteration: 8
- Status: RETURNED_FOR_REPLAN

## Files Changed
- `apps/web/src/App.tsx`
- `apps/web/src/appData.ts`
- `apps/web/src/appData.test.ts`
- `apps/web/src/batchPrint.ts`
- `apps/web/src/printFill.ts`
- `apps/web/src/printFill.test.ts`
- `docs/CABINET_WORKFLOW_MATRIX.md`
- `google/app-scripts/RPP2-cv-record.gs`
- `server/pdf_server.py`
- `server/tests/test_pdf_server.py`

## Implementation Summary
- Restored CV Rinse mapping: a tag is used only when explicitly supplied; Pour Plate retains its source average result while replicas remain blank; membrane retains its source result. This local Apps Script source must be deployed as an Owner New Version before it can affect the live system.
- Added rollback-based artifact-set promotion and fault injection coverage for failed mid-promotion. The server continues to create all temporary DOCX/PDF/metadata before any promotion.
- Split Other-Water into explicit PW/PRW and WFI/PUS sections while retaining logical `building=Other` routing.
- Stopped the Print route from mounting the PDF batch renderer until explicit Generate preview; batch renderer now accepts drafts. The drawer shell and allowlisted human labels are present, but the preflight editor, validation wiring, conflict UI, List URL/group/detail contract, smoke validator, and browser/artifact/copy-down evidence remain unfinished.
- Corrected Other rows in the cabinet matrix to match its declared semantic columns.

## Evidence Rechecked During Implementation
- `RPP2-cv-record.gs` local helper expectations require blank manufactured tags, `resultAvg` for Pour Plate, and `result` for membrane.
- `BatchPreview` posts to `/api/pdfs` only from its render effect; PrintPage now mounts it only after explicit Generate preview.
- `documentPayload` retains legacy aliases internally; `printFill` now allowlists user-facing labels instead of deriving them from arbitrary payload keys.

## Tests / Commands Run
1. `pnpm test`
   - Result: PASS
   - Notes: 13 files, 93 tests passed.
2. `pnpm check`
   - Result: PASS
   - Notes: TypeScript project build check passed.
3. `python -m pytest server/tests -q`
   - Result: PASS
   - Notes: 17 tests passed, including injected mid-promotion failures.
4. `git diff --check`
   - Result: PASS
   - Notes: no whitespace errors.
5. Browser/axe, copied-release, seven DOCX/PDF artifact routes, and live deployment smoke
   - Result: NOT RUN
   - Notes: Iteration remains incomplete; no external deployment was attempted.

## Artifacts Inspected
- NONE. No authoritative DOCX template or generated artifact was changed or created.

## Regression Checks
- Other binder typed-registry tests: PASS.
- CV server conflict/conversion-failure tests: PASS.
- Full requested List/Fill-in browser regressions: NOT RUN; implementation incomplete.

## Diff Review
- Unrelated changes: NONE among the staged product files.
- Generated artifacts accidentally tracked: NONE.
- Debug residue: NONE added by this iteration.
- Secrets/sensitive data: NONE.

## Known Limitations
- This is a resumable checkpoint, not audit-ready. F1/F2/F3/F7/F8/F10 remain incomplete; F5 still needs removal/cleanup fault coverage and integration-level promotion failure proof.
- The current Print preflight contains the required generation gate but not the real per-worksheet editable draft form; do not represent it as finished.
- The Apps Script source is intentionally not deployed.

## Unresolved Questions
- NONE. Continue only within the bounded Iteration 8 packet.

## Requested Next State
LUNA_IMPLEMENTING
