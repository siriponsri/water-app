# TASKS — 12 ข้อจากการใช้งานจริง

เอกสารนี้คือรายการงานที่ต้องทำทั้งหมด เขียนให้ผู้รับงานคนถัดไปทำต่อได้โดยไม่ต้องสำรวจโค้ดซ้ำ
ทุกข้อเท็จจริงในเอกสารนี้ **ยืนยันด้วยการรันโค้ดจริงแล้ว** ไม่ใช่การอ่านแล้วเดา
บรรทัดที่อ้าง `file:line` ตรวจแล้วกับไฟล์จริงในวันที่ 9 ก.ย. 2026

---

## 0. อ่านก่อนแตะอะไร

### 0.1 โฟลเดอร์นี้ไม่ใช่ git repo

ไม่มี `.git` ลบหรือเขียนทับแล้ว **กู้ไม่ได้**

มี backup อยู่แล้วที่:

```
C:\Users\siripon.sri\Desktop\my_project\water-anf3-backup-20260909.tar.gz   (24 MB, 643 entries)
```

สร้างจาก `tar -czf` โดยตัด `node_modules`, `apps/web/node_modules`, `dist`, `.venv`,
`__pycache__`, `.pytest_cache`, `.uv-cache`, `python` ออก ตรวจแล้วว่ามีทั้ง 5 template
และไฟล์ `.gs` ครบ

**ก่อนเริ่มงานรอบใหม่ ให้สร้าง backup ใหม่ทับชื่อวันที่ปัจจุบัน** และอย่าลบตัวเก่า
จนกว่าจะยืนยันว่างานรอบนี้ผ่าน gate ทั้งหมด

### 0.2 งานที่ทำเสร็จแล้ว (Phase 1 ฝั่ง frontend)

**สำคัญ: ไฟล์เหล่านี้ถูกแก้ไปแล้ว ไม่ใช่งานค้าง** เทียบกับ backup แล้ว มี 9 ไฟล์:

| ไฟล์ | สถานะ | แก้อะไร |
|---|---|---|
| `apps/web/src/documentPayload.ts` | แก้แล้ว | ข้อ 1, 6, 7, 11 + `floor` |
| `apps/web/src/documentPayload.test.ts` | แก้แล้ว | เทสต์ครอบของใหม่ทั้งหมด |
| `apps/web/src/documentPlaceholders.test.ts` | ไฟล์ใหม่ | gate กัน placeholder หลุด |
| `apps/web/src/node-builtins.d.ts` | ไฟล์ใหม่ | ประกาศ Node builtin แคบๆ ให้ gate ใช้ |
| `apps/web/src/recordScope.ts` | แก้แล้ว | building segment + multi-value |
| `apps/web/src/recordScope.test.ts` | แก้แล้ว | เทสต์ building drift |
| `apps/web/src/storage.ts` | แก้แล้ว | cache key + field ที่ขาด |
| `apps/web/src/storage.test.ts` | ไฟล์ใหม่ | เทสต์ cache key |
| `apps/web/src/App.tsx` | แก้แล้ว | 2 บรรทัด (call site ของ cache) |

สถานะการตรวจ ณ ตอนหยุด: `pnpm check` ผ่าน · `pnpm test` ผ่าน 80/80 · `pnpm build` ผ่าน ·
`python -m pytest server/tests` ผ่าน 8/8 · validation gate ผ่าน 11/11

**ยังไม่ได้ทำ:** ยังไม่มีการพิมพ์เอกสารจริงออกกระดาษเพื่อยืนยันด้วยตา (ข้อ V1 ด้านล่าง)
และยังไม่แตะ `.gs`, `server/`, ไม่มีหน้า List, ไม่มีหน้า Print แยก

---

## 1. ข้อเท็จจริงที่ยืนยันแล้ว (ใช้ตัดสินใจได้)

### 1.1 ต้นตอข้อ 3 — Air ไม่แสดง worksheet

บั๊กสองชั้นต่อกัน:

1. `apps/web/src/appData.ts:178` — `params.set(key, Array.isArray(value) ? value.join(',') : value)`
   ทำให้ URL เป็น `samplingMode=passive,active` และ `gasType=CA,N2`
2. `google/app-scripts/RPP2-air-record.gs:708-709` — เอาค่านั้นไปหาเป็น **สตริงเดียว**:

