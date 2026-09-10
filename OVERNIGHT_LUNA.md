# WATER-APP — LUNA MAX OVERNIGHT ENGINEERING RUN

อ่าน `AGENTS.md`, `README.md`, `FINAL_DELIVERY_REPORT.md`,
`CLEANUP_REPORT.md` และตรวจ repository ปัจจุบันก่อนเริ่ม

คุณเป็น single root implementation session ของ water-app

ให้ทำงานแบบ autonomous end-to-end ต่อเนื่อง:
inspect
→ reproduce / establish baseline
→ plan internally
→ implement
→ test
→ debug
→ fix
→ regression
→ inspect artifacts
→ self-audit
→ commit
→ push

ห้ามหยุดเพียงเพื่อรายงาน planning, progress หรือผล test ระหว่างทาง
หากยังมีงาน local ที่สามารถดำเนินการต่อได้ ให้ดำเนินการต่อทันที

---

## Current State

Release ปัจจุบันคือ 7.1v

GPT Work ได้ทำ repository cleanup และ validation รอบแรกแล้ว

Production Apps Script ที่เกี่ยวข้องถูก owner redeploy เรียบร้อยแล้วก่อนเริ่ม session นี้

ดังนั้น:

- ห้าม deploy หรือ redeploy Apps Script เพิ่มเอง
- ห้ามสร้าง deployment version ใหม่
- ห้ามแก้ Production Google Sheets
- ห้ามลบ production records
- ห้าม reset worksheet-number sequence
- ห้ามเปลี่ยน sharing/permissions ของ external systems

อนุญาตให้ทำ read-only live endpoint validation ได้

หากพบ production/deployment mismatch:
ให้เก็บ evidence และรายงาน
ห้ามแก้ production เอง

---

# PRIMARY OBJECTIVE

ทำ Post-Deployment Engineering Validation และ repository hardening
ของ water-app release 7.1v ให้ละเอียดที่สุดเท่าที่ environment นี้ทำได้

แก้ defect จริงที่พิสูจน์ได้ใน repository

เป้าหมายคือให้ branch นี้อยู่ในสภาพที่ owner สามารถ pull
ไปยังเครื่องที่ทำงานในวันถัดไปและทำ final target-machine acceptance ได้

---

# 1. Reconstruct State

เริ่มด้วย:

- `git status`
- `git log --oneline -10`
- `git diff`
- `git diff --cached`
- ตรวจ current branch
- ตรวจ VERSION.txt
- ตรวจ AGENTS.md
- ตรวจ repository tree
- อ่าน `.codex/WORK_STATE.md` หากมี

Repository evidence และ current Git state มีลำดับความน่าเชื่อถือสูงกว่า
WORK_STATE หรือข้อความจาก session เก่า

---

# 2. Baseline Validation

รัน verification ที่มีอยู่จริงใน repository

อย่างน้อยให้ตรวจ:

- pnpm test
- pnpm check
- pnpm build
- git diff --check
- full Python pytest suite ถ้าสามารถติดตั้ง/ใช้ dependency ที่มีอยู่ได้
- repository validators
- workbook/schema validators
- Apps Script validators
- routing validators
- document-generation validators
- style/contrast validators
- release validators

อย่า invent command

ตรวจ package scripts และ repository ก่อนรัน

หาก test fail:

reproduce
→ trace execution path
→ identify root cause
→ smallest evidence-supported fix
→ rerun failing test
→ adjacent regression

อย่าแก้ test เพื่อทำให้ implementation ที่ผิดผ่าน

---

# 3. Post-Deployment Read-Only Smoke

Production Apps Script ได้ redeploy แล้ว

ให้ตรวจ deployment behavior แบบ READ-ONLY เท่านั้น

ใช้ endpoint/config ที่พิสูจน์ได้จาก repository/environment

ตรวจเท่าที่ safe validator รองรับ:

- Water endpoint
- Air endpoint
- CV endpoint ถ้ามี safe read-only validation path
- building routing
- logical domain routing
- response schema
- timeout behavior
- malformed/error behavior ที่ไม่สร้าง production mutation

ห้ามสร้าง test record บน production เพียงเพื่อ smoke test

ห้ามเดา URL หรือ credential

หาก endpoint ไม่พร้อมหรือ network เข้าไม่ได้:
บันทึก NOT TESTED / BLOCKED แล้วทำงาน local ส่วนอื่นต่อ

อย่าหยุดทั้ง run เพราะหนึ่ง external validation ทำไม่ได้

---

# 4. Windows / Local Application Validation

ตรวจ workflow บน Windows environment นี้เท่าที่ทำได้:

- START-ANF3.bat
- local Flask/document server
- frontend startup
- required paths
- assets
- configuration
- version identity
- dependency startup
- error handling

หาก process ต้องรัน background:
จัดการ process อย่างปลอดภัย
ตรวจ health
ใช้ในการ validation
และ cleanup process เมื่อไม่จำเป็นแล้ว

---

# 5. Browser / Frontend Functional Validation

ทดสอบ functional behavior โดยไม่ redesign UI

ครอบคลุมเท่าที่ environment รองรับ:

- main navigation
- Building → Domain → Workflow
- list/filter/group/detail behavior
- URL state/back navigation

และ workflows:

1. PW/PRW
2. WFI/PUS
3. Environmental Monitoring
4. Compressed Air
5. CV Contact Plate
6. CV Rinse — Pour Plate
7. CV Rinse — Membrane Filtration

