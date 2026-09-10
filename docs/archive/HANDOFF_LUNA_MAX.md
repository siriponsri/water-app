# ANF3 Laboratory Records — Authoritative Luna Max Handoff

**Document status:** Authoritative implementation specification  
**Target agent:** Codex Luna Max  
**Language:** Thai-first; retain established English identifiers in code  
**Baseline:** `ANF3-Laboratory-Records-20260901.zip`  
**Mission:** Rebuild the non-game application into a production-ready, no-code-owner-operable laboratory record system without modifying the Games area.

---

## 0. How Luna Max must use this document set

Read in this exact order before changing any file:

1. `AGENTS.md`
2. `HANDOFF_LUNA_MAX.md` — scope, precedence, non-negotiable rules
3. `AUDIT_REPORT_BUILDING_WORKFLOW.md` — owner-confirmed Building × Workflow evidence
4. `docs/CABINET_WORKFLOW_MATRIX.md` — exact 16 active destinations and reserve rule
5. `docs/CV_TEMPLATE_ROUTING_CONTRACT.md` — CV Contact/Rinse route ownership and template routing
6. `docs/SCALE_UP_CONFIGURATION_CONTRACT.md` — configuration and capacity rules
7. `PLAN.md` — phases, gates, deliverables, definition of done
8. `ARCHITECTURE_RECOMMENDATIONS.md` — system topology and data boundaries
9. `DESIGN.md` — approved visual and interaction direction
10. `docs/APPS_SCRIPT_6_FILE_CONTRACT.md` — exact six-file Apps Script contract
11. `design-assets/manifest.json` and `design-assets/README.md` — ready-to-use SVG package and asset rules
12. `OWNER.md` — no-code owner setup and deployment experience
13. `TEST_PLAN.md` — tests and Final Delivery Gate
14. `llm-wiki/*`, `google/sheets/schema.json`, and current implementation as supporting evidence

If documents conflict, use this precedence:

`explicit owner response in the current run` > `HANDOFF_LUNA_MAX.md` > `PLAN.md` > `ARCHITECTURE_RECOMMENDATIONS.md` > `DESIGN.md` > `APPS_SCRIPT_6_FILE_CONTRACT.md` > `OWNER.md` > `TEST_PLAN.md` > `llm-wiki/*` > current code.

Never silently resolve a conflict involving data, access, deployment, spreadsheet mapping, numbering, migration, or Games. Record it in the Decision Log and ask the owner.

---

## 1. Required outcome

At the end of this goal, the repository must contain a complete, working, validated full stack:

- A responsive React/Vite frontend for the non-game record experience.
- A restrained 2.5D/3D **Digital Record Cabinet** home experience based on the physical binder system.
- Exactly 16 approved active Building × Workflow destinations from the audited matrix, plus a disabled pink `Coming Soon` reserve.
- A ready-to-use original SVG package under `design-assets/`, governed by `manifest.json`; no placeholder or stock imagery.
- A local Python/Flask service for approved PDF/Word generation and local file operations where those functions are already required.
- Exactly **six production copy/paste Google Apps Script files**, one self-contained `Code.gs` for each bound Google Sheet project.
- A safe Air, Water, and Cleaning Validation data flow with deterministic numbering, idempotent upsert, audit logs, active/legacy boundaries, and read APIs.
- Complete local and Apps Script deployment instructions that a no-code owner can execute.
- Automated/static/manual validation evidence and a final delivery report.
- A release ZIP that can replace the previous project without losing excluded or owner-controlled content.

“Working” means verified through realistic fixtures and production-shaped spreadsheets. A placeholder, mock-only path, TODO, dead button, fake success response, or implementation described as complete without evidence fails the goal.

---

## 2. Absolute scope boundary: Games freeze

### 2.1 Files and behavior Luna must not modify

Do not edit, move, rename, delete, format, regenerate, build from a new source, or change behavior in:

- `games/**`
- `_archived/frontend-v6/games/**`
- `docs/MICRO_LAB_GAMES_IMPLEMENTATION_PLAN.md`
- game test fixtures, game storage schemas, game scoring, game routes, game assets, or game copy
- React game pages/components/functions already present inside shared files, except the minimum mechanical conflict resolution described below

### 2.2 Shared-file exception

If a shared file such as `apps/web/src/App.tsx`, `styles.css`, router configuration, or build configuration contains both game and non-game code, Luna may edit only the smallest non-game region necessary. Before editing:

