# 🔴 แก้ปัญหา "Required Air requested resource"

## สาเหตุ

Error นี้เกิดเพราะ **RPP2-air-record ยังไม่มี sheets ที่จำเป็น**:
- `records_em_OT` (สำหรับ Building 11, 19)
- `records_ca_OT` (สำหรับ Building 11, 19)
- และอาจยังไม่มี B10, B12, B16 ด้วย

## ✅ วิธีแก้ (ทำตามลำดับ)

### ขั้นตอนที่ 1: สร้าง Sheets ใน RPP2-air-record

1. **เปิด RPP2-air-record** (Spreadsheet ID: `1qhzgsO75jzCwg9h6NnIps1RauMHbyA9MJiwy699vono`)

2. **Extensions → Apps Script**

3. **เมนู ANF3 Air System → 2) Setup approved active tabs**
   - จะขึ้นกล่องข้อความ "Air active record sheets: PASS"
   - ตรวจสอบว่าด้านล่างมี tabs ใหม่:
     - `records_em_B10`
     - `records_em_B12`
     - `records_em_B16`
     - ⭐ **`records_em_OT`** ← สำคัญ!
     - `records_ca_B10`
     - `records_ca_B12`
     - `records_ca_B16`
     - ⭐ **`records_ca_OT`** ← สำคัญ!

4. **เมนู ANF3 Air System → 1) Check schema / configuration**
   - ต้องขึ้น OK ทุกบรรทัด
   - ถ้ามี "missing" = ยังไม่ได้สร้าง กลับไปข้อ 3

5. **Deploy version ใหม่:**
   - **Deploy → Manage deployments**
   - กดรูป **ดินสอ (Edit)** ข้าง Active deployment
   - **Version: New version**
   - **Description:** `Added OT sheets for Building 11/19`
   - **Deploy**
   - ⚠️ **ขั้นตอนนี้สำคัญมาก** ถ้าไม่ทำ URL เดิมยังใช้โค้ดเก่า

---

### ขั้นตอนที่ 2: ทำซ้ำกับ Water และ CV

**RPP2-water-record:**
1. Extensions → Apps Script
2. เมนู **ANF3 Water System → 2) Setup approved active tabs**
3. เมนู **1) Check schema / configuration** → OK
4. **Deploy → Manage deployments → Edit → New version → Deploy**

**RPP2-cv-record:**
1. Extensions → Apps Script
2. เมนู **ANF3 CV System → 2) Setup approved active tabs**
3. เมนู **1) Check schema / configuration** → OK
4. **Deploy → Manage deployments → Edit → New version → Deploy**

---

### ขั้นตอนที่ 3: ทดสอบ

1. กลับไปที่ **air-test**
2. รีเฟรชหน้า Google Sheets
3. เมนู **🔄 RPP2 Sync → ซิงค์ทั้งหมด (Air)**
4. **ควรผ่านแล้ว!**

---

## 🔍 ตรวจสอบว่าทำครบหรือยัง

### ใน RPP2-air-record:

**1. ตรวจสอบ tabs ด้านล่าง:**
```
✓ มี tab "records_em_OT" หรือยัง?
✓ มี tab "records_ca_OT" หรือยัง?
```

**2. ตรวจสอบ Deployment:**
```
Deploy → Manage deployments
→ ดูว่า "Version" เป็นเวอร์ชันล่าสุดที่ Deploy ไปเมื่อกี้หรือยัง
```

**3. ทดสอบ URL:**

เปิด URL นี้ใน browser:
```
https://script.google.com/macros/s/AKfycbz7lr5vMWM5wgZafC5XGxdAu72scGv2KDl7ixNe5FnGoPjSF0SOjH9QgA_Bztk5n6Oo/exec?action=ping
```

ต้องได้:
```json
{
  "ok": true,
  "success": true,
  "message": "Air Record API is running",
  ...
}
```

---

## ❌ ถ้ายังไม่ได้

### ปัญหา: กดเมนู "2) Setup approved active tabs" แล้วไม่มี tabs ใหม่

**วิธีแก้:** สร้าง tabs เอง

1. ใน RPP2-air-record คลิก **+** ด้านล่าง (เพิ่ม sheet)
2. ตั้งชื่อตามนี้ทีละ sheet:
   - `records_em_B10`
   - `records_em_B12`
   - `records_em_B16`
   - `records_em_OT` ← สำคัญ
   - `records_ca_B10`
   - `records_ca_B12`
   - `records_ca_B16`
   - `records_ca_OT` ← สำคัญ

3. **ในแต่ละ sheet ใส่หัวตารางแถวแรก:**

**สำหรับ `records_em_*` (ทั้งหมด):**
```
worksheetNo | recordStatus | building | samplingDate | performedDate | temp | incNo | lotMedia | mfgMedia | expMedia | determinedDate | concludedDate | approvedDate | docNo | samplesJson | createdAt | updatedAt | createdBy
```

**สำหรับ `records_ca_*` (ทั้งหมด):**
```
worksheetNo | recordStatus | building | samplingDate | performedDate | temp | incNo | lotTSA | lotMedia | lotOther | mfgMedia | expMedia | determinedDate | concludedDate | approvedDate | docNo | samplesJson | createdAt | updatedAt | createdBy
```

4. แล้วกลับไป Apps Script → เมนู "1) Check schema / configuration"

---

### ปัญหา: Deploy แล้วแต่ยังเจอ error เดิม

**สาเหตุ:** URL ยัง cache โค้ดเก่า

**วิธีแก้:**
1. รอ 1-2 นาที
2. ลองซิงค์ใหม่
3. ถ้ายังไม่ได้ → Deploy version ใหม่อีกครั้ง

---

## 📋 Checklist

ก่อนลองซิงค์อีกครั้ง ต้องทำครบทั้งหมดนี้:

- [ ] RPP2-air-record มี tab `records_em_OT`
- [ ] RPP2-air-record มี tab `records_ca_OT`
- [ ] RPP2-air-record Deploy version ใหม่แล้ว
- [ ] RPP2-water-record Setup + Deploy แล้ว
- [ ] RPP2-cv-record Setup + Deploy แล้ว
- [ ] air-test วางโค้ดใหม่แล้ว (จาก `01-air-user/Code.gs`)
- [ ] รีเฟรช air-test แล้ว

---

## 🎯 สรุป: ทำอะไรผิดพลาด?

เวลาที่ผ่านมา:
1. ✅ วาง URL ใหม่ใน User Sheet → ถูกแล้ว
2. ✅ Hard-code URL ในโค้ด → ถูกแล้ว
3. ❌ **ลืมสร้าง OT sheets ใน System DB** ← นี่คือปัญหา
4. ❌ **ลืม Deploy version ใหม่** ← URL ยังใช้โค้ดเก่า

ตอนนี้ต้องทำ:
- สร้าง sheets ใน RPP2-air-record
- Deploy version ใหม่
- ลองซิงค์อีกครั้ง

---

**ถ้าทำครบทุกขั้นตอนแล้วยังไม่ได้ ส่ง screenshot หน้า RPP2-air-record (แสดง tabs ด้านล่าง) มาให้ดูครับ**
