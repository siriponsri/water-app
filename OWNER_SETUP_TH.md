# คู่มือเจ้าของระบบ — ANF3 Laboratory Records v7.1

คู่มือนี้บอกว่า **โค้ด Apps Script ไฟล์ไหน ต้องวางในสเปรดชีตไหน** และต้องตั้งค่าอะไรบ้าง
ทำตามลำดับในเอกสารนี้ทีละข้อ ไม่ต้องใช้ VS Code, Git, Terminal หรือ clasp

> **สำรอง Google Sheet ทุกไฟล์ก่อนเริ่ม** — File ▸ Make a copy
> ถ้าอะไรผิดพลาด คุณจะย้อนกลับได้ทันที

---

## ส่วนที่ 1 — แผนที่ไฟล์ (สำคัญที่สุด)

ระบบมี Google Sheet 6 ไฟล์ แบ่งเป็น 3 คู่ (Air / Water / CV) คู่ละ 2 ไฟล์
**User** คือไฟล์ที่เจ้าหน้าที่ลงผล **System DB** คือไฟล์ที่เก็บข้อมูลรวมและให้เว็บอ่าน

| # | Google Sheet | บทบาท | Spreadsheet ID | ไฟล์ที่ต้อง Copy จาก ZIP | ต้อง Deploy เป็น Web App? |
|---:|---|---|---|---|---|
| 1 | **RPP2-air-record** | Air System DB | `1qhzgsO75jzCwg9h6NnIps1RauMHbyA9MJiwy699vono` | `apps-script-deploy/02-air-system/Code.gs` | ✅ ใช่ |
| 2 | **air-test** | Air User | `1ZImZ3OyfaOQQYcwLlwHFlj9vU6Aqt4fLwv3VMV7sLSo` | `apps-script-deploy/01-air-user/Code.gs` | ❌ ไม่ |
| 3 | **RPP2-water-record** | Water System DB | `1aeMOagZPkoVA_LJxjVvmUL59cMtTTicUH5NzuYEhyY0` | `apps-script-deploy/04-water-system/Code.gs` | ✅ ใช่ |
| 4 | **water-r** | Water User | `1rw_3OWuRLV791Y70kWJ4cyXDuxuHooAsoxWLCiiRw2M` | `apps-script-deploy/03-water-user/Code.gs` | ❌ ไม่ |
| 5 | **RPP2-cv-record** | CV System DB | `1g6klceQWA4Duy5Eq2Az0LE47-2WUUXZE2fAPFBSKHrE` | `apps-script-deploy/06-cv-system/Code.gs` | ✅ ใช่ |
| 6 | **Testing** | CV User | `1ZHzetpPt1fpHx4ftxKiPFjsW0RIXYoraFVOxz2mRdGg` | `apps-script-deploy/05-cv-user/Code.gs` | ❌ ไม่ |

**Spreadsheet ID ทั้ง 6 ตัวถูกตั้งไว้ในโค้ดให้แล้ว ตรงกับลิงก์ที่คุณส่งมา** ไม่ต้องแก้
ถ้าวันหนึ่งย้ายไฟล์หรือสร้างสำเนาใหม่ ให้แก้ค่าที่บรรทัด `SPREADSHEET_ID` /
`SOURCE_SPREADSHEET_ID` / `TARGET_SPREADSHEET_ID` ที่หัวไฟล์ `Code.gs` เท่านั้น

### โฟลเดอร์อื่นในชุดส่งมอบ ห้าม Copy ทับ 6 ไฟล์นี้

- `apps-script/` — ไฟล์อ้างอิงสำหรับผู้ดูแลระบบ (แยกเป็นหลายไฟล์)
- `apps-script-deploy/06-cv-system-split-reference/` — เวอร์ชันแยกไฟล์ของ CV System ไว้อ่านเทียบ
- `google/app-scripts/*.txt` — สำเนาโค้ดเดิมที่รันอยู่ตอนนี้ ไว้เทียบก่อน/หลัง

**ใช้ `apps-script-deploy/` เท่านั้นในการติดตั้ง**

---

