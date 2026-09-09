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

## 14. Specialist Agents

When configured, use specialist agents rather than asking one agent to speculate across every layer.

### `anf3_explorer`

Read-only evidence gathering:
- trace Apps Script → workbook → API → JSON → template → server;
- inspect exact fields and placeholders;
- report contradictions;
- do not edit.

Use before risky cross-layer changes.

### `anf3_renderer`

Primary implementation specialist:
- document payload mapping;
- DOCX/PDF pipeline;
- template routing;
- focused integration fixes;
- run relevant local verification.

Only one write-capable implementation agent should edit the same area at a time.

### `anf3_validator`

Read-only hostile reviewer:
- template fidelity;
- mapping correctness;
- multipage semantics;
- unresolved placeholders;
- filename/output behavior;
- regression against legacy behavior.

Use after meaningful implementation work.

The main agent remains responsible for integrating findings and deciding what actually changes.

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
