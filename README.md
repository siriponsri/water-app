# ANF3 Laboratory Records

A **read-only** workspace over the Air, Water and Cleaning Validation System
DB, for the GPO microbiology laboratory. It finds a worksheet, shows what the
System DB holds, previews it, and prints it from the controlled Word template
on the operator's own PC.

It never writes a record. Records are created, numbered and synchronised only
in the owner-managed Google Sheets, through bound Apps Script projects.

```
Google Sheets (user sheets)  →  bound Apps Script  →  RPP2 System DB sheets
                                                            ↓ public read
                     React workspace (hash router, read-only, IndexedDB cache)
                                                            ↓ route key only
                     Flask on this PC  →  controlled .docx → PDF
```

---

## Where to start

**If you are installing or running it** — in this order:

| | |
|---|---|
| [`START_HERE_BEGINNER_TH.md`](START_HERE_BEGINNER_TH.md) | เริ่มจากศูนย์ อ่านอันนี้ก่อน |
| [`OWNER_MANUAL.md`](OWNER_MANUAL.md) | คู่มือใช้งานประจำวัน ติดตั้ง เปิด แก้ปัญหา |
| [`OWNER_DEPLOYMENT.md`](OWNER_DEPLOYMENT.md) | **คัดลอกอะไรไปวางที่ไหน** — 6 สคริปต์ → 6 สเปรดชีต |
| [`OWNER_SETUP_TH.md`](OWNER_SETUP_TH.md) | ติดตั้ง Apps Script ทีละไฟล์ |
| [`OWNER.md`](OWNER.md) | คู่มือฉบับเต็ม |

**If you are changing the code**, read in this order:

| | |
|---|---|
| [`HANDOFF.md`](HANDOFF.md) | **Read first.** The current state of the tree, what must not be touched, the open items |
| [`CLAUDE.md`](CLAUDE.md) | The short version: layout, the verify list, the rules that are not negotiable |
| [`DESIGN.md`](DESIGN.md) | Why every decision was made, version by version |
| [`PLAN.md`](PLAN.md) | The approved scope |
| [`docs/`](docs/) | The contracts a gate enforces — see [`docs/README.md`](docs/README.md) |

`PLAN.md`, `DESIGN.md` and `HANDOFF.md` are authoritative for the current
release. This file is the map, not the specification.

---

## Running it on a laboratory PC

**Double-click `START-ANF3.bat`. That is the whole procedure.**

The workspace is meant to live on the department share drive, but it is not
run from there — the first launch copies it to this PC under
`%LOCALAPPDATA%\ANF3-Laboratory-Records`, sets up Python once, and starts.
Afterwards it starts straight away, and refreshes itself whenever `VERSION.txt`
on the share drive changes.

Running several PCs directly out of one shared folder is what this avoids: the
Python environment records an absolute path and only works on the PC that
built it, the activity log and the port file are single files every PC would
write to, and two PCs printing the same worksheet would write the same output
PDF at once. See `HANDOFF.md` § "Share drive".

For a PC that will convert Word to PDF with Word itself rather than
LibreOffice, run `INSTALL-MSOFFICE-SUPPORT.bat` once.

## Running it as a developer

```
pnpm install
pnpm dev            # vite on 127.0.0.1:5173, /api proxied to 127.0.0.1:8000
pnpm build          # emits ./dist, which is what the Flask server serves
```

`START-SERVER.bat` runs the Flask side on its own.

---

## What is in the box

| | |
|---|---|
| `apps/web/src/` | The supported React application. `tokens.css` is the locked design system — every colour, space and easing resolves through it |
| `server/` | Flask: serves the built app, resolves templates, renders PDFs, keeps the activity log |
| `templates/` | The five controlled Word templates. Nothing generates a document except from one of these |
| `google/app-scripts/` | The six `.gs` files used for deployment; `RPP2-*.gs` are the three System DB web apps |
| `validation/` | The gates. Everything below must pass before a release |
| `docs/` | Contracts and design history — [`docs/README.md`](docs/README.md) |
| `pw-prw/` `wfi-pus/` `compressed-air/` `em-air/` `cv/` `games/` | Frozen legacy direct-URL pages, hash-checked, not linked from the React workspace. Do not edit |

## The two training simulations

Offline, deterministic, fictional, and **not an approval tool**.

- **The Sixth Plate** — 9 microbial identification cases: form several
  hypotheses, choose media that separate them, record before interpreting, and
  claim only what the media can support.
- **Excursion Trace** — 7 cleanroom rounds: flag the readings that genuinely
  exceed their limit (Feller-corrected for active air), reconstruct the
  likeliest ingress path, choose a CAPA that fixes the cause.

Three levels change the rules, not just a label — beginner for new staff,
review (the default) for experienced staff, expert. See `HANDOFF.md` § 3.

A third simulation, CultureCheck, was **removed in v7.1n**: it shared six of
its nine phases with The Sixth Plate. The frozen legacy page at
`games/growth-promotion.html` is a different artefact and is untouched.

---

## Verify before you ship

Every one of these must pass:

```
pnpm check && pnpm test && pnpm build
python3 -m pytest server/tests
node validation/test_apps_script_security.mjs
node validation/test_cv_contract.mjs
node validation/test_games.mjs
node validation/test_worksheet_numbering.mjs
node validation/validate_non_game_contract.mjs
node validation/validate_launchers.mjs
node validation/validate_styles.mjs
node validation/contrast.mjs
python3 validation/validate_cv_package.py
python3 validation/validate_release.py
node validation/validate_wiring.mjs --built
```

Plus, with a server running, the interaction guard — it needs a real browser
so it is not in the list above:

```
node validation/validate_interaction.mjs
```

## The rules that are not negotiable

1. **The browser never writes a record.** If a change would let it mutate the
   System DB, stop and ask.
2. **Restrict mutation endpoints.** The Apps Script deployment has no shared
   sync token, so each System Web App must use the narrowest viable Google
   Workspace access scope.
3. **Binder colour means a building.** Never decorative, never reuse the
   reserve pink, never invent a record count.
4. **The operator identity is attribution, not authentication.** Nothing
   verifies the name or the code and no endpoint checks it. It must never be
   described as a login or as a 21 CFR Part 11 signature.
5. **The training simulations are fictional.** Keep the boundary language
   wherever a limit or a grade is shown.
6. **Ask before touching** `server/`, `apps-script*/`, `templates/`, or the
   frozen legacy pages.

`CLAUDE.md` carries the full list with the reasoning.