## ส่วนที่ 2 — สร้าง Token 3 ตัวก่อน

Token คือรหัสลับที่ทำให้ System DB รู้ว่าคำสั่งเขียนข้อมูลมาจาก User sheet ตัวจริง
ต้องมี **3 ตัวแยกกัน** (Air / Water / CV) ตัวละอย่างน้อย 24 ตัวอักษร

วิธีสุ่มแบบง่าย: เปิด Google Sheet ช่องว่าง ๆ แล้วพิมพ์

```
=CONCAT(DEC2HEX(RANDBETWEEN(0,4294967295),8), CONCAT(DEC2HEX(RANDBETWEEN(0,4294967295),8), DEC2HEX(RANDBETWEEN(0,4294967295),8)))
```

กด Enter 3 ครั้ง (แก้ค่าใหม่ทุกครั้ง) จะได้ 3 ตัว เก็บใส่ที่ปลอดภัย เช่น Password manager

> ⚠️ **ห้าม** เขียน Token ลงในเอกสารนี้ ลงในไฟล์ `.env` ลงในภาพหน้าจอ หรือส่งทางแชท
> Token อยู่ใน Script Properties ของ Apps Script เท่านั้น

---

## ส่วนที่ 3 — ติดตั้งทีละคู่ (ทำ Air ให้จบก่อน ค่อยขยับ)

### 3.1 System DB ก่อนเสมอ

ตัวอย่าง Air — ทำแบบเดียวกันกับ Water และ CV

1. เปิด **RPP2-air-record**
2. เมนู **Extensions ▸ Apps Script**
3. ในไฟล์ `Code.gs` กด **Ctrl+A** แล้ว **Delete**
4. เปิด `apps-script-deploy/02-air-system/Code.gs` จาก ZIP ด้วย Notepad กด **Ctrl+A ▸ Ctrl+C**
5. กลับมาที่ Apps Script กด **Ctrl+V** แล้ว **Ctrl+S**
6. (ถ้ามีไฟล์ `appsscript.json` ในโฟลเดอร์เดียวกัน) **Project Settings ▸ ติ๊ก Show "appsscript.json"** แล้ววางทับเช่นกัน
7. กด **Deploy ▸ New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: ตามนโยบาย Google Workspace ขององค์กร (แนะนำ **Anyone within [องค์กร]**)
9. **Copy Web app URL** เก็บไว้ — จะได้ URL แบบ `https://script.google.com/macros/s/AKfycb.../exec`

> ถ้าเป็นการอัปเดตครั้งถัดไป ให้ใช้ **Deploy ▸ Manage deployments ▸ ✏️ ▸ Version: New version**
> จะได้ URL เดิม ไม่ต้องไปแก้ที่อื่น

### 3.2 User sheet

1. เปิด **air-test**
2. **Extensions ▸ Apps Script** ▸ วาง `apps-script-deploy/01-air-user/Code.gs` แบบเดียวกับข้อ 3–5
3. Run ฟังก์ชันตั้งค่า System URL แล้วใส่ Web app URL ที่ Copy มาจากข้อ 3.1
4. Refresh หน้า Google Sheet จะเห็นเมนู ANF3 เพิ่มขึ้นมาบนแถบเมนู

### 3.3 ทำซ้ำอีกสองคู่

| ลำดับ | System DB (ทำก่อน) | User (ทำหลัง) |
|---|---|---|
| คู่ที่ 2 | RPP2-water-record ← `04-water-system` | water-r ← `03-water-user` |
| คู่ที่ 3 | RPP2-cv-record ← `06-cv-system` | Testing ← `05-cv-user` |

> **CV ยังไม่เคยมี Apps Script มาก่อน** สองไฟล์นี้จึงเป็นการติดตั้งครั้งแรก
> ให้ตรวจว่าใน **Testing** มีชีตชื่อ **`CV`** อยู่จริง เพราะโค้ดอ่านจากชีตชื่อนี้

> ⚠️ **ห้ามเอา URL ข้ามโดเมน** CV URL ต้องไม่ไปอยู่ใน Water/Air และกลับกัน
> System DB ของ CV จะปฏิเสธคำขอที่ไม่ใช่ `domain=cv` อยู่แล้ว แต่ให้ตรวจซ้ำด้วยตา

