# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read [`HANDOFF.md`](HANDOFF.md) first.** It is the current state of the tree:
what was rebuilt in v7.1, what must not be touched, how to run and verify, and
the open items in priority order. This file is the short version.

> [`AGENTS.md`](AGENTS.md) at the root is **stale** — it describes the pre-v7.1
> vanilla-JS app ("no npm project, build step, or automated test runner") and
> its `js/`, `css/`, `data/` layout. Those folders are the frozen legacy pages
> now. Follow this file and `HANDOFF.md` instead.

## What this is

ANF3 Laboratory Records — a **read-only** React/Vite/TypeScript workspace over
the Air, Water and Cleaning Validation System DB, for a pharmaceutical
microbiology laboratory (GPO). Records are created, numbered and synchronised
only in the owner-managed Google Sheets through bound Apps Script projects.
Nothing in the browser writes to them.

```
Google Sheets (user sheets)  →  bound Apps Script  →  RPP2 System DB sheets
                                                            ↓ public read
                     React workspace (hash router, read-only, IndexedDB cache)
                                                            ↓ route key only
                     Flask on localhost:8000  →  controlled .docx → PDF
```

Three boundaries follow from that diagram and explain most of the design:

- The browser reads the System DB **directly** from published Apps Script
  `/exec` URLs — Flask is not a proxy for it.
- The browser sends Flask a **route key**, never a template path. `server/`
  owns template resolution and re-validates the CV method server-side.
- Everything the browser keeps (IndexedDB record cache, operator identity,
  recents, palette, shape, quality) is **per-machine** and disposable.

## Running it

Node 22, pnpm 10. `node_modules` is not checked in; `pnpm install` first.

```
pnpm install
pnpm dev          # vite 127.0.0.1:5173, /api proxied to 127.0.0.1:8000
pnpm build        # tsc -b && vite build → ./dist (what Flask serves)
pnpm check        # tsc -b only
pnpm test         # vitest run
```

A single test file or case:

```
pnpm vitest run apps/web/src/games/difficulty.test.ts
pnpm vitest run apps/web/src/games/engine.test.ts -t "critical error"
python3 -m pytest server/tests/test_pdf_server.py -k catalog
node validation/test_cv_contract.mjs        # each gate is a standalone script
```

The Flask server serves the PDF and catalogue routes:

```
INSTALL.bat                    # one time
INSTALL-MSOFFICE-SUPPORT.bat   # one time, Word → PDF
START-SERVER.bat               # Flask on http://localhost:8000
```

`START-ANF3.bat` is the single-click path on a non-developer machine. It is
run **from the share drive**: it copies the workspace to
`%LOCALAPPDATA%\ANF3-Laboratory-Records`, installs Python there once, and
refreshes whenever the root `VERSION.txt` changes. Bump `VERSION.txt` on every
release or no PC updates. See `HANDOFF.md` § 2c.
Both launchers probe the `.venv` (python.exe **and** `pyvenv.cfg` **and** a
real `import flask`) and rebuild it when it fails — never guard on
`python.exe` alone; see `DESIGN.md` § v7.1e.
`CREATE-DIST-ZIP.ps1` packages a release.

### Where the System DB URLs come from

Two layers, in this order — see `apps/web/src/api.ts`:

1. `.env.production` at the **repo root** (`VITE_WATER_READ_URL`,
   `VITE_AIR_READ_URL`, `VITE_CV_READ_URL`) is compiled into the bundle.
2. `config.json` beside the launcher is fetched at runtime and overrides any
   key it sets non-empty. This exists so the owner can repoint a domain with
   Notepad on a PC that has no Node — do not remove it in favour of a rebuild.

Public **read** endpoints only, in both. `ANF3_SYNC_TOKEN` never appears in
either; the only place a token may live on a PC is `server/log-forward.json`
(optional, off by default, server-side only — see `log-forward.example.json`).

## Layout

- `apps/web/src/` — the supported application
  - `tokens.css` — **the locked design system.** Every colour, font, space,
    easing and duration in the project resolves through a token here.
  - `styles.css` — Index-First layout, N3 side-rail nav, one-line colophon
  - `DeskScene.tsx` + `theme.ts` — the 3D shelf of the real box files, above
    the bench. Colours are read out of `tokens.css` at runtime (`THREE.Color`
    cannot parse `oklch()`, so `theme.ts` paints the token to a 1×1 canvas)
  - `App.tsx` — `createHashRouter` routes, shelf index, record workspace, ⌘K
    palette. One file, ~2000 lines; most screens are components inside it
  - `appData.ts` — workflows, buildings, binders, spine labels, tool tabs,
    `fellerCorrected()`. `activeBinders()` = openable; `shelfBinders()` =
    openable + the pink spare. Do not conflate them
  - `api.ts` · `storage.ts` · `recordPolicy.ts` — **contract code, do not
    refactor casually**: System DB read, offline cache, PDF route policy
  - `operator.ts` — who is at this machine: `{ name, code }`, per browser,
    plus `logEvent`/`readLog`. Attribution, never authentication; never
    describe it as a login or a Part 11 signature
  - `batchPrint.ts` · `pdfPreview.ts` — `renderBatch()` renders each worksheet,
    the preview draws every page with pdf.js, `mergeParts()` stitches only what
    is still ticked (unticking never returns to the server). `pdfjs-dist` is
    pinned to 4.x on purpose; see `HANDOFF.md` § 2b before changing either
  - the instrument-panel layer at the end of `styles.css` — `.legend`,
    `.well`, `.readout`, `.lamp`, `.calibrated`, and selection by inversion.
    Containment is a hairline, never a hairline plus a shadow
  - `settings.ts` — the per-machine quality choice (auto/full/fast). "fast"
    must reduce MOTION as well as cost; see `HANDOFF.md` § 2e
  - `palette.ts` · `binderShape.ts` · `recent.ts` — the other per-browser
    choices: binder hue overrides (with contrast/clash warnings), binder
    shape, the in-tray of recently opened records and the substitution log
  - `games/` — two offline training simulations, plus `difficulty.ts`,
    which is what makes the chosen level change the rules
