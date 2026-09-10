# ANF3 Laboratory Records — Implementation Plan and Approval Gates

**Authority:** This plan is subordinate only to `HANDOFF_LUNA_MAX.md` and current-run owner approvals.  
**Execution rule:** Audit first, ask before major decisions, implement only approved scope, validate before claiming completion.  
**Excluded concurrent work:** Games and all game content.

---

## 1. Objective and success statement

Deliver a replacement-ready full stack for ANF3 laboratory records that:

- maps the physical binder system into a clear Digital Record Cabinet;
- preserves fast 2D operational workflows;
- reads controlled records from Air, Water, and CV System Sheets;
- keeps operational editing in the six Google Sheet projects unless owner-approved otherwise;
- provides approved PDF preview/print/download through the local service;
- gives a no-code owner six copy/paste `Code.gs` files and exact deployment steps;
- is safe to test, cut over, roll back, and maintain;
- leaves Games unchanged.

The work is a controlled rebuild, not a speculative greenfield rewrite. Preserve proven contracts and replace inconsistent or duplicated implementations deliberately.

---

## 2. Workstreams

| ID | Workstream | Primary outputs | Owner gate |
|---|---|---|---|
| W0 | Baseline and audit | Inventory, hashes, risk register, decision brief | Gate A |
| W1 | Architecture/data contract | Approved topology, six-project map, API/schema contract | Gate B |
| W2 | Design system/assets | Cabinet preview, binder mapping, SVG kit, responsive layouts | Gate C |
| W3 | Six Apps Script projects | Six self-contained `Code.gs`, validators, setup helpers | Gate B approved |
| W4 | Frontend | Cabinet/List home, record workspace, health/degraded states | Gate C approved |
| W5 | Local backend | Safe PDF generation/download/save, health API | Gate A approved |
| W6 | Tests/release | Automated checks, owner dry-run, ZIP, rollback | Gate D |

No workstream may modify the excluded Games scope.

---

## 3. Phase 0 — Read-only baseline audit

### Tasks

1. Read every authoritative document in the mandated order, including the audited matrix and CV template-routing contract.
2. Inventory repository files and identify source-of-truth versus generated/legacy copies.
3. Hash `games/**` and save `validation/games-baseline.sha256`.
4. Inspect:
   - six current `apps-script-deploy/*/Code.gs` files;
   - `google/sheets/schema.json` and all six workbook fixtures;
   - `google/spreadsheet-id.json` without copying sensitive values into reports;
   - frontend routes, API URLs, cache, PDF actions, 3D loading, and mobile fallback;
   - Flask host binding, request limits, template allowlists, path handling, and tests;
   - build/release scripts and current ZIP contents.
5. Produce a contradiction table: document says / code does / fixture proves / risk / recommended resolution.
6. Classify all visible controls as working, degraded, disabled-with-reason, or dead. Dead controls fail the gate.
7. Identify any production-only step requiring owner credentials.

### Gate A output

Present a Thai decision brief with the recommended topology and no more than five questions listed in `HANDOFF_LUNA_MAX.md`. Wait for the owner.

### Exit criteria

- No source file modified except audit artifacts.
- Games hash recorded.
- Every major uncertainty is either proven or raised.
- Owner approval is recorded verbatim in `DECISION_LOG.md`.

---

## 4. Phase 1 — Freeze architecture and data contracts

### Default recommendation for owner approval

- Retain Windows local React/Flask distribution for record/PDF work.
- Retain Google Sheets as the controlled operational input.
- Treat System Sheets as normalized read models and numbering authority.
- Use exactly three User bound scripts and three System bound/web-app scripts.
- Allow frontend reads only under the access model the owner/organization approves.
- Use test-clone Sheets before production.

### Required artifacts

1. Six-project responsibility matrix.
2. Per-workflow source-to-normalized-field mapping.
3. Active/legacy sheet allowlists.
4. Request/response schemas with examples.
5. Record identity and retry model.
6. Number allocation and immutability model.
7. Error taxonomy and audit-log schema.
8. Migration/cutover plan stating exactly what changes and what remains untouched.