```js
if (gasType && gasType !== 'all' && !JSON.stringify(record.samples || []).toLowerCase().includes(gasType)) return false;
if (samplingMode && samplingMode !== 'all' && !JSON.stringify(record.samples || []).toLowerCase().includes(samplingMode)) return false;
```

`includes('passive,active')` เป็นเท็จทุกแถวที่มีอยู่จริง → **กรองออก 100%**

กระทบตรงกับที่รายงาน: `b10-em-air` (`appData.ts:145`), `b12-em-air` (`:149`),
`b16-em-air` (`:154`) ทุกตัวส่ง `samplingMode: ['passive','active']` และ
`b16-ca-n2` (`:155`) ส่ง `gasType: ['CA','N2']`

`b10-ca` (`:146`) และ `b12-ca` (`:150`) ส่ง `gasType: 'CA'` ค่าเดียว จึงไม่ติดบั๊กนี้
แต่ยังพลาดได้ถ้า `samples` ว่างหรือไม่มีคำว่า `ca` ใน JSON

Water รอดเพราะใช้ `waterType: 'all'` ซึ่ง `appData.ts:177` ข้ามไป
แต่ `b16-wfi` (`:153`) ส่ง `waterType: 'WFI/PUS'` และติดบั๊กชนิดเดียวกันที่
`RPP2-water-record.gs:789`

### 1.2 ต้นตอข้อ 4 — Building 11/19

`normalizeBuildingSegment_()` (`RPP2-air-record.gs:456-459`) รับแค่ `(10|12|16)`
รันโค้ดจริงแล้วได้:

| building | segment | tab ที่ไป | docNo ที่จะสร้าง |
|---|---|---|---|
| Building 10 | `B10` | `records_em_B10` | `AT-26-B10-0001` |
| Building 11 | *(ว่าง)* | `records_em_OT` | `AT-26-0001` |
| Building 12 | `B12` | `records_em_B12` | `AT-26-B12-0001` |
| Building 16 | `B16` | `records_em_B16` | `AT-26-B16-0001` |
| Building 19 | *(ว่าง)* | `records_em_OT` | `AT-26-0001` |

**tab `_OT` มีอยู่ในนิยาม** — `RPP2-air-record.gs:37,40` ประกาศ
`records_ca_OT` และ `records_em_OT` และ `setupAirActiveRecordSheets()` (`:85-89`)
สร้างให้ ต้องยืนยันกับสมุดงานจริงว่ารันเมนูนี้ไปแล้ว

**ห้ามเปลี่ยนสิ่งที่ `normalizeBuildingSegment_` คืนแบบพร่ำเพรื่อ** ฟังก์ชันนี้ป้อน
`getNextDocNo()` (`:433`) ซึ่งเป็น **การออกเลขเอกสาร** เปลี่ยนแล้วเลข worksheet
ของ B11/B19 จะเปลี่ยนรูปจาก `AT-26-0001` เป็น `AT-26-B11-0001` ซึ่งเป็นเอกสารควบคุม
→ **ต้องถามเจ้าของก่อน** ว่าเลขเดิมที่ออกไปแล้วจะจัดการอย่างไร

### 1.3 แก้ข้อที่แผนเดิมเขียนผิด

แผนเดิม (`iridescent-snuggling-globe.md`) เขียนว่า `worksheetBuildingMismatch_`
"รายงานว่าไม่มีปัญหากับแถวที่เสี่ยงผิดที่สุด" — **ไม่ถูกต้อง** รันโค้ดจริงได้:

| worksheetNo + building | ผลจริง |
|---|---|
| `AT-26-B10-0001` + Building 10 | `""` ถูกต้อง (ตรงกัน) |
| `AT-26-B10-0001` + Building 12 | `numberBuilding=B10; currentBuilding=B12` **จับได้** |
| `AT-26-0001` + Building 10 | `numberBuilding=OTHER; currentBuilding=B10` **จับได้** |
| `AT-26-0001` + Building 11 | `""` ถูกต้อง (ทั้งคู่ไม่มี segment) |
| `AT-26-OT-0001` + Building 11 | `""` ← ช่องว่างจริงอยู่ที่นี่ |

