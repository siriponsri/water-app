# Domain

## Concepts

- **User sheet**: a worksheet filled by laboratory users. Its bound script initiates sync.
- **System DB**: the owner-controlled Google Sheet receiving normalized records and serving read APIs.
- **Active shard**: a building-specific destination tab for new routine Air or Water records.
- **Legacy backup**: an unsuffixed historical record tab that stays readable but cannot be mutated through the new API.
- **Worksheet number**: immutable controlled identifier allocated in Bangkok time under a per-domain script lock.
- **Contact Plate**: printable Cleaning Validation matrix using the approved CV contact template.
- **Rinse**: Cleaning Validation matrix using `CVR`; Pour Plate resolves through the CV-owned adapter to `pw-prw-template.docx`, and Membrane Filtration resolves to `wfi-pus-template.docx`.

## Entities

- Domains: Water, Air, Cleaning Validation.
- Water workflows: PW/PRW (`WT`) and WFI/PUS (`WP`).
- Air workflows: EM Air (`AT`) and Compressed Air (`AC`).
- CV prefixes: Contact Plate (`CV`) and rinse (`CVR`).
- Building number segments: `B10`, `B12`, `B16`, or no segment for Other, Building 11/19 and blank.
- CV stores one parent in `records_cv` and zero or more children in `records_cv_samples`, linked by `recordId`.

## User-Provided Knowledge

- User note, 2026-09-01: new Air and Water records must be stored in the new `RPP2-*.xlsx` building-specific sheet structure; old sheets remain backups.
- User note, 2026-09-01: Cleaning Validation follows the same choose -> preview -> print experience as Water and Air.
- User note, 2026-09-01: the visible app must scale to additional worksheet workflows without redesigning the shell.
- User note, 2026-09-01: game loops should have a clear goal, immediate feedback, progression, meaningful choices, risk/reward, variation, short loops and safe failure with explanation.
