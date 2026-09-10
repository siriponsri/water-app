# คู่มือติดตั้งสำหรับผู้ดูแลระบบ — ANF3 Laboratory Records

**เอกสารนี้ตอบคำถามเดียว: ต้อง copy อะไร ไปวางที่ไหน**

ทำตามลำดับ ห้ามสลับ — สคริปต์ System DB ต้องพร้อมก่อน สคริปต์ User ถึงจะมีที่ให้ส่งข้อมูลไป

---

## ตาราง copy ทั้งหมด — 6 ไฟล์ 6 สเปรดชีต

| # | copy ไฟล์นี้ | ไปวางที่สเปรดชีตนี้ | Spreadsheet ID | แท็บที่ต้องมีในชีต |
|---|---|---|---|---|
| 1 | `apps-script-deploy/02-air-system/Code.gs` | **RPP2-air-record** | `1qhzgsO75jzCwg9h6NnIps1RauMHbyA9MJiwy699vono` | `records_air`, `records_air_samples`, `logs` |
| 2 | `apps-script-deploy/01-air-user/Code.gs` | **air-test** | `1ZImZ3OyfaOQQYcwLlwHFlj9vU6Aqt4fLwv3VMV7sLSo` | แท็บข้อมูล Air |
| 3 | `apps-script-deploy/04-water-system/Code.gs` | **RPP2-water-record** | `1aeMOagZPkoVA_LJxjVvmUL59cMtTTicUH5NzuYEhyY0` | `records_water`, `records_water_samples`, `logs` |
| 4 | `apps-script-deploy/03-water-user/Code.gs` | **water-r** | `1rw_3OWuRLV791Y70kWJ4cyXDuxuHooAsoxWLCiiRw2M` | แท็บข้อมูล Water |
| 5 | `apps-script-deploy/06-cv-system/Code.gs` | **RPP2-cv-record** | `1g6klceQWA4Duy5Eq2Az0LE47-2WUUXZE2fAPFBSKHrE` | `records_cv`, `records_cv_samples`, `logs` |
| 6 | `apps-script-deploy/05-cv-user/Code.gs` | **Test** (ไฟล์ที่คุณส่งมาชื่อ Testing 1) | `1ZHzetpPt1fpHx4ftxKiPFjsW0RIXYoraFVOxz2mRdGg` | `CV` |

**สคริปต์อ้าง Spreadsheet ID ไม่ใช่ชื่อไฟล์** — เปลี่ยนชื่อสเปรดชีตได้อิสระ
(Testing → Test ไม่กระทบอะไร) แต่ **ห้ามเปลี่ยนชื่อแท็บ** เพราะสคริปต์อ้างตามชื่อแท็บ

**วิธีดู Spreadsheet ID:** ดูจาก URL ตรงกลาง
`https://docs.google.com/spreadsheets/d/`**`ตรงนี้คือ ID`**`/edit`
ถ้าไม่ตรงกับตาราง ให้แก้ค่า `SOURCE_SPREADSHEET_ID` / `TARGET_SPREADSHEET_ID` ที่หัวไฟล์ `.gs`

ไฟล์ `.txt` ในโฟลเดอร์ `google/app-scripts/` เป็นสำเนาสำรองไว้เทียบเท่านั้น
**ให้ copy จาก `apps-script-deploy/` เสมอ**

---

## ก่อนเริ่ม — เช็ค 5 ข้อนี้

| # | เช็ค | ทำไม |
|---|---|---|
| 1 | มี URL `/exec` ของ **RPP2-cv-record** แล้วหรือยัง | ถ้ายัง แท็บ CV จะว่าง `.env.production` ที่ส่งมายังไม่มีค่านี้ |
| 2 | เครื่อง Windows มี **MS Word** ติดตั้ง | ถ้าไม่มี สร้าง PDF ไม่ได้เลย |
| 3 | เครื่องนั้นออกอินเทอร์เน็ตได้ | `INSTALL.bat` ต้องโหลด uv และ Flask · เว็บต้องอ่าน Google Sheets |
| 4 | มีเวลาว่างพอทำทั้ง 6 คู่ (ราว 1 ชม.) | หยุดกลางคันได้ แต่ **อย่าหยุดระหว่างคู่เดียวกัน** — วาง System DB แล้วต้องวาง User sheet ให้จบ |
| 5 | โฟลเดอร์แอป **ไม่อยู่ใน OneDrive** | OneDrive sync ทำให้ `.venv` พังแบบที่เจอมาแล้ว |

