# ANF3 — Contract for Exactly Six Copy/Paste Google Apps Script Files

**Purpose:** Give Luna Max an implementation-level contract for rebuilding the six production `Code.gs` files.  
**Owner experience:** Open the matching Google Sheet → Extensions → Apps Script → replace `Code.gs` → Save → run the numbered setup menu/functions.  
**No developer tooling required:** no clasp, npm, Node, file merging, manifest editing, or manual snippet assembly.

---

## 1. Production source-of-truth rule

Exactly these files are production-deployable:

| Order | File | Target role |
|---:|---|---|
| 1 | `google/app-scripts/air-test.gs` | Air User bound project |
| 2 | `google/app-scripts/RPP2-air-record.gs` | Air System bound project + Web App |
| 3 | `google/app-scripts/water-r.gs` | Water User bound project |
| 4 | `google/app-scripts/RPP2-water-record.gs` | Water System bound project + Web App |
| 5 | `google/app-scripts/Testing.gs` | CV User bound project |
| 6 | `google/app-scripts/RPP2-cv-record.gs` | CV System bound project + Web App |

Each file must:

- be syntactically complete on its own;
- contain all constants/helpers/menus/tests needed for that project;
- use globally unique function names within that project;
- contain a header with file role, version, target Sheet role, time zone, setup order, and warnings;
- avoid a required `appsscript.json` change;
- avoid hardcoded secret or production-only mutation URL;
- expose an owner-friendly numbered menu;
- provide one `verify...Setup()` function returning/printing a PASS/FAIL checklist;
- be readable despite single-file delivery: section banners and stable function order are required.

The files in `google/app-scripts/` are the authoritative copy-ready sources. Deploy the three `RPP2-*.gs` files as the System DB web apps and the other three files as bound User Sheet scripts. Do not create or use a second `apps-script-deploy/` mirror.

---

## 2. Shared conventions

### 2.1 Version and response envelope

All projects define:

- `ANF3_API_VERSION`
- `ANF3_IMPLEMENTATION_VERSION`
- `ANF3_TIME_ZONE = 'Asia/Bangkok'`
- `ANF3_DOMAIN`
- safe JSON response helpers
- a run/request ID helper

System responses use:

```json
{
  "ok": true,
  "status": 200,
  "data": {},
  "meta": {
    "domain": "air",
    "apiVersion": "...",
    "implementationVersion": "...",
    "requestId": "...",
    "processedAt": "...",
    "timeZone": "Asia/Bangkok"
  }
}
```

Errors use a stable code and safe Thai/English message. Do not serialize raw `Error.stack`, Sheet ID, tab lists, URL, Script Properties, or full request payload.

### 2.2 Script Properties keys

Use explicit per-project keys:

- `ANF3_SYSTEM_URL` — User project only.
- `ANF3_SETUP_VERSION` — setup marker.
- counter keys — System only, namespaced by domain/prefix/year/building.
- optional trigger ID/last setup evidence — User only.

Do not use User Properties for shared production configuration.

### 2.3 Stable identity fields

Recommended owner-approved control columns in User Sheets:

- `anf3SourceRecordId`
- `anf3SyncNow`
- `anf3SyncStatus`
- `anf3LastSyncedAt`
- `anf3LastSyncMessage`
- `anf3LastFingerprint`
- `worksheetNo` if not already present

CV may additionally require:

- `anf3BatchId` or approved existing `cvBatchKey`
- `anf3SampleId`

Luna must audit existing headers and reuse exact established equivalents rather than creating duplicates. New columns are appended only after Gate B approval. Never delete, reorder, or rename owner data automatically.

### 2.4 Sync status model

Use a small deterministic state set:

- blank / `NOT_SYNCED`
- `READY`
- `SYNCING`
- `SYNCED`
- `NO_CHANGE`
- `VALIDATION_ERROR`
- `REMOTE_ERROR`
- `CONFLICT`

On retry/crash, `SYNCING` older than an approved timeout can be safely retried because the System operation is idempotent. Never treat an HTTP 200 containing `ok:false` as success.

### 2.5 Mutation access

The six-file deployment does not use an application-level sync token. Restrict
each System Web App deployment to the narrowest Google Workspace audience that
still permits its paired User Sheet to call it. Keep domain checks, action
allowlists, input validation, and script locks enabled.

### 2.6 Formula injection

Before writing untrusted text to Sheets, values beginning with `=`, `+`, `-`, or `@` must be handled according to an explicit safe-write policy. Preserve legitimate numeric/date values as types. Do not globally prepend apostrophes to every field.

### 2.7 Time and dates