### Gate B questions

Ask only about discrepancies that materially change data. Do not ask the owner to choose low-level code structure. Obtain approval before creating tabs, adding columns, migrating data, resetting counters, or enabling triggers.

### Exit criteria

- Every target sheet/tab is explicitly allowlisted.
- No arbitrary client-controlled spreadsheet/sheet/field routing.
- Existing worksheet-number behavior is preserved.
- Retry behavior is defined and testable.
- Owner has approved schema additions and migration behavior.

---

## 5. Phase 2 — Design system and visual assets

### Required design work

1. Build a home composition with fixed-camera shelves and readable binder spines.
2. Use building/location as the single semantic meaning of binder color.
3. Keep workflow as text/icon on the spine.
4. Provide `Cabinet | List` parity.
5. Provide a CSS 2.5D mobile binder presentation.
6. Preserve the proven 2D record master-detail workflow and improve its hierarchy.
7. Create original SVG assets when adequate assets are absent; no placeholders.
8. Test light/dark, reduced motion, keyboard, touch, and no-WebGL states.

### Required previews for Gate C

- Desktop 1440×900 cabinet home, light.
- Desktop 1440×900 cabinet home, dark.
- Tablet 768×1024 cabinet/list behavior.
- Mobile 375×812 CSS binder view.
- Desktop record workspace.
- One degraded/offline state.

### Exit criteria

- Owner confirms the already recorded color semantics: B10 blue, B12 violet, B16 mint, Other Locations orange, pink reserve `Coming Soon`.
- All 16 active destinations in `docs/CABINET_WORKFLOW_MATRIX.md` are reachable in Cabinet and List views.
- Binder labels are readable without hover.
- No content relies only on color or 3D.
- No Games screen or asset changed.
- Asset manifest and licenses/origin are documented.

---

## 6. Phase 3 — Rebuild the six Apps Script files

Implement in this dependency order:

1. Air System
2. Air User
3. Water System
4. Water User
5. CV System
6. CV User

System files are implemented first because they own validation, numbering, routing, idempotency, read contracts, and mutation authentication. User files then call only the approved System contract.

### Required behavior common to all six

- `Asia/Bangkok` time semantics.
- Central constant/config block at top with clear `OWNER EDIT` markers only where unavoidable.
- Setup/verify/health/test functions with human-readable Thai result messages.
- No secret hardcoded; use Script Properties.
- Structured logs with a run ID.
- Safe, stable errors without stack/config leakage.
- Bulk range operations rather than cell-by-cell loops where feasible.
- Formula-injection protection for untrusted text.
- No caller-supplied arbitrary sheet/spreadsheet/action/field.

### User projects

- Add an `ANF3 Sync` menu on open.
- Provide a no-code setup wizard/helper for System URL and domain token.
- Validate required headers without deleting or reordering owner data.
- Add only owner-approved control columns.
- Assign/preserve a stable source record ID.
- Send normalized commands with retry-safe idempotency.
- Write back returned worksheet number and sync state only after System success.
- Never mark failure as synced.
- Timed triggers are opt-in and created only after owner approval.

### System projects

- Expose `health/ping`, `search`, `get` reads under approved access policy.
- Authenticate every mutation with the domain token.
- Validate schema and payload before locking/mutation.
- Lock number allocation and mutation.
- Allocate or preserve an immutable worksheet number.
- Route only to the explicit active store.
- Upsert by stable identity and ensure replay/no-op is safe.
- Replace CV child samples deterministically.
- Write audit log without secret/payload overexposure.
- Aggregate active and legacy reads without permitting legacy mutation.

### Exit criteria

- Exactly six copy-ready files.
- Static tests pass for all files.
- Test-clone end-to-end flows pass for each domain.
- A repeated identical sync returns the same identity/number and no duplicate.
- Invalid token, workflow, target, field, date, cursor, and identifier are rejected.

