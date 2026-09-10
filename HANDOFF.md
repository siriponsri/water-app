# Handoff — ANF3 Laboratory Records v7.1

Written for the next session (any agent) picking this up. Read this file, then
`PLAN.md` and `DESIGN.md`. Everything below is the state of the working tree as
delivered, not a proposal.

---

## 0. Read this first — the v7.1f wiring audit

The v7.1 release built cleanly, passed every test and every release gate, and
**was not connected to anything.** The running app reported
"System DB URL is not configured" for all three domains.

**Cause.** Vite resolves `.env` files relative to `root`, and `root` is
`apps/web`. `.env.production` lives at the repo root, so *every*
`VITE_*_READ_URL` was silently dropped from the bundle. Verified by grepping the
built asset for the configured URL: not present.

**Fixed:** `envDir: '../../'` in `vite.config.ts`.

**Also found and fixed in the same pass:**

| Finding | Fix |
|---|---|
| `tsconfig.node.json` was `composite` with no `outDir`, so `tsc -b` emitted `vite.config.js` and `vite.config.d.ts` into the repo root. A stale compiled config can win vite's config resolution. | Both tsconfigs now emit to `node_modules/.tmp/`. A `.gitignore` was added (there was none). |
| `<html lang="th">` while all UI copy is English. | `lang="en"`. |
| `VITE_CV_READ_URL` is empty. | **Not fixable here — the owner must supply it.** Documented in `OWNER_MANUAL.md` § 2. Water and Air are set. |

**New gate: `validation/validate_wiring.mjs`.** Run it with `--built` after any
build. It checks that vite's `envDir` resolves to the folder holding
`.env.production`, that no stale compiled config exists, that the `/api` dev
proxy is present, that every `/api/...` path `App.tsx` calls has a matching
`@app.route` in `pdf_server.py`, that every PDF workflow the UI can request is
in the server registry, and — with `--built` — that each configured URL is
actually inside `dist/assets/*.js`.

**Backend verified end to end**, not assumed. Flask was started against the
build in the delivery container and every route exercised with curl:

| Workflow | Result |
|---|---|
| `pw-prw` · `wfi-pus` · `compressed-air` · `em-air` | PDF produced |
| `cleaning-validation-contact` · `-rinse-pour` · `-rinse-membrane` | PDF produced |
| rinse-membrane sent with `testMethod: pour-plate` | rejected 422, "test method does not match the selected route" — the guard works |

A downloaded artefact was confirmed to be a real 2-page PDF. The Apps Script
`/exec` URLs cannot be reached from the delivery container (egress allowlist),
so the System DB read is proven only as far as "the URL is in the bundle"; the
owner verifies the rest with the health checks in `OWNER_MANUAL.md` § 4.

**Tree tidied.** Twelve stale root markdown files moved to `docs/archive/`
(nothing deleted). `HANDOFF_SONNET5.md` → `HANDOFF.md`; references updated in
`README.md`, `CLAUDE.md`, `OWNER_SETUP_TH.md`. New `OWNER_MANUAL.md` is the
owner's operating manual; `OWNER_SETUP_TH.md` remains the Apps Script
install detail it always was.

---

## 1. What changed in this pass, and what did not

**Rebuilt (presentation only):**

| Path | What it is now |
|---|---|
| `apps/web/src/tokens.css` | **New.** The locked design system: OKLCH colour, three font roles, a 4-pt space scale, three easings, three durations, six z-levels. Everything else references it. |
| `apps/web/src/styles.css` | Rewritten. Index-First macrostructure, N3 side-rail nav, one-line colophon footer. |
| `apps/web/src/theme.ts` | **New.** Resolves CSS custom properties into `THREE.Color` (see §4). |
| `apps/web/src/DeskScene.tsx` | **New.** Replaces `FoyerScene.tsx` (deleted). The 3D shelf + bench. |
| `apps/web/src/recent.ts` | **New.** The in-tray: what this browser opened last, `localStorage` only. |
| `apps/web/src/App.tsx` | Rewritten. All UI copy is English. Adds a ⌘K palette and the shelf index. |
| `apps/web/src/appData.ts` | `SpineLabel` per binder (transcribed from photographs), the shelf topology below, and the typed `tools` list. |
| `.claude/skills/` | **New.** Four vendored design skills — see §9. |
| `OWNER_SETUP_TH.md` | **New.** Which Apps Script file goes in which spreadsheet, with the real IDs. |
| `apps/web/src/games/*` | Presentation rebuilt; `content.ts`, `engine.ts`, `persistence.ts`, `types.ts` untouched. New game added (§3). |
| `validation/validate_release.py` | Design gates updated for the new architecture — see §6. |

