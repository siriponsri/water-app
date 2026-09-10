# ANF3 Repository Guidelines

## 1. Mission

This repository is the ANF3 laboratory-record and document-generation application.

The current priority is to preserve the existing frontend and complete/harden the end-to-end document pipeline:

```text
Google Sheets / RPP2 / Apps Script API
→ record + samplesJson / templatePayload
→ select the correct authoritative DOCX template
→ fill placeholders
→ save <worksheetNo>.docx
→ convert the filled DOCX to <worksheetNo>.pdf
→ expose the result through the existing frontend
```

Do not redesign the current frontend unless a change is required to complete or fix this flow.

The repository contains legacy behavior that is still part of the compatibility contract. Treat unusual field names, placeholder spelling/case/whitespace, worksheet-number formats, and routing behavior as intentional until proven otherwise from the real code and templates.

---


## 1A. Required Two-Session Operating Model

For substantial implementation work, ANF3 uses a two-session operating model unless the user explicitly requests a single-session workflow.

```text
Session 1 — Astra
Planner + Auditor + Integration Controller

Session 2 — Luna
Implementer + Test Executor + Fix Owner
```

The purpose of this split is separation of concerns, not parallel coding.

Astra is the control-plane session. Luna is the execution-plane session.

### Core authority rule

For an active implementation task:

- **Astra owns planning, evidence review, task boundaries, acceptance criteria, and final audit.**
- **Luna owns product-code implementation, implementation-side tests, and corrections.**
- Astra MUST NOT create a competing implementation while Luna owns the task.
- Luna MUST NOT broaden or reinterpret the task without repository evidence or Astra review.
- Only one session may own product-code writes for the same task at a time.
- The two sessions MAY both write coordination files according to the coordination protocol below.

The default write ownership is:

```text
product code / templates / tests      → Luna
.agent-bus/CURRENT_TASK.md            → Astra
.agent-bus/ASTRA_AUDIT.md             → Astra
.agent-bus/LUNA_REPORT.md              → Luna
.agent-bus/STATUS.json                 → current state owner
.agent-bus/LOCK.json                   → ownership coordination only
```

Astra may directly modify product code only when the user explicitly changes the operating model or when write ownership is explicitly transferred. If ownership is transferred, Luna MUST stop editing that area until ownership returns.

### Shared communication bus

The two sessions communicate through a filesystem mailbox called the **Agent Bus**.

Default location:

```text
.agent-bus/
├── CURRENT_TASK.md
├── LUNA_REPORT.md
├── ASTRA_AUDIT.md
├── STATUS.json
├── LOCK.json
└── HISTORY.md
```

If the sessions use separate Git worktrees or checkouts, set a shared external bus path using an environment variable or launcher configuration, for example:

```text
ANF3_AGENT_BUS=/root/workspace/.agent-bus/anf3
```

Both sessions MUST use the same resolved bus directory for the same task.

The Agent Bus is coordination state, not product behavior. Do not couple application code to it.

Runtime bus files SHOULD remain uncommitted unless the user explicitly asks to preserve an audit trail in Git. If `.agent-bus/` is inside the repository, prefer adding it to `.gitignore`.

### Important runtime limitation

`AGENTS.md` defines the protocol but does not itself wake or message an idle CLI session.

Without an external orchestrator, the user or another foreground command must invoke the next session after a state transition.

With an orchestrator, the orchestrator MAY watch `STATUS.json` and invoke the appropriate session automatically. The orchestrator is only a dispatcher; it does not own planning or implementation decisions.

### State machine

Use only these task states unless this file is explicitly amended:

```text
ASTRA_PLANNING
NEEDS_EVIDENCE
READY_FOR_LUNA
LUNA_IMPLEMENTING
READY_FOR_ASTRA_AUDIT
CHANGES_REQUIRED
READY_FOR_LUNA_FIX
BLOCKED
ASTRA_AUDIT_PASS
```

Normal flow:

```text
User Goal
  ↓
ASTRA_PLANNING
  ↓
READY_FOR_LUNA
  ↓
LUNA_IMPLEMENTING
  ↓
READY_FOR_ASTRA_AUDIT
  ↓
Astra hostile audit
  ├── PASS  → ASTRA_AUDIT_PASS
  └── FAIL  → CHANGES_REQUIRED
                 ↓
             READY_FOR_LUNA_FIX
                 ↓
             Luna targeted fix
                 ↓
             READY_FOR_ASTRA_AUDIT
```

Use `NEEDS_EVIDENCE` when Astra cannot yet build a safe implementation packet from repository evidence.

Use `BLOCKED` only when a repository Stop Condition is met or a required external dependency prevents safe progress.

### STATUS.json contract

`STATUS.json` is the machine-readable coordination source of truth for the current task.

Recommended schema:

