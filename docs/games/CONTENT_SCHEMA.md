# Game Content Schema

> **Note (v7.1n).** This document was written when there were three
> simulations. **CultureCheck / Growth Promotion Lab was removed** — it shared
> six of its nine phases with The Sixth Plate. Two remain: The Sixth Plate and
> Excursion Trace. Difficulty levels now change the rules rather than only
> labelling a run. `HANDOFF.md` § 3 is current; read this for background only.


## Educational profile

The runtime-validated profile contains `id`, `displayName`, `effectiveDate`,
`educationalOnly`, a disclaimer, and exactly six media definitions. Every media
definition has an ID (`TSB`, `SDA`, `MSA`, `MAC`, `RV`, or `XLD`), physical form,
educational role, and claim boundary.

## CultureCheck mission

Each Mission 1–8 variant contains a deterministic seed, fictional lot ID,
medium/form, required route, appearance and label truth, challenged property,
required controls, optional reference condition, test/control observations,
read-window state, supported validity, supported disposition, defects, and a
debrief principle. Mission 0 is orientation-only and contains route questions
instead of a lot fixture.

## Sixth Plate case

Each Case 1–8 contains a deterministic seed, fictional sample, investigation
question, available media, action budget, required media sequence, hypothesis
IDs, truth-layer observations, expected conclusion, supported next action,
maximum claim, chain-of-custody state, mixed-culture state, defects, and a
debrief principle. Case 0 is orientation-only and contains six media-role
questions. Truth remains internal to the evaluator and is not exposed as a
learner-facing answer key.

## Learner state and evidence

Game state is versioned under the `anf3.games.*.v2` local keys and mirrored to
the `anf3-games-v2` IndexedDB database. A state includes phase, campaign
selection, role, difficulty, 2D preference, learner observations, decisions,
completed items, best local scores, coaching signals, and audit events.

Every evidence item has an ID, source, objective observation, optional
interpretation, validity, confidence, and chain-of-custody state. Every
committed learner or system action creates an audit event with ID, timestamp,
action, detail, and source.

Evidence packets use schema version 2 and contain the campaign/scenario
identity, role, difficulty, decision, evidence, audit, deterministic score,
and optional linter notes. Packets are local training artifacts, not regulated
records.

## Validation rules

- The six-media profile must be educational-only and structurally complete.
- Growth decisions are evaluated by route, lot identity, appearance, property,
  controls, read window, objective observations, validity, disposition, and
  rationale.
- Identification observations are compared field-by-field before conclusion
  scoring.
- Species-level language, broken traceability, missing controls, unacknowledged
  mixed culture, missing RV → XLD linkage, and unsupported fungal/bacterial
  conversion produce linter findings or score ceilings.