---

## ส่วนที่ 4 — ต่อเว็บแอปเข้ากับ System DB

เปิดไฟล์ `.env.production` ในโฟลเดอร์โปรเจกต์ด้วย Notepad แล้วใส่ URL 3 ตัวจากข้อ 3

```
VITE_AIR_READ_URL=https://script.google.com/macros/s/…/exec
VITE_WATER_READ_URL=https://script.google.com/macros/s/…/exec
VITE_CV_READ_URL=https://script.google.com/macros/s/…/exec
```

- ใส่ URL ที่ลงท้ายด้วย `/exec` เท่านั้น (ไม่ใช่ `/dev`)
- **ห้ามใส่ Token ลงในไฟล์นี้** เว็บอ่านอย่างเดียว ไม่ต้องใช้ Token
- บันทึกไฟล์ แล้ว build ใหม่ (ดูส่วนที่ 6)

---

## ส่วนที่ 5 — ทดสอบว่าใช้ได้จริง

ทำตามลำดับ ถ้าข้อไหนไม่ผ่าน อย่าข้ามไปข้อถัดไป

| # | ทดสอบ | วิธี | ผลที่ถูกต้อง |
|---:|---|---|---|
| 1 | System DB ตอบ | เปิด Web app URL ในเบราว์เซอร์ ต่อท้ายด้วย `?action=ping` | ได้ JSON `{"success":true,...}` |
| 2 | Token ตั้งแล้ว | ใน Apps Script ของ System DB Run `runAnf3SelfCheck` | ทุก check เป็น `ok: true` |
| 3 | User → System | ใน User sheet ใช้เมนู ANF3 สั่ง sync 1 แถว | แถวไปโผล่ใน System DB |
| 4 | กันคนนอกเขียน | เรียก action ที่เป็นการเขียนโดยไม่ใส่ Token | ต้องได้ `Unauthorized mutation` |
| 5 | เว็บอ่านได้ | เปิดเว็บ ▸ Water ▸ PRW & PW | เห็นรายการ worksheet |
| 6 | PDF ออก | เลือก record ▸ **Preview PDF** | เห็น PDF ในหน้าจอ |
| 7 | CV Contact Plate | Shelf ▸ Building 16 ▸ Cleaning Validation ▸ **Contact Plate** | ใช้เทมเพลต CV Contact Plate |
| 8 | CV Rinse | …▸ **Rinse** ▸ **Pour Plate** | ใช้เทมเพลตตระกูล PW/PRW |
| 9 | CV Rinse (2) | …▸ **Rinse** ▸ **Membrane Filtration** | ใช้เทมเพลตตระกูล WFI/PUS |
| 10 | COA App | Tools ▸ **COA App** ตอนอยู่นอกวง network | ขึ้นกล่องข้อความให้ต่อ Wi-Fi `ANF3` |

---

## ส่วนที่ 6 — ติดตั้งและเปิดเว็บบนเครื่อง Windows

ครั้งแรก:

1. แตก ZIP ลงโฟลเดอร์ที่เขียนไฟล์ได้ (เช่น `D:\ANF3` — **อย่าวางใน Program Files**)
2. ดับเบิลคลิก `INSTALL.bat`
3. ดับเบิลคลิก `INSTALL-MSOFFICE-SUPPORT.bat` (สำหรับแปลง Word ▸ PDF)

ใช้งานประจำวัน:

1. ดับเบิลคลิก **`START-ANF3.bat`**
2. รอจนหน้าต่างดำขึ้นข้อความว่าเซิร์ฟเวอร์พร้อม **แล้วปล่อยหน้าต่างนั้นเปิดไว้**
3. เบราว์เซอร์จะเปิด `http://localhost:8000` ให้เอง

> สคริปต์ **ไม่** ปิด Word/Excel ให้ — บันทึกงานที่เปิดค้างไว้ก่อนสั่งสร้าง PDF

