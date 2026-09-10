# Architecture

## Components

- `apps/web/src/`: React/Vite UI, route registry, System DB API client, read cache, games, inventory and Three.js foyer.
- `server/pdf_server.py`: local-only Flask shell, PDF API, inventory hash gate and allowlisted legacy static files.
- `templates/`: server-owned DOCX templates. The browser never chooses a template path.
- `apps-script-deploy/01-air-user` through `06-cv-system`: copy-ready bound and System DB Apps Script projects.
- `google/sheets/*.xlsx` and `google/sheets/schema.json`: offline evidence of the Google Sheet structures inspected for this release.
- `google/app-scripts/*.txt`: owner-facing copies of scripts found in the working Google projects; deployment source remains `apps-script-deploy/`.

## Data Flow

1. A user creates or edits a worksheet in an owner-controlled Google Sheet.
2. Its bound User Apps Script sends a token-authenticated mutation to the matching System DB Web App.
3. The System DB allocates an immutable worksheet number under a script lock and writes to an allowlisted active shard.
4. React calls token-free `search` and `get` actions on the System DB Web App and caches read-only results in `anf3-read-cache-v1`.
5. After a fresh online `get`, React may send an allowlisted workflow payload to local `POST /api/pdfs`.
6. Flask applies the server-owned DOCX template, serializes Office conversion, returns a `pdfId`, and exposes preview/download/save by that ID.

## Boundaries And Integrations

- Browser mutation is intentionally absent. Mutation tokens exist only in Apps Script Properties.
- Flask binds to `127.0.0.1`; generated files and templates are not static web roots.
- Production read endpoints are compiled from `.env.production`. Air and Water URLs are known; CV remains owner-controlled.
- Google Calendar is embedded with the fixed ANF3 calendar ID and `Asia/Bangkok`.
- Inventory runtime uses the original `inventory_catalog.pdf`; indexed search is enabled only when its pinned SHA-256 and the 95-row reviewed manifest agree.
- Word PDF conversion requires Microsoft Word plus `pywin32`, or LibreOffice. This is a machine prerequisite, not a browser feature.

## Invariants

- Existing worksheet numbers never change, even when building metadata changes.
- New routine Air and Water rows go only to active building shards. Unsuffixed routine tabs are immutable backups.
- CV contact plate and rinse share the normalized parent/child store, but use different number prefixes.
- CV rinse PDF actions use the owner-approved PW/PRW and WFI/PUS template families through CV-owned route adapters, subject to local capability and target-PC verification.
- A cached record can be inspected offline, but PDF actions require a fresh online System DB `get` in the current session.
- Do not infer URLs, tokens, SOP criteria, sheet mappings or missing template behavior.