ฟังก์ชันนี้ทำงานถูกเป็นส่วนใหญ่ ช่องว่างมีแค่เลขที่มี `OT` อยู่ในตัวเลข ซึ่ง
`getNextDocNo()` **ไม่เคยสร้างเอง** (มันเว้น segment ไปเลย ไม่ใส่ `OT`) จึงเป็น
ความเสี่ยงเฉพาะเลขที่นำเข้าจากภายนอกหรือกรอกมือ → **ความสำคัญต่ำ** ไม่ใช่ของด่วน

### 1.4 ต้นตอข้อ 1 — `<gradeControl>` ไม่ถูกแทน

`server/pdf_server.py:426-430` แทนค่าเฉพาะ key ที่มีใน `data`
key ที่ไม่ส่งมา **ไม่ถูกล้าง** ข้อความจึงติดไปบนกระดาษ
`documentPayload.ts` เดิมไม่เคยส่ง key `gradeControl` เลย

ตรวจเทมเพลตจริงทั้ง 5 ไฟล์ พบว่า **มี token ชนิดเดียวกันอีกตัว** ที่ไม่มีคนเติม:
`<floor>` ใน `em-template.docx` (พิมพ์ผิดทุกใบของ EM Air)
ทั้งสองแก้แล้วใน 0.2 และมี gate คุมแล้ว

จำนวน token ที่นับได้จริง (distinct suffix ไม่ใช่จำนวนครั้งที่ปรากฏ):

| template | tokens | หมายเหตุ |
|---|---|---|
| `pw-prw-template.docx` | 167 | `samplingPoint`/`tagNo`/`resultAvg` 30 ช่อง · `result1xx`/`result2xx` 30+30 |
| `wfi-pus-template.docx` | 109 | `samplingPoint`/`tagNo`/`result` 30 ช่อง |
| `em-template.docx` | 413 | 50 แถว |
| `ca-template.docx` | 73 | 10 แถว |
| `cv-contact-template.docx` | 43 | 10 แถว · `gradeControl` ไม่มีเลขต่อท้าย |

> หมายเหตุ: เลข "60 ช่อง" ที่เคยพูดถึงคือจำนวนครั้งที่ปรากฏ (แต่ละ token อยู่ 2 หน้า)
> ค่า `limit = 30` ใน `documentPayload.ts:129` ถูกต้องแล้ว **อย่าเปลี่ยนเป็น 60**

### 1.5 sidebar (ข้อ 2)

`App.tsx:101-107` `RAIL_PRIMARY` เป็น path เปล่า ไม่มี `?building=` เลย
building context อยู่ใน query string **ที่เดียว** เมื่อไม่มีค่า:
- `binderForContext()` bail out (`appData.ts:215` — `if (!workflowId || !building) return undefined`)
- `recordScope.ts` ไม่กรอง building

→ ได้ทุกอาคารรวมกัน ซึ่งเป็นพฤติกรรมที่โค้ดตั้งใจ (มี comment อธิบายไว้)
แต่ไม่ใช่สิ่งที่ผู้ใช้ต้องการ

### 1.6 หน้า List (ข้อ 5)

ไม่มี route `/list` เลย รายการ record เป็น div ไม่ใช่ table (`App.tsx:1481-1506`)
แสดง 2 บรรทัด ตาราง `<table>` จริงมีที่เดียวคือ `ActivityPage` (`App.tsx:272-287`)
+ CSS `styles.css:1587-1599` → ใช้เป็นแบบอย่างได้

ข้อมูลที่ยังไม่มีใน `SearchItem`:
- `performedDate` — server ส่งมาแล้ว (`RPP2-air-record.gs:719`, `RPP2-water-record.gs:799`)
  **เพิ่ม type แล้วใน 0.2**
- **sampling point** — อยู่ระดับ sample (`App.tsx:1580` อ่าน
  `sample.samplingPoint || sample.room || sample.location`) **ไม่มากับ `action=search`**
  → ต้องแก้ `.gs` (ตัดสินใจแล้ว ดู 2.2)

### 1.7 คอขวดความเร็ว (ข้อ 8)

เรียงตามน้ำหนักที่วัดจากโค้ด:

1. **Word COM เปิดใหม่ทุกไฟล์ ใต้ global lock** — `convert_with_word()`
   (`pdf_server.py:185-262`) เขียน `.ps1` ชั่วคราวแล้ว
   `New-Object -ComObject Word.Application` ต่อเอกสาร และ `CONVERSION_LOCK`
   (`:101`) บังคับทีละไฟล์ → **เพิ่ม parallel ฝั่ง client ไม่ช่วยเลย**