ตรวจ:

- Generate Preview
- Cancel
- Reset
- navigation
- selection
- validation
- keyboard behavior
- focus behavior
- responsive behavior

หาก automated browser ไม่มี:
ใช้ verification อื่นที่พิสูจน์ได้
และบันทึก browser gate เป็น NOT TESTED
ห้าม claim ว่าผ่าน browser จริง

---

# 6. Document Pipeline Validation

ตรวจทั้ง 7 workflow

ใช้ synthetic/local-safe fixtures เท่านั้น

ห้าม fabricate production laboratory data

ตรวจ:

- correct record
- template route
- header mapping
- sample mapping
- legacy aliases
- page splitting
- repeated headers
- unresolved placeholders
- DOCX integrity
- PDF integrity
- worksheetNo filenames
- DOCX/PDF correspondence
- controlled template layout

หากสร้าง temporary DOCX/PDF:
ตรวจให้เสร็จแล้ว cleanup
ห้าม commit generated outputs

---

# 7. Repository Hardening

ระหว่าง validation หากพบ defect จริง:

- แก้เฉพาะ defect ที่พิสูจน์ได้
- รักษา architecture เดิม
- ห้าม speculative refactor
- ห้าม redesign frontend
- ห้าม normalize legacy contract
- ห้ามเปลี่ยน authoritative DOCX layout
- ห้ามสร้าง field/business rule ใหม่จากการเดา

สามารถปรับ:
- code
- tests
- validators
- local documentation
- developer workflow

ได้เมื่อจำเป็นต่อ defect หรือ Definition of Done

---

# 8. Long-Run Continuity

ดูแลไฟล์:

`.codex/WORK_STATE.md`

ให้เป็น compact checkpoint เท่านั้น

อัปเดตหลัง milestone สำคัญ โดยมี:

## Objective
## Verified Facts
## Completed
## Files Intentionally Changed
## Tests Passed
## Tests Failed
## Remaining
## Blockers
## Exact Next Action

อย่าใช้ WORK_STATE เป็น log ยาว

หาก context compact:
อ่าน AGENTS.md + WORK_STATE + git status + git diff
แล้วทำงานต่อจาก exact next action

ห้ามเริ่มใหม่จากศูนย์

---

# 9. Self-Audit Before Commit

ก่อน commit ให้ตรวจ:

- git status
- git diff
- git diff --check
- files changed
- tests
- generated artifacts
- temporary logs
- debug code
- secrets
- credentials
- unrelated changes
- stale `.agent-bus`
- template changes
- production-identifying data

แก้ defect ที่พบแล้ว rerun verification ที่ได้รับผลกระทบ

---

# 10. Git Authorization

ผู้ใช้อนุญาตอย่างชัดเจนให้คุณ:

- ทำงานบน branch `main`
- create commits
- create multiple logical commits if useful
- push commits ไปยัง `origin/main`

ก่อน commit/push:
- ตรวจ `git status`
- ตรวจ `git diff`
- ตรวจ `git diff --check`
- ตรวจว่าไม่มี secrets, generated artifacts, debug residue หรือไฟล์ชั่วคราว
- รัน verification ที่เกี่ยวข้อง
- ห้าม force push
- ห้าม rewrite history
- ห้ามใช้ destructive reset เพื่อลบทิ้งงานโดยไม่จำเป็น

เมื่อ repository อยู่ในสภาพ coherent และผ่าน self-audit แล้ว:

git add -A
git commit -m "<appropriate concise commit message>"
git push origin main

หากมี defect สำคัญที่ยังแก้ไม่ได้และอาจทำให้ main ใช้งานไม่ได้:
ห้าม push
ให้รายงาน `NOT_READY_TO_PUSH`

---

# 11. Final Validation Report

ก่อนจบ ให้สร้าง:

`validation/POST_DEPLOYMENT_VALIDATION_7.1v.md`

สรุป:

## Environment
## Commit / Branch
## Verified by Execution
## Verified by Inspection
## Defects Found
## Defects Fixed
## Tests Passed
## Tests Failed
## Not Tested
## Production Read-Only Smoke
## Files Changed
## Residual Risks
## Owner Tests Required on Workstation
## Recommendation

ใช้ผลจริงเท่านั้น

แยกสถานะ:

PASS
FAIL
NOT TESTED
BLOCKED

ห้ามเปลี่ยน NOT TESTED เป็น PASS จาก inference

---

# 12. End State

ถ้าทุก local gate ผ่าน:

ตั้ง conclusion ใน report:

READY_FOR_TARGET_MACHINE_ACCEPTANCE

ถ้ายังมีข้อจำกัดที่ไม่ block source branch:
ใช้:

READY_WITH_OWNER_GATES

ถ้ามี defect สำคัญที่ยังแก้ไม่ได้:
ใช้:

NOT_READY_FOR_ACCEPTANCE

ไม่ว่าสถานะใด ให้ push branch หาก repository อยู่ในสภาพ coherent
และการ push ไม่ทำให้สูญเสียข้อมูล

ในกรณีมี failing implementation ที่อาจทำให้ branch ใช้งานไม่ได้:
commit/push ได้เพราะนี่เป็น isolated overnight branch
แต่ต้องบันทึก failure ชัดเจนใน report

อย่า merge main

หลัง push แล้วตรวจว่า remote branch ถูกสร้างสำเร็จ

จากนั้นจบ session พร้อม summary สั้น ๆ เท่านั้น