# Games Implementation and Delivery Plan

> **Note (v7.1n).** This document was written when there were three
> simulations. **CultureCheck / Growth Promotion Lab was removed** — it shared
> six of its nine phases with The Sixth Plate. Two remain: The Sixth Plate and
> Excursion Trace. Difficulty levels now change the rules rather than only
> labelling a run. `HANDOFF.md` § 3 is current; read this for background only.


## Authoritative references

- `GROWTH_PROMOTION_SIMULATION_LAB_GAME_DESIGN.md`
- `BACTERIAL_IDENTIFICATION_INVESTIGATION_GAME_DESIGN.md`
- `DESIGN.md`

The supported game surface is the React/Vite implementation in
`apps/web/src/games/`. It is a local educational workspace. It does not write
laboratory records, call the System DB, call Google Apps Script, or use an LLM
to grade a learner.

## Delivered campaigns

### CultureCheck: Growth Promotion Lab

The campaign contains Mission 0 through Mission 8:

| Missions | Learning boundary |
| --- | --- |
| 0 | Route media performance, method suitability, and routine product testing |
| 1 | Clean baseline with positive and uninoculated controls |
| 2 | Reference comparison and count confidence on a solid medium |
| 3 | Keep promotion, inhibition, and indication claims separate |
| 4 | Detect a failed uninoculated control |
| 5 | Route a product-interference question to method suitability |
| 6 | Preserve an equivocal broth observation without inventing a count |
| 7 | Stop a biologically plausible lot with a label/certificate mismatch |
| 8 | Reconstruct a packet with timing, control, morphology, and traceability defects |

Each mission uses deterministic, fictional fixtures. The run records lot intake,
required controls, objective observations, correction reasons, validity,
disposition, rationale, audit events, score ceilings, and a QA debrief.

### The Sixth Plate: Microbial Case Files

The campaign contains Case 00 through Case 08:

| Cases | Learning boundary |
| --- | --- |
| 00 | Classify TSB, SDA, MSA, MAC, RV, and XLD by form and evidence role |
| 01 | Separate TSB recovery, MSA reaction, and MAC exclusion from a species claim |
| 02 | Report a MAC pink/red pattern as a bounded lactose-fermenter group clue |
| 03 | Require the RV → XLD enrichment sequence before a Salmonella-like hypothesis |
| 04 | Keep a red-without-black XLD pattern at group level |
| 05 | Treat SDA yeast-like morphology as a non-bacterial clue |
| 06 | Recognize two morphotypes as a mixed-culture/purity issue |
| 07 | Reject organism claims when the chain of custody is broken |
| 08 | Use an unresolved conclusion for an atypical, contradictory packet |

Each case supports competing hypotheses, a bounded action budget, required
controls, objective medium observations, an evidence wall, a deterministic
report linter, calibrated confidence, a required next action, and QA review.

## Shared implementation

- `content.ts` owns the educational profile, media definitions, missions, cases,
  hypotheses, and deterministic truth fixtures.
- `engine.ts` evaluates validity, disposition, evidence accuracy, claim
  calibration, mixed culture, controls, and score ceilings without network
  access.
- `GameChrome.tsx` provides simulation status, campaign navigation, evidence
  rail, audit trail, debrief actions, and disabled-action reasons.
- `LabScene.tsx` provides the restrained 3D laboratory scene plus an equivalent
  text/2D fallback. Reduced motion bypasses nonessential motion.
- `persistence.ts` stores state and evidence packets in IndexedDB with a
  localStorage fallback, migrates compatible v1 state, validates imported
  educational profiles, and exports JSON packets.
- `GameReportPage.tsx` renders a local report route with print/save-to-PDF via
  the browser print dialog.

## Guardrails

All content is labelled fictional and educational-only. Exact strains,
compendial acceptance criteria, incubation parameters, proprietary SOP values,
and production release decisions remain outside the game profile. A reaction
can narrow a hypothesis but cannot prove species identity. A broken control,
traceability link, timing boundary, or mixed-culture clue remains visible in
the evidence packet and can cap the score.

The game routes are:

- `#/games`
- `#/games/growth-promotion`
- `#/games/bacterial-identification`
- `#/games/report/:packetId`

The legacy `#/games/feller` URL remains a compatibility redirect to The Sixth
Plate. The legacy `games/` mini-games are not linked from the supported React
workspace.

## Deliberately outside the delivery

- Production SOP/compliance profiles or regulated release authorization.
- Live LIMS, instrument, System DB, Google Sheets, or Apps Script integration.
- Instructor accounts, remote rosters, class analytics, and multi-user sync.
- Server-generated game PDFs. Browser print/save is provided for local reports.
- Formal QA approval of the fictional fixtures.

## Verification and deployment

Run from the repository root:

```text
corepack pnpm check
corepack pnpm test
corepack pnpm build
node validation/render_screenshots.cjs
powershell -ExecutionPolicy Bypass -File .\CREATE-DIST-ZIP.ps1
```

The production build is written to `dist/`. `START-ANF3.bat` reuses a healthy
local server or starts `START-SERVER.bat`, which serves the build at
`http://127.0.0.1:8000`. The release script creates a dated archive under
`release/` and writes a SHA-256 sidecar file.
