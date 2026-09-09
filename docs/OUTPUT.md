# ANF3 Implementation Output

Date: 2026-09-09  
Implementer: Luna / implementation session  
Branch: `main`  
Remote: `origin/main`  
Base commit before this handoff: `fe286d6` (`feat: harden share-drive release workflow`)  
Status: `IMPLEMENTATION_COMPLETE` for the public source checkout; `AUDIT_REQUIRED` for controlled-release verification.

This document is the handoff to the planner and auditor session. It records the implementation, the commands actually executed, the evidence obtained, and the checks that still require controlled assets or external systems.

## STATUS

The local implementation is complete and the public-source verification gates pass.

The changes harden the supported share-drive release path, protect the local DOCX/PDF generation flow, validate placeholders across all Word XML parts, make incomplete caches regenerate safely, and make public validation usable without owner-only documents or controlled DOCX templates.

No production Google Sheet, Apps Script deployment, live endpoint, controlled template, or owner-only document was modified.

The final repository-level decision remains with the planner/auditor session because the controlled release package and target laboratory PC are not available in this checkout.

## FILES CHANGED

Tracked product and validation changes:

- `BUILD-DIST.bat` — points runtime configuration to the release-root `config.json` and documents the no-rebuild configuration workflow.
- `CREATE-DIST-ZIP.ps1` — updates the release handoff text to the current public documentation entry points.
- `START-ANF3.bat` — hardens share-drive copying, local locking, healthy-server reuse, version refresh behavior, port discovery, runtime/configuration checks, converter checks, and readable failure paths.
- `apps/web/src/api.ts` — loads runtime endpoint configuration from the release root beside `START-ANF3.bat`.
- `apps/web/src/documentPlaceholders.test.ts` — skips the controlled-template gate when the public checkout does not contain controlled templates, while still running it strictly when those assets are supplied.
- `apps/web/src/node-builtins.d.ts` — declares the narrow `existsSync` surface required by the placeholder gate without importing global Node types into browser code.
- `docs/archive/LUNA_MAX_GOAL.txt` — reduces the archived handoff to a historical note and points active instructions to the current repository contracts.
- `server/pdf_server.py` — replaces placeholders in every Word XML part, checks unresolved placeholders across those parts, serializes document generation, regenerates incomplete cache pairs, preserves worksheet identity/conflict behavior, and supports disabling automatic browser opening for controlled smoke tests.
- `server/tests/test_pdf_server.py` — verifies body/header/footer replacement and the incomplete DOCX cache path.
- `validation/games-baseline.sha256` — removes the hash entry for the deleted stale document.
- `validation/validate_cv_package.py` — supports public-source mode and controlled-release mode for the CV template gate.
- `validation/validate_launchers.mjs` — checks the launcher lock, config validation, public `/exec` URL rule, converter preflight, status wait, and port scan contract.
- `validation/validate_non_game_contract.mjs` — supports an optional controlled release directory and uses the typed frontend/server registries when owner-only contracts are absent from the public checkout.
- `validation/validate_release.py` — separates public source checks from controlled package checks and validates controlled runtime configuration when supplied.
- `package-lock.json` — removed because this repository uses `pnpm-lock.yaml` as its package lock.
- `docs/OUTPUT.md` — this implementation and verification handoff.

Pre-existing user-provided untracked instruction/reference files were preserved and were not deleted or rewritten: `AGENTS.md`, `.claude/skills/README.md`, `design-assets/README.md`, `docs/README.md`, and `docs/TASKS.md`.

## IMPLEMENTATION SUMMARY

### Share-drive launcher

`START-ANF3.bat` now keeps the supported execution model on the local machine. It refuses to start Flask directly from an unavailable UNC/share path, reuses a healthy local ANF3 server, and delays a version refresh while that server is still running so the process cannot use a mixed release.

The launcher serializes refresh/start operations with a local lock, copies the release to the per-user local directory, checks the expected `dist`, server, configuration, and runtime files, repairs the local Python environment when possible, validates public Apps Script `/exec` endpoint syntax, checks for a Word/LibreOffice converter, scans the supported local port range, waits for `/api/status`, and opens the browser only after the service responds. Failure paths now print an actionable message instead of silently falling back to an unsafe start mode.