2. **`_hash_file(template_path)` ทุก POST** (`:988`) — `pw-prw-template.docx`
   10.4 MB อ่าน+SHA256 ทั้งไฟล์ทุกครั้ง **แม้ cache hit**
3. **unzip + rezip ทั้งไฟล์ต่อเอกสาร** (`:529`, `:606-611`) — template เกือบทั้งหมด
   เป็นรูป บีบอัดใหม่ทุกไบต์เพื่อแก้ XML ไฟล์เดียว
4. `renderBatch()` (`batchPrint.ts:99-120`) เป็น loop `await` ทีละตัว 2-3 round trip/แผ่น

cache แบบ content-addressed มีอยู่แล้วและใช้ได้ดี (`:989-998`) พิมพ์ซ้ำของเดิมเกือบฟรี

---

## 2. งานที่ต้องทำ

### 2.1 ยืนยันงานที่ทำแล้วบนกระดาษจริง — ทำก่อนอย่างอื่น

ยังไม่มีใครเห็นผลบนกระดาษ ต้องพิมพ์จริงก่อนจะทำข้ออื่นต่อ (ดู V1)

### 2.2 แก้ Apps Script + redeploy (ข้อ 3, 4, และ sampling point ของข้อ 5)

ไฟล์: `google/app-scripts/RPP2-air-record.gs`, `google/app-scripts/RPP2-water-record.gs`

- **`RPP2-air-record.gs:708-709`** และ **`RPP2-water-record.gs:789`** — split ค่าด้วย
  comma แล้ว match แบบ any-of แทน `.includes()` สตริงเดียว
- **เพิ่มการกรอง `building` ฝั่ง server** — ตอนนี้ Air/Water ไม่มีเลย (มีแต่ CV ที่
  `RPP2-cv-record.gs:1115`) ให้เทียบแบบ segment รองรับ `Building 12`/`B12`/`12`
  ใช้ตรรกะเดียวกับ `buildingSegment()` ใน `apps/web/src/recordScope.ts`
- **เพิ่ม sampling point ใน `searchAirResponse_` และฝั่ง water** — สรุปจาก
  `record.samples` เป็นสตริงสั้น (จำกัดความยาว เช่น 3 จุดแรก + "…") ส่งมาใน field
  ชื่อ `samplingPoints` (type ฝั่ง client เพิ่มไว้แล้วใน `storage.ts`)
- **`normalizeBuildingSegment_` (`:456`) — อย่าแก้จนกว่าจะได้คำตอบจากเจ้าของ**
  ดูเหตุผลใน 1.2 เพราะกระทบการออกเลขเอกสาร
- **`worksheetBuildingMismatch_` (`:462`)** — ความสำคัญต่ำ ดู 1.3

**หลังแก้ต้อง deploy:** Apps Script editor → Deploy → Manage deployments → Edit (ดินสอ)
→ Version: **New version** → Deploy
การกด Save ในตัว editor **ไม่เปลี่ยน** สิ่งที่ `/exec` เสิร์ฟ — `api.ts:74-86`
เตือนเรื่องนี้ไว้เพราะเคยเสียเวลาไปหนึ่งวัน

**ก่อนแก้:** สำรอง Google Sheet ทุกใบ (กฎใน `HANDOFF.md` §8)
**ยืนยัน:** เมนู `1) Check schema / configuration` (`verifyAirSystemSetup`) และ
`2) Setup approved active tabs` ต้องผ่าน และต้องเห็น tab `records_ca_OT`/`records_em_OT` จริง

### 2.3 หน้า List (ข้อ 5) — route ใหม่ `/list`

- group by Building → sub-group by Work → แถว
- คอลัมน์อย่างน้อย: worksheet no. · sampling date · performed date · sampling point
- ใช้ `<table>` แบบ `ActivityPage` (`App.tsx:272-287`) เป็นแบบอย่าง
- เพิ่มใน `RAIL_PRIMARY` (`App.tsx:101`)
- ต้องพึ่ง 2.2 สำหรับ sampling point

### 2.4 sidebar กรองตามอาคาร (ข้อ 2)

- เพิ่ม `buildingContext.ts` — localStorage per-machine แบบเดียวกับ `palette.ts`/`recent.ts`
  จำอาคารที่เปิดล่าสุด