1. Compute and save a baseline inventory/hash for `games/**`.
2. Identify the exact shared-file game regions.
3. Preserve their route, imports, rendering, CSS selectors, text, storage keys, and behavior byte-for-byte where practical.
4. Run the existing game regression tests after every shared-file refactor.

The final report must prove that standalone game files are unchanged and that all existing game routes still pass. Do not redesign the Games navigation card, game catalog, or gameplay.

---

## 3. Major-decision approval protocol

The owner explicitly requires Luna to ask before making major decisions. Follow this protocol.

### Gate A — Audit and decision brief: ask before implementation

First perform a read-only audit. Then present one concise Thai approval brief with:

- what exists and what is proven;
- inconsistencies or risks;
- the recommended choice for each unresolved decision;
- impact of each alternative;
- exact files/areas that would change;
- a numbered list of no more than five owner questions.

At minimum, ask the owner to confirm:

1. **Deployment topology:** retain recommended Windows local app + Apps Script/Sheets, or approve another production host.
2. **Read-access policy:** organization-only/restricted access versus link-access/public Apps Script reads.
3. **Cutover strategy:** recommended test clone → parallel smoke test → controlled production replacement.
4. **Any schema/mapping discrepancy** discovered from the six real workbook structures.
5. **Any newly proposed building/workflow/template** not present in the approved matrix and registries.

Do not ask again about facts already proven and consistent. Do not start material code changes before the owner approves Gate A.

### Gate B — Data contract and migration approval

After Gate A, produce exact before/after maps for:

- six Google Sheets;
- source tabs, active target shards, legacy read-only tabs, child/sample tabs, and logs;
- worksheet-number formats and counter scopes;
- record identity and idempotency keys;
- fields added to user sheets;
- migration/backfill actions, if any.

Ask before any destructive schema change, tab creation in production, migration, deletion, renaming, counter initialization/reset, or trigger activation.

### Gate C — Visual direction approval

Create a static or running preview at 1440, 768, and 375 px showing the cabinet home and record workspace. Ask the owner to approve the composition and binder-to-building mapping before final visual polish. This gate must not touch Games.

### Gate D — Production cutover approval

Complete local/test-sheet verification first. Then give the owner a cutover checklist and wait before:

- deploying or redeploying production Apps Script web apps;
- switching production endpoint URLs;
- enabling timed triggers;
- writing to production active shards;
- replacing the owner's current distributable ZIP.

### Changes Luna may make without interrupting the owner

After an approved gate, Luna may independently make small, reversible decisions that do not change architecture, data meaning, security, deployment, numbering, schema, Games, or approved visual direction. Record material implementation choices in `DECISION_LOG.md`.

---

## 4. Product model

### 4.1 Human mental model

The home screen represents the physical laboratory record cabinet:

- **Binder color = building/location**, never workflow or status.
- **Binder spine label = workflow**.
- **Small secondary label = building/location**.
- **Status and record count = separate neutral badges/text**, not the binder color meaning.
- Desktop uses a fixed-camera cabinet/shelf presentation.
- Mobile uses equivalent CSS 2.5D binders, not a generic card grid and not a heavy WebGL scene.
- A persistent `Cabinet | List` control provides a fast accessible alternative.

Approved web colors and owner-confirmed semantic mapping:

| Physical binder | Main | Soft surface | Known mapping |
|---|---:|---:|---|
| Blue | `#68B9E8` | `#E8F5FC` | Building 10 |
| Mint | `#63D3AB` | `#E7F8F2` | Building 16 |
| Violet | `#B087DC` | `#F2EAF9` | Building 12 |
| Orange | `#F2A65A` | `#FFF0DE` | Other Locations: Building 11 and 19 |
| Pink | `#ED8FA3` | `#FCECEF` | Reserve only: `Coming Soon` |

The exact active destinations are authoritative in `docs/CABINET_WORKFLOW_MATRIX.md`. Pink is disabled decoration/capacity indication only: no API call, record count, route, or invented workflow.

### 4.2 Operational workflow

The visible web app is a read/inspect/preview/print client. Editable operational records remain in controlled Google Sheets unless Gate A explicitly changes that decision.

Default flow:

1. Laboratory user enters/updates a record in a domain User Sheet.
2. Its bound User Apps Script validates and sends a normalized command to the matching System Apps Script.
3. System Apps Script authenticates, locks, validates, allocates or preserves the worksheet number, routes to an allowlisted active store, upserts idempotently, replaces child samples atomically, and logs the operation.
4. React reads normalized records from the System read API.
5. The Flask service creates a PDF only from an approved template/workflow and returns an opaque `pdfId`.
6. User previews, prints, downloads, or explicitly saves the generated file.