```json
{
  "protocol_version": 1,
  "project": "ANF3",
  "task_id": "ANF3-YYYYMMDD-001",
  "state": "READY_FOR_LUNA",
  "owner": "luna",
  "iteration": 1,
  "updated_by": "astra",
  "updated_at": "2026-09-10T07:00:00+07:00",
  "task_file": "CURRENT_TASK.md",
  "report_file": "LUNA_REPORT.md",
  "audit_file": "ASTRA_AUDIT.md"
}
```

Rules:

- `task_id` MUST remain stable through the full plan → implement → audit loop.
- `iteration` increments only when Luna begins a new correction cycle after `CHANGES_REQUIRED`.
- `owner` identifies the session expected to act next or currently acting.
- `updated_at` SHOULD be an ISO-8601 timestamp with timezone.
- Do not reuse a completed task ID for a different goal.
- Do not mark `ASTRA_AUDIT_PASS` merely because Luna reports success.

### LOCK.json contract

`LOCK.json` prevents ambiguous write ownership. It is a coordination lock, not a security boundary.

Recommended schema while Luna owns implementation:

```json
{
  "task_id": "ANF3-YYYYMMDD-001",
  "write_owner": "luna",
  "scope": "product-code",
  "status": "ACTIVE"
}
```

Astra MUST treat an active Luna product-code lock as read-only for implementation files.

Luna MUST NOT take ownership of a second unrelated implementation task in the same working tree unless concurrent edits are proven non-overlapping and the user explicitly requests parallel implementation.

### Completion authority

Luna may declare:

```text
IMPLEMENTATION_COMPLETE
```

This means implementation and implementer-side verification are complete enough for audit. It is not final task completion.

For two-session tasks, final completion requires:

```text
ASTRA_AUDIT_PASS
```

Astra MUST NOT issue this state until applicable Definition-of-Done requirements have been checked.

---

## 2. Source-of-Truth Order

Before changing cross-layer behavior, inspect the real repository files. Do not rely on memory or inferred schemas when the answer can be proven locally.

Use this evidence order:

1. active implementation code;
2. latest Google Apps Script under `google/app-scripts/`;
3. example/current workbook structures under `google/sheets/`;
4. authoritative DOCX templates under `templates/`;
5. existing frontend/form/print logic under `js/` and workflow directories;
6. active Flask/document/PDF server code under `server/` and `pdf_server.py` or its current equivalent;
7. `_archived/` only as legacy/reference evidence.

If two active sources conflict, report the conflict and trace which one is actually executed before changing behavior.

Never silently "normalize" a legacy contract because another name looks cleaner.

---

## 3. Project Structure

Important locations:

- Root HTML pages include `index.html`, `master-data.html`, and `doc_code.html`.
- Form workflows live in `pw-prw/`, `wfi-pus/`, `compressed-air/`, and `em-air/`.
- Shared browser code is in `js/` (`app.js`, `db.js`, `sync.js`, `form-*`, `print-*`, and related modules).
- Shared styling is in `css/style.css`.
- Latest Google Apps Script sources are in `google/app-scripts/`.
- Google Sheets/XLSX examples and fixtures are in `google/sheets/`.
- Authoritative Word templates are in `templates/`.
- The local Flask document/PDF service is in `server/`.
- Generated Word documents belong in `words/`.
- Generated PDFs belong in `pdfs/`.
- `data/` contains local/master-data cache where still used.
- `input/` and `exemple_database/` may contain older fixtures/examples.
- `_archived/` is reference/legacy code, not the active implementation unless execution tracing proves otherwise.
- `TEST_PLAN.md` contains existing manual verification guidance.
- `.agent-bus/` is the optional local two-session coordination mailbox; it is not application runtime state and should normally remain uncommitted.

Do not move or rename major directories as part of unrelated work.

---

## 4. Current Domain Architecture

The main domains are:

- Water
- Air / Environmental Monitoring
- Compressed Air
- Cleaning Validation (CV)

The frontend must consume logical API/domain data. It must not depend on physical Google Sheet shard names.

Physical building routing is owned by the Apps Script/API layer:

- Building 10 → `B10`
- Building 12 → `B12`
- Building 16 → `B16`
- all other/unknown/blank buildings → `OT`

Do not invent `B11`, `B19`, or new shard conventions without an explicit requirement.

### Worksheet-number compatibility

Preserve existing numbering contracts:

- Water PW/PRW: `WT-YY-B10/B12/B16/OT-####`
- Water WFI/PUS: `WP-YY-B16/OT-####`
- Air EM: `AT-YY-B10/B12/B16/OT-####`
- Compressed Air: `AC-YY-B10/B12/B16/OT-####`
- CV Contact: `CV-YY-B10/B12/B16/OT-####`
- CV Rinse: `CVR-YY-B10/B12/B16/OT-####`

Legacy worksheet numbers already present in data remain valid. Never renumber historical records merely to match the current format.

---

## 5. Cleaning Validation Storage and Routing

The current RPP2 CV system physically stores records in eight building shards.

### Contact Plate

- `records_cv_contact_B10`
- `records_cv_contact_B12`
- `records_cv_contact_B16`
- `records_cv_contact_OT`

