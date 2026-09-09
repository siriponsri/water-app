
# ANF3 Share-Drive Release Goal

## Mission

Deliver a supported Windows release that a non-technical laboratory user can launch by double-clicking `START-ANF3.bat` from a UNC/share-drive folder. The launcher must copy a complete release to a per-machine local directory, validate its runtime, start the local Flask service, open the browser, and support document generation without Node.js, pnpm, or administrator access.

The browser remains read-only. Production Google Sheets and Apps Script deployments must never be mutated by this work. Official DOCX templates and owner-only documents are controlled assets: they may be present in the share-drive release, but must never be committed to Git.

## Current evidence

`docs/TASKS.md` is the source list of the twelve reported work areas. The active source already contains fixes for multi-value Air/Water filters, building filters, `samplingPoints`, `gradeControl`, `floor`, date/result formatting, cache isolation, CV routing, and batch-preview abort handling. These fixes still require real-template and deployed-endpoint verification.

The following defects or release gaps are confirmed in the current checkout:

1. `START-ANF3.bat` excludes `dist/` while `server/pdf_server.py` requires `dist/index.html`; a first launch from a share drive can therefore return a frontend 404.
2. The launcher does not preflight `dist`, controlled templates, endpoint configuration, or PDF converter availability with a clear user-facing result.
3. Share-drive refresh can mirror files while a local server is still running; repeated launches must reuse a healthy server or coordinate refresh safely.
4. `/list` is not registered in the React router; `searchAllSystem()`, `samplingPoints`, and `performedDate` are not presented in a grouped list.
5. Building context is not persisted and rail/domain links do not consistently carry a selected building; “all buildings” must be explicit.
6. `/print/:domain/:workflow` is absent. `printQueue.ts` and `printFill.ts` exist but are not integrated into navigation and generation.
7. The document payload truncates rows at template capacity without an explicit reject or page split when a record exceeds capacity.
8. A changed payload produces a new internal PDF hash but can overwrite the existing user-facing `words/<workflow>/<worksheetNo>.docx`; this needs `GENERATE`, `NO_CHANGE`, and controlled `CONFLICT` behavior.
9. Generated DOCX output has no final unresolved-placeholder gate.
10. PDF generation performance still hashes the full template, unzips/rezips the full document, starts Word per file, and renders batch records serially.
11. The current public checkout is missing controlled templates and owner documents, so release validation is hard-coded to fail. Validation must distinguish public-source checks from controlled-release checks.
12. Validation and release scripts still reference deleted Markdown files; README links must not point to missing documents. `package-lock.json` is redundant beside `pnpm-lock.yaml`.

Apps Script source currently implements the intended comma-separated filters and OT routing. Treat live deployment state as unverified until tested against non-production Sheets and the deployed `/exec` URLs. Preserve B11/B19 → OT behavior and all historical worksheet numbers unless the owner gives a separate business decision.

## Implementation order

### A. Establish a clean release contract

- Keep only `README.md` and `docs/GOAL.md` as public Markdown documentation.
- Ignore `templates/`, generated `words/` and `pdfs/`, `release/`, caches, and machine-local state.
- Make validation work in two modes: public source mode and controlled release mode.
- Remove stale references to deleted docs and remove `package-lock.json`.
- Keep official templates in the share-drive release or a separately controlled asset directory; never stage them.

### B. Make the launcher genuinely all-in-one

- Copy `dist/`, `config.json`, and controlled templates from the share master to `%LOCALAPPDATA%\ANF3-Laboratory-Records`.
- Continue excluding `.venv`, `node_modules`, `words`, `pdfs`, logs, ports, caches, `.git`, and release output.
- Reuse a healthy local server before refreshing files; never start duplicate servers.
- Verify `dist/index.html`, `server/pdf_server.py`, all five DOCX files, valid `pyvenv.cfg`, Flask importability, public read URLs, and a Word/LibreOffice converter.
- Repair the Python environment automatically and show actionable errors without requiring Node, pnpm, or admin rights.
- Wait for `/api/status`, open the selected loopback port, and keep all failure paths readable.
- Define the supported release as a prebuilt package: users run the launcher; developers build `dist` before publishing the share-drive release.

### C. Complete the frontend workflow

- Add local-storage building context with an explicit all-building option.
- Add `/list`, grouped by building and work, with worksheet number, sampling date, performed date, and sampling points; preserve offline cache isolation.
- Add `/print/:domain/:workflow`; persist selected records in `printQueue.ts` across navigation.
- Integrate `printFill.ts` so only blank canonical payload keys can be filled locally, and never write those values to System DB.
- Preserve the two-segment `<main>` key so selecting a record does not clear the queue.
- Ensure every page payload includes header fields plus that page’s samples.

