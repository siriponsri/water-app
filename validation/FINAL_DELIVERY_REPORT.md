# ANF3 Cleaning Validation - Current Delivery Note

## Delivery status

**PASS WITH DECLARED PRODUCTION ACTIONS**

Cleaning Validation is implemented as a separate `cv` domain with its own
record store, System API, worksheet numbering, synchronization boundary,
route registry, and local PDF adapters.

## Owner-approved template routing

| CV sampling family | Route | Resolved template |
|---|---|---|
| Contact Plate | `cleaning-validation-contact` | `cv-contact-template.docx` |
| Rinse + Pour Plate | `cleaning-validation-rinse-pour` | `pw-prw-template.docx` |
| Rinse + Membrane Filtration | `cleaning-validation-rinse-membrane` | `wfi-pus-template.docx` |

The route identities and adapters remain CV-owned even where a Rinse route
intentionally reuses an approved Water template family. Unknown or conflicting
methods are rejected before document generation.

## Implemented controls

- Dedicated `cv_records` read/cache namespace and CV synchronization endpoint.
- Parent/sample replacement with idempotent `recordId` handling and audit logs.
- Rinse worksheet prefix `CVR`; Contact Plate worksheet prefix `CV`, with
  building-aware Contact Plate numbering.
- Server-owned template allowlist, opaque PDF IDs, safe download/save paths,
  and no client-provided filesystem path.
- The browser never receives a mutation token.

## Verification

| Gate | Result |
|---|---|
| CV domain contract | PASS |
| Worksheet numbering and Rinse profile | PASS |
| Apps Script security/read contract | PASS |
| CV package and DOCX placeholder structure | PASS |
| Local Flask `/api/pdf-capabilities` | PASS |
| Contact, Rinse Pour, and Rinse Membrane PDF fixture smoke | PASS |
| Production browser route/report smoke | PASS |

The PDF fixture smoke used fictional data only and produced valid PDF output
for all three owner-approved CV routes on the current Windows machine.

## Production actions still required

1. Deploy the CV System Apps Script using the Owner-controlled organization-only
   access policy.
2. Configure the resulting CV `/exec` URL in `.env.production` and rebuild.
3. Set matching CV User/System Script Properties and verify the test clone.
4. Run the approved sequence: test clone, parallel smoke test, controlled
   production replacement.
5. Back up production Sheets and obtain Gate D approval before production
   writes or trigger activation.

The current local build is ready and playable at `http://127.0.0.1:8000`.
This note does not claim that Google production deployment or Gate D cutover
has already occurred.