### Rinse

- `record_cv_rinse_B10`
- `record_cv_rinse_B12`
- `record_cv_rinse_B16`
- `record_cv_rinse_OT`

Note the intentional singular `record_cv_rinse_*` naming. Do not rename it for consistency.

The frontend must not send or require these physical sheet names.

### CV method routing

For CV Rinse, `Test-Method` is authoritative for the document/form route.

- Contact Plate → `CONTACT_PLATE` → `cv-contact`
- Rinse + Pour Plate → `PW_PRW` / `POUR_PLATE` → `cv-rinse-pour`
- Rinse + Membrane Filtration → `WFI_PUS` / `MEMBRANE_FILTRATION` → `cv-rinse-membrane`

A source row may say `Rinse-PW` while `Test-Method` is membrane filtration. In that case it still routes to the WFI/PUS membrane form.

Do not use the sampling-method label alone to override `Test-Method`.

---

## 6. Document Template Routing

Authoritative template routing:

- PW-PRW → `templates/pw-prw-template.docx`
- WFI-PUS → `templates/wfi-pus-template.docx`
- EM → `templates/em-template.docx`
- Compressed Air → `templates/ca-template.docx`
- CV Contact Plate → `templates/cv-contact-template.docx`
- CV Rinse + Pour Plate → PW-PRW template
- CV Rinse + Membrane Filtration → WFI-PUS template

Prefer an existing `templateFamily`, `sampleMatrix`, and `testMethod` contract over creating another parallel routing system.

Centralize routing/mapping where the existing architecture permits it. Do not duplicate slightly different mapping logic across unrelated frontend pages.

---

## 7. Confirmed Data and Rendering Contracts

These behaviors have been re-verified from the actual legacy/client/server code and templates. Preserve them unless new repository evidence proves the active implementation has intentionally changed.

### WFI/PUS

The sample result field is:

```text
result
```

not `resultAvg`.

Map each sample result to the actual `resultNN` placeholders present in the WFI/PUS template.

### PW/PRW

PW/PRW samples use:

```text
result1
result2
resultAvg
```

For CV Pour Plate initial data:

```text
result1 = ""
result2 = ""
source Result → resultAvg
```

Do not fabricate replicate I/II values.

### CV Rinse

`tagNo` is blank unless a real source explicitly supplies it.

Do not manufacture tags from row numbers, locations, or worksheet numbers.

### CV Contact

Sampling point is composed as:

```text
Equipment + " - " + Location
```

with sensible one-sided fallback when only one value is available.

Keep `equipment` and `location` separately in the data contract when they already exist.

### Compressed Air

The authoritative CA DOCX contains only the legacy placeholder:

```text
<tempRoom01>
```

It is populated from record-level `data.temp`.

Do not invent `tempRoom02` through `tempRoom10`.

Per-sample temperature fields use the actual per-sample placeholders that exist in the template (for example `temp01...temp10`).

### Legacy placeholder aliases

Inspect the real DOCX XML before changing aliases. Known historical examples include:

- a Contact placeholder with whitespace such as `<samplingTime >`;
- RPP2 field `lotPMembrane` mapping to template placeholder `lotMembrane`;
- RPP2 `leftEM` / `rightEM` mapping to template `leftEm` / `rightEm`.

Preserve exact spelling, case, and whitespace required by the actual template.

---

## 8. DOCX Placeholder Rules

DOCX templates are authoritative layout artifacts.

Before implementing or changing a mapping:

1. inspect the actual `.docx`;
2. inspect `word/document.xml` and relevant headers/footers when necessary;
3. compare against the active legacy print/render code;
4. identify exact placeholders, including duplicated placeholders and Word run splitting;
5. only then change the mapping.

Do not recreate a form visually from scratch when a template already exists.

Do not alter template layout, fonts, table geometry, pagination, or labels unless explicitly requested.

Missing data should render blank.

Never fabricate:
- microbiology results;
- control results;
- media lots;
- equipment IDs;
- dates;
- replicate values;
- sampling tags;
- approval information.

After generation, validate that no expected placeholder remains unresolved.

An unresolved placeholder is a defect unless it is explicitly documented as intentionally preserved.

---

## 9. Multipage Rendering Contract

The existing document/PDF server semantics are important.

When a render request includes `pages`, the server renders from those page dictionaries and does not automatically merge top-level `data` into each page.

Therefore every page dictionary must be self-contained and contain:

```text
record/header fields
+
that page's sample fields
```

Do not assume global/header fields will be inherited.

Use the actual template capacities and active server behavior when splitting pages.

Current CV sync validation already limits CV records to template capacity:
- Contact: max 10 samples;
- Rinse: max 30 samples.

Do not create a second, competing CV pagination scheme unless the active contract changes.

---

## 10. Output Identity and Regeneration

External document identity is the worksheet number.

Expected filenames:

```text
<worksheetNo>.docx
<worksheetNo>.pdf
```

Examples:

```text
CVR-26-B16-0001.docx
CVR-26-B16-0001.pdf
```