- rail Water/Air/CV แนบ `?building=` จาก context นั้น
- เพิ่มแถบเลือกอาคารในหน้า domain/records ให้ "ทุกอาคาร" เป็นตัวเลือกที่ตั้งใจกด
  ไม่ใช่ค่า default
- `DomainPage` (`App.tsx:1246`) ให้แยกตามอาคารแทน link ไป workflow เปล่า

### 2.5 workflow + หน้า Print แยก (ข้อ 9, 10)

เป้าหมายข้อ 9: **เลือกแฟ้ม → หน้า List → หน้า Print**

- route ใหม่ `/print/:domain/:workflow`
- ย้าย print selection จาก state ของ `Workspace` (`App.tsx:1415`) ไป
  `printQueue.ts` (sessionStorage) ให้อยู่รอดข้าม navigation
- **กับดัก:** `<main>` key ด้วย 2 segment แรกเท่านั้น (`HANDOFF.md` §2d)
  ถ้า key ด้วย full path จะ remount แล้ว selection หาย — มี gate
  `validate_interaction.mjs` คุมอยู่
- **ฟอร์มเติม placeholder (ข้อ 10):** แสดง placeholder ที่ payload ให้ค่าว่าง
  ให้กรอกได้ ไม่กรอก = `""`
- เก็บที่ `printFill.ts` — localStorage คีย์ `domain:workflow:recordKey`
  (ตัดสินใจแล้ว: เก็บในเครื่อง ต่อ record)
- **ห้ามเขียนกลับ System DB** (กฎข้อ 1) และต้องมีข้อความบอกชัดว่าเป็นค่าเฉพาะเครื่องนี้
  ไม่ใช่ข้อมูลในระบบ — เหตุผลเดียวกับที่ `operator.ts` ต้องบอกว่าไม่ใช่ login
- **หมายเหตุ:** `create_pdf` รับ `pages` เป็น array ของ dict ต่อหน้าอยู่แล้ว
  (`pdf_server.py:971-975` → `build_multipage_docx` `:1012-1014`) แต่ browser
  ไม่เคยส่ง — ใช้ช่องทางนี้ได้ ไม่ต้องสร้าง API ใหม่

### 2.6 ความเร็วการพิมพ์ (ข้อ 8)

เรียงตาม (ผลลัพธ์ ÷ ความเสี่ยง):

1. **cache template hash ด้วย `(path, mtime, size)`** — ตัดการอ่าน 10 MB ต่อ request
   ง่าย ได้เยอะ
2. **เขียน zip ใหม่โดยคัดลอกไบต์ที่บีบอัดแล้ว** ของ entry อื่นตรงๆ แก้เฉพาะ
   `word/document.xml` ง่าย ได้เยอะ
3. **แปลงทั้ง batch ใน Word session เดียว** — เปิด Word ครั้งเดียว วน SaveAs แล้วปิด
   ลดต้นทุน process start จาก N ครั้งเป็น 1 ได้มากที่สุด แต่ต้องระวัง
   `CONVERSION_LOCK` และการ cleanup ถ้า Word ค้าง
4. **ดึง record ล่วงหน้าแบบขนาน** ใน `renderBatch()` ให้ network overlap
   กับการแปลง ส่วนการแปลงยังเรียงตามเดิม

**ขอบเขต:** แก้เฉพาะชั้น I/O และการแปลง **ห้ามแตะ** `PDF_WORKFLOW_REGISTRY`,
`_validate_pdf_route` หรือการ resolve template (กฎข้อ 7 + 11)

### 2.7 ลบไฟล์ที่ไม่จำเป็น (ข้อ 12) — ทำท้ายสุด

ตัดสินใจแล้ว: **ลบพร้อม build artifacts**

ลบได้ ปลอดภัย (ตรวจ inbound reference แล้วว่าไม่มีไฟล์ใดอ้างอิง):
- `apps-script-deploy.zip` (2.06 MB) — artifact เก่า
- `server/__pycache__/`, `server/tests/__pycache__/`, `.pytest_cache/`
- `dist/` (5.4 MB) — สร้างใหม่ด้วย `BUILD-DIST.bat`
- `node_modules/` (825 MB) + `apps/web/node_modules/` — สร้างใหม่ด้วย `pnpm install`
- `package-lock.json` (107 KB) — โปรเจกต์ใช้ pnpm เหลือ lockfile เดียว
- กลุ่มไฟล์กำพร้าจาก session แก้ปัญหา 7 ก.ย. (~40 KB):
  `CHECK-SHEETS-REQUIRED.md`, `CHECK-SHEETS.txt`, `check_sheets.py`,
  `MUST-DO-FIRST.txt`, `FIX-STEP-BY-STEP.md`, `QUICK-START.txt`,
  `INSTALL-SIMPLIFIED.md`, `FIX-AIR-SYNC.md`, `FIX-AIR-SHEETS-MISSING.md`,
  `FIX-BUILDING-11-19.md`

