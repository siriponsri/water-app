# ANF3 Laboratory Records: Read-only audit

> Historical pre-implementation snapshot. Current implementation and browser/release evidence are recorded in `validation/FINAL_RELEASE_REPORT.md` and `validation/GAMES_PATCH_REPORT.md`.

วันที่ตรวจ: 2 กันยายน 2026 (Asia/Bangkok)

เอกสารนี้เป็นหลักฐานจากการตรวจแบบ read-only ก่อนการแก้ไขระบบข้อมูลหรือ
การ cutover production ตัวเลข, URL, token, spreadsheet ID, ข้อมูลผู้ใช้งาน และ
ข้อมูลจาก production ถูกละไว้โดยตั้งใจ

## ขอบเขตและ freeze

- อ่านเอกสารเกมที่ผู้ใช้ระบุ: `APPLY_GAMES_PATCH.md`,
  `BACTERIAL_IDENTIFICATION_INVESTIGATION_GAME_DESIGN.md` และ
  `GROWTH_PROMOTION_SIMULATION_LAB_GAME_DESIGN.md`
- ตรวจ source, frontend, local PDF service, Apps Script deploy kit,
  schema/fixtures, templates และ release scripts
- ไม่แก้ `games/**`, `_archived/frontend-v6/games/**` หรือ
  `docs/MICRO_LAB_GAMES_IMPLEMENTATION_PLAN.md`
- hash baseline ของพื้นที่ Games ถูกบันทึกไว้ที่
  `validation/games-baseline.sha256`

## หลักฐานที่พบ

### Frontend

| หัวข้อ | สิ่งที่โค้ดปัจจุบันทำ | ผลกระทบ |
|---|---|---|
| Registry | มี 5 workflows และ 3 domains ใน `apps/web/src/appData.ts` | ยังไม่ใช่ registry ของ 16 จุดหมายตาม matrix |
| Home/Cabinet | Home แสดงโฟลเดอร์ตาม domain | อาคาร/สถานที่และ binder destination ยังไม่ครบ |
| 3D | `FoyerScene.tsx` สร้าง geometry ด้วย Three.js | ยังไม่ได้ใช้ SVG asset package ที่เอกสารกำหนด |
| List parity | เส้นทางหลักเป็น domain/workflow | ยังไม่มี Cabinet/List ที่มาจาก matrix เดียวกัน |
| Record read | ใช้ `ok/data` search/get contract รุ่นใหม่ | endpoint Air/Water ที่ตรวจได้ตอบ `Unknown action` ซึ่งบ่งชี้ว่าเป็น deployment รุ่นเก่า |
| CV PDF | Owner-approved three-route policy | Contact Plate uses `cv-contact-template.docx`; Rinse-PW/PRW uses the approved PW/PRW family; Rinse-WFI/PUS uses the approved WFI/PUS family |

### Live endpoint checks

- Air และ Water `ping` ตอบ HTTP 200
- Air และ Water `search`/`health` ที่ตรวจแบบ read-only ตอบ `Unknown action`
- CV endpoint ยังไม่ได้ตั้งค่าใน `.env.production`
- ยังไม่มีหลักฐาน owner credentials, deployment version หรือ production smoke test

### Apps Script

พบ production candidates 6 ไฟล์ใน `apps-script-deploy/*/Code.gs` แต่ยังไม่ตรง
contract ใหม่ทั้งหมด ได้แก่ shared version/time-zone/domain constants,
`verify...Setup()` naming, allowlist/read contract, mutation authentication,
idempotent routing และ legacy mutation behavior ที่ต้องแยกออก

จุดเสี่ยงที่ต้องแก้หลัง Gate A/B:

- user scripts มี source ID และ mutation URL แบบ hardcoded
- action names และ setup functions บางส่วนเป็น contract รุ่นเก่า
- มี delete flow เดิมใน code path
- CV setup มี `clearContent`
- static validator ปัจจุบันยังตรวจ contract รุ่นเก่าและอ่อนเกินไป

### Templates / PDF

มี template ที่ตรวจพบ 5 รายการ: PW/PRW, WFI/PUS, compressed air, EM air และ
The repository contains the CV Contact template plus the approved Water template families reused by the two CV Rinse adapters.
The CV route keys remain separate (`cleaning-validation-rinse-pour` and `cleaning-validation-rinse-membrane`) and are independently method-validated.

The owner-approved decision is to reuse the Water template families for CV Rinse. The application must keep the CV route and data boundary explicit rather than blocking these routes.
The browser submits only a CV route key and normalized method; the local server resolves the approved template family.

### Workbook fixtures

จาก fixture ที่ตรวจแบบ read-only:

- Air source มีข้อมูลใน `records-Air` และ `records-CA Gass`
- Air System มีข้อมูลใน legacy unsuffixed tabs ขณะที่ active shard tabs ว่าง
- Water source มีข้อมูลใน `prw-pw` และ `wfi-pus`
- Water System มีข้อมูลใน legacy unsuffixed tabs ขณะที่ active PW shards ว่าง
- Water System fixture ไม่มี WFI B10/B12 tabs
- Water fixture มี Buildings 11 และ 19 รวมถึงแนวคิด legacy พิเศษ
- CV source มีข้อมูล Building 10/16/12 และกลุ่ม Contact plate, Rinse-PW,
  Rinse-WFI, CV และ CEHT
- CV System parent fixture ว่าง/header-only และ sample sheet ไม่มี sample data

ความแตกต่างนี้เป็น Gate B schema/migration discrepancy ห้าม backfill, สร้าง
production tabs, reset counter หรือเปิด trigger โดยอัตโนมัติ

### Offline contract validator

เพิ่ม `validation/validate_non_game_contract.mjs` และรันกับ workspace ปัจจุบัน
ผลคือ matrix 16 จุด, asset manifest/ไฟล์, exactly six `Code.gs`, loopback
The pre-owner snapshot recorded missing shared Apps Script functions/constants and missing CV Rinse route behavior; those implementation findings are now addressed by the current source.
The remaining checks are live deployment evidence, Google authorization, test-clone workbooks, and production cutover controls.
6. Enable and fixture-test all three owner-approved CV PDF routes; do not block Rinse solely because its approved template family is shared with Water.
## Recommended resolution

1. คง Windows local React/Flask เป็น distribution สำหรับ record/PDF
2. คง Google Sheets เป็น operational input และ System Sheets เป็น read model/
   numbering authority
3. ใช้สาม User bound scripts และสาม System bound/web-app scripts
4. ใช้ `test clone -> parallel smoke test -> controlled production replacement`
5. อ่าน legacy tabs แบบ read-only; เขียนรายการใหม่ไป active shards หลัง Gate B
   อนุมัติเท่านั้น
6. Enable and fixture-test all three owner-approved CV PDF routes; do not block Rinse solely because its approved template family is shared with Water.

## สถานะ gate

| Gate | สถานะ | เหตุผล |
|---|---|---|
| A: topology/access/cutover decision | PENDING | ยังไม่มีคำตอบยืนยัน 5 ข้อด้านล่าง |
| B: schema/routing/migration | BLOCKED BY GATE A | fixture ขัดแย้งกับ active shard และต้องมี owner decision |
| C: visual/frontend preview | NOT STARTED | ต้องล็อก registry/contract ก่อน |
| D: production cutover | NOT ELIGIBLE | ไม่มี owner authorization/credentials/live evidence |

การอนุญาตอ่าน/เขียน filesystem ที่ได้รับ หมายถึงสิทธิ์ใน workspace เท่านั้น
ไม่ถือเป็นการอนุมัติ schema, access policy, production writes, trigger หรือ
deployment ภายนอก