**คำแนะนำ: ทำ Air ให้จบก่อนคู่เดียว** แล้วทดสอบว่าแท็บ Air มีข้อมูลขึ้นจริง
ถ้าคู่แรกผ่าน อีกสองคู่คือทำซ้ำแบบเดียวกัน ถ้าคู่แรกติด คุณเสียเวลาแค่หนึ่งในสาม

---

## ขั้นตอนที่ 0 — สำรองก่อน ทุกครั้ง

เปิดสเปรดชีตแต่ละตัว → File → Make a copy → ตั้งชื่อลงท้ายด้วยวันที่
เช่น `RPP2-cv-record-20260903`

---

## ขั้นตอนที่ 1 — กำหนดขอบเขต Web App

ระบบไม่ใช้ sync token ให้ยืนยันกับผู้ดูแล Google Workspace ว่า System Web App
แต่ละตัวใช้ `Who has access` ที่แคบที่สุดและ User Sheet คู่กันยังเรียกได้

---

## ขั้นตอนที่ 2 — ติดตั้ง System DB (ทำก่อนเสมอ)

ทำซ้ำ 3 รอบ สำหรับ RPP2-air-record, RPP2-water-record, RPP2-cv-record

1. เปิดสเปรดชีต → **Extensions → Apps Script**
2. ลบโค้ดเดิมใน `Code.gs` ทิ้งทั้งหมด → วางเนื้อไฟล์จากตารางข้างบน → **Save**
3. ถ้าในชุดมี `appsscript.json` ให้เปิด **Project Settings → ติ๊ก "Show appsscript.json"**
   แล้ววางทับด้วย
4. **Deploy → New deployment → เลือก Web app**

   | ช่อง | ต้องตั้งเป็น |
   |---|---|
   | Execute as | **Me** (บัญชีเจ้าของ) |
   | Who has access | ขอบเขตที่แคบที่สุดซึ่ง User Sheet คู่กันเรียกได้ |

5. **copy URL ที่ลงท้ายด้วย `/exec` เก็บไว้** — จะใช้ในขั้นตอนที่ 4

   > 🔴 **กับดักที่คนพลาดมากที่สุดใน Apps Script**
   > ถ้าสเปรดชีตนี้**เคย deploy ไว้แล้ว** การกด Save ในหน้า Apps Script
   > **ไม่ทำให้ URL `/exec` เปลี่ยนตาม** เพราะ deployment ถูกตรึงไว้กับ *เวอร์ชัน* หนึ่ง
   >
   > ต้องทำแบบนี้แทน:
   > **Deploy → Manage deployments → กดรูปดินสอ (Edit) → Version: `New version` → Deploy**
   >
   > ถ้าไม่ทำ URL เดิมจะยังเสิร์ฟโค้ดเก่า แล้วเว็บแอปจะได้คำตอบว่า
   > **`Unknown action`** ซึ่งแปลว่า "สคริปต์ที่รันอยู่ยังไม่รู้จักคำสั่ง search"
   > ไม่ใช่ว่าเว็บแอปส่งผิด
7. กลับมาที่สเปรดชีต รีเฟรช → เมนู ANF3 จะโผล่ → กด **Check readiness** ต้องผ่าน

---

## ขั้นตอนที่ 3 — ติดตั้ง User sheet

ทำซ้ำ 3 รอบ สำหรับ air-test, water-r, Test

1. เปิดสเปรดชีต → **Extensions → Apps Script** → วางโค้ดทับ → **Save**
2. กลับมาที่สเปรดชีต **รีเฟรชหน้า** → เมนูใหม่จะโผล่ (ของ CV ชื่อ **ANF3 CV Sync**)
3. กดในเมนูตามลำดับ

   | ลำดับ | เมนู | ทำอะไร |
   |---|---|---|
   | 1 | Check readiness | ตรวจว่าหัวตารางครบ |
   | 2 | Prepare control columns | เพิ่มคอลัมน์ควบคุม (`cvSyncNow`, `cvSyncStatus`, …) |
   | 3 | Set CV System URL | วาง URL `/exec` จากขั้นตอนที่ 2 |
   | 4 | Set CV Sync Token | วาง token **ตัวเดียวกัน**กับที่ใส่ใน System DB |