No browser code receives a mutation token. No arbitrary spreadsheet ID, sheet name, field, template path, or filesystem path comes from a client request.

---

## 5. Data and numbering rules that are already binding

### 5.1 Domains and workflows

- Air: `em-air` (`AT`), `compressed-air` (`AC`)
- Water: `pw-prw` (`WT`), `wfi-pus` (`WP`)
- Cleaning Validation: Contact Plate (`CV`), Rinse (`CVR`)

Cleaning Validation document generation has CV-owned route keys and adapters. Contact Plate uses the CV Contact template. Rinse requires explicit Test Method selection and resolves through the CV Rinse-PW/PRW or CV Rinse-WFI/PUS adapter to the owner-approved `pw-prw-template.docx` or `wfi-pus-template.docx` family. Route metadata remains distinct from Water; the approved template family is intentionally shared. See `docs/CV_TEMPLATE_ROUTING_CONTRACT.md`.

### 5.2 Building normalization

- `10`, `B10`, `Building 10` → number segment `B10`, storage suffix `B10`
- Equivalent forms for 12 and 16 → `B12` / `B16`
- Other, 11, 19, unknown, or blank → no number segment and `OT` active shard where applicable
- Preserve the user's original building value as data; normalization is used for routing/numbering only.

### 5.3 Worksheet-number format

| Workflow | Segmented example | Unsegmented example |
|---|---|---|
| EM Air | `AT-26-B10-0001` | `AT-26-0001` |
| Compressed Air | `AC-26-B12-0001` | `AC-26-0001` |
| PW/PRW | `WT-26-B16-0001` | `WT-26-0001` |
| WFI/PUS | `WP-26-B10-0001` | `WP-26-0001` |
| CV Contact Plate | `CV-26-B12-0001` | `CV-26-0001` |
| CV Rinse | — | `CVR-26-0001` |

Rules:

- Year and dates use `Asia/Bangkok`.
- Counter scope is `prefix + Bangkok year + normalized building segment`.
- CV Rinse never has a building segment.
- Existing worksheet numbers are immutable.
- A later building mismatch is logged, not automatically moved or renumbered.
- Legacy Water prefixes `PQ-OLD`, `PQ-OCL`, `RA6`, `WP-PQ` remain unchanged.
- Allocation, duplicate check, record upsert, sample replacement, counter write, and audit log must be protected by a System project script lock.

### 5.4 Active/legacy boundary

- Air active: `records_em_B10/B12/B16/OT`, `records_ca_B10/B12/B16/OT`
- Water active: `records_pw_prw_B10/B12/B16/OT`, `records_wfi_B10/B12/B16/OT`
- CV active: `records_cv`, `records_cv_samples`
- Unsuffixed routine Air/Water tabs are legacy readable backups and must not receive new mutation writes.
- Unknown/misspelled targets are rejected; never create a request-provided sheet name.

---

## 6. Exactly six production Apps Script files

Production copy/paste source is exactly:

1. `apps-script-deploy/01-air-user/Code.gs`
2. `apps-script-deploy/02-air-system/Code.gs`
3. `apps-script-deploy/03-water-user/Code.gs`
4. `apps-script-deploy/04-water-system/Code.gs`
5. `apps-script-deploy/05-cv-user/Code.gs`
6. `apps-script-deploy/06-cv-system/Code.gs`

Each file must be fully self-contained and pasteable into the default `Code.gs` editor of its matching Sheet. The owner must not merge snippets, install clasp, run Node, edit JSON manifests, or create extra `.gs` files.

The six files are the only production source of truth. If modular developer sources are retained, they must be generated from or verified against the six files and clearly labeled non-copy-ready. Never maintain independent hand-edited mirrors.

Full function/contract requirements are in `docs/APPS_SCRIPT_6_FILE_CONTRACT.md`.

---

## 7. Full-stack architecture baseline

Unless the owner approves a different Gate A choice:

- **Frontend:** React + TypeScript + Vite, hash routing, self-hosted fonts, lazy-loaded Three.js only for the cabinet desktop enhancement.
- **Operational UI:** 2D master-detail records; never put record tables, forms, calendars, PDF viewers, or tools inside 3D.
- **Read cache:** dedicated IndexedDB read cache only; no pending mutation queue.
- **Backend:** local-only Flask bound to `127.0.0.1`; allowlisted PDF workflows/templates; opaque generated file IDs; size limits; safe paths.
- **Data layer:** six Google Sheets with six bound Apps Script projects.
- **Deployment:** Windows one-click local distribution plus three owner-controlled System web-app deployments and three User bound scripts.
- **Security:** Script Properties tokens for mutations, no token in frontend/source/logs, explicit allowlists, locks, formula-injection defenses, safe error responses.

