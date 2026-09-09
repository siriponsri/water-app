# docs/

Two kinds of document live here. Contracts are load-bearing — a validation
gate reads them, so changing one without changing the code it describes fails
the build. Everything else is history, kept because it explains why something
is the way it is.

## Contracts a gate enforces

| File | What it fixes | Enforced by |
|---|---|---|
| [`CABINET_WORKFLOW_MATRIX.md`](CABINET_WORKFLOW_MATRIX.md) | **The source of truth for the shelf** — which binder holds which workflow, in which building. Change this and `apps/web/src/appData.ts` together | `validation/validate_non_game_contract.mjs` |
| [`CV_TEMPLATE_ROUTING_CONTRACT.md`](CV_TEMPLATE_ROUTING_CONTRACT.md) | Which Cleaning Validation record prints from which controlled template, and the one substitution that is knowingly accepted | `validation/test_cv_contract.mjs`, `validation/validate_cv_package.py` |
| [`APPS_SCRIPT_6_FILE_CONTRACT.md`](APPS_SCRIPT_6_FILE_CONTRACT.md) | Exactly six deployable `.gs` files under `google/app-scripts/`; `RPP2-*.gs` are the System DB web apps | `validation/validate_release.py`, `validation/test_apps_script_security.mjs` |
| [`SCALE_UP_CONFIGURATION_CONTRACT.md`](SCALE_UP_CONFIGURATION_CONTRACT.md) | How a new building or workflow is added without editing code in six places | — |

## Working notes

| File | For |
|---|---|
| [`DESIGN_SKILLS_WORKFLOW.md`](DESIGN_SKILLS_WORKFLOW.md) | How the vendored design skills in `.claude/skills/` are meant to be used |
| [`MICRO_LAB_GAMES_IMPLEMENTATION_PLAN.md`](MICRO_LAB_GAMES_IMPLEMENTATION_PLAN.md) | The original games plan. Large, and partly overtaken — `HANDOFF.md` § 3 is current |
| [`games/`](games/) | Games content schema, requirement traceability, and the scientific assumptions behind the fixtures |

## `archive/`

Superseded. Kept for the record, **not** to be followed.

Two of these describe a pre-v7.1 architecture and actively contradict the
current deployment: `APPLY_OVERLAY.md` installs a "CV Overlay v5.1" zip and
tells you to open `index.html` and pick Cleaning Validation, which no longer
resolves; `CV_DATA_CONTRACT.md` says to copy `apps-script/` into "the Apps
Script project", singular, when there are six bound projects
(`APPS_SCRIPT_6_FILE_CONTRACT.md` above is current). They were moved here in
v7.1p because `README.md` still linked to them as if they were live.

`LUNA_MAX_GOAL.txt` is a prior agent's task prompt from the v6.0 era, whose
central instruction — do not rebuild the vanilla app into React — is the
opposite of what was subsequently agreed and done.

The rest is point-in-time material: earlier handoffs, decision logs, test
plans, gate briefs, and the original game design documents.
