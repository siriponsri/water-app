# Repository cleanup audit — 2026-09-10

This is a reference audit, not a blanket deletion plan. No file was deleted unless runtime/build/release references proved it safe.

| Candidate | Disposition | Evidence |
| --- | --- | --- |
| `inventory_catalog.pdf` | KEEP | `server/pdf_server.py`, `apps/web/src/App.tsx`, server tests, release validation and inventory-index all reference it. |
| `water-anf3.zip` | KEEP | Release archive for the no-code distribution; ignored by Git so it is not a source artifact. No alternative release handoff was proven. |
| `docs/archive/` | KEEP | Historical implementation and recovery evidence; no runtime coupling was found, but no retention approval was supplied. |
| `_archived/` | KEEP | Explicitly designated repository reference evidence by `AGENTS.md`; non-game validation freezes selected contents. |
| Root troubleshooting/handoff documents | KEEP | `TASKS.md`, owner/readme/handoff documents retain explicit operator and recovery references. |
| `words/`, `pdfs/` | KEEP directories; no generated file deleted | Required output locations. Their contents were empty during this audit. |
| `.agent-bus/` | KEEP uncommitted | Active two-session coordination state, ignored at delivery. |

Reference scan used `rg` over runtime, validation, release and documentation sources. No proven-unreferenced deletion candidate exists in the current checkout.