- Format operational timestamps in `Asia/Bangkok`.
- Parse spreadsheet `Date` objects explicitly.
- API dates are `yyyy-MM-dd` or ISO-8601.
- Do not depend on browser/runner locale.
- The worksheet number year uses the approved two-digit year behavior already proven by current tests; verify whether existing `26` means Gregorian 2026 rather than silently converting to Buddhist 69.

---

## 3. Shared User-project implementation sections

Every User `Code.gs` contains sections in this order:

1. File header and owner warnings
2. Constants and approved header aliases
3. `onOpen()` and menu
4. No-code setup functions
5. Header/schema inspection helpers
6. Row/group selection
7. Domain normalization/validation
8. Stable identity/fingerprint
9. Request creation and `UrlFetchApp`
10. Response validation and writeback
11. Trigger management
12. Diagnostics/test functions
13. Safe utility helpers

### Required owner functions

Use domain-specific prefixes to avoid confusion. Each User file must provide equivalents of:

- `setup<Domain>User()` — checks headers and guides safe setup; no production sync.
- `set<Domain>SystemUrl()` — prompts for and validates the matching domain URL using health before save.
- `set<Domain>SyncToken()` — stores token without logging.
- `verify<Domain>UserSetup()` — read-only PASS/FAIL report.
- `sync<Domain>MarkedRows()` — manual explicit sync.
- `create<Domain>DailyTrigger()` — opt-in; confirmation and duplicate prevention.
- `remove<Domain>DailyTriggers()` — lists/removes only this project's approved handler triggers.
- `test<Domain>UserDryRun()` — creates request preview or uses controlled fixture; does not mutate production unless clearly named and owner-approved.

### Menu order

`ANF3 <Domain> Sync`:

1. `1) ตรวจสอบความพร้อม`
2. `2) ตั้งค่า System URL`
3. `3) ตั้งค่า Sync Token`
4. `4) เตรียมคอลัมน์ควบคุม` — only if Gate B approved
5. `5) Sync แถวที่ทำเครื่องหมาย`
6. `6) ดูรายงาน Sync ล่าสุด`
7. `7) ตั้งเวลาอัตโนมัติ` — separated and clearly optional
8. `8) ปิดเวลาอัตโนมัติ`

Never place destructive/reset/delete commands in the main menu without an extra admin confirmation and documentation.

### Writeback safety

Before writing returned worksheet number/status:

- locate row by stable source ID;
- verify row still represents the same logical record;
- if important source fields changed since request fingerprint, write `CONFLICT` and do not overwrite current state blindly;
- update control cells in one bounded range operation where feasible;
- protect issued worksheet number from a conflicting remote response.

---

## 4. Shared System-project implementation sections

Every System `Code.gs` contains sections in this order:

1. File header and deployment warning
2. Constants, workflow/schema/sheet allowlists
3. `onOpen()` and admin menu
4. Setup/verify functions
5. `doGet(e)` read dispatcher
6. `doPost(e)` mutation dispatcher
7. Auth and request parsing
8. Domain/workflow/payload validation
9. Lock/idempotency controller
10. Number allocation
11. Active/legacy routing
12. Upsert/sample operations
13. Search/get normalization
14. Audit log
15. Test/diagnostic functions
16. Safe utilities/response helpers

### Required System functions

Domain-specific equivalents:

- `setup<Domain>System()` — verifies or creates only owner-approved missing exact tabs/headers.
- `set<Domain>SyncToken()` — stores token.
- `verify<Domain>SystemSetup()` — read-only schema, property, duplicate-number, and deployment readiness checks.
- `reconcile<Domain>CountersDryRun()` — shows recommended counters/collisions without writing.
- `apply<Domain>CounterReconciliation()` — separate admin-only function, confirmation required, Gate B approval.
- `test<Domain>Health()`
- `test<Domain>Search()`
- `test<Domain>Get()`
- `test<Domain>MutationFixture()` — controlled test data only, clearly documented.

### Admin menu

`ANF3 <Domain> System`:

1. `1) ตรวจสอบ Schema/Configuration`
2. `2) ตั้งค่า Sync Token`
3. `3) ทดสอบ Health/Search/Get`
4. `4) ตรวจ Duplicate/Counter แบบไม่แก้ข้อมูล`
5. Admin actions submenu — guarded and clearly dangerous

### Lock boundary

Authenticate and perform inexpensive payload validation before lock. Under the lock:

- locate idempotent record;
- reconcile/allocate number;
- collision check;
- upsert record;
- replace samples;
- write counter state;
- write success audit event.

