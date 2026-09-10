# คู่มือเจ้าของระบบแบบ No-code — ANF3 Laboratory Records

> เอกสารนี้เป็นข้อกำหนดคู่มือที่ Luna Max ต้องทำให้ตรงกับระบบจริงก่อนส่งมอบ ชื่อเมนู ฟังก์ชัน และภาพหน้าจอต้องอัปเดตตาม implementation สุดท้าย ห้ามปล่อยคำสั่งตัวอย่างที่กดแล้วไม่ตรงกับระบบ

---

## 1. สิ่งที่เจ้าของระบบต้องได้รับ

เจ้าของระบบต้องสามารถติดตั้งและดูแลระบบได้โดยใช้เพียง:

- Windows Explorer
- Google Chrome/Edge
- Google Sheets และเมนู Extensions > Apps Script
- ไฟล์ ZIP ที่ส่งมอบ
- Microsoft Word ในกรณีที่ต้องสร้าง PDF จาก Word template

เจ้าของระบบไม่ต้องใช้ VS Code, Git, Terminal, npm, Node, clasp, Python command, JSON editor หรือรวมโค้ดหลายไฟล์ด้วยตนเอง

ชุดส่งมอบต้องมี:

- ปุ่ม/ไฟล์ติดตั้งครั้งแรกแบบ one-click
- ปุ่มเริ่มระบบแบบ one-click
- Apps Script จำนวน 6 ไฟล์ที่ Copy/Paste ได้ทันที
- คู่มือพร้อมภาพหน้าจอหรือ SVG callout
- ตารางบันทึก URL/สถานะที่ไม่บังคับให้บันทึก token ลงเอกสาร
- วิธีทดสอบ วิธีสำรอง วิธีอัปเดต และวิธีย้อนกลับ

---

## 2. ภาพรวมที่เจ้าของควรเข้าใจ

ระบบแบ่งเป็น 4 ส่วน:

1. **User Google Sheet** — เจ้าหน้าที่กรอก/แก้ข้อมูลตาม workflow เดิม
2. **System Google Sheet** — เก็บข้อมูล normalized, ออกเลข worksheet, ให้ Web App อ่าน
3. **ANF3 Web App บน Windows** — ค้นหา เปิดดู Preview และ Print แบบ read-only
4. **Local PDF Service** — ใช้ approved Word template สร้างเอกสารบนเครื่อง

Air, Water และ Cleaning Validation มี User/System อย่างละคู่ รวมเป็น 6 Google Sheets/Apps Script projects

---

## 3. กติกาความปลอดภัยก่อนเริ่ม

- ใช้ Google account ขององค์กรที่ถูกต้อง
- สำรอง Google Sheet ทั้ง 6 ไฟล์ก่อนเปลี่ยนโค้ด
- ห้ามถ่ายภาพหรือส่ง Sync Token ในแชต/อีเมล/เอกสาร
- ห้ามนำ URL ของ Air ไปใส่ Water/CV หรือสลับกัน
- ทดสอบบนสำเนา Sheet ก่อน production
- ยังไม่เปิด Daily Trigger จน Manual Sync ผ่าน
- ห้าม reset counter หรือย้าย/ลบ tab โดยไม่มี Gate B/D approval
- ถ้า Google ขอสิทธิ์ ให้ตรวจชื่อบัญชีและโปรเจกต์ก่อนอนุญาต
- หน้า Games ไม่อยู่ในงานติดตั้งนี้และต้องทำงานเหมือนเดิม

---

## 4. แผนที่ 6 ไฟล์

| ลำดับติดตั้ง | Google Sheet role | ไฟล์ที่ Copy | ต้อง Deploy Web App หรือไม่ |
|---:|---|---|---|
| 1 | Air System DB | `apps-script-deploy/02-air-system/Code.gs` | ต้อง Deploy |
| 2 | Air User | `apps-script-deploy/01-air-user/Code.gs` | ไม่ต้อง |
| 3 | Water System DB | `apps-script-deploy/04-water-system/Code.gs` | ต้อง Deploy |
| 4 | Water User | `apps-script-deploy/03-water-user/Code.gs` | ไม่ต้อง |
| 5 | CV System DB | `apps-script-deploy/06-cv-system/Code.gs` | ต้อง Deploy |
| 6 | CV User | `apps-script-deploy/05-cv-user/Code.gs` | ไม่ต้อง |