The architecture must make local startup and degraded states honest. Never show “Online” merely because the browser has network; distinguish local service, Air API, Water API, and CV API health.

---

## 8. Non-functional requirements

### Reliability

- Retrying a sync must not create another worksheet number or duplicate record.
- Partial failure must not silently mark a row synced.
- CV parent/sample replacement must be atomic within the practical Apps Script transaction boundary.
- Triggers must not overlap; locks and run IDs are mandatory.
- Every mutation returns structured success/error data and produces an audit entry with no secret values.

### Performance budgets

- Initial non-3D shell usable at 1440/768/375 px without waiting for Three.js.
- Three.js bundle lazy-loaded only on supported desktop conditions.
- Search debounce 250–350 ms; abort stale browser requests.
- Apps Script list/search has bounded result limits and no unbounded full-sheet client response.
- No repeated cell-by-cell writes in large loops when range operations are possible.

### Accessibility

- WCAG 2.2 AA target.
- Keyboard navigation, visible focus, screen-reader labels, semantic landmarks, 44×44 px touch targets.
- `prefers-reduced-motion` produces a complete static experience.
- Cabinet meaning is never communicated by color alone.
- List view exposes the same destinations and information as cabinet view.

### Visual quality

- Professional laboratory/QA tone: clean, tactile, calm, organized.
- No gradients, neon glow, glassmorphism, decorative blobs, random 3D motion, oversized marketing hero, card-grid clutter, or emoji icons.
- Binder labels remain readable without hover.
- Fixed camera; no free orbit, pan, or zoom.
- Use the supplied `design-assets/` package. When an adequate image/icon does not exist, create a new original SVG, add it to the manifest, validate it, and include it in the release rather than leaving a placeholder.

### Privacy and security

- Do not commit tokens, deployment URLs if owner classifies them as restricted, personal data, generated records, PDFs, or production logs.
- Escape spreadsheet values beginning with `=`, `+`, `-`, or `@` when writing untrusted text.
- Never return stack traces, spreadsheet IDs, Script Properties, absolute paths, or internal tab maps in public responses.
- Document the selected Apps Script access policy and its trade-offs after owner approval.

---

## 9. Required repository deliverables

Luna must finish with all of the following:

### Implementation

- Non-game frontend redesign implemented and built.
- Six self-contained production `Code.gs` files rebuilt and validated.
- Backend/API integration aligned to approved contracts.
- Setup/verification helpers inside each Apps Script file.
- Safe local startup/build/release scripts.
- No dummy feature or dead control.

### Documentation

- Updated `README.md` for a professional project overview.
- Updated `OWNER.md` as a Thai no-code manual.
- Updated `ARCHITECTURE_RECOMMENDATIONS.md`, `DESIGN.md`, and `TEST_PLAN.md` reflecting the implementation, not intentions.
- `DECISION_LOG.md` containing owner approvals, unresolved risks, and deviations.
- `validation/FINAL_DELIVERY_REPORT.md` with commands, results, screenshots, hashes, and known limitations.

### Release

- Clean release ZIP with no secrets, caches, generated PDFs/Word files, `node_modules`, or temporary output.
- Exact overlay/apply instructions.
- Rollback instructions.
- A six-file checklist identifying the target Google Sheet for every `Code.gs`.
- Screenshots at 1440, 768, 375 px in light mode; 1440 px dark mode; cabinet and list fallback.

---

## 10. Definition of done

The goal is complete only when every condition is true:

- Owner approvals for Gates A–D are recorded where required.
- The non-game application builds and starts from the documented one-click path.
- All supported record workflows can be searched, opened, freshly fetched, previewed, and printed when an approved template exists.
- Exactly six Apps Script files are copy/paste ready and independently pass syntax/static tests.
- Controlled test-sheet smoke tests prove insert, retry/upsert, update, immutable numbering, routing, read aggregation, auth rejection, and logs.
- Games files are unchanged and game regression tests pass.
- No secrets, TODO/FIXME placeholders, fake data presented as real, hidden failure, or undocumented manual developer step remains.
- The no-code guide was dry-run as if the owner had only the ZIP, browser, Google Sheets, and Windows Explorer.
- Final Delivery Gate in `TEST_PLAN.md` passes with evidence.

If a production-only step cannot be performed without owner credentials/authorization, do not claim it passed. Mark it `OWNER ACTION REQUIRED`, provide the exact safe steps, and distinguish it from completed local/test verification.