On failure, write a safe failure audit event where possible. Always release lock in `finally`. If lock acquisition fails, return `BUSY_RETRY` and do not mutate.

### Idempotency table/strategy

System must preserve enough identity to resolve a replay:

- `domain + workflow + sourceRecordId` as logical key;
- last applied fingerprint;
- worksheet number;
- record key/row identity;
- last request/run evidence.

An identical replay returns `NO_CHANGE` or prior stable result. A changed fingerprint updates only allowed fields without renumbering. A conflicting workflow/domain/source identity returns `CONFLICT`.

Do not depend only on `_rowIndex` as an identity.

---

## 5. File 1 — Air User

### Responsibilities

- Recognize only Air source workflows: EM Air and Compressed Air.
- Read only explicit source tabs/columns proven by `schema.json` and workbook audit.
- Normalize to `em-air` or `compressed-air`.
- Validate dates/building/required sampling fields.
- Group rows only according to proven Air worksheet logic.
- Send commands to Air System URL.
- Write back AT/AC worksheet number and sync state.

### Must reject

- Water/CV workflow values;
- missing stable record/group identity;
- ambiguous row group;
- mismatched Air endpoint health domain;
- invalid returned prefix;
- changed row fingerprint during writeback.

### Required tests

- EM B10 and unsegmented fixture.
- Compressed Air B12/B16 fixture.
- duplicate retry.
- source row moved/sorted before writeback.
- wrong Water/CV endpoint rejected.

---

## 6. File 2 — Air System

### Workflow map

| Workflow | Prefix | Active store family | Legacy read |
|---|---|---|---|
| `em-air` | `AT` | `records_em_{B10|B12|B16|OT}` | `records_em` |
| `compressed-air` | `AC` | `records_ca_{B10|B12|B16|OT}` | `records_ca` |

### Mutation requirements

- Normalize building conservatively.
- Route by workflow + normalized storage suffix from allowlist.
- Allocate prefix/year/building-scoped number.
- Never write new rows to unsuffixed legacy tabs.
- Existing issued record update stays in its current approved tab.
- Building mismatch after issue is logged.

### Read requirements

- Aggregate allowed active shards + legacy.
- Normalize fields across tab versions.
- Deterministically resolve duplicates and disclose `sourceClass` only if safe/useful.
- Paginate/bound response.

### Required tests

- All eight active routing combinations plus OT.
- Legacy readable but mutation rejected.
- AT/AC numbering scopes independent.
- concurrent simulated allocation.
- unknown sheet/workflow/action rejected.
- search/get across active and legacy.

---

## 7. File 3 — Water User

### Responsibilities

- Recognize only `pw-prw` and `wfi-pus` plus explicitly preserved legacy-special formats.
- Preserve existing legacy numbers/prefixes rather than converting.
- Normalize approved Water records and samples.
- Send to Water System URL.
- Validate returned `WT`/`WP` or approved legacy number according to request class.

### Must reject

- automatic conversion of `PQ-OLD`, `PQ-OCL`, `RA6`, `WP-PQ`;
- wrong Air/CV endpoint;
- ambiguous workflow based on incomplete header/value evidence;
- arbitrary target tab from source cell.

### Required tests

- PW/PRW B10/B12/B16/OT.
- WFI/PUS B10/B12/B16/OT.
- legacy-special preservation.
- retry/update without renumbering.

---

## 8. File 4 — Water System

### Workflow map

| Workflow | Prefix | Active store family | Legacy read |
|---|---|---|---|
| `pw-prw` | `WT` | `records_pw_prw_{B10|B12|B16|OT}` | `records_pw_prw` |
| `wfi-pus` | `WP` | `records_wfi_{B10|B12|B16|OT}` | `records_wfi` |

### Setup rule

The fixture historically lacked some WFI B10/B12 tabs. Setup may create them only if Gate B confirms they are still required and absent. It must use exact approved headers and refuse a conflicting nonempty tab.

### Required tests

- Full active routing matrix.
- WT/WP number scope and collision.
- setup dry-run versus apply.
- legacy read-only protection.
- special legacy number preservation.
- search/get normalization across all allowed stores.

---

## 9. File 5 — CV User

### Responsibilities

- Group Contact Plate or Rinse rows into one logical parent and ordered/stable samples.
- Prefer explicit `cvBatchKey`/owner-approved batch ID; do not infer across ambiguous records.
- Assign/preserve stable record and sample IDs.
- Normalize method/type to Contact Plate (`CV`) or Rinse (`CVR`).
- Send one idempotent parent+samples command.
- Write back one record ID/worksheet number consistently to all group rows after success.

### Group safety

