# Google Sheet Contracts

## Authoritative Evidence

- Spreadsheet IDs: `google/spreadsheet-id.json`.
- Offline workbook structures: `google/sheets/RPP2-*.xlsx` and `google/sheets/schema.json`.
- Copy-ready code: `google/app-scripts/*.gs`.
- System Web App deployments: `google/app-scripts/RPP2-*.gs`.
- User note, 2026-09-01: real Sheets use the RPP2 workbook structure; old routine tabs remain backups.

## Spreadsheet Map

| Domain | System DB | User Sheet |
| --- | --- | --- |
| Air | `1qhzgsO75jzCwg9h6NnIps1RauMHbyA9MJiwy699vono` | `1ZImZ3OyfaOQQYcwLlwHFlj9vU6Aqt4fLwv3VMV7sLSo` |
| Water | `1aeMOagZPkoVA_LJxjVvmUL59cMtTTicUH5NzuYEhyY0` | `1rw_3OWuRLV791Y70kWJ4cyXDuxuHooAsoxWLCiiRw2M` |
| Cleaning Validation | `1g6klceQWA4Duy5Eq2Az0LE47-2WUUXZE2fAPFBSKHrE` | `1ZHzetpPt1fpHx4ftxKiPFjsW0RIXYoraFVOxz2mRdGg` |

## Active And Legacy Stores

| Workflow | Active stores | Legacy read-only backup |
| --- | --- | --- |
| EM Air | `records_em_B10`, `records_em_B12`, `records_em_B16`, `records_em_OT` | `records_em` |
| Compressed Air | `records_ca_B10`, `records_ca_B12`, `records_ca_B16`, `records_ca_OT` | `records_ca` |
| PW/PRW | `records_pw_prw_B10`, `records_pw_prw_B12`, `records_pw_prw_B16`, `records_pw_prw_OT` | `records_pw_prw` |
| WFI/PUS | `records_wfi_B10`, `records_wfi_B12`, `records_wfi_B16`, `records_wfi_OT` | `records_wfi` |
| CV | `records_cv`, `records_cv_samples` | none defined |

`setupWaterActiveRecordSheets()` creates and validates WFI B10/B12 when missing. Unknown target sheets are rejected; they are never created from request input.

## Worksheet Numbering

| Workflow | Prefix | B10 example | Unsegmented example |
| --- | --- | --- | --- |
| EM Air | `AT` | `AT-26-B10-0001` | `AT-26-0001` |
| Compressed Air | `AC` | `AC-26-B10-0001` | `AC-26-0001` |
| PW/PRW | `WT` | `WT-26-B10-0001` | `WT-26-0001` |
| WFI/PUS | `WP` | `WP-26-B10-0001` | `WP-26-0001` |
| CV Contact Plate | `CV` | `CV-26-B10-0001` | `CV-26-0001` |
| CV Rinse | `CVR` | not segmented | `CVR-26-0001` |

- `10`, `B10`, `Building 10` normalize to `B10`; equivalent forms apply to 12 and 16.
- Other, Building 11/19, blank and unknown values use no number segment and the `OT` active shard where applicable.
- Counter scope is prefix + Bangkok year + building segment.
- Existing worksheet numbers are immutable. A later building mismatch is logged, not renumbered or moved.
- Legacy Water prefixes `PQ-OLD`, `PQ-OCL`, `RA6` and `WP-PQ` retain their existing formats.

## API Boundary

- Token-free reads: `GET action=ping|search|get` with allowlisted workflows.
- Token-authenticated mutations: `POST` with matching `ANF3_SYNC_TOKEN` stored in Script Properties of both User and System projects.
- Air and Water reads aggregate active shards plus the legacy backup.
- New mutations route by normalized building and cannot target a caller-provided arbitrary sheet.
- CV is idempotent by `recordId`; samples link to the parent through `recordId`.

## Verification

- Static validators: `validation/test_worksheet_numbering.mjs`, `validation/test_apps_script_security.mjs`, `validation/test_cv_contract.mjs` and `validation/validate_cv_package.py`.
- Bound/System setup functions are listed in `OWNER.md`.
- Always back up production sheets and verify with controlled non-production rows before enabling triggers.