**ย้ายเนื้อหาก่อนลบ:** `FIX-BUILDING-11-19.md` เป็นบันทึกเดียวของปัญหา B11/B19
สรุปลง `docs/` ก่อน (เนื้อหาส่วนใหญ่อยู่ในเอกสารนี้แล้ว §1.2)

**ห้ามลบ** (gate บังคับ หรือมีคนอ้างอิง):
- `OWNER.md`, `PLAN.md`, `DESIGN.md`, `inventory_catalog.pdf` (4.28 MB) —
  `validate_release.py` require
- template ทั้ง 5, `.gs` ทั้ง 6
- `docs/CABINET_WORKFLOW_MATRIX.md`, `docs/CV_TEMPLATE_ROUTING_CONTRACT.md`
- `docs/archive/` — มี 4 จุดถูกอ้างจากนอกโฟลเดอร์
  (`CREATE-DIST-ZIP.ps1` อ้าง `CONTINUE_ON_NEW_MACHINE.md`)
- `_archived/frontend-v6/games/` — ถูก pin hash ใน `games-baseline.sha256`
- `css/`, `js/`, root `*.html` — `validate_release.py` เดินตรวจทุก `href`/`src`
- `AGENTS.md` — เนื้อหา stale แต่มี 3 จุดอ้างอิง → เติมหมายเหตุ ไม่ใช่ลบ

### 2.8 งานเล็กที่เจอระหว่างทาง

- `validation/validate_wiring.mjs` มองหา `vite.config.js` หรือ `.mjs` แต่โปรเจกต์มีแค่
  `vite.config.ts` → แก้ให้ตรง
- `DESIGN.md:944` เขียน token เป็น `result1_01`/`result2_01` แต่ของจริงคือ
  `result101`/`result201` ไม่มี underscore → แก้เอกสาร
- `documentPayload.ts:113` มี key `'samplingTime '` (มีช่องว่างท้าย) ซ้ำซ้อน เพราะ
  server normalize `<\s+`→`<` และ `\s+>`→`>` อยู่แล้ว (`pdf_server.py:423-424`)
  ลบได้ แต่ไม่เร่ง — มีเทสต์ยืนยันพฤติกรรมปัจจุบันอยู่

---

## 3. การตรวจก่อนส่งงาน

### 3.1 gate อัตโนมัติ (ผ่านทั้งหมด ณ ตอนหยุด)

```
pnpm check
pnpm test
pnpm build
python -m pytest server/tests
node validation/test_cv_contract.mjs
node validation/test_apps_script_security.mjs
node validation/test_worksheet_numbering.mjs
node validation/test_games.mjs
node validation/validate_non_game_contract.mjs
node validation/validate_styles.mjs
node validation/validate_launchers.mjs
node validation/contrast.mjs
node validation/validate_wiring.mjs --built
python validation/validate_cv_package.py
python validation/validate_release.py
```

ต้องมีเบราว์เซอร์ จึงไม่อยู่ในชุด default:
```
node validation/validate_interaction.mjs            # ต้องมี Flask ที่ :8000 + playwright
SHOT_ROUTES="/,/list,/games" node validation/shot.cjs   # ต้องมี dist/ เสิร์ฟที่ :4173
```

### 3.2 ตรวจด้วยตา — gate จับไม่ได้

**V1 · ข้อ 1, 6, 7, 11 (ค้างอยู่ ทำก่อน)**
พิมพ์เอกสารจริงแล้วอ่านบนกระดาษ:
- CV Contact 1 ใบ — ต้องไม่มีข้อความ `<gradeControl>` เหลือ
- EM Air 1 ใบ — ต้องไม่มี `<floor>` เหลือ
- ทุกใบ — วันที่ต้องเป็น `01 Sep 2026` (date only, pad 2 หลัก)
- ทุกใบ — ตัวเลขผลต้องเป็นจำนวนเต็ม 0 ตำแหน่ง, `0` ต้องพิมพ์เป็น `<1`,
  `TNTC` ต้องผ่านไม่ถูกแปลง