ถ้าแก้ `.env.production` หรืออัปเดตโค้ดหน้าเว็บ ให้ build ใหม่ด้วย `BUILD-DIST.bat`
แล้วแจกไฟล์ด้วย `CREATE-DIST-ZIP.ps1`

---

## ส่วนที่ 7 — แฟ้มบนชั้นและเส้นทางของ PDF

หน้าแรกของเว็บคือชั้นวางแฟ้มจริง **สีของแฟ้ม = อาคาร** ไม่ใช้สีเพื่อความสวยงาม

| สีแฟ้ม | คือ | มีอะไรอยู่ข้างใน |
|---|---|---|
| 🔵 ฟ้า | **Building 10** | PRW & PW · Air Sampling · CA · Cleaning Validation (4 แฟ้ม) |
| 🟣 ม่วง | **Building 12** | PRW & PW · Air Sampling · CA · Cleaning Validation (4 แฟ้ม) |
| 🟢 เขียว | **Building 16** | PRW & PW · WFI · Air Sampling · CA & Nitrogen · Cleaning Validation (5 แฟ้ม) |
| 🟠 ส้ม | **Other Locations** | แฟ้มเดียว เปิดแล้วเลือก Building 11 · Air Sampling / Building 11 · CA / Building 19 · PRW |
| 🩷 ชมพู | **สำรอง** | แฟ้มเดียว พิมพ์ว่า **Coming Soon** วางไว้เฉย ๆ กดไม่ได้ ไม่มี API ไม่มีเลข |

### Cleaning Validation — 1 แฟ้มต่ออาคาร เลือกวิธีข้างใน

```
เปิดแฟ้ม Cleaning Validation ของอาคาร
        │
        ├── Contact Plate ──────────────────► เทมเพลต  cv-contact-template.docx
        │
        └── Rinse
              ├── Pour Plate ───────────────► เทมเพลต  pw-prw-template.docx
              └── Membrane Filtration ──────► เทมเพลต  wfi-pus-template.docx
```

- ผู้ใช้ต้องเลือกวิธีก่อน จึงจะเข้าถึงรายการ record ได้ — เลือกผิดจะไม่พิมพ์ผิดเทมเพลต
- ยังเปลี่ยนวิธีรายตัวได้ที่หน้า record (ปุ่มวงกลม Rinse test method)
- **record ของ Rinse เป็นเอกสาร CV** ไม่เข้าไปในลำดับเลข worksheet ของ Water

---

## ส่วนที่ 8 — แท็บเชื่อมต่อระบบอื่น

| แท็บ | ไปที่ | หมายเหตุ |
|---|---|---|
| **Stock DB** | Lab_Stock Google Sheet | เปิดแท็บใหม่ |
| **Stock Web** | Lab Stock web app | เปิดแท็บใหม่ |
| **จองเลขเอกสาร** | Log Documents Google Sheet | เปิดแท็บใหม่ |
| **Upload Picture** | โฟลเดอร์ Google Drive ของห้องแล็บ | เปิดแท็บใหม่ |
| **COA App** | `http://192.168.1.10:8000` | ตรวจ network ก่อนเปิด |

**COA App** อยู่บนเครื่องของหัวหน้าในวง network ของห้องแล็บ เว็บจะลองต่อก่อน (รอไม่เกิน 2.5 วินาที)
ถ้าต่อไม่ได้ จะขึ้นกล่องข้อความบอกให้ต่อ Wi-Fi ชื่อ **`ANF3`** แล้วลองใหม่

> เบราว์เซอร์เปลี่ยน Wi-Fi ให้ไม่ได้ — ต้องเปลี่ยนเองที่เมนู network ของ Windows
> ระบบจึงได้แค่บอกให้ทราบ ไม่ได้แกล้งทำเป็นเชื่อมต่อให้

---

## ส่วนที่ 9 — สำรอง อัปเดต และย้อนกลับ

**ก่อนแก้ Apps Script ทุกครั้ง**