ติดตั้ง System ก่อน User ในแต่ละคู่ เพื่อให้ได้ System URL สำหรับตั้งค่า User

---

## 5. เตรียมข้อมูลสำหรับเจ้าของ

Luna ต้องสร้างแบบฟอร์ม checklist ที่ไม่เก็บ secret ประมาณนี้:

| Domain | System code วางแล้ว | System health ผ่าน | System URL ตั้งใน User แล้ว | Manual sync ผ่าน | Trigger เปิดแล้ว |
|---|---|---|---|---|---|
| Air | ☐ | ☐ | ☐ | ☐ | ☐ |
| Water | ☐ | ☐ | ☐ | ☐ | ☐ |
| CV | ☐ | ☐ | ☐ | ☐ | ☐ |

Token ใช้ 3 ค่าแยกกัน: Air, Water, CV ค่าละอย่างน้อย 32 ตัวอักษรสุ่ม และใช้ค่าเดียวกันเฉพาะ User/System ภายใน domain นั้น ห้ามพิมพ์ token ลง checklist

หากระบบมีฟังก์ชันสร้าง token แบบปลอดภัย ให้เจ้าของสร้าง/คัดลอกในขั้นตอน setup แล้วล้าง clipboard ตามคำแนะนำ แต่โค้ดห้าม log หรือแสดง token หลังบันทึก

---

## 6. ขั้นตอนทั่วไปสำหรับวาง Code.gs

ทำซ้ำกับ Google Sheet ตามตาราง:

1. เปิด Google Sheet ที่ถูกต้อง
2. เลือก **Extensions > Apps Script**
3. คลิก `Code.gs`
4. กด Ctrl+A ใน editor แล้วกด Delete
5. เปิดไฟล์ `Code.gs` ที่ตรงกับ Sheet จาก ZIP
6. กด Ctrl+A, Ctrl+C แล้วกลับมาวางด้วย Ctrl+V
7. กด Save
8. ไม่ต้องสร้างไฟล์ `.gs` เพิ่ม และไม่ต้องแก้ `appsscript.json`
9. กลับ Google Sheet แล้ว Reload หลังตั้งค่าเสร็จ

คู่มือสุดท้ายต้องมีภาพ/SVG ชี้ตำแหน่ง Extensions, Code.gs, Run, Deploy, Manage deployments และ Triggers หากไม่สามารถแนบภาพจริง ให้ Luna สร้าง SVG callout ที่ไม่เลียนแบบข้อมูลส่วนตัว

---

## 7. ติดตั้ง Air System

1. สำรอง Air System DB
2. วาง `02-air-system/Code.gs`
3. ใน Apps Script เลือกและ Run `setAirSyncToken()` (หรือชื่อสุดท้ายที่ implementation ใช้)
4. ใส่ Air token และอนุญาตสิทธิ์
5. Run `verifyAirSystemSetup()` ก่อน setup เพื่อดูสิ่งที่ขาด
6. หากรายงานต้องสร้าง exact active tabs ให้ตรวจรายการและยืนยันตาม Gate B
7. Run `setupAirSystem()`
8. Run `verifyAirSystemSetup()` อีกครั้ง ต้อง PASS หรือมีเฉพาะ warning ที่บันทึกไว้
9. Deploy > Manage deployments
10. Deployment เดิม: Edit > New version > Deploy เพื่อรักษา URL ตามแผน cutover
11. Deployment ใหม่: New deployment > Web app
12. Execute as: owner
13. Who has access: เลือกค่าที่ Owner/องค์กรอนุมัติใน Gate A เท่านั้น
14. คัดลอก URL ที่ลงท้าย `/exec`
15. เปิด `URL?action=health` ต้องได้ JSON `ok:true` และ domain Air โดยไม่เผย config ภายใน

ทดสอบ search/get แบบ fixture ที่คู่มือสุดท้ายระบุ ห้ามเดา workflow/query จาก production data

---

## 8. ติดตั้ง Air User