Use a separate internal normalized content hash only for change detection:

- `GENERATE`: no existing artifact;
- `NO_CHANGE`: artifact exists and normalized content is unchanged;
- `CONFLICT` / controlled regeneration: worksheet identity exists but relevant content changed.

Do not use a content hash as the user-facing filename.

Do not silently overwrite an existing generated document when the content has changed unless the existing product behavior explicitly defines controlled regeneration.

---

## 11. Sync and Data Safety

The sync layer is data-critical.

Preserve:
- `samplesJson` contracts;
- Apps Script schemas;
- worksheet-number behavior;
- record IDs and recovery behavior;
- logical `templateFamily`, `sampleMatrix`, and `testMethod` values;
- existing building routing.

Do not "clean up" data contracts during a document-generation task.

For create/number-allocation paths, retain concurrency and duplicate protection such as `LockService` or the current equivalent.

When a record already exists, prefer deterministic recovery/no-change behavior over appending a duplicate.

Never test destructive sync logic against production Sheets.

If a task requires modifying or deploying a live Apps Script deployment, mutating production Google Sheets, deleting live records, or resetting worksheet-number sequences, stop and request explicit user approval.

**YOLO mode grants autonomy over the local repository and local test environment. It does not grant permission to mutate production/external systems.**

---

## 12. Coding Discipline

Use `$karpathy-guidelines` for implementation/refactoring work when available.

Core rules even when the skill is not explicitly invoked:

- Think before coding.
- Do not guess when evidence is available.
- Make the smallest change that solves the verified problem.
- Avoid speculative abstractions.
- Do not refactor unrelated code.
- Match existing style.
- Every changed line should trace to the current goal or a verified defect.
- Prefer a verifiable goal over "make it better."

### JavaScript

- two-space indentation;
- semicolons;
- single-quoted strings;
- `camelCase` functions/variables;
- `PascalCase` classes;
- `UPPER_SNAKE_CASE` constants;
- keep form-specific logic in the matching module unless a proven shared abstraction already exists.

For Google Apps Script, prefer broadly compatible syntax and avoid unnecessarily new operators where existing deployment compatibility is uncertain.

### Python

- four-space indentation;
- `snake_case`;
- follow existing local style;
- do not introduce a formatter/linter migration as part of unrelated work.

---

## 13. Skills

Use project skills intentionally.

### `$anf3-document-pipeline`

Use for:
- RPP2 record mapping;
- `samplesJson`;
- `templatePayload`;
- template routing;
- DOCX generation;
- PDF generation;
- print/download workflow.

### `$anf3-debug`

Use whenever:
- a test fails;
- the user reports a bug;
- a generated DOCX/PDF is wrong;
- sync behavior is inconsistent;
- routing/numbering/mapping appears incorrect;
- an exception or stack trace is present.

Apply the debugging discipline silently. Do not print a ritual/mantra.

### `$karpathy-guidelines`

Use during code edits and refactors to keep changes simple and surgical.

### `$doc`

Use for DOCX inspection/editing/render validation when available.

### `$post-mortem`

Use only after a consequential, non-trivial defect has:
1. a reliable repro;
2. a proven root cause;
3. an implemented fix;
4. successful validation.

Do not create post-mortems for trivial cosmetic/one-line fixes unless requested.

---

## 14. Specialist Agents and Session Responsibilities

When configured, use specialist agents rather than asking one agent to speculate across every layer.

The specialist-agent layer operates **inside** the two-session model. It does not replace Astra or Luna.

```text
Astra session
├── anf3_explorer   — read-only evidence gathering
└── anf3_validator  — read-only hostile review

Luna session
├── anf3_renderer   — focused implementation
├── anf3_explorer   — read-only tracing when needed
├── $anf3-debug     — defect investigation
├── $karpathy-guidelines
└── $doc            — DOCX inspection / render validation
```

### Session 1 — Astra: Planner and Auditor

Astra is the control-plane session.

Primary responsibilities:

- read `AGENTS.md` before substantive work;
- inspect the active repository and source-of-truth evidence;
- reconstruct the real execution path rather than trusting inferred architecture;
- define the user goal in verifiable terms;
- identify files, contracts, fixtures, templates, and workflows likely to be affected;
- identify behavior that MUST be preserved;
- define acceptance criteria and validation requirements;
- identify unresolved evidence conflicts and Stop Conditions;
- create or update `.agent-bus/CURRENT_TASK.md`;
- transition task state to `READY_FOR_LUNA` only when the task is sufficiently bounded;
- review Luna's report, actual diff, and verification evidence;
- use `anf3_validator` when an independent hostile review is useful;
- issue concrete `CHANGES_REQUIRED` findings when defects remain;
- issue `ASTRA_AUDIT_PASS` only when applicable Definition-of-Done requirements are satisfied.

Astra SHOULD behave as a hostile reviewer after implementation.

Astra MUST NOT:

