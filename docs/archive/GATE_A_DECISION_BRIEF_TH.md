# Gate A: เอกสารตัดสินใจก่อน rebuild ระบบ ANF3

วันที่: 2 กันยายน 2026  
สถานะ: `PENDING OWNER DECISION`

## ผลลัพธ์ที่ต้องการ

ส่งมอบ ANF3 Laboratory Records แบบ full stack สำหรับใช้งานจริง ได้แก่ React/
Vite, Digital Record Cabinet 2.5D/3D พร้อม List parity, 2D record workspace,
local Flask/PDF service และ Google Sheets/System DB โดยคง Games ไว้ตาม baseline
เดิมทุกประการ

## สิ่งที่ตรวจยืนยันแล้ว

- มี active Cabinet destinations 16 จุดตาม `docs/CABINET_WORKFLOW_MATRIX.md`
- มี original SVG asset package และ manifest ครบตาม capacity ที่ audit ไว้
- มี production candidate `Code.gs` จำนวน 6 ไฟล์ แต่ contract ปัจจุบันยังเป็น
  รุ่นเก่าและต้อง rebuild
- Air/Water live endpoint ที่ตรวจแบบ read-only ตอบ `Unknown action` สำหรับ
  `search`/`health` จึงต้องทดสอบ deployment รุ่นใหม่ก่อนเปลี่ยน client
- fixture พบ legacy tabs ที่มีข้อมูล ขณะที่ active shard หลายแท็บว่าง และ WFI
  B10/B12 ไม่ปรากฏใน fixture
- Owner decision now authorizes all three CV PDF routes: Contact Plate uses
  `cv-contact-template.docx`, Rinse-PW/PRW uses the approved PW/PRW template
  family, and Rinse-WFI/PUS uses the approved WFI/PUS template family.

## Recommendation

1. คง Windows local React/Flask เป็น runtime หลักสำหรับ record/PDF
2. คง Google Sheets เป็น operational input และ System Sheets เป็น normalized
   read model/numbering authority
3. ใช้ 3 User bound scripts + 3 System bound/web-app scripts แบบ copy/paste
4. ทดสอบด้วย `test clone -> parallel smoke test -> controlled production
   replacement`
5. อ่าน legacy tabs ได้ แต่ไม่เขียน record ใหม่ลง legacy; ยังไม่ backfill หรือ
   reset counter โดยอัตโนมัติ
6. Enable all three CV PDF routes through the approved template families and
   verify each route with a fixture before production use.

## คำตอบที่ต้องการจาก Owner

ตอบเป็นข้อ 1–5 ได้เลย โดยเลือก recommendation หรือระบุทางเลือกขององค์กร:

1. ยืนยัน topology Windows local React/Flask + Google Sheets/System DB หรือไม่
2. การอ่านข้อมูลจำกัดเฉพาะผู้ใช้ในองค์กร หรืออนุญาต public/link access
3. ยืนยันลำดับ test clone, parallel smoke test และ controlled production
   replacement หรือมี cutover sequence อื่น
4. ยืนยัน legacy tabs เป็น read-only และเลื่อน active shard/backfill/counter/
   trigger จนกว่า Gate B จะอนุมัติหรือไม่
5. The owner confirms that CV Rinse PDF is enabled through the approved
   PW/PRW and WFI/PUS template families, with CV-owned route keys and adapters.

## ผลกระทบหลังอนุมัติ

| การตัดสินใจ | ไฟล์/ระบบที่ได้รับผลกระทบ |
|---|---|
| topology/access | `apps/web/src/api.ts`, `.env.production`, Apps Script deployment settings, `OWNER.md` |
| shard/schema/migration | 6 `Code.gs`, `google/sheets/schema.json`, test-clone workbook; production tabs จะยังไม่ถูกแตะจน Gate B/D |
| Cabinet/List | `apps/web/src/appData.ts`, `App.tsx`, `FoyerScene.tsx`, `styles.css`, asset references และ routing tests |
| CV PDF capability | `server/pdf_server.py`, CV policy/adapter, and the three owner-approved route mappings |
| cutover/release | `OWNER.md`, apply/rollback docs, validation reports และ release ZIP หลัง Gate D |

## สิ่งที่ยังไม่ทำ

ยังไม่มีการ deploy/replace web app, ตั้ง trigger, เพิ่ม/ย้าย/ลบ production tab,
backfill, reset counter, sync record จริง หรือ claim production success

คำตอบ “อนุญาต READ/WRITE เต็มที่” ที่ได้รับก่อนหน้านี้ถูกบันทึกเป็น workspace
permission เท่านั้น และยังไม่ถือเป็นคำตอบของข้อ 1–5
