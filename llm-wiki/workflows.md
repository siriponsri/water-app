# Workflows

## Local Release

- Purpose: build and package the local read-only application.
- Inputs: React source, Flask server, DOCX templates, inventory PDF/index, `.env.production` read endpoints.
- Commands: `rtk pnpm check`, `rtk pnpm test`, `rtk pnpm build`, `rtk pytest -q`, then `powershell -ExecutionPolicy Bypass -File .\CREATE-DIST-ZIP.ps1`.
- Outputs: `dist/` and `release/ANF3-Laboratory-Records-<date>.zip`.
- Validation: responsive browser checks, nonblank canvas pixel variance, Flask security tests, Apps Script validators and ZIP smoke test.
- Known failure modes: Word/LibreOffice absent; old Web App deployment returns `Unknown action`; CV endpoint omitted.
- Provenance: `package.json`, `server/tests/test_pdf_server.py`, `validation/`, `OWNER.md`.

## Apps Script Deployment

- Purpose: update six bound/System projects without changing workbook ownership.
- Inputs: the matching `apps-script-deploy/*/Code.gs`, three domain tokens and the three System Web App URLs.
- Process: back up sheets, paste System code, set the domain token, run schema setup/test, deploy a new Web App version, paste matching User code, set the same token, update URL, then test one controlled record.
- Validation: `ping`, `search`, `get`, controlled insert/update, immutable number, expected shard, samples and audit log.
- Known failure modes: updating code without creating a New Version leaves the live URL on old code; different tokens return unauthorized mutation; unsupported sheet names are rejected.
- Provenance: `apps-script-deploy/MANUAL_COPY_GUIDE_TH.md`, `OWNER.md`.

## Adding A Worksheet Workflow

- Purpose: scale beyond the current workflow set while keeping one UI shell.
- Inputs: approved prefix/numbering rule, read contract, active/legacy sheet allowlists, source headers and approved DOCX template policy.
- Process: add one registry entry in `apps/web/src/appData.ts`; implement allowlisted Apps Script routing; add server-owned template mapping only when approved; add focused policy/contract tests.
- Validation: domain route, search/get normalization, cache key, PDF policy, 320-1440 layout and mutation isolation.
- Guardrail: do not create a generic arbitrary-sheet or arbitrary-template endpoint.