- implement a parallel competing solution while Luna owns writes;
- edit product files merely because a different design seems cleaner;
- approve based only on Luna's prose report without checking the relevant evidence;
- treat an unexecuted test as passed;
- silently resolve a genuine authoritative-source conflict;
- mutate production/external systems without explicit user approval.

Except for Agent Bus coordination files and user-requested process documentation, Astra SHOULD remain read-only for product code during Luna's implementation phase.

Astra owns these planning/audit outcomes:

```text
READY_FOR_LUNA
NEEDS_EVIDENCE
CHANGES_REQUIRED
BLOCKED
ASTRA_AUDIT_PASS
```

### Session 2 — Luna: Implementer

Luna is the execution-plane session and default product-code write owner.

Primary responsibilities:

- read `AGENTS.md` and `.agent-bus/CURRENT_TASK.md` before editing;
- confirm that `STATUS.json` assigns the task to Luna;
- inspect referenced repository evidence rather than blindly following speculative implementation detail;
- implement the smallest change that satisfies the verified goal;
- preserve existing architecture and compatibility contracts;
- use appropriate project skills and specialist agents;
- run the smallest relevant verification first;
- fix failures caused by the implementation;
- run adjacent regression checks;
- inspect generated DOCX/PDF artifacts when applicable;
- review the final diff for unrelated changes, secrets, generated artifacts, and debug residue;
- write `.agent-bus/LUNA_REPORT.md`;
- transition the task to `READY_FOR_ASTRA_AUDIT` when ready for review.

Luna MUST NOT:

- broaden scope without evidence;
- redesign unrelated UI or architecture;
- reinterpret legacy contracts for consistency or cleanliness;
- fabricate missing laboratory/business data;
- silently choose between genuinely conflicting authoritative sources;
- bypass the Stop Conditions;
- deploy or mutate production/external systems without explicit user approval;
- mark `ASTRA_AUDIT_PASS` itself.

If Luna discovers evidence that invalidates Astra's plan, Luna MUST stop the affected part, document the evidence in `LUNA_REPORT.md`, and return the task for Astra review rather than guessing.

Luna may make small implementation choices that are clearly implied by repository evidence and do not change the task's business meaning.

### `anf3_explorer`

Read-only evidence gathering:

- trace Apps Script → workbook → API → JSON → template → server;
- inspect exact fields and placeholders;
- report contradictions;
- identify which code path is actually executed;
- do not edit.

Use before risky cross-layer changes.

### `anf3_renderer`

Primary implementation specialist under Luna:

- document payload mapping;
- DOCX/PDF pipeline;
- template routing;
- focused integration fixes;
- run relevant local verification.

Only one write-capable implementation agent should edit the same area at a time.

### `anf3_validator`

Read-only hostile reviewer, normally coordinated by Astra:

- template fidelity;
- mapping correctness;
- multipage semantics;
- unresolved placeholders;
- filename/output behavior;
- regression against legacy behavior;
- acceptance-criteria compliance;
- suspicious unrelated changes.

Use after meaningful implementation work.

The Astra session remains responsible for integrating findings and deciding whether the task passes audit.

### Specialist concurrency rule

Read-only specialists may run concurrently when useful.

Write-capable specialists MUST NOT edit overlapping files concurrently.

Luna remains responsible for integrating any specialist implementation into one coherent diff before handoff to Astra.

---

## 14A. Astra → Luna Implementation Packet

Before Luna begins implementation, Astra MUST create a bounded implementation packet in `.agent-bus/CURRENT_TASK.md`.

Use this structure:

```markdown
# CURRENT TASK

## Identity
- Task ID:
- Iteration:
- Planner: Astra
- Implementer: Luna

## User Goal
<what the user is actually asking to achieve>

## Verified Current State
<what Astra proved from the active repository>

## Source-of-Truth Evidence
- <file/path + behavior>
- <template/workbook/API evidence>

## Execution Path
<actual runtime path relevant to this task>

## Required Changes
- <bounded outcome 1>
- <bounded outcome 2>

## Must Preserve
- <compatibility contract>
- <legacy behavior>

## Must Not Do
- <scope boundary>
- <unsafe/external action>

## Verification Required
- <focused test/repro>
- <adjacent regression>
- <artifact inspection if applicable>

## Definition of Done for This Task
- [ ] <criterion 1>
- [ ] <criterion 2>

## Known Risks / Stop Conditions
- <risk or NONE>

## Handoff State
READY_FOR_LUNA
```

The packet SHOULD describe outcomes and constraints rather than over-prescribe speculative code edits.

Astra may name likely files, but Luna MUST still inspect the actual implementation before editing.

If evidence is insufficient to form a safe packet, Astra MUST use `NEEDS_EVIDENCE` rather than inventing a contract.

---

## 14B. Luna → Astra Implementation Report

After implementation, Luna MUST write `.agent-bus/LUNA_REPORT.md`.

Use this structure:

```markdown
# LUNA IMPLEMENTATION REPORT

## Identity
- Task ID:
- Iteration:
- Status: IMPLEMENTATION_COMPLETE | BLOCKED | RETURNED_FOR_REPLAN

## Files Changed
- `path/to/file`

## Implementation Summary
<what changed and why>

## Evidence Rechecked During Implementation
<any repository evidence that confirmed or changed the plan>

## Tests / Commands Run
1. `<command>`
   - Result: PASS | FAIL | NOT RUN
   - Notes:

## Artifacts Inspected
- <DOCX/PDF/fixture or NONE>

## Regression Checks
- <check and result>

## Diff Review
- Unrelated changes: NONE | <details>
- Generated artifacts accidentally tracked: NONE | <details>
- Debug residue: NONE | <details>
- Secrets/sensitive data: NONE | <details>

## Known Limitations
- <limitation or NONE>

## Unresolved Questions
- <question or NONE>

## Requested Next State
READY_FOR_ASTRA_AUDIT
```

Claims such as `fixed`, `working`, `complete`, or `pass` MUST be backed by the relevant verification.

If a required test could not be run, Luna MUST report `NOT RUN` and explain why.

Luna MUST NOT substitute a different successful test for the original failing repro.

---

## 14C. Astra Audit Contract

When `STATUS.json` is `READY_FOR_ASTRA_AUDIT`, Astra MUST perform a hostile audit against the user goal, `CURRENT_TASK.md`, repository rules, and the actual implementation state.

Astra SHOULD inspect, as applicable:

1. the current diff;
2. changed implementation files;
3. relevant active source-of-truth files;
4. Luna's test output or reproducible commands;
5. generated DOCX/PDF artifacts;
6. template XML/placeholder contracts;
7. routing/worksheet-number compatibility;
8. multipage behavior;
9. unresolved placeholders;
10. unrelated edits or scope drift;
11. debug residue, generated outputs, secrets, or production-identifying data;
12. task-specific Definition of Done.

Astra MUST distinguish these evidence classes:

```text
VERIFIED_BY_EXECUTION
VERIFIED_BY_REPOSITORY_INSPECTION
INFERRED_NOT_VERIFIED
NOT_TESTED
```

Do not present `INFERRED_NOT_VERIFIED` or `NOT_TESTED` as executed verification.

Write the audit to `.agent-bus/ASTRA_AUDIT.md`.

PASS format:

```markdown
# ASTRA AUDIT

## Identity
- Task ID:
- Iteration:
- Verdict: PASS

## Acceptance Criteria
- [x] ...

## Verification Reviewed
- ...

## Residual Risks
- NONE | ...

## Final State
ASTRA_AUDIT_PASS
```

Failure format:

```markdown
# ASTRA AUDIT

## Identity
- Task ID:
- Iteration:
- Verdict: CHANGES_REQUIRED

## Findings
### F1 — <short defect title>
- Severity: blocking | major | minor
- Evidence:
- Expected:
- Actual:
- Required correction:
- Required re-test:

## Scope Control
Do not modify unrelated behavior while addressing these findings.

## Next State
READY_FOR_LUNA_FIX
```

Every blocking finding MUST be concrete and falsifiable.

Astra MUST NOT return vague instructions such as "improve robustness" or "make it better" without a verified defect or unmet acceptance criterion.

---

## 14D. Correction Loop

After `CHANGES_REQUIRED`:

1. Astra records specific findings in `ASTRA_AUDIT.md`.
2. `iteration` increments.
3. State becomes `READY_FOR_LUNA_FIX`.
4. Luna reads the audit before editing.
5. Luna changes only what is necessary to resolve the findings unless new repository evidence proves a broader correction is required.
6. Luna reruns the original failing verification plus adjacent regression checks.
7. Luna updates `LUNA_REPORT.md` for the new iteration.
8. State returns to `READY_FOR_ASTRA_AUDIT`.
9. Astra re-audits the actual result.

Do not create an endless subjective review loop.

Astra may request another correction only for:

- a concrete remaining defect;
- a regression introduced by the correction;
- an unmet acceptance criterion;
- a newly proven source-of-truth conflict;
- a violated repository rule or Stop Condition.

A preference-only change should become a new user-approved task unless it is already part of the original acceptance criteria.

---

## 14E. Session Startup and Recovery

Neither session may rely on hidden conversational memory as the sole task state.

### Astra startup

At the beginning of an Astra session or after context loss:

1. read `AGENTS.md`;
2. resolve the Agent Bus path;
3. read `STATUS.json` if it exists;
4. read `CURRENT_TASK.md`, `LUNA_REPORT.md`, and `ASTRA_AUDIT.md` when relevant;
5. inspect the current Git status/diff;
6. reconstruct state from repository evidence before planning or auditing.

If there is no active task, Astra may enter `ASTRA_PLANNING` for the user's current goal.

### Luna startup

At the beginning of a Luna session or after context loss:

1. read `AGENTS.md`;
2. resolve the Agent Bus path;
3. read `STATUS.json`;
4. confirm the state is `READY_FOR_LUNA` or `READY_FOR_LUNA_FIX` before product-code edits;
5. read `CURRENT_TASK.md`;
6. if fixing an audited defect, also read `ASTRA_AUDIT.md`;
7. inspect current Git status/diff before editing;
8. refuse to assume ownership when another implementation writer already owns overlapping work.

### Recovery precedence

When reconstructing an interrupted task, use this order:

1. `AGENTS.md` repository rules;
2. current active repository evidence;
3. `.agent-bus/STATUS.json`;
4. `.agent-bus/CURRENT_TASK.md`;
5. `.agent-bus/ASTRA_AUDIT.md` for requested corrections;
6. `.agent-bus/LUNA_REPORT.md` for prior implementation evidence;
7. current working-tree diff and test state;
8. conversation memory only as supporting context.

If coordination files conflict with active repository evidence, repository evidence wins for product behavior and the conflict MUST be reported.

If `STATUS.json` conflicts with the actual write state, do not continue blind. Reconcile ownership first.

---

## 14F. Git and Working-Tree Strategy for Two Sessions

### Preferred simple mode: shared checkout

For a beginner-friendly local workflow, Astra and Luna may point to the same repository checkout provided that:

- Astra remains read-only for product code;
- Luna is the only product-code writer;
- both use the same Agent Bus;
- both inspect `git status` before acting;
- no other implementation agent edits overlapping files.

This mode is simple but depends on strict write discipline.

### Safer advanced mode: separate worktrees

For stronger isolation, use separate Git worktrees or checkouts:

```text
ANF3-worktrees/
├── astra/     # planning/audit view
└── luna/      # implementation worktree

/root/workspace/.agent-bus/anf3/
├── CURRENT_TASK.md
├── LUNA_REPORT.md
├── ASTRA_AUDIT.md
├── STATUS.json
├── LOCK.json
└── HISTORY.md
```

In this mode:

- Luna owns the implementation branch/worktree;
- Astra audits Luna's actual branch/diff;
- the Agent Bus MUST be outside either worktree or otherwise shared explicitly;
- do not create competing Astra and Luna implementation branches for the same task.

### Commit rule

Do not commit merely to communicate between sessions.

Commit when the user requests commits or when the established workflow requires a verified checkpoint.

Astra SHOULD audit the exact implementation state that will be committed or handed off.

---

## 14G. Optional Orchestrator Compatibility

An external deterministic orchestrator MAY automate session invocation by watching `STATUS.json`.

The orchestrator may perform actions such as:

```text
READY_FOR_LUNA
→ invoke Luna with instructions to read AGENTS.md + CURRENT_TASK.md

READY_FOR_LUNA_FIX
→ invoke Luna with instructions to read AGENTS.md + ASTRA_AUDIT.md

READY_FOR_ASTRA_AUDIT
→ invoke Astra with instructions to audit the current implementation

ASTRA_AUDIT_PASS
→ stop

BLOCKED
→ stop and surface the blocking condition
```

The orchestrator MUST NOT:

- invent requirements;
- edit product code;
- override source-of-truth evidence;
- mark audit PASS;
- bypass production/external-system approval requirements;
- hide tool/test failures;
- continue indefinitely after a Stop Condition.

The orchestrator is a dispatcher only.

### Recommended invocation message for Astra

```text
You are Session 1 — Astra for ANF3.
Read AGENTS.md first and obey the two-session protocol.
You are the planner, hostile auditor, and integration controller.
Do not implement competing product-code changes while Luna owns writes.
Resolve the Agent Bus, inspect STATUS.json, and act only on the state assigned to Astra.
Ground decisions in active repository evidence.
```

### Recommended invocation message for Luna

```text
You are Session 2 — Luna for ANF3.
Read AGENTS.md first and obey the two-session protocol.
You are the sole implementation owner for the active task.
Read the Agent Bus and confirm STATUS.json assigns work to Luna before editing.
Implement the smallest evidence-supported change, verify it, write LUNA_REPORT.md, and return the task for Astra audit.
Do not broaden scope or mutate production/external systems without explicit user approval.
```

---

## 15. Debugging Policy

For any defect, use `$anf3-debug`.

Do not start by editing the first suspicious line.

Expected order:

```text
reproduce
→ trace the real fail path
→ collect evidence
→ rank and falsify hypotheses
→ identify root cause
→ apply the smallest fix
→ rerun the original repro
→ run adjacent regression checks
→ inspect generated artifacts when applicable
```

Temporary diagnostics must be clearly marked and removed before delivery unless intentionally promoted to permanent logging.

Do not declare a bug fixed because a different test passed.

---

## 16. Testing and Verification

Existing commands include:

- `.\INSTALL.bat`
- `.\INSTALL-MSOFFICE-SUPPORT.bat`
- `.\START-SERVER.bat`
- `.\CREATE-DIST-ZIP.ps1`

The repository historically has no single npm build/test runner. Do not assume one exists.

Use `TEST_PLAN.md` plus focused executable checks.