### D. Harden documents and PDF generation

- Preserve all authoritative route, field, alias, CV method, worksheet-number, and template-layout contracts.
- Reject or explicitly paginate over-capacity records; never silently drop samples.
- Validate generated DOCX XML for unresolved placeholders before conversion.
- Detect unchanged content as `NO_CHANGE`; detect changed content under an existing worksheet identity as `CONFLICT` or an explicit controlled regeneration path.
- Keep filenames `<worksheetNo>.docx` and `<worksheetNo>.pdf`.
- Optimize I/O only after correctness, keeping `CONVERSION_LOCK`, server-owned route resolution, and Word/LibreOffice cleanup safe.

### E. Verify Apps Script without production mutation

- Use test Sheets to verify multi-value filters, building aliases, sampling-point summaries, OT routing, CV shard names, capacities, duplicate protection, and legacy recovery.
- Confirm the deployed `/exec` revision matches the tested source; saving Apps Script alone is insufficient.
- Require owner approval before any live redeploy or production Sheet operation.

## Acceptance gates

All of the following must pass:

1. A clean Windows laboratory PC with no Node.js or pnpm launches from a UNC share with one double-click.
2. First launch copies a usable `dist`, templates, configuration, and server; second launch reuses the running server; version changes refresh safely.
3. Missing/broken environment, missing template, missing converter, busy port, offline state, and concurrent launch produce actionable messages.
4. Water, Air, CV, all seven PDF routes, all building scopes, and offline cache behavior work with representative fixtures.
5. DOCX and PDF outputs open, preserve template layout, repeat headers on multipage output, resolve expected placeholders, avoid fabricated values, and use worksheet-number filenames.
6. No over-capacity record is silently truncated; changed worksheet content cannot silently overwrite a controlled artifact.
7. Public and controlled validation suites pass, with no stale documentation references and no official DOCX or owner-only Markdown files in Git.
8. The owner confirms non-production Apps Script tests and, separately, approves any required live deployment.

## Required verification commands

```powershell
pnpm install
pnpm check
pnpm test
pnpm build
python -m pytest server/tests
node validation/test_cv_contract.mjs
node validation/test_apps_script_security.mjs
node validation/test_worksheet_numbering.mjs
node validation/test_games.mjs
node validation/validate_non_game_contract.mjs
node validation/validate_launchers.mjs
node validation/validate_styles.mjs
node validation/contrast.mjs
node validation/validate_wiring.mjs --built
python validation/validate_cv_package.py
python validation/validate_release.py
```

Also run browser interaction checks, real-template DOCX/PDF inspection for PW/PRW, WFI/PUS, EM, Compressed Air, CV Contact, CV Pour, and CV Membrane, and a real laboratory-PC timing test for ten documents.

## Handoff rules for Luna Max

- Work evidence-first and make surgical changes.
- Do not redesign the existing frontend.
- Do not edit official templates to compensate for a data or payload bug.
- Do not change B11/B19 numbering semantics, legacy aliases, or physical CV shard names.
- Do not mutate production Sheets, deploy Apps Script, or delete production records.
- Do not commit `templates/`, generated outputs, secrets, or owner-only documents.

## Planner and auditor status

The current implementation pass has completed the local code changes for the building context, `/list`, `/print/:domain/:workflow`, local print-fill controls, template-hash caching, over-capacity rejection, unresolved-placeholder checking, worksheet conflict detection, and launcher preflight. These changes are present in the working tree and require the verification gates below before being called release-ready.

Verified by execution in this checkout: Python syntax compilation, launcher validation, built wiring validation, CV contract checks, worksheet-numbering checks, Apps Script security checks, style validation, and `git diff --check`.

Not verified because this checkout lacks dependencies and controlled assets: TypeScript compilation, Vitest, Python pytest, real DOCX/PDF generation, visual PDF inspection, clean-PC share-drive launch, Microsoft Word/LibreOffice conversion, deployed Apps Script behavior, and production endpoint revision matching. The absence of `templates/`, `OWNER.md`, `PLAN.md`, and `DESIGN.md` is an intentional public-repository policy and must be resolved only by supplying controlled release assets outside Git.

Audit decision: `CHANGES_REQUIRED` until the controlled release package is assembled and the acceptance gates pass on a clean Windows laboratory PC. No production deployment or Sheet mutation was performed.