- Every group must have a deterministic key.
- Mixed building/method/date within a group is a validation error unless explicitly allowed.
- Reordering sample rows must not generate another parent.
- Retry replaces/merges samples according to the approved contract without duplication.
- CV Rinse number is unsegmented even when building exists as record data.

### Required tests

- Contact Plate with multiple sample rows.
- Rinse with multiple sample rows.
- explicit batch key and deterministic fallback if approved.
- mixed/ambiguous group rejection.
- retry after partial client failure.
- source rows sorted before writeback.

---

## 10. File 6 — CV System

### Stores

- Parent: `records_cv`
- Child: `records_cv_samples`
- Audit/log: exact approved tab after audit

### Identity and atomicity

- Parent idempotency key uses stable source record/batch identity.
- Child rows link through system `recordId`.
- Under one script lock: upsert parent, replace approved child set, verify linkage/count, log.
- On a detected failure, do not return success; perform best possible rollback or leave explicit repair evidence and `CONFLICT/REPAIR_REQUIRED` state.

### Numbering

- Contact Plate uses `CV-YY[-Bxx]-NNNN`.
- Rinse uses `CVR-YY-NNNN` only.
- Existing number remains immutable.

### Read/PDF capability metadata

Read responses must include normalized sampling family and test method so the frontend/local service can apply `docs/CV_TEMPLATE_ROUTING_CONTRACT.md`. Apps Script does not select a filesystem template and must never return a template path. PDF capability is reported by the local service: Contact Plate and both Rinse methods are enabled only when the CV-owned route/adapter and its owner-approved template family pass verification. Rinse-PW/PRW uses `pw-prw-template.docx`; Rinse-WFI/PUS uses `wfi-pus-template.docx`.

### Required tests

- Contact parent + N children.
- Rinse parent + N children.
- replay no duplicate parent/children.
- changed sample set deterministic replacement.
- invalid mixed group rejection.
- CV/CVR numbering and CVR no-building rule.
- orphan child detection in verification report.

---

## 11. Static validator requirements

Luna must create/extend offline validators that inspect all six files for:

- parseable Apps Script-compatible JavaScript;
- required role/version/time-zone constants;
- required owner functions and menus;
- absence of hardcoded token patterns;
- absence of mutation token in `doGet` response/frontend config;
- explicit workflow and active/legacy allowlists;
- LockService usage in System mutation paths;
- absence of caller-provided sheet names in `getSheetByName` mutation flow;
- required prefix/building/CVR rules;
- error response safety;
- no game-file dependency/import/change.

Static pattern checks do not replace behavioral test-clone runs.

---

## 12. Owner verification output

Each `verify...Setup()` must produce a concise table/log including:

- implementation version;
- correct bound spreadsheet role (safe name/role, not secret IDs in public report);
- required properties present (token shown only as `SET/NOT SET`);
- required source/active/legacy tabs and header state;
- duplicate issued-number count;
- counter reconciliation state;
- trigger count/handler;
- last successful/failed audit event;
- overall `PASS`, `BLOCKED`, or `WARNING`.

It must not mutate data.

---

## 13. Deployment contract

### System projects

- Execute as owner.
- Access mode selected at Gate A and documented.
- Deploy new version; preserve existing URL where intended.
- Health test immediately after deployment.
- Record deployment date/version in private owner checklist, not hardcoded source.

### User projects

- Bound script only; no web deployment.
- Save code, authorize, configure URL/token, verify, run manual controlled sync.
- Create trigger only after manual smoke test and Gate D approval.

### Rollback

- Keep prior six-file export and deployment version references.
- Remove/disable new triggers first.
- Restore User/System code in controlled pair order.
- Redeploy prior System version.
- Verify no duplicate/partial records before re-enabling sync.

---

## 14. Final six-file acceptance checklist

- [ ] Exactly six production `Code.gs` files exist.
- [ ] All are standalone pasteable.
- [ ] No manifest/clasp/Node requirement for owner.
- [ ] Setup/verify/menu functions exist and are documented.
- [ ] User scripts cannot choose target tab.
- [ ] System scripts authenticate mutation before write.
- [ ] Script lock covers numbering/upsert/samples/log.
- [ ] Stable identity survives row sorting/insertion.
- [ ] Identical retry creates no duplicate and no new number.
- [ ] Active/legacy boundary passes tests.
- [ ] CVR numbering has no building segment.
- [ ] Legacy special Water prefixes remain unchanged.
- [ ] No token/stack/config leakage.
- [ ] Test-clone evidence exists for all three domains.
- [ ] Owner guide references function/menu names exactly as implemented.