**Deliberately untouched — do not "tidy" these:**

- `apps/web/src/api.ts`, `storage.ts`, `recordPolicy.ts` — the System DB read
  contract, the offline cache and the PDF-route policy.
- `server/`, `apps-script/`, `apps-script-deploy/`, `templates/` — the regulated
  side. The browser still sends only a route key; the local server still owns
  template resolution and validates the CV method.
- The legacy direct-URL HTML pages (`pw-prw/`, `wfi-pus/`, `compressed-air/`,
  `em-air/`, `cv/`, `games/`) — still frozen fallbacks, still hash-checked by
  `validation/validate_non_game_contract.mjs`.

### The shelf, as the owner specified it

Binder colour means a building and nothing else.

| Colour | Group | Binders |
|---|---|---|
| Blue | Building 10 | PRW & PW · Air Sampling · CA · Cleaning Validation |
| Lilac | Building 12 | PRW & PW · Air Sampling · CA · Cleaning Validation |
| Mint | Building 16 | PRW & PW · WFI · Air Sampling · CA & Nitrogen · Cleaning Validation |
| Amber | Other Locations | **one** binder; Building 11 and Building 19 are inside it |
| Pink | Reserve | **one** spare, spine printed `COMING SOON`, `route: null`, never openable |

14 openable binders, 15 on the shelf. `activeBinders()` returns what can be
opened; `shelfBinders()` includes the reserve file, because the physical spare
is on the shelf. Do not conflate them.

Two binders open onto a contents page instead of a record list:

- **`other-locations`** → `/binder/other-locations` → Building 11 · Air
  Sampling, Building 11 · CA, Building 19 · PRW.
- **any `cv` binder** → the family step, then, for Rinse, the method step:

```
Contact Plate ──────────────► cleaning-validation-contact
Rinse ├─ Pour Plate ────────► cleaning-validation-rinse-pour   (PW / PRW family)
      └─ Membrane Filtration► cleaning-validation-rinse-membrane (WFI / PUS family)
```

The chosen method rides in the `testMethod` query parameter, pre-selects the
per-record radio group, and is still overridable there. `recordPolicy.ts` is
unchanged — it remains the single place that maps a record to a template route.

`docs/CABINET_WORKFLOW_MATRIX.md` is the source of truth for all of this and is
asserted by `validation/validate_non_game_contract.mjs`. Change the matrix and
the code together, or the check fails.

---

## 2. The design system, in one page

Read `apps/web/src/tokens.css` — the stamp at the top of that file is the
durable record. The short version:

- **Macrostructure: Index-First.** The application is a finding aid. The page
  *is* the index; the 3D shelf is how you handle what the index points at.
- **Nav: N3 side-rail.** A left rail of typographic labels, no icon tiles, no
  top bar. It collapses to a horizontal strip under `60rem`.
- **Footer: one line.** Ft4 was tried and cut in v7.1d — see `DESIGN.md`.
  The footer now states only that the workspace is read-only; everything else
  moved to the screen where the reader is deciding. The old text said:
- ~~**Footer: Ft4 dense colophon.** One mono paragraph stating the data~~
  boundaries, the template families, and the training boundary. It is a real
  statement of scope, not a sitemap.
- **Type — three faces, three jobs.** Newsreader (roman serif) titles;
  IBM Plex Sans Thai reads, and carries Thai sample-point names straight out
  of the System DB; IBM Plex Mono carries exactly **one** role — machine data
  (worksheet numbers, codes, dates, counts, states). Never use mono for prose
  or for section labels; that is how the outlier becomes a third body font.
- **Colour.** Warm oat paper, near-black ink, one oxide-red accent that only
  ever marks state. Building hues are *structural*: a hue means a building,
  and it appears on binder spines, index codes and row markers only.