1. สำรอง Air User Sheet
2. วาง `01-air-user/Code.gs`
3. Reload Sheet ให้เมนู `ANF3 Air Sync` ปรากฏ
4. เลือก `1) ตรวจสอบความพร้อม`
5. เลือก `2) ตั้งค่า System URL` และวาง Air `/exec` URL
6. ระบบต้องตรวจ health/domain ก่อนบันทึก
7. เลือก `3) ตั้งค่า Sync Token` และใส่ Air token เดียวกับ Air System
8. หากต้องเพิ่ม control columns ให้เลือก `4) เตรียมคอลัมน์ควบคุม` หลังยืนยัน preview เท่านั้น
9. เตรียม Air fixture อย่างน้อย EM 1 record และ Compressed Air 1 record ใน test clone
10. ทำเครื่องหมาย sync แล้วเลือก `5) Sync แถวที่ทำเครื่องหมาย`
11. ตรวจ worksheet number, active shard, status, audit log และ retry
12. ยังไม่ตั้ง Trigger จน smoke test ครบ

---

## 9. ติดตั้ง Water System/User

ทำลำดับเดียวกับ Air โดยใช้:

- System: `04-water-system/Code.gs`
- User: `03-water-user/Code.gs`
- Water token
- Water System URL

ต้องทดสอบแยก:

- PW/PRW → `WT`
- WFI/PUS → `WP`
- B10/B12/B16/Other routing
- retry ไม่ออกเลขใหม่
- legacy prefixes `PQ-OLD`, `PQ-OCL`, `RA6`, `WP-PQ` ไม่ถูกแปลง
- record ใหม่ไม่เข้า unsuffixed legacy tabs

หาก WFI B10/B12 tabs ยังไม่มี ฟังก์ชัน setup ต้องแสดง exact tabs/headers ที่จะสร้างและรอ owner ยืนยัน ไม่สร้างจากชื่อที่พิมพ์เอง

---

## 10. ติดตั้ง CV System/User

ใช้:

- System: `06-cv-system/Code.gs`
- User: `05-cv-user/Code.gs`
- CV token
- CV System URL

### CV System

- ตรวจ `records_cv`, `records_cv_samples`, audit/log tab
- Deploy Web App ด้วย access ที่อนุมัติ
- health ต้องระบุ CV

### CV User

- ตรวจกลุ่ม sample และ stable batch/record ID
- Contact Plate ต้องได้ `CV-YY[-Bxx]-NNNN`
- Rinse ต้องได้ `CVR-YY-NNNN` ไม่มี building segment
- Retry ต้อง update parent เดิมและจัด child samples โดยไม่ซ้ำ
- Mixed/ambiguous group ต้องถูกปฏิเสธพร้อมข้อความแก้ไขได้

การ Preview/Print ของ Cleaning Validation ต้องแสดงเส้นทาง Template ให้ผู้ใช้ตรวจสอบก่อน:

- Contact Plate → `Cleaning Validation Contact`
- Rinse → ต้องเลือก Test Method
  - Pour Plate → `CV Rinse — Pour Plate`
  - Membrane Filtration → `CV Rinse — Membrane Filtration`

Owner-approved CV Rinse template decision: reuse the Water template families. Pour Plate resolves to `pw-prw-template.docx` and Membrane Filtration resolves to `wfi-pus-template.docx`. CV route keys, adapters, method validation, and audit metadata remain separate from Water. If the method is missing, unknown, or conflicts with the matrix, keep document generation disabled and show the correction needed.

---

## 11. Manual smoke test ก่อนเปิด Trigger

สำหรับแต่ละ domain ให้ใช้ test clone และทำตามนี้:

1. เพิ่ม record ทดสอบใหม่
2. Sync ครั้งแรก → ต้อง insert และได้เลขที่ถูกต้อง
3. Sync ซ้ำโดยไม่แก้ → ต้อง `NO_CHANGE`/ผลเดิม ไม่เพิ่มแถว ไม่ออกเลขใหม่
4. แก้ field ที่อนุญาต → ต้อง update เลขเดิม
5. เปลี่ยน building หลังออกเลข → เลขเดิม/ตำแหน่งเดิมตาม contract และมี audit warning
6. ใช้ token ผิดใน test → ต้อง reject ไม่มี record/log sensitive data
7. ตรวจ Web App search/get เห็นข้อมูล normalized
8. เปิด React App และค้นหา/เปิด record ได้
9. สร้าง PDF เฉพาะ workflow ที่มี approved template
10. ตรวจว่า Games ไม่มี record/log ใหม่จากการเล่นหรือเปิดหน้า

