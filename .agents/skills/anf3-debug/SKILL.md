---
name: anf3-debug
description: Evidence-first debugging for the ANF3 laboratory-record/document-generation project. Use whenever a bug, failing test, wrong sync result, incorrect worksheet number, JSON mapping defect, DOCX/PDF rendering issue, unresolved placeholder, routing mismatch, server exception, or frontend workflow failure is reported or discovered.
---

# ANF3 Debug

Debug ANF3 by evidence, not intuition.

Apply this process silently. Do **not** recite a mantra or ritual to the user.

The goal is to prove the failing path, identify the real mechanism, make the smallest safe correction, and verify the original workload plus the nearest regression risks.

## 1. Protect State First

Before reproducing:

- determine whether the target is local/test or production;
- identify whether the path can write to Google Sheets, Apps Script deployments, generated files, or external systems;
- avoid destructive actions until the environment is proven safe;
- make local backup copies when an experiment could overwrite an existing fixture or generated artifact.

YOLO/local full-access mode is **not** authorization to mutate production Google Sheets, deploy live Apps Script, delete records, reset counters, or overwrite production documents.

If a reliable reproduction requires a production mutation, stop and ask for explicit approval.

## 2. Define the Exact Symptom

Write a one-line defect statement:

```text
input / record
→ action
→ expected result
→ actual result
```

Prefer exact identifiers when available:

- worksheetNo;
- recordId;
- workflow;
- sampleMatrix;
- testMethod;
- templateFamily;
- source row(s);
- target sheet/shard;
- template filename;
- output DOCX/PDF filename;
- exception text.

Do not begin with a proposed cause.

## 3. Reproduce Reliably

Create the smallest deterministic reproduction possible.

Preferred ANF3 repro artifacts:

- one focused local fixture;
- one XLSX/source record;
- one API request/response;
- one worksheetNo;
- one generated DOCX/PDF;
- one failing helper/test;
- one browser flow with exact steps.

For sync defects, use test sheets or local fixture data.

For rendering defects, use a single known record and preserve both the input payload and generated artifact.

If the issue is flaky, repeat the exact workload and capture each run. Increase observability before guessing.

If the issue cannot be reproduced, state that clearly and collect more evidence. Do not patch a theory.

## 4. Classify the Failing Layer

Identify the first layer where actual data diverges from expected data.

Typical ANF3 path:

```text
source workbook / Google Sheet
→ Apps Script normalization/grouping/routing
→ RPP2 record
→ samplesJson
→ API response / templatePayload
→ frontend/legacy print mapping
→ document payload/pages
→ DOCX template placeholder replacement
→ generated DOCX
→ PDF conversion
→ frontend download/open
```

Do not blame the final visible layer until upstream values are checked.

## 5. Domain-Specific Trace Checks

### A. Sync / worksheet-number defects

Check in this order:

1. source row values;
2. building normalization (`B10/B12/B16/OT`);
3. workflow/method routing;
4. grouping key;
5. target physical shard;
6. existing-record/recovery lookup;
7. lock/concurrency behavior;
8. worksheet-number profile and counter scope;
9. append/update decision;
10. status written back to the source.

Do not reset a sequence to test a numbering hypothesis.

### B. CV routing defects

For CV Rinse, verify `Test-Method` first.

Expected routes:

```text
Contact Plate
→ CONTACT_PLATE / cv-contact

Rinse + Pour Plate
→ PW_PRW / POUR_PLATE / cv-rinse-pour

Rinse + Membrane Filtration
→ WFI_PUS / MEMBRANE_FILTRATION / cv-rinse-membrane
```

A label such as `Rinse-PW` does not override membrane `Test-Method`.

### C. samplesJson / templatePayload defects

Compare:

1. source field;
2. normalized record field;
3. `samplesJson`;
4. `templatePayload` or document payload;
5. exact template placeholder;
6. rendered output.

Do not fix the renderer when the wrong value already exists in `samplesJson`.

Do not change `samplesJson` when the bug is only a placeholder alias.

### D. DOCX placeholder defects

Inspect the authoritative DOCX itself.

When needed inspect:

- `word/document.xml`;
- headers;
- footers;
- tables;
- Word text-run boundaries;
- duplicate literal placeholders.

Treat exact spelling/case/whitespace as evidence.

Known contracts include:

- Contact legacy whitespace such as `<samplingTime >` where still present;
- `lotPMembrane` → template `lotMembrane`;
- `leftEM/rightEM` → template `leftEm/rightEm`;
- Compressed Air has record-level `<tempRoom01>` only; do not invent `tempRoom02..10`.

### E. PW/PRW defects

Verify:

```text
result1
result2
resultAvg
```

For CV Pour initial sync:

```text
result1 = ""
result2 = ""
source Result → resultAvg
```

Do not fabricate replicate values.