4. กด **Dry run (no mutation)** ก่อน — ต้องผ่านโดยไม่เขียนอะไร
5. ค่อยกด **Sync marked rows**

---

## ขั้นตอนที่ 4 — ต่อเว็บแอปเข้ากับ System DB

เปิดไฟล์ `.env.production` ที่โฟลเดอร์หลักของแอป ใส่ URL `/exec` ทั้งสามตัว

```
VITE_WATER_READ_URL=https://script.google.com/macros/s/xxxxx/exec
VITE_AIR_READ_URL=https://script.google.com/macros/s/xxxxx/exec
VITE_CV_READ_URL=https://script.google.com/macros/s/xxxxx/exec
```

### ทางที่ง่ายกว่า — แก้ `config.json` ไม่ต้อง build (v7.1k ขึ้นไป)

ไฟล์ **`config.json`** อยู่ข้างๆ `START-ANF3.bat` เปิดด้วย Notepad วาง URL แล้ว Save
**รีเฟรชเบราว์เซอร์ ใช้ได้ทันที ไม่ต้องมี Node ไม่ต้องมี pnpm ไม่ต้อง build**

```json
{
  "waterReadUrl": "https://script.google.com/macros/s/xxxxx/exec",
  "airReadUrl":   "https://script.google.com/macros/s/xxxxx/exec",
  "cvReadUrl":    "https://script.google.com/macros/s/xxxxx/exec"
}
```

ช่องไหนเว้นว่าง = ใช้ค่าที่ build มาให้แล้ว ฉะนั้นกรอกแค่บรรทัดที่อยากเปลี่ยนก็พอ
ไฟล์นี้อยู่นอกโฟลเดอร์ `dist\` **การ build ใหม่จะไม่ลบทับ**

> ⚠️ ใส่เฉพาะ URL อ่านอย่างเดียว **ห้ามใส่ `ANF3_SYNC_TOKEN` ในไฟล์นี้**
> เพราะเบราว์เซอร์อ่านไฟล์นี้ได้

### ทางเดิม — แก้ `.env.production` แล้ว build

ใช้เมื่อจะแก้โค้ด **ต้องมี Node.js และ pnpm ติดตั้งบนเครื่องนั้น**
(`INSTALL.bat` ติดตั้งแค่ Python ไม่ได้ติดตั้ง Node)

```
BUILD-DIST.bat
```

**ตรวจว่าสำเร็จ:**

```
node validation/validate_wiring.mjs --built
```

ต้องได้ `Wiring OK — 3/3 domains configured`

---

## ขั้นตอนที่ 5 — ติดตั้งบนเครื่อง Windows

| ลำดับ | ไฟล์ | ทำกี่ครั้ง |
|---|---|---|
| 1 | `INSTALL.bat` | ครั้งเดียว |
| 2 | `INSTALL-MSOFFICE-SUPPORT.bat` | ครั้งเดียว (ต้องมี MS Word) |
| 3 | `START-ANF3.bat` | ทุกครั้งที่ใช้ |

---

## ขั้นตอนที่ 6 — ทดสอบว่าใช้ได้จริง

| # | ทำอะไร | ต้องได้ |
|---|---|---|
| 1 | เปิด `http://localhost:8000/api/status` | JSON ไม่ใช่หน้า error |
| 2 | เปิด URL `/exec` ในเบราว์เซอร์ตรงๆ | JSON ไม่ใช่หน้า login |
| 3 | เปิดแท็บ Water | มีรายการขึ้น |
| 4 | เปิดแท็บ Air | มีรายการขึ้น |
| 5 | เปิดแฟ้ม CV ของ Building 16 | มีรายการขึ้น |
| 6 | เลือกใบงาน → Preview PDF | ได้ PDF |
| 7 | กด Print | สั่งพิมพ์ได้ |
| 8 | ปิดเน็ตแล้วเปิดใบงานเดิม | ยังอ่านได้จากแคช |

---

