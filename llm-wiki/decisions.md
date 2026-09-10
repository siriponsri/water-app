# Decisions

## Durable Decisions

- 2026-09-01: React is read-only. Google Sheets remains the editable system of work. Provenance: owner instruction and `PLAN.md` sections 1, 5 and 6.
- 2026-09-01: active Air/PW/WFI storage uses building shards; unsuffixed routine tabs are backups. Provenance: owner instruction, `PLAN.md` storage clarification and system `Code.gs` allowlists.
- 2026-09-01: worksheet counters are independent by prefix, Bangkok year and normalized building segment. Provenance: `PLAN.md` approved numbering amendment.
- 2026-09-01: CV rinse uses `CVR` without a building segment; contact plate uses `CV` with the normal segment rule. Provenance: owner approval and `validation/test_worksheet_numbering.mjs`.
- 2026-09-01: the visual signature is one Three.js laboratory workbench. All operational views remain restrained 2D layouts. Provenance: `DESIGN.md`, `apps/web/src/FoyerScene.tsx`.
- 2026-09-01: light mode uses low-glare gray-green surfaces and dark mode preserves object detail; reduced motion/mobile uses an equivalent 2D folder selector. Provenance: owner feedback and `apps/web/src/styles.css`.
- 2026-09-02: Owner approved CV Rinse to use the Water test template families: Pour Plate maps to `pw-prw-template.docx` and Membrane Filtration maps to `wfi-pus-template.docx`. CV route keys/adapters remain distinct; target-PC Word verification is still required. Provenance: `OWNER.md`, `docs/CV_TEMPLATE_ROUTING_CONTRACT.md`, `server/pdf_server.py`.