### Runtime configuration and release packaging

The browser reads `config.json` from the release root. This keeps endpoint changes editable with Notepad on a laboratory PC and avoids requiring Node.js, pnpm, or a rebuild for normal endpoint configuration. The build/package helper text now describes the current public release documentation and the same root-level configuration location.

### DOCX/PDF generation safety

The document service now processes XML files throughout `word/`, including the document body, headers, footers, and other Word XML parts. It handles both literal and XML-escaped placeholder forms and retains the existing legacy key spelling/case behavior. The final unresolved-placeholder gate examines all Word XML parts before conversion.

Generation is serialized around the worksheet identity check, DOCX creation, conversion, and metadata commit. A cache is reported as ready only when the PDF, metadata, and worksheet-named DOCX all exist. If the DOCX is missing, the pair is regenerated. If an existing worksheet identity has different content, the request remains a controlled conflict and does not silently overwrite the user-facing artifact.

The external identity remains the worksheet number and the generated names remain `<worksheetNo>.docx` and `<worksheetNo>.pdf`. No laboratory values, control values, media lots, tags, dates, or approval data are fabricated by these changes.

### Validation and documentation hygiene

The public checkout no longer fails only because owner-only documents and controlled templates are intentionally absent. `validate_release.py`, `validate_cv_package.py`, and `validate_non_game_contract.mjs` now accept an external controlled release directory when those assets are available. Public mode explicitly reports which controlled checks were skipped.

The placeholder test follows the same rule: it is strict when all controlled templates are present and skips only the controlled-template suite when the public checkout cannot run it. The stale deleted-document hash/reference was removed, and the redundant npm lockfile was deleted.

The existing frontend workflow in the base implementation remains intact, including building context, `/list`, `/print/:domain/:workflow`, local print-fill controls, template-family routing, over-capacity protection, worksheet conflict handling, and per-page payload behavior. No unrelated frontend redesign was introduced in this pass.

## TESTS / COMMANDS RUN

All commands were run from `C:\Users\Siripon Sri\Desktop\My Project\water-app` on Windows, using the repository's `rtk` command prefix.

| Command | Result |
|---|---|
| `rtk pnpm check` | PASS — TypeScript project check completed. |
| `rtk pnpm test` | PASS — 11 test files passed; 78 tests passed; 1 file and 8 tests skipped because controlled DOCX templates are absent. |
| `rtk pnpm build` | PASS — Vite production build completed and generated `dist/index.html` and assets. |
| `rtk uv run --with pytest --with flask --with pywin32 --with comtypes pytest server/tests` | PASS — 10/10 tests. |
| `rtk node validation/test_cv_contract.mjs` | PASS. |
| `rtk node validation/test_apps_script_security.mjs` | PASS. |
| `rtk node validation/test_worksheet_numbering.mjs` | PASS. |
| `rtk node validation/test_games.mjs` | PASS. |
| `rtk node validation/validate_launchers.mjs` | PASS — 5 launcher scripts checked. |
| `rtk node validation/validate_styles.mjs` | PASS — 269 class references resolved. |
| `rtk node validation/contrast.mjs` | PASS — all light/dark contrast pairs passed. |
| `rtk node validation/validate_wiring.mjs --built` | PASS — 3 domains, 3 API paths, and 7 PDF routes matched. |
| `rtk node validation/validate_non_game_contract.mjs` | PASS with 2 controlled-asset warnings; failures 0. |
| `rtk python validation/validate_cv_package.py` | PASS in public-source mode; controlled CV template check explicitly skipped. |
| `rtk python validation/validate_release.py` | PASS in public-source mode; controlled DOCX/owner-document checks explicitly skipped. |
| `rtk python -m py_compile server/pdf_server.py server/tests/test_pdf_server.py validation/validate_cv_package.py validation/validate_release.py` | PASS. |
| `rtk git diff --check` | PASS. |

The two warnings from the non-game contract audit are expected for this checkout:

1. the controlled cabinet matrix is outside the public repository;
2. the controlled CV template-routing contract is outside the public repository.

The public audit used the typed frontend registry and active PDF server route registry in their place.

## RESULTS