### F. WFI/PUS defects

The sample result field is:

```text
result
```

Do not silently substitute `resultAvg`.

### G. Multipage defects

Re-check active server semantics.

For the current confirmed behavior, when `pages` is supplied each page dictionary must independently contain:

```text
header/record fields
+
that page's sample fields
```

Do not assume top-level `data` is merged into page dictionaries.

When page 2 loses headers, inspect the payload before editing the template.

### H. DOCX → PDF defects

Determine whether the defect exists:

1. in the filled DOCX;
2. only after PDF conversion;
3. only when opened/downloaded through the frontend.

Always compare the generated DOCX with the generated PDF.

Do not rebuild the form layout in a separate PDF implementation to hide a Word-conversion defect.

### I. Frontend defects

Verify API response and generated artifacts independently first.

Do not redesign the frontend while debugging a specific button, status, route, or download problem.

## 6. Build Multiple Hypotheses

After tracing the fail path, list 2–5 plausible causes ranked by evidence.

For each hypothesis define:

- supporting evidence;
- what would disprove it;
- cheapest safe experiment.

Prefer a disproof-oriented experiment first.

Avoid single-hypothesis anchoring.

Example:

```text
Symptom: PDF page 2 has blank header.

H1: page-2 payload lacks header values.
Disproof: dump page-2 payload and prove headers are present.

H2: page-2 placeholder aliases differ.
Disproof: inspect page-2 template XML.

H3: DOCX is correct and Word→PDF conversion drops content.
Disproof: inspect generated DOCX before conversion.
```

## 7. Maintain a Breadcrumb Ledger

Keep a compact internal/debug note:

```text
[run 1] input → observation → implication
[run 2] one changed variable → observation → implication
...
```

Every new root-cause hypothesis must explain all prior observations.

If one prior run contradicts the theory, the theory is incomplete or wrong.

Do not change multiple experimental variables at once unless required.

## 8. Prove the Root Cause

A root cause is proven only when:

- the failing path is identified;
- the mechanism explains the symptom end-to-end;
- targeted evidence supports it;
- reasonable competing hypotheses have been rejected;
- evidence is consistent with all prior runs.

"Changing this line made the test pass" is not by itself a root cause.

## 9. Apply the Smallest Safe Fix

Use `$karpathy-guidelines` when available.

Fix the earliest appropriate layer that owns the defect.

Examples:

- bad source normalization → fix normalization;
- wrong routing → fix routing, not renderer;
- correct data but alias mismatch → fix alias/mapping;
- page payload missing headers → fix page payload construction;
- correct DOCX but bad conversion → fix conversion path.

Do not:
- refactor adjacent code;
- rename legacy fields for style;
- invent new schemas;
- add speculative abstraction;
- rewrite the frontend;
- modify all templates because one template is wrong.

Every changed line should trace to the proven root cause or required regression coverage.

## 10. Validate the Fix

Validation must include the original repro.

Then run nearest relevant regression checks.

### Sync fixes

Verify, as applicable:

- correct target shard;
- correct worksheetNo;
- no duplicate record;
- recovery/no-change path;
- source sync status;
- adjacent building/method route.

### Document fixes

Verify:

- correct template;
- correct header fields;
- correct sample fields;
- correct page split;
- correct aliases;
- no fabricated values;
- no unexpected unresolved placeholders;
- `<worksheetNo>.docx` exists and opens;
- `<worksheetNo>.pdf` exists and opens;
- PDF visually corresponds to DOCX.

### CV changes

Exercise the nearest relevant routes:

- Contact;
- Rinse Pour;
- Rinse Membrane.

### Shared PW/WFI renderers

They may affect both Water and CV Rinse. Validate both contexts when changed code is shared.

## 11. Clean Up

Before declaring success:

- remove temporary `[DBG-*]` logs/probes;
- remove scratch files not intended as fixtures;
- keep useful regression tests;
- inspect the final diff for unrelated changes;
- ensure production IDs/secrets/test data were not accidentally committed;
- ensure generated Word/PDF files are not unintentionally staged.

## 12. Report the Result

Keep the final debug report concise:

```text
Repro:
Root cause:
Fix:
Validation:
Residual risk:
```

Use exact file/function/field names.

Do not claim broader validation than actually performed.

If the defect is consequential and non-trivial, and root cause/fix/validation are proven, use or suggest `$post-mortem` when appropriate.

## 13. Hard Stop Conditions

Stop and ask the user instead of guessing when:

- business meaning cannot be proven from active code/data/templates;
- two active sources conflict and the choice changes laboratory meaning;
- a production mutation/deployment is required;
- fixing the issue would require fabricating missing laboratory values;
- a proposed fix would intentionally break worksheet-number or data-contract compatibility.

Otherwise continue autonomously through local reproduction, diagnosis, fix, and validation.