บันทึกเฉพาะ worksheet test ID/ผลที่ไม่ sensitive ลง Final Delivery Report

---

## 12. เปิด Daily Trigger

ทำหลัง Gate D เท่านั้น:

1. เปิด User Sheet ของ domain
2. เลือกเมนู `ANF3 <Domain> Sync > 7) ตั้งเวลาอัตโนมัติ`
3. ระบบแสดง handler/time zone/time window และถามยืนยัน
4. ยืนยัน `Asia/Bangkok`
5. เปิด Apps Script > Triggers เพื่อตรวจว่ามี trigger เดียวสำหรับ handler นั้น
6. ตรวจ Executions ในวันถัดไป

ฟังก์ชันต้องป้องกัน duplicate triggers. การปิด trigger ต้องลบเฉพาะ handler ของระบบ ANF3 ใน project นั้น ไม่ลบ trigger อื่น

---

## 13. ติดตั้ง Local Web App บน Windows

Luna ต้องทำให้ขั้นตอนจริงสุดท้ายไม่เกิน:

1. แตก release ZIP ไปยังโฟลเดอร์ชื่อภาษาอังกฤษสั้น ๆ เช่น `C:\ANF3-Lab-Records`
2. ดับเบิลคลิก `INSTALL.bat` ครั้งแรก
3. รอหน้าต่างสรุป `INSTALLATION PASS`
4. ดับเบิลคลิก `START-ANF3.bat`
5. Browser เปิด URL local อัตโนมัติ

ข้อกำหนด installer/start:

- ไม่ต้อง Run as Administrator หากไม่จำเป็นจริง
- ตรวจ Python/runtime/dependency/MS Word support และแสดงข้อความไทยที่แก้ได้
- path มีช่องว่างต้องทำงาน
- ไม่ปิดหน้าต่างทันทีเมื่อ error
- ไม่ดาวน์โหลด/รันสิ่งที่ไม่ได้ระบุ
- ไม่แก้ system-wide PATH โดยไม่จำเป็น
- local server bind `127.0.0.1`
- เปิด browser หลัง health พร้อม ไม่ใช่ก่อน server ready
- ป้องกัน start ซ้ำ/port conflict พร้อมวิธีแก้

หากองค์กรบล็อก installer/download ให้มี offline dependency package หรือขั้นตอนที่ตรงกับ release จริง ไม่ใช่คำสั่งสมมติ

---

## 14. ตั้งค่า endpoint สำหรับ Web App

คู่มือสุดท้ายต้องให้เจ้าของกรอกเฉพาะ read URLs ผ่านไฟล์/หน้าตั้งค่าที่ปลอดภัยและชัดเจน เช่น `.env.production` ที่มี template หรือ local configuration wizard:

- Air read URL
- Water read URL
- CV read URL

ห้ามใส่ Sync Token ใน frontend. ตัวตรวจสอบ config ต้องบอกได้ว่า URL ใดผิด domain/ตอบไม่ได้ โดยไม่แสดงข้อมูลลับ

หลังเปลี่ยน config หากต้อง build ใหม่ Luna ต้องให้ one-click `BUILD-DIST.bat` หรือสร้าง release ที่อ่าน runtime config โดยไม่ต้องใช้ Node ของเจ้าของ การเลือกต้องตรงกับ architecture ที่อนุมัติ

---

## 15. การใช้งานประจำวัน

### ค้นหาและเปิด Record

1. เปิด `START-ANF3.bat`
2. เลือกแฟ้มจาก Cabinet หรือเปลี่ยนเป็น List
3. ตรวจ Building และ Workflow บนป้าย
4. ค้นหาด้วย worksheet number/date/building ตาม filter ที่มีจริง
5. เลือก record
6. ตรวจ badge `Current System DB` ก่อนใช้ Print/PDF

### Offline/Service issue

