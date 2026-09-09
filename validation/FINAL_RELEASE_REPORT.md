# ANF3 Laboratory Records v7.0 - Final Release Report

## Outcome

The repository contains the Windows local React/Flask application, read-only
record client, approved PDF routes, six copy-ready Apps Script projects, and
two complete local training game campaigns.

## Owner decisions

- Topology: Windows local React/Flask with Google Sheets and System DB.
- Read access: organization users only.
- Deployment order: test clone, parallel smoke test, controlled production replacement.
- Gate B: approved. Long-run verification: approved.
- CV templates: Contact Plate uses `cv-contact-template.docx`; Rinse Pour Plate
  uses `pw-prw-template.docx`; Rinse Membrane Filtration uses
  `wfi-pus-template.docx`.

## Implemented scope

| Area | Status | Evidence |
|---|---|---|
| Water and Air workflows | Implemented | Existing routes, templates, and Apps Script deploy kit |
| Cleaning Validation | Implemented | CV-owned records, routes, adapters, numbering, and PDF validation |
| Growth Promotion game | Implemented | Mission 0-8 campaign, deterministic fixtures, phase gates, evidence packet, report, autosave |
| The Sixth Plate game | Implemented | Case 00-08 campaign, six-media boundary, evidence packet, report, autosave |
| Local PDF service | Implemented | Server-owned template registry, opaque PDF IDs, safe download/save flow |
| Cabinet and record client | Implemented | 16 active destinations, List parity, organization-only read contract |
| Deployment package | Implemented | `release/ANF3-Laboratory-Records-20260902.zip` and SHA-256 sidecar |

## Verification

| Check | Result |
|---|---|
| TypeScript check | PASS |
| Vitest | PASS - 2 files, 19 tests |
| Flask/Python tests | PASS - 8 tests |
| Apps Script security/read contract | PASS |
| CV contract and worksheet numbering | PASS |
| Games validator and non-game contract audit | PASS |
| Full release structural validation | PASS |
| Production Vite build | PASS |
| Browser campaign/report smoke | PASS - 10 views, no console or page errors |
| Flask production smoke | PASS - `/`, `/api/status`, `/api/pdf-capabilities`, and catalog status returned HTTP 200 |
| CV package structural validation | PASS |
| CV PDF fixture smoke | PASS - Contact, Rinse Pour, and Rinse Membrane produced valid PDF files |
| Release ZIP hash sidecar | PASS |

The Playwright smoke covered the complete Growth Promotion and Sixth Plate
flows through their report pages, responsive views at 320, 375, and 1280 px,
one `h1` and one `main` landmark per view, and horizontal overflow checks.
The local PDF smoke used fictional fixture data only and confirmed all three
owner-approved CV routes resolve to valid PDF output; generated test artifacts
are excluded from the release package.

## UI and accessibility

- The approved cabinet visual direction and existing token system remain in use.
- The game surfaces use native controls, visible focus states, live status
  messages, reduced-motion support, 2D fallback, and local autosave.
- Screenshots are stored under `validation/screenshots/` and include desktop,
  mobile, debrief, and report states for both campaigns.

## Games boundary

The standalone legacy files under `games/`, `_archived/frontend-v6/games/`,
and `docs/MICRO_LAB_GAMES_IMPLEMENTATION_PLAN.md` remain protected by the
freeze hash contract. The supported game pages do not connect to System DB,
Google Sheets, Apps Script, or an LLM grader, and never write regulated
records.

## External production actions

The local application is built and running at `http://127.0.0.1:8000`.
Production cutover still requires Owner-controlled Google actions: deploy the
three System Web Apps with organization access, configure the CV `/exec` URL,
set matching User/System Script Properties, execute the test-clone and parallel
smoke sequence, back up production Sheets, and approve Gate D before any
production replacement or trigger activation.

The current `.env.production` intentionally leaves `VITE_CV_READ_URL` empty
until the Owner supplies the deployed CV System Web App URL. Therefore this
package is deploy-ready and locally playable; it is not represented as a
completed Google production cutover.