## แก้ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| Console ขึ้น `Access-Control-Allow-Origin ... must not be the wildcard '*'` | ใช้ build เก่าก่อน v7.1g | build ใหม่ด้วย `BUILD-DIST.bat` |
| `net::ERR_FAILED 302` ตามหลัง CORS | อาการเดียวกัน (302 คือ Apps Script redirect ปกติ) | เหมือนข้างบน |
| ทุกแท็บขึ้น `System DB URL is not configured` | ยังไม่ทำขั้นตอนที่ 4 หรือลืม build | ทำขั้นตอนที่ 4 ให้ครบ |
| แท็บ CV ว่าง แต่ Water/Air มีข้อมูล | `VITE_CV_READ_URL` ยังว่าง **หรือ** ยังไม่เคยกด Sync | ใส่ URL + build ใหม่ + กด Sync marked rows |
| เปิดแฟ้ม CV ของอาคารแล้วไม่มีอะไร ทั้งที่ซิงก์แล้ว | ซิงก์ด้วยสคริปต์เวอร์ชันก่อน v7.1g ที่เขียน building เป็น `10` แทน `Building 10` | วางสคริปต์ CV ใหม่ทับ แล้ว **Retry PENDING / ERROR rows** หรือซิงก์ใหม่ทั้งหมด |
| เปิด URL `/exec` แล้วเจอหน้า login | Deploy ตั้งเป็น "Anyone with Google account" | Deploy ใหม่เป็น **Anyone** |
| แท็บขึ้นว่า `Unknown action` | **URL `/exec` ยังเสิร์ฟโค้ดเวอร์ชันเก่า** — กด Save ในหน้า Apps Script ไม่พอ | Deploy → Manage deployments → Edit (ดินสอ) → Version: **New version** → Deploy |
| Console ขึ้น `Cannot read properties of undefined (reading 'startTime')` ที่ `VM13` / `<anonymous>` | **ไม่ใช่โค้ดของแอป** — เป็นสคริปต์ที่ส่วนขยายเบราว์เซอร์ (เช่น Edge Copilot) ฉีดเข้ามา | ไม่ต้องแก้ ถ้ารำคาญให้ปิดส่วนขยายหรือลองใน InPrivate |
| `BUILD-DIST.bat` เด้งหน้าจอดำแล้วปิดทันที | **ไม่มี Node.js/pnpm บนเครื่อง** และสคริปต์เดิมไม่มี `pause` เลยปิดก่อนอ่านทัน | เวอร์ชันนี้ค้างหน้าจอไว้และบอกวิธีแล้ว — แต่ปกติ**ไม่ต้อง build**: แก้ `config.json` แทน |
| แก้ `.env.production` แล้วไม่มีอะไรเปลี่ยน | ยังไม่ได้ build (หรือ build ไม่ผ่าน) | ใช้ `config.json` แทน ได้ผลทันทีโดยไม่ต้อง build |
| `No pyvenv.cfg file` | `.venv` ถูก copy/ย้ายมา | รัน `START-SERVER.bat` ใหม่ (ซ่อมเอง) หรือลบ `.venv` แล้ว `INSTALL.bat` |

---

## สิ่งที่แก้ในเวอร์ชันนี้ (v7.1g–i) — และผลกับคนติดตั้ง

| แก้อะไร | ถ้าคุณติดตั้งไปแล้วต้องทำอะไร |
|---|---|
| `api.ts` เลิกส่ง `credentials: 'include'` ที่ทำให้ CORS บล็อกทุก request | **build ใหม่** |
| `05-cv-user/Code.gs` เพิ่ม `normalizeCvBuilding_` เขียน `Building 10` แทน `10` | **วางสคริปต์ CV ใหม่ทับ แล้วซิงก์ใหม่** |
| จอ 3D กู้คืนได้เองเมื่อ GPU ตัด context | build ใหม่ |
| `vite.config.ts` เพิ่ม `envDir` | build ใหม่ |
| แจ้งเตือน + รายการพิมพ์ซ้ำ สำหรับ Rinse-PW + Membrane | build ใหม่ |
| ติ๊กเลือกหลายใบพิมพ์รวดเดียว | build ใหม่ |
| เลือกสีแฟ้มเอง (ปุ่ม Colours) | build ใหม่ |

---

## เรื่องที่เกี่ยวกับเอกสารที่ควบคุม

### 1. `Rinse-PW` + `Memb. Filtration` — ตัดสินแล้ว: ใช้ฟอร์ม WFI ไปก่อน

**สถานะ: เจ้าของระบบยอมรับแล้ว ระหว่างรอฟอร์มใหม่จาก QA**

ฟอร์มที่ควบคุมทั้งสองใบ **เนื้อฟอร์มเป็นรูปภาพ** (pw-prw 4 รูป 10 MB, wfi-pus 2 รูป)
โปรแกรมแทนได้แค่ token ไม่กี่ตัว เกณฑ์ยอมรับที่พิมพ์ออกมาอยู่ในรูป แก้ไม่ได้

