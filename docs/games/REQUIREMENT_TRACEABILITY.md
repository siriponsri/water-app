# Games Requirement Traceability

> **Note (v7.1n).** This document was written when there were three
> simulations. **CultureCheck / Growth Promotion Lab was removed** — it shared
> six of its nine phases with The Sixth Plate. Two remain: The Sixth Plate and
> Excursion Trace. Difficulty levels now change the rules rather than only
> labelling a run. `HANDOFF.md` § 3 is current; read this for background only.


| Requirement | Implementation | Verification |
| --- | --- | --- |
| CultureCheck Mission 0–8 campaign | `CultureCheckGame.tsx`, `content.ts` | Browser flow, content count, build |
| Work-order routing boundary | `ROUTE_QUESTIONS`, `engine.ts` | Mission 0 route review |
| Media-lot intake and control planning | `CultureCheckGame.tsx` | Disabled-action and completion flow |
| Negative control blocks release | `engine.ts` | `engine.test.ts` |
| Traceability mismatch blocks release | `engine.ts` | `engine.test.ts` |
| Objective observation before interpretation | Both game state machines | Phase-gated UI flow |
| Sixth Plate Case 00–08 campaign | `BacterialIdentificationGame.tsx`, `content.ts` | Browser flow, content count, build |
| Six-media role orientation | `MEDIA_ORIENTATION`, `CaseOrientation` | Case 00 review flow |
| Hypotheses and action budget | `HYPOTHESES`, `MediaPlanning` | Disabled-action and selection flow |
| RV → XLD prerequisite | `MediaPlanning`, `lintBacterialConclusion` | Case 03 browser/error path, engine test |
| Field-by-field culture observations | `observationMatches`, `engine.ts` | `engine.test.ts` |
| Presumptive claim boundary | `lintBacterialConclusion` | Overclaim and rationale tests |
| Mixed-culture warning | `lintBacterialConclusion`, Case 06 fixture | Mixed-morphotype test |
| Broken chain-of-custody handling | `lintBacterialConclusion`, Case 07 fixture | Browser/error path and engine test |
| SDA fungal morphology boundary | `lintBacterialConclusion`, Case 05 fixture | SDA morphology test |
| Deterministic seeded rendering | `LabScene.tsx`, `seededIndex` | Same-seed assertion, build |
| Evidence rail and audit history | `GameChrome.tsx`, game state | Browser flow and report inspection |
| Local autosave, resume, and migration | `persistence.ts` | IndexedDB/localStorage implementation review |
| JSON evidence export | `persistence.ts`, both games | Debrief action and packet schema |
| Local printable report route | `GameReportPage.tsx` | Browser flow to `#/games/report/:packetId` |
| 3D scene and equivalent 2D fallback | `LabScene.tsx` | 2D toggle and reduced-motion browser checks |
| No production write path | Game imports and route boundary | Architecture inspection |
| Offline deterministic grading | `engine.ts` | No network/LLM dependency check |