- Public source checks: PASS.
- TypeScript check: PASS.
- Frontend unit tests: PASS with only controlled-template skips.
- Production frontend build: PASS.
- Flask/PDF server tests: PASS, 10/10.
- Apps Script source/security and worksheet-numbering checks: PASS without deploying or mutating a live system.
- Launcher, wiring, style, contrast, CV package, release structure, Python compilation, and whitespace checks: PASS.
- No unresolved test failure remains in the local verification set.
- Generated `dist/` output was used for build/wiring verification and remains ignored by Git.

## ARTIFACTS INSPECTED

- `docs/GOAL.md`, `docs/TASKS.md`, and `AGENTS.md` for the active release contract and handoff requirements.
- `config.json` for the public endpoint-only runtime configuration contract.
- `dist/index.html` and the Vite output after `pnpm build`.
- `server/pdf_server.py` and its active route/template/cache logic.
- `server/tests/test_pdf_server.py`, including a synthetic DOCX containing `document.xml`, `header1.xml`, and `footer1.xml`.
- The generated synthetic DOCX in the pytest test path was checked for replacement and unresolved-placeholder behavior; no generated test artifact was retained in the repository.
- `START-ANF3.bat`, `BUILD-DIST.bat`, and `CREATE-DIST-ZIP.ps1`.
- Active Google Apps Script files and validation fixtures through the repository's source/security/numbering checks.
- `validation/games-baseline.sha256` and all frozen game files through the game validation gate.
- The working-tree diff and `git diff --check` output.

The official DOCX templates are not present in this public checkout, so their XML layout and rendered PDFs could not be inspected here.

## KNOWN LIMITATIONS

The following acceptance gates remain unverified because the required controlled assets or external environment are unavailable:

- real DOCX generation against the five controlled templates;
- visual PDF inspection for PW/PRW, WFI/PUS, EM, Compressed Air, CV Contact, CV Pour Plate, and CV Membrane Filtration;
- Word/LibreOffice conversion on the target laboratory PC;
- clean-PC first launch from a real UNC/share-drive path;
- concurrent launcher and busy-port behavior on a target PC;
- deployed `/exec` endpoint behavior against non-production Sheets;
- confirmation that deployed Apps Script revisions match the checked-in source;
- browser interaction/screenshot smoke tests that require a running external Flask/browser setup;
- ten-document timing on the actual laboratory machine.

Use the controlled modes when the external package is assembled:

```powershell
python validation/validate_release.py --controlled-dir <release-directory>
python validation/validate_cv_package.py --controlled-dir <release-directory>
node validation/validate_non_game_contract.mjs --controlled-dir <release-directory>
```

## UNRESOLVED QUESTIONS

1. Which controlled release directory contains the owner documents, five authoritative DOCX templates, catalog, built frontend, and release configuration for the next audit?
2. Which non-production Apps Script deployments and test Sheets are approved for the end-to-end read/numbering/routing checks?
3. Which converter is the supported target on each laboratory PC: Microsoft Word, LibreOffice, or both?
4. Should the owner assign a new release version in `VERSION.txt` before publishing the share-drive package? The existing value was preserved because no new version was supplied.
5. After controlled verification, does the planner/auditor accept the public-source implementation as `ASTRA_AUDIT_PASS`, or are further targeted corrections required?

## DIFF / REGRESSION NOTES

- The implementation uses the existing server, launcher, template-family, worksheet-number, and runtime-configuration contracts. It does not create a parallel document route or rename legacy fields.
- Document identity remains the worksheet number. Content change under an existing worksheet identity remains a controlled conflict; the service does not silently overwrite the generated artifact.
- Header/footer replacement and unresolved-placeholder checks are additive to the existing body replacement behavior.
- The local generation lock is intentionally process-local and protects concurrent requests handled by this Flask process. Cross-machine or multi-process deployment coordination remains outside the supported local release model.
- Public validation now distinguishes missing controlled assets from source defects instead of treating the public repository as if it contained owner-only assets.
- `package-lock.json` was removed; `pnpm-lock.yaml` remains the package lock.
- No templates, generated Word/PDF outputs, secrets, production exports, or live Apps Script deployments were staged.
- No unrelated UI redesign, framework migration, or broad refactor was introduced.

The implementation commit should be reviewed together with this file. The final commit hash and push result are reported by the implementer session after commit/push completes.