- **Building colours come from the physical binders**, photographed on the
  ANF3 shelf: B10 pale blue, B12 lilac with a plum band, B16 mint with a sage
  band, Other amber, Reserve pink. `--bNN-spine` is the board, `--bNN-band` is
  the printed band, `--bNN-band-ink` is the ink on that band, and `--bNN` is a
  darkened version of the same hue that can carry small text on paper.

**Rules that are load-bearing, not taste:**

1. Every colour and every `font-family` resolves through a token. No inline
   hex, no inline `oklch()`, no bare font name. Relative-colour forms
   (`oklch(from var(--token) …)`) are fine — they still reference the token.
2. Every padding, gap and margin comes off the `--space-*` scale.
3. Focus rings appear instantly. Never transition `outline`.
4. Animate `transform` and `opacity` only, on `--ease-out` / `--dur-*`.
5. No eyebrow labels above headings; no card inside a card; no card with a
   thick coloured side stripe; no three-column icon-above-heading grid.
6. Headings are roman. Emphasis comes from weight or accent, never italic.

---

## 2b. Who is at the machine, and the print preview (v7.1o)

### The identity is a name AND a code

The System DB's own `createdBy` column is why. Across 212 rows of
`records_pw_prw` it holds `na` 44 times, `KC`/`kc` 25, `kulwanee`/`Kulwanee`
17, plus `วิทยา`, `Siripon`, `คนสวย` and 12 blanks — free text, no code
anywhere. QA cannot answer "who made this record" from that column however it
is displayed, so no amount of filtering would have satisfied the request.

`operator.ts` therefore stores `{ name, code }`, asked once per browser and
kept until **ลบชื่อและรหัสจากเครื่องนี้** on `/activity` clears it (that
button logs the departure first — an unattributed "somebody left" is worth
nothing). An install from before v7.1o carries a bare code under
`anf3.operator.v1`; it is migrated and only the name is asked for.

Both fields reach the sheet through the existing server-side forward
(`server/log-forward.json`, off by default, token never in the browser):
`username` gets the readable `name (code)` so an existing 5-column `logs` tab
keeps working, and `operatorName`/`operatorCode` are appended as their own
columns. `ensureLogHeaders_()` in the air and water system scripts widens the
header row in place on the first write — the owner does not edit the sheet.

**It is still not a login.** Nothing verifies either field, no endpoint checks
it, and every surface says so. Do not let it be described to QA as a Part 11
signature or as access control.

`record_opened` now fires from `RecordSheet` — declared since the beginning on
both sides, with a Thai label, but never emitted until now.

### The print preview

`buildBatch()` is split into `renderBatch()` (each worksheet its own document
plus page count) and `mergeParts()` (stitch what is still ticked). Unticking a
worksheet never returns to the server.

`pdfPreview.ts` draws pages with pdf.js rather than framing a blob URL,
because an `<iframe>` of a PDF cannot be verified here (Playwright's Chromium
has no PDF plugin) and can be disabled outright by the
`AlwaysOpenPdfExternally` policy on a corporate Windows image.

Three things to leave alone:

- **`pdfjs-dist` is pinned to 4.x.** v6 calls
  `Map.prototype.getOrInsertComputed` and throws on anything but a very recent
  browser. Check what the lab machines run before bumping the major.
- **`.preview-screen` must sit above `--z-sticky-nav`.** At a lower layer the
  side rail covers the left 224px, which is where the tick boxes are.
- **`serve_static` must keep the `.mjs` MIME case.** Served as
  `application/octet-stream` the pdf.js worker is refused as a module script
  and the preview cannot draw anything.

Both `printJS` call sites now pass `onError`; print-js throws inside its own
XHR callback, so a failed print used to be completely silent.

---

## 2c. The share drive (v7.1p)

The workspace lives on the department share drive so there is one copy to
update. It is **not run from there**. `START-ANF3.bat` copies it down to
`%LOCALAPPDATA%\ANF3-Laboratory-Records` on first launch, sets up Python
there once, and hands over; on later launches it compares `VERSION.txt` on the
share drive with the local one and refreshes only when they differ.

Running several PCs out of one shared folder breaks three things, which is why
this exists:

- **`.venv` is not portable.** `pyvenv.cfg` records an absolute path to the
  Python it was built from, so it works only on the PC that created it. Worse,
  `START-SERVER.bat` treats a failing environment as damaged and calls
  `INSTALL.bat`, which does `rmdir /s /q` on it — deleting the shared
  environment out from under whoever is using it at that moment.
- **`activity-log.jsonl` and `.anf3-port` are single files.** The write lock in
  `activity_log.py` is a `threading.Lock`, useless across machines; the read
  path already skips torn lines silently, so entries would be lost from the
  audit trail with nothing to show for it. The port file makes each PC believe
  another machine's server is its own.
- **Two PCs printing the same worksheet collide.** `pdf_id` is a hash of the
  content, not of the machine, so the same worksheet is the same output path.
  That is a controlled document.

The copy therefore excludes exactly the per-machine state: `/XD .venv
node_modules .git .uv-cache pdfs words release shots __pycache__` and
`/XF .anf3-port activity-log.jsonl log-forward.json`. robocopy, not xcopy,
because UNC paths and long names; exit codes below 8 are success.

If the local copy cannot be written the launcher says so and falls back to
running from the share drive, with a warning that it is not safe for several
people at once.

**`validation/validate_launchers.mjs` enforces all of this** — the exclusions,
the `%LOCALAPPDATA%` target, the errorlevel-8 check, the short-circuit that
stops the launcher handing over to itself forever, plus label resolution and
balanced quotes in every `.bat`. These scripts cannot be executed off Windows,
so this gate is the only thing standing between a typo and a black window that
flashes and closes on a laboratory PC.

`VERSION.txt` at the root is the stamp. **Bump it on every release**, or no PC
will pick the update up.

---

## 2d. The instrument panel and the quality governor (v7.1q)

The visual register is a laboratory instrument's front panel — machined
divisions, engraved legends, recessed wells, lamps wired to real state — not
skeuomorphism. At density 7-8 containment is a hairline plus a background
shift and **never a shadow as well**; `.sheet` has no `box-shadow` for that
reason. Selection is by **inversion**, once per view: the open record is
inverted, a row ticked for printing carries an accent marker instead. Do not
merge those two states again.

New tokens (`--color-well`, `--inset-well`, `--tick-ink`, `--lamp-off`,
`--ease-settle`, `--stagger` and friends) are all under 0.02 chroma. Rule 9
still holds: the binder hue is the loudest thing on screen.

**`QualityGovernor` in `DeskScene.tsx`** measures frame times on the machine
it is running on and steps the shadow map down 2048 → 1024 → off, resolution
following. It only ever steps down, ignores the first second, and closes its
sampling window on 45 frames **or** 1.5 seconds, whichever comes first — the
frame-count-only version waited longest on exactly the machines that needed
help soonest. It writes `data-shelf-quality` on `<html>`; ask for that value
on a support call rather than guessing.

**Frame numbers from a development container are worthless here** — there is
no GPU, so the scene runs about 1 fps regardless. The governor's firing was
verified; the frame rate on the real machine has not been.

**The fleet is uniform and was measured** (v7.1s), not guessed at:
Core Ultra 5 235U, Intel Graphics 4 Xe-cores, **hardware acceleration ON**,
WebGL2, Edge 152, **1920x1200 at device pixel ratio 1.25**, 16 GB, 14 threads.
The probe pinned the vsync ceiling at both light and heavy load, so 60 fps is
a floor and the real headroom was never reached.

Three numbers follow from that and must not be "simplified" back:

- **The shelf's `dpr` is a SCALAR with a floor of 1.5**, not a range. Given a
  range, r3f clamps the device's own ratio into it, so a range can never
  render above native — on a 1.25 panel that means no supersampling at all.
  v7.1r's "raise the ceiling to the panel ratio" silently *lowered* every
  machine in the building from 1.5 to 1.25 for exactly this reason.
- **The print preview's scale floor is 2**, above the panel's 1.25, because
  this is the screen where a worksheet number is checked before a controlled
  document is printed.
- **No page eviction.** Measured at ~0.7 MB of heap per page, so a
  40-worksheet batch is ~60 MB against 16 GB. Eviction would only add a
  re-render every time somebody scrolled back.

