# ตรวจสอบ Sheets ใน Google Sheets ทั้ง 3 ระบบ

## AIR SYSTEM
**URL:** https://docs.google.com/spreadsheets/d/1qhzgsO75jzCwg9h6NnIps1RauMHbyA9MJiwy699vono/edit

### ✅ Sheets ที่ต้องมี (กด tabs ด้านล่าง):

**EM Air (Environment Monitoring):**
- [ ] `records_em_B10` (Building 10)
- [ ] `records_em_B12` (Building 12)
- [ ] `records_em_B16` (Building 16)
- [ ] `records_em_OT` (Other Locations - Building 11, 19)

**CA (Compressed Air):**
- [ ] `records_ca_B10` (Building 10)
- [ ] `records_ca_B12` (Building 12)
- [ ] `records_ca_B16` (Building 16)
- [ ] `records_ca_OT` (Other Locations - Building 11, 19)

**Master Data:**
- [ ] `database_em`
- [ ] `database_ca`
- [ ] `logs`

---

## WATER SYSTEM
**URL:** https://docs.google.com/spreadsheets/d/1aeMOagZPkoVA_LJxjVvmUL59cMtTTicUH5NzuYEhyY0/edit

### ✅ Sheets ที่ต้องมี:

**PW / PRW (Purified Water / Pre-Reverse Osmosis Water):**
- [ ] `records_pw_prw_B10` (Building 10)
- [ ] `records_pw_prw_B12` (Building 12)
- [ ] `records_pw_prw_B16` (Building 16)
- [ ] `records_pw_prw_OT` (Other Locations)

**WFI / PUS (Water For Injection / Pure Steam):**
- [ ] `records_wfi_B16` (Building 16)
- [ ] `records_wfi_OT` (Other Locations)

**Master Data:**
- [ ] `database`
- [ ] `logs`

**Legacy (Optional - read-only):**
- [ ] `records_pq_old`
- [ ] `records_pq_ocl`
- [ ] `records_ra6`
- [ ] `records_wfi_pq`
- [ ] `records_wfi`

---

## CV SYSTEM
**URL:** https://docs.google.com/spreadsheets/d/1g6klceQWA4Duy5Eq2Az0LE47-2WUUXZE2fAPFBSKHrE/edit

### ✅ Sheets ที่ต้องมี:

- [ ] `records_cv_contact` (Contact plates)
- [ ] `record_cv_rinse` (Rinse samples - ไม่มี s)
- [ ] `logs`

---

## วิธีตรวจสอบ

### 1. เปิดแต่ละ URL ด้านบน

### 2. ดูที่ tabs ด้านล่างของ Google Sheets

### 3. ถ้าขาด tabs ไหน:

**Air:**
```
Extensions > Apps Script
> เมนู "ANF3 Air System" > "2) Setup approved active tabs"
> เมนู "1) Check schema / configuration" (ต้อง OK)
> Deploy > Manage deployments > Edit > New version > Deploy
```

**Water:**
```
Extensions > Apps Script
> เมนู "ANF3 Water System" > "2) Setup approved active tabs"
> เมนู "1) Check configuration" (ต้อง OK)
> Deploy > Manage deployments > Edit > New version > Deploy
```

**CV:**
```
Extensions > Apps Script
> เมนู "ANF3 CV System" > "1) Setup / verify schema"
> เมนู "2) Check configuration" (ต้อง OK)
> Deploy > Manage deployments > Edit > New version > Deploy
```

---

## ทำไมต้องมี _OT sheets?

`_OT` = "Other Locations" สำหรับ buildings ที่ไม่ใช่ 10, 12, 16

เช่น:
- Building 11 -> ไปที่ `records_em_OT` และ `records_ca_OT`
- Building 19 -> ไปที่ `records_em_OT` และ `records_ca_OT`

โค้ดใน `normalizeBuildingSegment_()` รองรับเฉพาะ B10, B12, B16
ถ้าไม่ใช่ 3 building นี้ = แปลงเป็น `OT`

---

## Checklist ก่อนซิงค์

- [ ] Air: มีครบ 11 sheets (8 records + 3 master)
- [ ] Water: มีครบอย่างน้อย 8 sheets (6 active + 2 master)
- [ ] CV: มีครบ 3 sheets
- [ ] Air: Deploy version ใหม่แล้ว
- [ ] Water: Deploy version ใหม่แล้ว
- [ ] CV: Deploy version ใหม่แล้ว
- [ ] air-test: วางโค้ดใหม่แล้ว (01-air-user/Code.gs)
- [ ] water-r: วางโค้ดใหม่แล้ว (03-water-user/Code.gs)
- [ ] Testing: วางโค้ดใหม่แล้ว (05-cv-user/Code.gs)

---

## ถ้าหลังจากทำครบแล้วยังเจอ error

ส่งมาให้:
1. Screenshot tabs ด้านล่างของ RPP2-air-record
2. Screenshot tabs ด้านล่างของ RPP2-water-record
3. Screenshot tabs ด้านล่างของ RPP2-cv-record
4. Error log ล่าสุดจาก air-test

---

## สรุป: ทำไมมี error?

1. ข้อมูลมี Building 11 และ 19
2. โค้ดแปลง Building 11/19 เป็น "OT"
3. โค้ดพยายามหา sheet `records_em_OT` และ `records_ca_OT`
4. แต่ sheets เหล่านี้ยังไม่มี (ไม่ได้สร้าง)
5. เลยขึ้น error "Required Air sheet not found"
6. Error message ที่เห็นคือ "Required Air requested resource" (Google Apps Script ตัดข้อความ)

**แก้ยังไง:** สร้าง sheets ด้วยเมนู "Setup approved active tabs" แล้ว Deploy ใหม่
