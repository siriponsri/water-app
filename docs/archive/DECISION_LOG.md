# ANF3 Laboratory Records decision log

วันที่เริ่มบันทึก: 2 กันยายน 2026 (Asia/Bangkok)

## Gate A: APPROVED / Gate B: APPROVED FOR LONG RUN

### Owner response received

> อนุญาต READ/WRITE เต็มที่

### Gate A/B owner decisions (verbatim)

> 1. ยืนยัน topology ตามที่เสนอครับ
> 2. การอ่านข้อมูลจำกัดเฉพาะผู้ใช้ในองค์กรครับ
> 3. ยืนยันลำดับ test clone, parallel smoke test และ controlled production replacement ยืนยันลำดับตามนี้เลยครับ
> 4. อนุมัติ Gate B เลยครับ และยิงยาว Long run
> 5. กำหนด Rinse CV ใช้ Template เดียวกับ Water Test ทั้ง 2 Template ครับ เพราะฉะนั้น หน้า CV จะประกอบด้วย 3 templates A. Contact Plate (cv-contact-template.docx), B. Pour Plate (pw-prw-template.docx), C. Membrane Filtration (wfi-pus-template.docx)

ข้อความนี้ยืนยัน workspace filesystem permission เท่านั้น ส่วน decisions ของ
topology, access policy, schema/cutover และ CV template family อยู่ในคำตอบ
Gate A/B แบบ verbatim ด้านบน

### Decisions resolved by owner

คำตอบข้อ 1-5 ได้รับแล้วและมีผลใช้กับ long-run implementation:

1. ยืนยันให้คง topology Windows local React/Flask + Google Sheets/System DB
   ตาม recommendation หรือไม่
2. การอ่านข้อมูลต้องจำกัดเฉพาะผู้ใช้ในองค์กร หรืออนุญาต public/link access
   ตาม policy ขององค์กร
3. ยืนยันลำดับ `test clone -> parallel smoke test -> controlled production
   replacement` หรือมีขั้นตอน cutover อื่น
4. legacy tabs เป็น read-only; active shard/backfill/counter/trigger ใช้ตาม
   controlled sequence และ evidence ของ Gate D
5. CV ใช้ 3 template families ที่ owner ระบุ: Contact, Water PW/PRW layout
   for Pour Plate, and Water WFI/PUS layout for Membrane Filtration

### Current safe scope

ทำได้ตาม Gate A/B ที่อนุมัติ:

- read-only audit, static inspection และ reversible local validation
- ตรวจ/บันทึก Games hash และห้ามแก้ game files
- local implementation, test-clone preparation และ static/integration validation

เอกสาร mapping ที่เตรียมไว้: [docs/GATE_B_BEFORE_AFTER_MAP_20260902.md](docs/GATE_B_BEFORE_AFTER_MAP_20260902.md)

เอกสารสรุปสำหรับตัดสินใจ: [docs/GATE_A_DECISION_BRIEF_TH.md](docs/GATE_A_DECISION_BRIEF_TH.md)

ยังต้องรอ controlled cutover evidence/owner action ก่อน:

- production tabs/data migration, counter reconciliation และ trigger enablement
- production deployment/replacement และ production sync write
- claim ว่า production deployment สำเร็จโดยไม่มี deployment evidence

CV template interpretation:

- `cv-contact-template.docx` is CV-owned Contact Plate template.
- `pw-prw-template.docx` is the approved layout/template family for CV Pour Plate.
- `wfi-pus-template.docx` is the approved layout/template family for CV Membrane
  Filtration.
- The UI/backend still use CV-owned workflow keys and adapters (`CV_CONTACT`,
  `CV_RINSE_POUR`, `CV_RINSE_MEMBRANE`) and never accept a client filesystem
  path. This keeps CV data, audit events, and method validation separate while
  honoring the owner's single-template-family decision.

Gate D remains pending until backup, test-clone evidence, parallel smoke tests,
and controlled production replacement evidence are complete.

### Reversible validation snapshot

- `npm run check`: PASS
- `npm run test -- --run`: PASS, 2 test files / 19 tests
- `pytest server/tests`: PASS, 8 tests
- `node validation/render_screenshots.cjs` against `http://127.0.0.1:8000`:
  PASS, 10 route/report views with no console/page errors or horizontal overflow
- Local CV PDF fixture smoke: PASS for Contact Plate, Rinse Pour Plate, and
  Rinse Membrane Filtration
- `node validation/test_games.mjs`: PASS
- `node validation/test_apps_script_security.mjs`: PASS
- `node validation/test_cv_contract.mjs`: PASS
- `node validation/test_worksheet_numbering.mjs`: PASS
- `python -m py_compile server/pdf_server.py`: PASS
- `npm run build`: PASS; Vite build completed with a non-blocking large-chunk warning
- Games baseline comparison: PASS for all recorded paths
- `pnpm` was unavailable in PATH; equivalent npm scripts were run successfully