The governor stays anyway: a 15 W part in a thin chassis is not guaranteed to
hold its clocks under a sustained load, and policy can change.
`tools/ANF3-CHECK-THIS-PC.html` re-measures any machine in fifteen seconds.

**`<main>` is keyed on the first two path segments, not the full pathname.**
Keying on the full path remounts the workspace when the record key changes
and silently discards the ticked print selection.
`validation/validate_interaction.mjs` guards it (needs a running server and a
browser, so it is not in the default gate run).

---

## 2e. The per-machine quality choice (v7.1t)

`apps/web/src/settings.ts` holds one setting — **auto / full / fast** — kept
per browser like the binder colours, and surfaced on the **ตั้งค่าเครื่องนี้**
rail tab along with the operator identity and the shelf look.

- **auto** (default) lets `QualityGovernor` measure and step down.
- **full** pins full quality and stops the governor demoting at all.
- **fast** pins it low *and stops the motion*, which is the part that is easy
  to get wrong: it must reach the 3D scene's `calm` prop, not only the dpr.
  The pointer parallax is the only motion in the shelf that runs without the
  reader doing anything, so it is the one that matters most here.

The choice is published to CSS as `data-motion` on the root element, because
the 2D motion has to answer to it too. `prefers-reduced-motion` from the OS
outranks the setting in both directions — never invert that.

Three things not to undo:

- **`.sr-only` must stay in `styles.css`.** It also exists in `games.css`;
  that copy is only loaded by the components under `games/`.
- **`validate_styles.mjs` checks reachability, not existence.** A class used
  outside `games/` must be defined outside `games.css`. It passed on a real
  bug before this, which is why the check is worth its complexity.
- **Shadows follow `quality` through `<ShadowSwitch>`.** Setting
  `gl.shadowMap.enabled` directly is a one-way switch that nothing restores.

`validation/validate_interaction.mjs` covers all of it: each option reaching
both `data-motion` and the canvas's real render ratio, persistence across a
reload, and "full" genuinely blocking demotion under software rendering.

---

## 3. The training simulations

Two campaigns, all fictional, all offline, all local autosave.

CultureCheck — Growth Promotion Lab was **removed in v7.1n**. It shared six of
its nine phases with The Sixth Plate (orientation, briefing, planning,
observation, debrief and the same evidence rail), so it was two names for one
game and the owner asked for the duplicate to go. The hash route
`#/games/growth-promotion` now redirects to The Sixth Plate so old bookmarks
still land somewhere. **The frozen legacy page `games/growth-promotion.html`
is a different artefact and was not touched** — `validate_release.py` and
`games-baseline.sha256` still check it, and it is still linked from
`games/index.html`.

- **The Sixth Plate — Microbial Case Files** (9 cases) — unchanged content.
- **Excursion Trace — Cleanroom Investigation** (**new**, 7 cases: 1
  orientation + 6 scored). Flag EM readings that exceed their grade's
  training-fixture action limit, reconstruct the likeliest ingress path across
  a hand-built cleanroom floor plan, then choose a CAPA. Active-air readings
  run through `fellerCorrected()` from `appData.ts` — one case is built
  specifically around a raw count that passes and a corrected count that does
  not. Scoring: exceedance triage 30 + path reconstruction 25 + CAPA
  calibration 30 + documentation 15, capped by the chosen level when a
  critical error fires (see below).
  Files: `excursionTypes.ts`, `excursionContent.ts`, `excursionEngine.ts`,
  `excursionEngine.test.ts`, `ExcursionTraceGame.tsx`.

### The level is a rule set, not a label (v7.1n)

Before v7.1n `difficulty` was stored, exported in the evidence packet and used
in the storage key, but **no rule read it** — picking "expert" changed nothing
you could feel. `games/difficulty.ts` is the fix, and both campaigns read it:

| | เริ่มต้น (`guided`) | ทบทวน (`standard`, default) | ยาก (`expert`) |
|---|---|---|---|
| for | new staff | experienced staff keeping their eye in | — |
| media purpose + boundary | shown | shown | hidden |
| sequence hint (RV before XLD) | shown | hidden | hidden |
| excursion action limits | printed | printed | hidden; a lookup button reveals one and writes an audit entry |
| glossary | open | closed | closed |
| report linter | live, and confirms before submit | at debrief only | at debrief only |
| action budget | authored **+2** | authored | authored **−1**, never below 2 |
| critical-error ceiling | 79 | 69 | 55 |
| per critical error | −0 | −4 | −9 |
| saved score | best attempt | first attempt | first attempt |

The per-error deduction is not decoration either. A ceiling alone only bites a
run that was otherwise scoring well, so without it a *poor* run scored
identically at every level — the same "difficulty is only a label" bug in
miniature. `difficulty.test.ts` is what caught that, and it is what keeps the
levels from quietly collapsing back into labels; it also asserts the expert
budget penalty can never make a case unwinnable.

The identifiers stay `guided | standard | expert` because saved progress,
evidence packets and storage keys already carry them. Only the meaning and the
Thai labels changed.

The training boundary language is not decoration. Microbiology and QA have not
reviewed these fixtures. Keep `TRAINING_FIXTURE_NOTICE` visible wherever a
limit or a grade is shown, and keep the games out of any path that could read
as an approval step.

---

## 4. The 3D scene, and the one trick in it

> **v7.1b** made the binder-opening animation the page transition itself —
> read `DESIGN.md` § v7.1b before touching `Binder`'s animation, the
> `.shelf-view::after` veil, or `binderForContext()`. The three are one
> mechanism; changing the timing of any of them without the others shows the
> cut.
>
> **v7.1a** rebuilt the render and the home layout — read `DESIGN.md`
> § v7.1a before touching either. Short version: image-based lighting from
> `RoomEnvironment`, ACES filmic tone mapping, procedural grain maps, a
> `FitCamera` that frames the shelf for the panel's actual aspect ratio, and a
> binder modelled as spine + back board + hinged front board so it can be
> fingered off the shelf and opened. The home screen is a `100dvh` three-row
> workbench with a building tab strip; there is no hero and no page scroll.


`DeskScene.tsx` builds the cabinet from the photographs: white melamine
carcass, one open bay, A4 lever-arch box files standing on the shelf, each
spine printed in four bands (code · Thai title over English subtitle ·
building and ANF3 · bare board) with a chrome finger ring. Below it is the
bench, with a task lamp and an in-tray.

What is interactive, and why each object is there:

| Object | Does |
|---|---|
| Shelf-edge chip | Changes which building is on the shelf |
| Binder | Comes off the shelf, lands on the bench, opens the records route |
| Lamp | Toggles the theme — the room's light is the page's light |
| In-tray | Opens the most recent record; the stack is the recent count |

**The trick:** `THREE.Color` cannot parse `oklch()`, and every colour in this
project is an oklch custom property. `theme.ts` paints the token onto a 1×1
canvas and reads the sRGB bytes back. That keeps one palette definition
instead of two that drift. If you add a material, add its token to
`ROOM_TOKENS` — do not inline a hex.

The camera is fixed (a small pointer parallax only) — there is no OrbitControls
and `validate_release.py` asserts there isn't. The scene is `aria-hidden`;
every drawer and binder it draws is also a real button in the index beside it,
and the flat CSS fallback renders when WebGL is unavailable, the viewport is
under 760 px, or the visitor asked for reduced motion.

---

## 5. Running and deploying locally

Development (Node 22, pnpm 10):

```
pnpm install
pnpm dev            # vite on 127.0.0.1:5173, /api proxied to 127.0.0.1:8000
```

The Flask server must be running for the PDF and catalogue routes:

```
INSTALL.bat                    # one time, no admin rights needed
INSTALL-MSOFFICE-SUPPORT.bat   # one time, for Word to PDF
START-SERVER.bat               # Flask on http://localhost:8000
```

Production build and packaging on Windows:

```
pnpm build                     # emits ./dist
BUILD-DIST.bat
powershell -ExecutionPolicy Bypass -File CREATE-DIST-ZIP.ps1
```

`START-ANF3.bat` is the single-click path for a non-developer machine: it
fetches a project-local `uv`, creates `.venv`, installs the Python
dependencies, starts Flask on port 8000 and opens the browser. The startup
script does not terminate Word or Excel — save open documents first.