---

## 7. Phase 4 — Frontend and local backend implementation

### Frontend order

1. Normalize domain/building/workflow data model.
2. Implement semantic list view first.
3. Implement cabinet layout with the same navigation model.
4. Lazy-load the desktop 3D enhancement.
5. Implement mobile CSS binders.
6. Wire record search/detail with request cancellation and honest health state.
7. Verify PDF action state policy.
8. Polish accessibility and performance.

### Frontend acceptance

- Cabinet binder selection routes directly to an already-filtered workflow/building record list.
- Global search is usable independently of 3D.
- Mobile never requires hover.
- WebGL failure does not remove a workflow.
- Record actions require a fresh successful System read in the current session.
- CV Contact and both CV Rinse routes use distinct CV-owned route keys and adapters. Contact resolves to the CV Contact template; Rinse-PW/PRW resolves to the approved `pw-prw-template.docx` family and Rinse-WFI/PUS resolves to the approved `wfi-pus-template.docx` family.
- Missing/ambiguous Rinse Test Method blocks generation and asks the user to choose Pour Plate or Membrane Filtration.
- API failures distinguish offline, local service unavailable, and domain service unavailable.
- No mutation URL/token appears in the browser bundle.

### Local backend acceptance

- Binds to `127.0.0.1` by default.
- Uses explicit workflow/template allowlists.
- Rejects path traversal and arbitrary template/output paths.
- Applies JSON size limits and bounded processing.
- Returns an opaque `pdfId`, never an absolute path.
- Save-to-Desktop requires explicit action and handles conflict safely.
- Approved workflow fixtures generate readable PDFs.
- Missing Microsoft Word support yields an actionable error and install guidance.

---

## 8. Phase 5 — Integrated validation

Run tests in this order:

1. Formatting/type/static checks.
2. Unit tests for normalization, numbering, routing, auth, cache policy, and PDF policy.
3. Apps Script static/sandbox tests.
4. Frontend component/routing tests.
5. Flask tests with approved fixtures.
6. Production-like test-clone Sheet smoke tests.
7. Browser integration at required sizes.
8. Keyboard/reduced-motion/no-WebGL/offline/degraded tests.
9. Game freeze diff and regression tests.
10. Clean-machine/no-code-owner dry-run.

Every failed test becomes a finding. Fix defects and rerun the affected group plus the Final Delivery Gate. Do not waive a failure merely because the happy path works.

---

## 9. Phase 6 — Cutover and release

### Pre-cutover

- Back up all six production Sheets.
- Record existing deployment URLs and versions privately.
- Confirm owner-approved access mode.
- Verify test clone with representative Air, Water, CV Contact Plate, and CV Rinse data.
- Confirm Games baseline hash/diff.
- Prepare rollback ZIP and old Apps Script exports.

### Gate D

Give the owner one ordered checklist identifying exactly when authorization prompts, deployment URLs, Script Properties, and triggers are handled. Wait for approval before production mutation or trigger enablement.

### Release package

Include:

- application source and verified built output;
- exactly six production Apps Script files;
- no-code setup/deployment guide;
- design assets and manifest;
- validation evidence and final report;
- apply and rollback instructions;
- version/readme metadata.

Exclude:

- secrets and tokens;
- production data/logs;
- generated record PDFs/Word files;
- `node_modules`, caches, temp files, editor state;
- obsolete independent copies that can be mistaken for production source.

---

## 10. Stop and escalation conditions

Stop and ask the owner when:

- a file/table mapping conflicts with the real workbook;
- a change would affect issued worksheet numbers;
- an operation can delete/move/overwrite production data;
- Apps Script access policy must be loosened;
- a required template or SOP rule is absent;
- a new building/workflow/template would be activated outside the owner-approved registries;
- shared-file refactoring cannot preserve Games confidently;
- production credentials/authorization are needed;
- release success depends on an untested Microsoft Office environment.

Do not stop for normal reversible implementation choices already covered by approved documents.
