# ANF3 CV Overlay v5.1

## Purpose

This overlay adds a complete Cleaning Validation workflow while keeping Water
and Cleaning Validation as separate data domains.

- Water PW/PRW and Water WFI/PUS remain in the existing Water stores and endpoint.
- CV PW/PRW and CV WFI/PUS are CV sample matrices stored in `cv_records` and
  synchronized only to the CV endpoint.
- A CV record is queued once per `recordId`; successful synchronization removes
  only that confirmed queue item.

## Apply on Windows

1. Close the local ANF3 application and make a copy of its current folder.
2. Extract `ANF3-CV-overlay-v5.1.zip`.
3. Copy the contents of the extracted folder into the existing ANF3 application
   folder and allow Windows to replace files with the same names.
4. Copy every file in `apps-script/` into the Apps Script project that will be
   deployed specifically for Cleaning Validation.
5. Deploy that Apps Script project as a Web App, then open **Cleaning
   Validation > Settings** and save the CV Web App URL.
6. Keep the existing Water and Air Web App URLs unchanged.

## Google Sheet contract

The CV endpoint writes only to `RPP2-cv-record`, which contains:

- `records_cv`: one parent row per CV worksheet;
- `records_cv_samples`: one child row per sample/result;
- `logs`: append-only synchronization audit events.

The sample matrix is one of `CONTACT_PLATE`, `PW_PRW`, or `WFI_PUS`. The
`domain` remains `CV` for all three matrices.

## Print guardrail

The owner-approved CV document set has three routes. Contact Plate uses
`cv-contact-template.docx`, Rinse-PW/PRW uses the approved
`pw-prw-template.docx` family, and Rinse-WFI/PUS uses the approved
`wfi-pus-template.docx` family. The CV routes stay separate from Water at the
workflow, adapter, audit, and validation layers.

## Smoke test after applying

1. Open `index.html` and select **Cleaning Validation**.
2. Create and save one draft for each sample matrix.
3. Confirm all three drafts appear in the CV registry and do not appear in the
   Water registry.
4. Set the CV Web App URL and synchronize the drafts.
5. Confirm parent rows appear in `records_cv`, child rows in
   `records_cv_samples`, and events in `logs`.
6. Print one Contact Plate, one Rinse-PW/PRW, and one Rinse-WFI/PUS record;
   confirm each PDF uses the expected route and approved template family.