- `server/` — Flask static + PDF generation; owns template resolution.
  `PDF_WORKFLOW_REGISTRY` in `pdf_server.py` maps the seven route keys to the
  five controlled templates; `_validate_pdf_route` re-checks the CV method and
  answers 422 on a mismatch. `activity_log.py` owns the append-only log
- `apps-script/`, `apps-script-deploy/` — the Sheets side. Six deployable
  bundles, one per spreadsheet (`docs/APPS_SCRIPT_6_FILE_CONTRACT.md`)
- `templates/` — five controlled Word templates
- `validation/` — contract, fixture, release and screenshot checks
- `.claude/skills/` — four vendored design skills (hallmark, repaint,
  no-slop-ui, design-taste); see `.claude/skills/README.md`
- `OWNER_DEPLOYMENT.md` — **what to copy where**: the 6 scripts → 6 spreadsheets table
- `OWNER_MANUAL.md` — the owner's operating manual (install, connect, run, fix)
- `OWNER_SETUP_TH.md` — the Apps Script install detail, file by file
- `docs/README.md` — which documents a gate enforces and which are history.
  `docs/CABINET_WORKFLOW_MATRIX.md` is the **source of truth for the shelf**:
  change it and `appData.ts` together or the contract check fails.
  `docs/archive/` is superseded — kept for the record, not to be followed
- `pw-prw/`, `wfi-pus/`, `compressed-air/`, `em-air/`, `cv/`, `games/`,
  `js/`, `css/`, and the root `*.html` pages — frozen legacy direct-URL app,
  hash-checked against `validation/games-baseline.sha256`; do not edit

## Verify before you finish

```
pnpm check && pnpm test && pnpm build
python3 -m pytest server/tests
node validation/test_apps_script_security.mjs
node validation/test_cv_contract.mjs
node validation/test_games.mjs
node validation/test_worksheet_numbering.mjs
node validation/validate_non_game_contract.mjs
python3 validation/validate_cv_package.py
python3 validation/validate_release.py
node validation/contrast.mjs        # every token pair, measured, plus sRGB gamut
node validation/validate_wiring.mjs --built   # the browser can actually reach the server
node validation/validate_launchers.mjs        # the .bat files, which cannot be run off Windows
node validation/validate_styles.mjs           # every className has a CSS rule, in a reachable sheet
```

Two more need a browser, so they are not in that list:

```
node validation/validate_interaction.mjs   # needs Flask running on :8000 + playwright
SHOT_ROUTES="/,/games,/inventory" node validation/shot.cjs   # needs dist/ served on :4173
```

## Rules that are not negotiable

1. **The browser never writes a record.** If a change would let it mutate the
   System DB, stop and ask.
2. **No mutation token** in browser configuration or source — not in
   `.env.production`, not in `config.json`. `ANF3_SYNC_TOKEN` lives only in
   Apps Script Script Properties and, optionally, `server/log-forward.json`.
3. **Token discipline.** No inline hex, `oklch()`, `rgb()` or bare
   `font-family` outside `tokens.css`. Add a named token instead.
4. **No eyebrow labels** above headings, no card-in-card, no card with a thick
   coloured side stripe, no three-column icon-above-heading grid, no italic
   headings. See `DESIGN.md` § v7.1 and `.hallmark/log.json`.
5. **Motion:** `transform` and `opacity` only, on the named easings and
   durations, always with a `prefers-reduced-motion` fallback. Focus rings
   appear instantly — never transition `outline`. The 3D shelf's cost is
   governed at runtime by `QualityGovernor`; never quote a frame rate measured
   in a container, which has no GPU. See `HANDOFF.md` § 2d.
6. **The training simulations are fictional** and are not an approval tool.
   Keep the training-boundary language wherever a limit or grade is shown.
7. **Ask before touching** `server/`, `apps-script*/`, `templates/`, or the
   frozen legacy pages.
8. **Binder colour means a building.** Never decorative, never reuse the
   reserve pink for Other Locations, never invent a record count.
9. **The binder hue is the loudest thing on screen.** Neutrals stay under
   0.02 chroma. After any palette edit run `node validation/contrast.mjs`;
   it fails on a pair below its threshold and on any colour outside sRGB.
10. **The build must stay wired.** `.env.production` is at the repo root while
    vite's `root` is `apps/web`, so `envDir` in `vite.config.ts` is what makes
    the System DB URLs reach the bundle. Never emit a `vite.config.js` beside
    the `.ts` (both tsconfigs emit to `node_modules/.tmp/` for this reason).
    Run `node validation/validate_wiring.mjs --built` after any build or
    config change; see `HANDOFF.md` § 0.
11. **A new PDF route is a three-place change**: `recordPolicy.ts`
    (`pdfRouteForRecord`), `PDF_WORKFLOW_REGISTRY` in `server/pdf_server.py`,
    and `docs/CV_TEMPLATE_ROUTING_CONTRACT.md`. `validate_wiring.mjs` and
    `test_cv_contract.mjs` fail if the three disagree.