`.env.production` carries the three public read endpoints. Never put a
mutation token in it; the System DB `ANF3_SYNC_TOKEN` lives only in Apps
Script Script Properties.

---

## 6. Verification — all of this passes as delivered

```
pnpm check
pnpm test                                     # 3 files, 35 tests
pnpm build
node validation/test_apps_script_security.mjs
node validation/test_cv_contract.mjs
node validation/test_games.mjs
node validation/test_worksheet_numbering.mjs
node validation/validate_non_game_contract.mjs
python3 validation/validate_cv_package.py
python3 validation/validate_release.py
node validation/contrast.mjs        # measured contrast + sRGB gamut for every token pair
```

Screenshot audit: `SHOT_ROUTES="/,/games,/inventory" node validation/shot.cjs`
(writes `shots/*.png`, light and dark, needs a static server on
`127.0.0.1:4173` serving `dist/`).

**One validator was changed and you should know why.**
`validate_release.py::assert_design_gates` used to assert on the old foyer —
`FoyerScene.tsx` exists, `OrbitControls` is configured, `CabinetView` and
`BinderList` are in `App.tsx`, and a `414px` media query is present. Those
described the previous implementation, not the regulated contract. They are
replaced with gates that describe the new one: no `OrbitControls`, 3D colour
comes from tokens, the named design tokens exist, the shelf index and the
reserve state are present, `overflow-x: clip` is on the root, and the rail
collapses at `60rem`. The CV, Apps Script, template and endpoint assertions in
that file are untouched.

---

## 7. What is left, in the order I would do it

1. **Real data pass.** Every screen in this delivery was verified against the
   empty and cached states, because the sandbox has no System DB reachability.
   Point `.env.production` at the live read endpoints and re-check: long
   worksheet numbers in `.hits strong`, Thai sample-point names in `.sample`,
   and a record with more than 36 populated fields (the field table is sliced
   at 36 — decide whether that slice should stay).
2. **The binder-to-bench animation.** A picked binder currently lays flat on
   the bench and the route changes 620 ms later. It does not open. If you want
   the page turn, add it in `Binder`'s `chosen` branch — but keep the total
   under ~800 ms; anything longer starts to feel like a loading screen.
3. **Cleaning Validation spine wording.** No photograph of a CV binder exists,
   so its spine carries English only (`CONTACT PLATE / AND RINSE RECORDS`) and
   no Thai line. The app deliberately does not invent controlled-label
   wording. Get the real label photographed, then fill `spineTitles.cv.th`.
4. **The Other Locations colour.** B10, B12, B16 and Reserve are sampled from
   photographs. Amber for Other Locations is from the written spec, not
   observed — confirm it against the physical shelf and, if it differs, change
   `--other-spine` / `--other-band` in `tokens.css` only.
5. **QA review of the Excursion Trace fixtures** before that campaign is shown
   to anyone as training.
6. **Bundle size.** `react-three-fiber` is ~880 kB raw / 234 kB gzipped and is
   already a lazy chunk. If the shelf is not worth that on the shared lab PCs,
   the flat CSS cabinet is a complete substitute — `FlatDesk` in `App.tsx`.

---

## 9. The bundled design skills

`.claude/skills/` carries four vendored, permissively licensed design skills so
any agent in this repo is held to the standard v7.1 was built to:
**hallmark** (MIT — the primary rule set, and what the slop test comes from),
**repaint** (Apache-2.0 — interaction, accessibility, SEO),
**no-slop-ui** (MIT — a fast reviewer's checklist), and
**design-taste** (MIT — component-level judgment).
`.claude/skills/README.md` says which to reach for when. Each keeps its
upstream `LICENSE`; update by re-copying from upstream, never by patching in
place.

---

## 8. House rules for whoever works on this next

- This workspace never writes a record. If a change would let the browser
  mutate the System DB, stop and ask.
- Do not put a mutation token in browser configuration or source.
- Back up each Google Sheet before replacing Apps Script.
- Have Microbiology and QA review CV mapping, game scenarios, test
  specifications and controlled templates before formal production use.
- The games are not an approval tool and must never be presented as one.
