---
name: anf3-document-pipeline
description: ANF3 laboratory document-generation workflow. Use when working on RPP2 records, samplesJson, templatePayload, DOCX placeholder mapping, Word generation, PDF generation, or print/download behavior for Water, Air, Compressed Air, and Cleaning Validation.
---

# ANF3 Document Pipeline

Inspect real repository files before changing mappings:

- `google/app-scripts/`
- `google/sheets/`
- `templates/`
- `js/`
- `server/`

Preserve Apps Script schemas, samplesJson, worksheet numbering,
templateFamily, and existing frontend behavior unless a proven defect requires change.

## Routing

- PW-PRW -> `pw-prw-template.docx`
- WFI-PUS -> `wfi-pus-template.docx`
- EM -> `em-template.docx`
- Compressed Air -> `ca-template.docx`
- CV Contact -> `cv-contact-template.docx`
- CV Rinse + Pour Plate -> PW-PRW template
- CV Rinse + Membrane Filtration -> WFI-PUS template

For CV Rinse, Test-Method decides the renderer.

## Confirmed contracts

- WFI sample result field is `result`.
- PW uses `result1`, `result2`, `resultAvg`.
- CV Pour: `result1=""`, `result2=""`, source Result -> `resultAvg`.
- CV Rinse `tagNo=""` unless explicitly present.
- CV Contact samplingPoint = Equipment + " - " + Location.
- CA has only `tempRoom01`; it is record-level `data.temp`.
- Never invent `tempRoom02..10`.
- With server `pages`, every page dict must include header and sample fields.
- Do not rely on top-level data being merged into pages.
- CV already respects template sample capacity.
- Use worksheetNo for `.docx` and `.pdf` filenames.

Inspect raw DOCX XML if placeholder spelling, case, whitespace,
or Word run splitting is uncertain.

Blank missing values. Never fabricate laboratory values.
Preserve original template layout.