- `Cached read-only` หมายถึงดูข้อมูลเก่าได้ แต่ยังไม่ควร Print
- ถ้า Air/Water/CV service ขัดข้อง ให้กด Retry และดู status panel
- ถ้า Local PDF service ขัดข้อง ข้อมูล record ยังดูได้ แต่ PDF actions ถูกปิด
- ห้ามใช้ cached record เป็นหลักฐาน current โดยไม่มี freshness label

---

## 16. สำรองและ Rollback

ก่อน update ทุกครั้ง:

- Download Google Sheets ทั้ง 6 หรือใช้ Make a copy ตามนโยบายองค์กร
- Export/เก็บ Code.gs เวอร์ชันเดิมทั้ง 6
- บันทึก deployment version ปัจจุบัน
- ปิด triggers ใหม่ก่อน rollback
- เก็บ release ZIP เดิม

Rollback order:

1. ปิด User triggers ของ release ใหม่
2. ตรวจว่าไม่มี run ค้าง
3. Restore System/User Code.gs เป็นคู่ domain
4. Redeploy System เวอร์ชันเดิม
5. ตั้ง User System URL ถ้า URL เปลี่ยน
6. Run verify และ controlled search
7. ตรวจ duplicate/partial record
8. เปิด trigger เมื่อผ่านเท่านั้น
9. Restore local app ZIP เดิม

ห้าม reset counter เพียงเพื่อให้ตัวเลข “ต่อสวย” เพราะ gap ยอมรับได้ แต่ duplicate ยอมรับไม่ได้

---

## 17. Troubleshooting แบบตัดสินใจได้

คู่มือสุดท้ายต้องมีตารางข้อความจริงจาก implementation เช่น:

| อาการ | ตรวจที่ไหน | สาเหตุที่เป็นไปได้ | วิธีแก้ปลอดภัย |
|---|---|---|---|
| เมนู ANF3 ไม่ขึ้น | Reload Sheet / Apps Script save | code ยังไม่ save หรือ authorization | Save, reload, run verify |
| `WRONG_DOMAIN` | User setup health | ใส่ URL ข้าม domain | วาง URL ที่ถูกคู่ |
| `UNAUTHORIZED_MUTATION` | Script Properties | token คู่ User/System ไม่ตรง | ตั้งค่าใหม่ทั้งคู่ ไม่ส่ง token ให้ผู้อื่น |
| `BUSY_RETRY` | Executions | มี sync อื่นถือ lock | รอแล้ว retry; ห้ามกดซ้ำรัว |
| `CONFLICT` | source row + audit | row เปลี่ยนระหว่าง sync | ตรวจ record แล้ว sync ใหม่ |
| ค้นหาได้แต่ Print ไม่ได้ | status panel | record cached/local service down/no template | fetch fresh/start local service/check capability |
| Word/PDF fail | local log | Word support/template issue | ใช้ install support/check approved template |

ห้ามแนะนำให้ลบ tab, reset counter, เปิด public access, ปิด security, หรือแก้ source codeเป็นวิธีแก้ทั่วไป

---

## 18. Owner acceptance sign-off

เจ้าของยืนยันเมื่อ:

- [ ] Backup ครบ
- [ ] Gate A–D decisions ถูกบันทึก
- [ ] Apps Script 6 ไฟล์วางได้จริงโดยไม่รวมไฟล์
- [ ] System health ทั้ง 3 ผ่าน
- [ ] Manual sync insert/retry/update ทั้ง 3 domain ผ่านใน test clone
- [ ] Number/routing/legacy boundaries ถูกต้อง
- [ ] Trigger ไม่มี duplicate และเปิดหลังอนุมัติ
- [ ] Web App Cabinet/List ใช้งานได้ที่ desktop/mobile
- [ ] PDF workflows ที่อนุมัติผ่านบนเครื่องจริง
- [ ] CV Contact, CV Rinse–Pour และ CV Rinse–Membrane เลือก Template ถูกต้อง
- [ ] CV Rinse ทั้งสองไม่ resolve ไปยังไฟล์/registry/hash ของ Water
- [ ] Rinse ที่ไม่มี/ไม่รู้จัก Method ถูกบล็อกพร้อมคำอธิบาย
- [ ] Games unchanged/regression PASS
- [ ] Rollback ถูกทดลองอย่างน้อยใน test environment
- [ ] Final Delivery Report แยกสิ่งที่ผ่านแล้วกับ Owner Action Required ชัดเจน
