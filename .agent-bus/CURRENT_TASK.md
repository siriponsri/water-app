# CURRENT TASK

## Identity
- Task ID: ANF3-20260910-002
- Iteration: 8
- Planner: Astra
- Implementer: Luna

## User Goal
Complete the nine reported defects in the release the Owner opens: redesign all active React and legacy application pages as Records Café while retaining the physical binder core; restore Air/CA/WFI records and true Building scope; split Other by domain; add a real editable Fill-in layer before Print; and allow deliberate controlled replacement of conflicting CV documents.

## Skills Required Before UI Work
Read these project-local skills and all directly referenced guardrails before editing:
- `.agents/skills/web-design-reviewer/SKILL.md` and `references/visual-checklist.md`
- `.agents/skills/frontend-design/SKILL.md`
- `.agents/skills/typeui-fundamentals/SKILL.md`
- `.agents/skills/typeui-fundamentals/accessibility.md`
- `.agents/skills/typeui-fundamentals/spacing-principles.md`
- `.agents/skills/typeui-fundamentals/typography-principles.md`
- `.agents/skills/typeui-fundamentals/ui-principles.md`
- `.agents/skills/typeui-fundamentals/ux-principles.md`
- project `$anf3-debug`, `$anf3-document-pipeline`, and `$karpathy-guidelines`

Use installed skills as design/build/audit guidance. The TypeUI Café page returned HTTP 429 during Astra research; do not claim pixel study or copy it. Source of truth is the Owner-approved Records Café direction, `DESIGN.md`, and physical binder assets.

## Verified Current State
- Iteration 6 automated tests pass but Astra audit found seven blocking/major findings.
- React sends logical Building/type filters and defensively filters mixed-building summaries.
- Local Water/Air Apps Script supports filters; configured live deployments previously ignored Building and require Owner New Version deployment plus read-only proof.
- List lacks requested search/group/detail design and models errors globally.
- Other is one binder; no Other-CV binder exists.
- Print auto-renders; record detail has only blank-key fill fields.
- `/api/pdfs` fails closed on changed content but provides no controlled resolution.
- Raw record/payload keys can be rendered to users.

## Source-of-Truth Evidence
- Iteration 6 `.agent-bus/ASTRA_AUDIT.md` and actual working-tree diff.
- `DESIGN.md`, `design-assets/manifest.json`, `docs/CABINET_WORKFLOW_MATRIX.md`.
- React List/scope/group/document/print modules under `apps/web/src/`.
- local Water/Air Apps Script and `server/pdf_server.py` plus tests.
- authoritative templates and seven document routes in `AGENTS.md`.
- active legacy pages share `css/anf3-v7.css`; Games and `_archived/` are excluded.

## Execution Path
`START-ANF3.bat` → copied dist/config → binder/domain/building List → logical Apps Script search/get → scoped selection → Print preflight Fill-in draft → server-owned document payload/template → GENERATE/NO_CHANGE or confirmed replace → DOCX/PDF → exact List return.

## Required Changes

### 1. Records Café design system on active application surfaces
- Update `DESIGN.md` before component/CSS changes. Preserve shelf/binders, existing building colors, binder shapes/assets, route ownership, and Games freeze.
- Apply to all React routes and active legacy HTML; exclude Games, `_archived/`, diagnostic tools, and DOCX template layout.
- Direction: laboratory reading room / records café, not literal café decoration. Use paper/surface/wood/ink hierarchy, ruled finding-aid structure, and building-color binder markers. No generic card wall, glass, gradients, emoji icons, or decorative metrics.
- Use Maitree for restrained headings, IBM Plex Sans Thai for UI/body, IBM Plex Mono only for worksheet/code. Use local font assets and remove legacy runtime Google Fonts.
- Preserve dark mode and WCAG AA; verify 320/375/414/768/1024/1280/1366/1920 plus 125%/200% zoom.

### 2. Unified List as a readable registry
- Support URL state: `building`, `domain`, `workflow`, `q`, `from`, `to`, and `groupBy=building|work`; default Building → Domain → Work, while single-Building scope groups Domain → Work.
- Show worksheet, human workflow, exact source building, dates, status, product/sampling points, sample count, and CV method where present. Load full record only when Details opens.
- Present Details in human sections: General, Sampling, Media, Results, Approval. Never dump storage objects.
- Model loading/errors per workflow and keep successful groups visible.
- Keep server filtering plus defensive client Building filtering before display.
- Restrict selection to one compatible PDF route/workflow at a time; disable incompatible rows with explanation, make Select all group-compatible, clear/reconcile selection when scope changes, and preserve exact return query.

### 3. Restore and prove Air/CA/WFI data
- Add a cursor-aware read-only deployment smoke validator for PW/PRW, WFI/PUS, EM, and CA over applicable B10/B12/B16/Other routes. Verify every returned item matches Building and cursors terminate safely.
- Do not deploy. Provide exact Owner New Version steps for Water and Air, then require post-deploy smoke evidence and copied-release browser evidence before PASS.
- Keep logical API fields only; never add shard names to frontend requests/UI.

### 4. Split Other binders
- Replace combined Other with `Other-Water`, `Other-Air`, `Other-CA`, and `Other-CV`, all using the existing Other color/asset family and `building=Other`.
- Other-Water exposes PW/PRW and WFI/PUS; Other-Air exposes EM; Other-CA exposes CA/N2; Other-CV exposes Contact and Rinse routing.
- Preserve exact Building 11/19/unknown source text when available and OT numbering/storage compatibility.
- Update typed registry, shelf/List parity tests, `DESIGN.md`, cabinet matrix, manifest capacity metadata, and validators.

