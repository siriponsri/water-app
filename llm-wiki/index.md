# LLM Wiki

## Start Here

- Architecture: [architecture.md](architecture.md)
- Domain concepts: [domain.md](domain.md)
- Workflows: [workflows.md](workflows.md)
- Decisions: [decisions.md](decisions.md)
- Open questions: [open-questions.md](open-questions.md)
- Google Sheet contracts: [google-sheet-contracts.md](google-sheet-contracts.md)
- Project-specific skill candidates: [skills.md](skills.md)

## Current Project Shape

- New-machine session bootstrap: `docs/archive/CONTINUE_ON_NEW_MACHINE.md` (archived; `README.md` and `HANDOFF.md` are current).
- ANF3 Laboratory Records is a local read-only React application served by Flask.
- The primary user loop is domain -> workflow -> current System DB record -> actual PDF preview -> print.
- Google Sheets bound scripts own record creation, worksheet numbering, edits, and sync.
- Air, Water, and Cleaning Validation are registered workflows; the foyer includes one disabled future slot.
- The authoritative deployment scripts are the six `.gs` files under `google/app-scripts/`; `RPP2-*.gs` are the System DB web apps.
- Start with `OWNER.md` for deployment and `PLAN.md` for the approved product contract.