For Apps Script testing, use non-production/test sheets and relevant test helpers when present, including current equivalents of:

- `testSyncAirEM()`
- `testSyncAirCA()`
- `testSyncWaterPRW()`
- `testSyncWaterWFI()`
- CV system helper/setup verification

Before running a named helper, confirm it still exists in the active script.

### Document-generation validation

Representative coverage should include:

- PW-PRW
- WFI-PUS
- EM
- Compressed Air
- CV Contact
- CV Rinse Pour Plate
- CV Rinse Membrane Filtration

For affected workflows verify:

- correct template selected;
- correct record/header fields;
- correct sample-to-placeholder mapping;
- correct page split where applicable;
- header fields present on every independently rendered page;
- no fabricated values;
- no unexpected unresolved placeholders;
- correct `<worksheetNo>.docx`;
- correct `<worksheetNo>.pdf`;
- files are non-empty and open successfully;
- PDF visually corresponds to the filled DOCX;
- existing frontend flow still works.

When a real fixture exists, prefer it over a fabricated example.

---

## 17. Build/Test Change Rules

Before editing:
1. inspect relevant implementation;
2. identify the execution path;
3. define a short verifiable plan;
4. establish a baseline where practical.

After editing:
1. run the smallest relevant test first;
2. fix failures caused by the change;
3. run adjacent regression checks;
4. inspect the actual generated artifact for document work;
5. review the diff for unrelated edits.

Do not stop at "code compiles" for document-generation work.

---

## 18. Frontend Rules

The existing frontend is already considered acceptable.

Do not redesign it merely because a different architecture or visual style seems preferable.

Make UI changes only when needed for:
- document generation;
- status/progress;
- download/open behavior;
- handling a verified workflow defect;
- user-visible error recovery.

Preserve established navigation and styling patterns.

Avoid introducing a framework/build migration unless explicitly requested.

---

## 19. Security and Configuration

Keep credentials, tokens, deployment secrets, and sensitive production data out of source control.

Review spreadsheet IDs, deployment URLs, and sheet names carefully before changing configuration.

Confirm timezone-sensitive behavior remains `Asia/Bangkok` where the existing system relies on it.

Do not log sensitive production records merely for debugging.

Generated test DOCX/PDF artifacts should not accidentally include production-identifying data.

---

## 20. Git / Change Hygiene

This checkout may not have reliable historical commit conventions.

Use concise imperative commit messages when commits are requested, for example:

```text
fix: preserve CV rinse template routing
fix: repeat headers in multipage payloads
test: cover compressed-air tempRoom01 mapping
docs: update ANF3 document pipeline guidance
```

Avoid committing:
- generated PDFs;
- generated Word outputs;
- production workbook exports;
- secrets;
- temporary debug dumps.

Do not rewrite Git history or force-push unless explicitly requested.

---

## 21. Stop Conditions

Work autonomously through normal local implementation, tests, and bug fixes.

Stop and ask the user only when:

1. a business rule cannot be resolved from active code, workbook fixtures, templates, or legacy behavior;
2. two authoritative active sources genuinely conflict and either choice could alter data meaning;
3. a change would mutate/delete production data;
4. a change requires deploying to or reconfiguring a live external system;
5. a proposed migration would break a documented compatibility contract;
6. the only available "fix" would fabricate missing laboratory/business data.

Do not ask for confirmation for routine local code edits directly supported by repository evidence.

---

## 22. Definition of Done

A document-generation change is complete only when:

- the correct logical record is retrieved;
- the correct template route is selected;
- record/header fields are correct;
- sample fields are correctly mapped;
- legacy aliases are preserved where required;
- multipage semantics match the actual server;
- generated DOCX preserves the authoritative template layout;
- generated PDF corresponds to the filled DOCX;
- output filenames use `worksheetNo`;
- no laboratory values were invented;
- expected placeholders are resolved;
- relevant representative fixtures pass;
- no unrelated architecture/UI refactor was introduced;
- significant defects found during validation are fixed and re-tested.

For consequential bugs, consider `$post-mortem` only after the root cause and validation are proven.

---

## 23. Two-Session Final Delivery Gate

When the two-session operating model is active, the repository task is not complete merely because Luna finished coding.

Before final delivery, all of the following MUST be true:

- `CURRENT_TASK.md` matches the actual user goal and accepted scope;
- Luna's implementation is present in the current delivery state;
- required focused tests were run or explicitly documented as not runnable;
- adjacent regression checks were performed where applicable;
- generated artifacts were inspected where applicable;
- Luna's report corresponds to the actual diff;
- Astra reviewed the actual implementation state rather than only the report;
- no blocking Astra findings remain open;
- repository Stop Conditions were respected;
- no production/external mutation occurred without explicit approval;
- `STATUS.json` is `ASTRA_AUDIT_PASS`.

If any required item is not satisfied, report the task as incomplete or blocked rather than overstating completion.

For small, low-risk, user-authorized single-session work, this gate does not apply unless the user explicitly requests Astra/Luna separation.

