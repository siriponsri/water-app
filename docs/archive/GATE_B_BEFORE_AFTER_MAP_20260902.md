# Gate B before/after map (proposed, not applied)

วันที่จัดทำ: 2 กันยายน 2026 (Asia/Bangkok)

เอกสารนี้เป็นแผน mapping จาก fixture และ contract ที่ตรวจแบบ read-only เท่านั้น
ยังไม่มีการสร้าง tab, เพิ่ม header, ย้ายข้อมูล, reset counter, เปิด trigger หรือ
เขียน production ใด ๆ การทำเครื่องหมาย `after` หมายถึง target ที่เสนอ ไม่ใช่
สถานะที่นำไปใช้แล้ว

## หลักการร่วม

- User Sheets เป็น operational entry; System Sheets เป็น normalized read model
  และ numbering authority
- client ส่งได้เฉพาะ domain/workflow/filter ที่ allowlist แล้ว ไม่ส่งชื่อ
  spreadsheet, tab, template หรือ filesystem path
- identity หลัก: `domain + workflow + sourceRecordId`; ห้ามใช้ row index เป็น
  identity เดียว
- legacy unsuffixed tabs อ่านได้อย่างเดียวและไม่รับ record ใหม่
- เลขที่ออกแล้ว immutable; retry ด้วย fingerprint เดิมต้องได้ identity/number
  เดิมและไม่สร้าง duplicate
- ทุกการเปลี่ยนแปลงในคอลัมน์ control หรือ active shards ต้องรอ Gate B และ
  production write ต้องรอ Gate D

## Responsibility map

| # | Copy-ready file | Before: fixture/source | After: approved target responsibility |
|---:|---|---|---|
| 1 | `01-air-user/Code.gs` | `air-test.xlsx`: `records-Air`, `records-CA Gass`; มี `worksheetNo`, `worksheetCreate`, `syncStatus` และ EM มี `ID` | อ่านเฉพาะ EM Air/Compressed Air, normalize เป็น `em-air`/`compressed-air`, group ตาม proven worksheet logic, ส่ง idempotent command ไป Air System, writeback เฉพาะแถวเดิมหลัง success |
| 2 | `02-air-system/Code.gs` | `RPP2-air-record.xlsx`: legacy `records_em`, `records_ca` มีข้อมูล; active B10/B12/B16/OT tabs มี header แต่ว่าง; `logs` มีอยู่ | อ่าน active shards + legacy; mutation ใหม่เข้า `records_em_{B10|B12|B16|OT}` หรือ `records_ca_{B10|B12|B16|OT}` เท่านั้น; lock number/upsert/log; legacy mutation reject |
| 3 | `03-water-user/Code.gs` | `water-r.xlsx`: `prw-pw`, `wfi-pus`; aliases `worksheet No.`/`worksheet  No.`, `worksheetCreate`, `syncStatus`; มี `_rpp2_registry` | อ่านเฉพาะ PW/PRW และ WFI/PUS ที่ allowlist, preserve legacy special values, ส่งไป Water System, writeback หลัง success โดยไม่เลือก target tabจาก source cell |
| 4 | `04-water-system/Code.gs` | `RPP2-water-record.xlsx`: legacy `records_pw_prw`, `records_wfi` มีข้อมูล; PW active shards มี headerแต่ว่าง; WFI B16/OT/PQ มีอยู่ แต่ WFI B10/B12 ไม่พบ; special legacy tabs มีอยู่ | อ่าน active + legacy; mutation ใหม่เข้า `records_pw_prw_{B10|B12|B16|OT}` หรือ `records_wfi_{B10|B12|B16|OT}` หลัง schema approval; preserve `PQ-OLD`, `PQ-OCL`, `RA6`, `WP-PQ`; สร้าง missing WFI tabs ได้เฉพาะ Gate B อนุมัติ |
| 5 | `05-cv-user/Code.gs` | `Testing.xlsx`: `CV` เป็น source หลัก; `database`/`table` เป็น reference; มี Contact plate/Rinse/CEHT values แต่ control identity ต้องตรวจเพิ่ม | group เป็น parent + ordered samples ด้วย explicit batch/record identity, normalize Contact Plate=`CV`, Rinse=`CVR`, ส่งเฉพาะ CV System, writeback ทุกแถวของกลุ่มหลัง success |
| 6 | `06-cv-system/Code.gs` | `RPP2-cv-record.xlsx`: `records_cv`, `records_cv_samples`, `logs` มี header; parent fixture ไม่มี data ที่ยืนยันได้ | upsert parent, replace child samples และ audit log ภายใต้ lock; Contact number `CV-YY[-Bxx]-NNNN`; Rinse number `CVR-YY-NNNN`; expose sampling family/method metadata แต่ไม่เลือก filesystem template |

## Tab and routing map

### Air System