- CV rinse pour + membrane — ค่าจุดเก็บตัวอย่างต้องอยู่ใน **ช่อง tag**
  ไม่ใช่ช่อง sampling point และช่อง result ต้อง **ว่าง**
- pw-prw และ wfi-pus ปกติ — ต้องไม่เปลี่ยน ค่ายังอยู่ช่องเดิม

**V2 · ข้อ 3, 4** เปิดทั้ง 5 แฟ้ม Air (B10/B12/B16 Air Sampling, B16 CA&N2,
B11 ใน Other Locations) ต้องเห็นรายการ · ทดสอบ offline ว่า cache ไม่ปนข้ามอาคาร

**V3 · ข้อ 2, 5, 9, 10** กด rail Water/Air/CV ต้องกรองตามอาคาร ·
หน้า List group ถูกชั้น · เติม placeholder แล้ว reload ต้องยังอยู่ ·
ปล่อยว่างต้องออกเป็น `""`

**V4 · ข้อ 8** จับเวลาพิมพ์ 10 แผ่นก่อน/หลัง **บนเครื่องแล็บจริง**
ตัวเลขจาก container ใช้ไม่ได้ (ไม่มี GPU ไม่มี Word)

**V5 · ข้อ 12** หลังลบ รัน `pnpm install` + `BUILD-DIST.bat` แล้ว
`START-ANF3.bat` ต้องเปิดได้ปกติ

### 3.3 ก่อนปล่อยรุ่น

**bump `VERSION.txt`** ไม่งั้นเครื่องอื่นไม่อัปเดต (`START-ANF3.bat` เทียบไฟล์นี้)

---

## 4. กฎที่ห้ามฝ่าฝืน (ย่อจาก CLAUDE.md)

1. เบราว์เซอร์ **ไม่เขียน** record ลง System DB — ถ้าการแก้จะทำให้เขียนได้ ให้หยุดถาม
2. **ไม่มี mutation token** ใน `.env.production` หรือ `config.json`
3. **token discipline** — ไม่มี hex/`oklch()`/`font-family` นอก `tokens.css`
4. ห้าม eyebrow label, card-in-card, card มีแถบสีข้างหนา, grid 3 คอลัมน์ไอคอนบนหัวข้อ,
   หัวข้อตัวเอน
5. **motion** — `transform`/`opacity` เท่านั้น + `prefers-reduced-motion`
   focus ring ต้องขึ้นทันที ห้าม transition `outline`
6. training simulation เป็นเรื่องสมมติ ไม่ใช่เครื่องมืออนุมัติ
7. **ถามก่อนแตะ** `server/`, `apps-script*/`, `google/app-scripts/`, `templates/`,
   หน้า legacy ที่ถูก freeze
8. สีแฟ้ม = อาคาร ไม่ใช่ของตกแต่ง ห้ามใช้สีชมพูสำรองกับ Other Locations
   ห้ามแต่งจำนวน record
9. neutral ต้องต่ำกว่า 0.02 chroma · หลังแก้ palette ต้องรัน `contrast.mjs`
10. `envDir` ใน `vite.config.ts` คือสิ่งที่ทำให้ URL ถึง bundle ·
    ห้ามมี `vite.config.js` ข้างไฟล์ `.ts`
11. PDF route ใหม่ = แก้ 3 ที่: `recordPolicy.ts`, `PDF_WORKFLOW_REGISTRY`,
    `docs/CV_TEMPLATE_ROUTING_CONTRACT.md`

---

## 5. ลำดับที่แนะนำ

1. backup ใหม่
2. **V1** — ยืนยันงาน Phase 1 บนกระดาษจริง (ค้างอยู่)
3. 2.2 Apps Script + redeploy (ปลดล็อกทั้งข้อ 3, 4 และ sampling point ของข้อ 5)
   — ถามเจ้าของเรื่องเลขเอกสาร B11/B19 ก่อน
4. 2.3 หน้า List → 2.4 sidebar → 2.5 หน้า Print
5. 2.6 ความเร็ว
6. 2.8 งานเล็ก
7. 2.7 ลบไฟล์ ท้ายสุด