### 5. Print preflight Fill-in
- Stop automatic generation on `/print/...`. Add a closed-by-default desktop side drawer/mobile bottom sheet named `Fill in / Edit before print`.
- Select queued worksheet, prefill all template-printable header/sample/result fields, allow edits to existing values, and keep per-worksheet local drafts without mutating System DB.
- Lock worksheet/document identity, record key, domain/workflow/building, sample family/method/template route, sample count, and row order. Do not add/delete/reorder samples.
- Results accept blank, numeric text, `<1`, `TNTC`, and legacy text. Provide Reset to System DB, Cancel, dirty/stale state, validation, and explicit Generate preview.
- Draft changes invalidate preview and block Print/Download until regeneration.
- Define workflow-specific presentation/edit schemas; never derive visible labels from placeholder/storage keys.

### 6. Controlled replacement contract
- Conflict response code is `WORKSHEET_CONTENT_CONFLICT` with worksheet/workflow/requested PDF id and sorted existing PDF ids.
- Confirmed retry sends `regeneration.mode=replace`, requested id, and exact existing id set.
- Inside document lock, re-check identity/set, build DOCX/PDF/metadata in temporary paths, validate placeholders/conversion, atomically replace worksheet DOCX, then commit new PDF/metadata. Remove superseded PDF/metadata only after success.
- Owner policy: no revision archive. New metadata records regeneration time and superseded ids. Failed conversion leaves old artifacts usable.
- UI displays human-readable changed fields and requires explicit per-worksheet confirmation. Never silently overwrite.
- Cover `CV-26-B10-0001` Contact and `CVR-26-B16-0001` Rinse Membrane.

### 7. Prevent technical-language leakage
- English is primary. Map internal fields to user terms such as Average result, Result I, Membrane lot, Sampling point, and Test method.
- Never display `samplesJson`, `templatePayload`, placeholder names, serialized JSON, or raw aliases such as `resultAvg`, `result1`, `lotPMembrane`, `leftEM`. Preserve them internally.
- Render samples as workflow-aware rows/forms. Add DOM leakage tests across List, Details, Fill-in, Print, errors/empty/loading, and representative legacy pages.

### 8. Release identity and installed-app evidence
- Increment release identity after implementation, rebuild dist, and validate isolated copy-down plus application opened through `START-ANF3.bat`. Do not edit installed copy as the product fix.

## Must Preserve
- Apps Script schemas, logical API contracts, worksheet formats/history, CV Test-Method routing, template families/placeholders/layout, per-page header semantics, and `<worksheetNo>.docx/.pdf`.
- Missing data stays blank; never fabricate results, lots, tags, approvals, replicates, or dates.
- Existing user changes in the dirty worktree.
- No physical shard names in frontend.

## Must Not Do
- Do not deploy/reconfigure Apps Script or mutate production Sheets.
- Do not rename legacy contracts for cleanliness.
- Do not edit authoritative DOCX layout.
- Do not redesign Games, `_archived/`, or diagnostic tools.
- Do not claim live/visual/installed verification without execution.

## Verification Required
- Unit/integration: URL/grouping/filtering, mixed rows, partial failure, compatible selection, scope reset, exact return, Other routes, presentation schemas, forbidden-token scan, Fill drafts, and conflict states.
- Server: GENERATE, NO_CHANGE, conflict payload, invalid/stale confirmation, success, failed-conversion rollback, concurrency.
- Documents: all seven routes; cited CV conflicts; open DOCX/PDF, filenames, routes, no unresolved placeholders, visual correspondence.
- Browser: target widths/zoom, light/dark, keyboard/focus, reduced motion, loading/error/empty, drawer/sheet, dirty preview, conflict confirmation; save before/after screenshots and axe zero critical.
- Active legacy route smoke for representative menu/list/form/print per domain plus leakage scan.
- `pnpm test`, `pnpm check`, `pnpm build`, Python tests, launcher/Air/CV/non-game/style/asset checks, `git diff --check`, final diff/artifact/secret/debug review.
- Owner-only: Water/Air New Version deployment and post-deploy smoke; seven-route visual checklist.

## Definition of Done for This Task
- [ ] All nine issues pass through the copied Owner release.
- [ ] Records Café is cohesive across React and active legacy pages while binders remain core navigation.
- [ ] Air/CA/WFI live rows are proven after Owner deployment.
- [ ] Other has four domain binders with correct routes.
- [ ] Print Fill-in edits printable fields without changing System DB.
- [ ] Controlled replace resolves both cited CV conflicts without silent overwrite or partial failure.
- [ ] No internal JSON/key/placeholder language is visible in normal frontend states.
- [ ] Automated, browser, artifact, installed-release, and Owner gates are documented honestly.

## Known Risks / Stop Conditions
- Water/Air deployment is an Owner external action; Luna stops short of deployment.
- If active source/template/workbook evidence conflicts on laboratory meaning, return to Astra rather than guessing.
- If legacy redesign exposes incompatible duplicate runtime contracts, preserve behavior and report exact evidence before architectural replacement.

## Iteration 8 Correction Scope
Read `.agent-bus/ASTRA_AUDIT.md` in full before editing. Resolve F1–F10 without broadening the task. In particular, restore the confirmed CV Rinse mappings before any external deployment, make controlled replacement rollback-safe under injected commit failures, place Fill-in before generation in the actual Print queue, replace generic payload-key labeling with per-route schemas, complete the List URL/group/detail contract, expose both PW/PRW and WFI/PUS from Other-Water, and add the read-only deployment smoke validator.

Run the original Iteration 7 suites plus every Required re-test listed in the audit. Browser, installed-release, and seven-route artifact evidence must be produced after the code corrections. Live Apps Script deployment remains Owner-only and must not be performed by Luna.

## Handoff State
READY_FOR_LUNA_FIX