| Workflow | Prefix | New-write active tabs | Legacy read-only |
|---|---|---|---|
| `em-air` | `AT` | `records_em_B10`, `records_em_B12`, `records_em_B16`, `records_em_OT` | `records_em` |
| `compressed-air` | `AC` | `records_ca_B10`, `records_ca_B12`, `records_ca_B16`, `records_ca_OT` | `records_ca` |

Building normalization is conservative: B10/B12/B16 route to the matching
segment; all other exact building identities route to `OT` while retaining the
original building value in the record.

### Water System

| Workflow | Prefix | New-write active tabs | Legacy read-only |
|---|---|---|---|
| `pw-prw` | `WT` | `records_pw_prw_B10`, `records_pw_prw_B12`, `records_pw_prw_B16`, `records_pw_prw_OT` | `records_pw_prw` |
| `wfi-pus` | `WP` | `records_wfi_B10`, `records_wfi_B12`, `records_wfi_B16`, `records_wfi_OT` | `records_wfi` |

`records_wfi_pq`, `records_pq_old`, `records_pq_ocl`, and `records_ra6` remain
legacy-special stores unless a later approved contract says otherwise. They are
not silently converted to WT/WP.

### CV System

| Record family | Parent | Child | Number scope |
|---|---|---|---|
| Contact Plate | `records_cv` | `records_cv_samples` | `CV` with building segment when applicable |
| Rinse | `records_cv` | `records_cv_samples` | `CVR` with no building segment |

The local PDF service, not Apps Script, resolves `cleaning-validation-contact`,
`cleaning-validation-rinse-pour`, or
`cleaning-validation-rinse-membrane`. Rinse routes intentionally resolve to the
approved Water template families through CV-owned route keys and adapters; they
must never become Water workflow requests or accept a client template path.

## Header and field policy

Existing owner headers are preserved exactly. Alias normalization is performed
in code; it does not rename source columns. Candidate control fields from the
contract are:

`anf3SourceRecordId`, `anf3SyncNow`, `anf3SyncStatus`, `anf3LastSyncedAt`,
`anf3LastSyncMessage`, `anf3LastFingerprint`, and an existing worksheet number
field where present. CV may additionally require `anf3BatchId`/`cvBatchKey` and
`anf3SampleId`.

These are **proposed additions only**. Before applying them, the owner must
confirm there is no established equivalent, and the script must append without
deleting, reordering, or overwriting owner data.

Normalized payloads retain, where present, the following families:

- identity: source record/batch/sample ID, worksheet number, domain, workflow;
- location: exact building, room/location, floor, sampling point/tag;
- timing: sampling/performed/determined/approved dates and sampling time;
- test context: method, matrix/water type, CV type, product/equipment;
- observations: sample order, result values/qualifiers, criteria, comments;
- audit: source system, fingerprint, sync version, created/updated timestamps.

Missing required values are validation errors. Unknown fields are not routed by
client request and are not copied into an arbitrary destination column.

## Identity, retry and numbering map

| Domain | Logical key | Numbering authority | Existing number rule |
|---|---|---|---|
| Air EM | `air + em-air + sourceRecordId` | Air System under `LockService` | `AT` + Bangkok year + B10/B12/B16 segment or OT |
| Air CA | `air + compressed-air + sourceRecordId` | Air System under `LockService` | `AC` + Bangkok year + B10/B12/B16 segment or OT |
| Water PW/PRW | `water + pw-prw + sourceRecordId` | Water System under `LockService` | `WT` + Bangkok year + approved building segment or OT |
| Water WFI/PUS | `water + wfi-pus + sourceRecordId` | Water System under `LockService` | `WP` + Bangkok year + approved building segment or OT |
| CV Contact | `cv + contact + sourceRecordId/batchId` | CV System under `LockService` | `CV-YY[-Bxx]-NNNN` |
| CV Rinse | `cv + rinse + sourceRecordId/batchId` | CV System under `LockService` | `CVR-YY-NNNN`, never building-segmented |

An identical fingerprint returns the existing result (`NO_CHANGE` or prior
stable result). A changed fingerprint updates allowed fields without
renumbering. A changed source identity or workflow returns `CONFLICT`.

## Migration and cutover proposal

1. Back up each owner workbook and clone it for testing.
2. Run schema/duplicate/counter **dry-run only** against the clone.
3. Approve exact active tabs, headers, identity aliases, and counter starting
   state at Gate B.
4. Test parallel read and one controlled create/update/retry per domain.
5. Keep legacy data in place and read-only unless a separately approved
   migration plan is signed; do not backfill by default.
6. Deploy System versions and pair each User script only after health passes.
7. Enable triggers only after the manual smoke test and Gate D approval.
8. Preserve old exports/deployment references for rollback.

No step above has been executed against production. The current status is
`PROPOSED / OWNER APPROVAL REQUIRED`.