1. เปิด Google Sheet ▸ **File ▸ Make a copy** ตั้งชื่อ `<ชื่อเดิม> BACKUP YYYY-MM-DD`
2. ใน Apps Script ▸ **Ctrl+A ▸ Ctrl+C** เนื้อหาเดิม แปะเก็บใน Notepad ไว้ก่อนวางของใหม่

**ย้อนกลับ Apps Script** — Apps Script มี **File ▸ See version history** ย้อนได้ทันที
ถ้าไม่มี ให้วางโค้ดเดิมที่เก็บไว้กลับเข้าไป แล้ว Deploy **New version** ทับ

**ย้อนกลับข้อมูล** — เปิดสำเนา BACKUP แล้วคัดลอกแถวกลับเข้าไฟล์จริง
อย่าลบชีตทิ้ง ให้เพิ่มแถวและทำเครื่องหมายแทน

**อัปเดตเว็บ** — เก็บโฟลเดอร์เดิมไว้ทั้งก้อน แตก ZIP ใหม่ลงโฟลเดอร์ใหม่
คัดลอก `.env.production` เดิมมาวางทับ แล้ว `BUILD-DIST.bat`
ถ้าเวอร์ชันใหม่มีปัญหา กลับไปดับเบิลคลิก `START-ANF3.bat` ในโฟลเดอร์เดิมได้เลย

---

## ส่วนที่ 10 — สิ่งที่ระบบนี้ตั้งใจ **ไม่** ทำ

อ่านข้อนี้ก่อนสั่งให้ใครแก้ระบบ

1. **เว็บไม่เขียนข้อมูลใด ๆ** การสร้าง แก้ไข ออกเลข และ sync อยู่ที่ Google Sheets เท่านั้น
2. **ไม่มี Token ในเว็บ** เว็บอ่านอย่างเดียว จึงไม่ต้องมี และต้องไม่มี
3. **เว็บไม่เลือกเทมเพลตเอง** เบราว์เซอร์ส่งแค่ชื่อเส้นทาง เซิร์ฟเวอร์บนเครื่องเป็นคนเลือกไฟล์ `.docx` และตรวจสอบวิธีทดสอบของ CV อีกชั้น
4. **เกมฝึกอบรมไม่ใช่เครื่องมืออนุมัติ** ทุกเคสเป็นสถานการณ์สมมติ ไม่เขียนข้อมูลจริง และยังไม่ผ่านการทบทวนโดย QA
5. **ระบบไม่แต่งข้อความบนฉลากเอกสารควบคุมเอง** สันแฟ้ม Cleaning Validation จึงยังไม่มีบรรทัดภาษาไทย เพราะยังไม่มีรูปฉลากจริง

---

## ส่วนที่ 11 — ตารางบันทึกของเจ้าของระบบ

พิมพ์หน้านี้เก็บไว้ **อย่าเขียน Token ลงไป**

| รายการ | ค่า | วันที่ตั้ง | ผู้ทำ |
|---|---|---|---|
| Air System Web App URL | | | |
| Water System Web App URL | | | |
| CV System Web App URL | | | |
| Air Token ตั้งแล้ว (✓/✗) | | | |
| Water Token ตั้งแล้ว (✓/✗) | | | |
| CV Token ตั้งแล้ว (✓/✗) | | | |
| สำรอง Sheet ครั้งล่าสุด | | | |
| เวอร์ชันเว็บที่ติดตั้ง | v7.1.0 | | |

---

## ถามใครเมื่อไม่แน่ใจ

ถ้าไม่แน่ใจเรื่อง URL, Token, การจับคู่สเปรดชีต, เกณฑ์ SOP, หรือพฤติกรรมของเทมเพลตที่หายไป
**ให้ถามก่อน อย่าเดา** ระบบนี้เป็นเอกสารที่ควบคุม การเดาหนึ่งครั้งอาจต้องตามแก้ทั้งชุด

- รายละเอียดขั้นตอน Apps Script แบบละเอียด: `apps-script-deploy/MANUAL_COPY_GUIDE_TH.md`
- ผู้ที่จะมาพัฒนาต่อ: `HANDOFF.md` และ `CLAUDE.md`
- เหตุผลของงานออกแบบ: `DESIGN.md`