โครงตารางของสองฟอร์มต่างกันตาม **วิธี** ไม่ใช่ตามชนิดน้ำ:

| ฟอร์ม | ช่องที่โปรแกรมเติม | เหมาะกับ |
|---|---|---|
| `pw-prw-template.docx` | `<tagNo>` `<samplingPoint>` `<result1>` `<result2>` `<resultAvg>` | Pour plate (2 จาน + เฉลี่ย) |
| `wfi-pus-template.docx` | `<tagNo>` `<samplingPoint>` `<result>` | Membrane Filtration (ค่าเดียว) |

Rinse-PW + Membrane จึงต้องใช้**โครงของ wfi-pus** แต่**หัวฟอร์มของ PW** — ซึ่งยังไม่มี

**ตอนนี้ระบบทำอะไร:** พิมพ์บนฟอร์ม WFI/PUS ต่อไป **แต่ไม่เงียบ**

1. ก่อนกดพิมพ์ จะมีกล่องข้อความสีเหลืองบอกชัดว่า
   ฟอร์มที่จะพิมพ์มีเกณฑ์ **10 cfu/100 mL (WFI/PUS)** แต่บันทึกนี้เกณฑ์จริงคือ
   **100 cfu/mL (PW/PRW)** ให้อ่านผลเทียบกับบันทึก ไม่ใช่เทียบกับฟอร์ม
2. ทุกใบที่พิมพ์แบบนี้ถูกจดไว้ ดูได้ที่แท็บ **Tools → Reprint when the Rinse-PW
   membrane form is approved** และ **Export CSV** ได้ เพื่อรู้ว่าต้องพิมพ์ซ้ำใบไหนบ้าง
   (รายการนี้เก็บในเบราว์เซอร์เครื่องที่พิมพ์ ไม่ใช่บันทึก)

**เมื่อได้ฟอร์มใหม่จาก QA ให้ทำแบบนี้:**

1. เปิด `wfi-pus-template.docx` → Save As → `cv-rinse-pw-membrane-template.docx`
2. เปลี่ยน**รูปหัวฟอร์ม**เป็นของ PW (เกณฑ์ 100 cfu/mL, factor 0.01)
3. **ห้ามแตะ token** `<tagNo01>` … `<result01>` ต้องเหมือนเดิมทั้งชื่อและจำนวน
4. ให้ QA อนุมัติ วางไฟล์ใน `templates/`
5. ส่งให้ผู้ดูแลโค้ดเพิ่ม route `cleaning-validation-rinse-pw-membrane`
   — จุดที่ต้องแก้มีสองที่เท่านั้น: `PDF_WORKFLOW_REGISTRY` ใน `server/pdf_server.py`
   และ `cvTemplateSubstitution` ใน `apps/web/src/recordPolicy.ts` ซึ่งเขียนรอไว้แล้ว
6. เอา CSV จากข้อ 2 ไปพิมพ์ซ้ำ

### 2. `CEHT` — 85 แถว

เว็บแอปรู้จักแค่ชนิด `CV` ต้องการให้ CEHT อยู่แฟ้มเดียวกัน แยกแฟ้ม หรือซ่อน?

### 3. ข้อมูลที่ควรแก้ในชีตก่อนซิงก์

- แถว 454 ช่อง Sampling date เป็น `#VALUE!`
- 35 แถวช่อง `CV/CEHT` ว่าง
- `records_cv_samples` มี 4,999 แถวว่างที่มีแต่ `excluded = False` — ลบทั้งแถว
  แล้วเอา checkbox/validation ออกจากคอลัมน์นั้น

---

## ถามใครเมื่อไม่แน่ใจ

| เรื่อง | คนที่ตัดสิน |
|---|---|
| เนื้อหาเทมเพลต Word ข้อความบนฉลากที่ควบคุม | เจ้าของเอกสาร / QA |
| การเลือกเทมเพลตของ Rinse | QA |
| สิทธิ์เข้าถึงสเปรดชีต การ deploy | เจ้าของระบบ |
| เลขใบงาน | ผู้ดูแลเลขเอกสาร |

**อย่าเดาข้อความบนฉลากที่ควบคุม** ถ้าไม่มีต้นฉบับให้ถาม
