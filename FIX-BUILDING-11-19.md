# วิธีแก้ปัญหา Building 11/19 - "Required Air requested resource"

## สาเหตุ

ข้อมูลมี Building 11 และ Building 19 แต่:
- ฟังก์ชัน `normalizeBuildingSegment_()` รองรับเฉพาะ B10, B12, B16
- Building 11/19 จะถูกแปลงเป็น `OT` (Other) → ต้องใช้ `records_em_OT` / `records_ca_OT`
- แต่ sheets เหล่านี้ยังไม่ได้สร้างในระบบ

## วิธีแก้ (เลือก 1 ใน 3)

### วิธีที่ 1: สร้าง OT sheets (แนะนำ - ใช้เวลา 2 นาที)

**ใน RPP2-air-record:**

1. Extensions → Apps Script
2. เมนู **ANF3 Air System → 2) Setup approved active tabs**
   - จะสร้าง sheets ให้อัตโนมัติ:
     - `records_em_B10`, `records_em_B12`, `records_em_B16`, **`records_em_OT`**
     - `records_ca_B10`, `records_ca_B12`, `records_ca_B16`, **`records_ca_OT`**

3. เมนู **1) Check schema / configuration** → ต้อง OK ทุกบรรทัด

4. **Deploy → Manage deployments → Edit (ดินสอ) → Version: New version → Deploy**

5. กลับไป **air-test** → ลองซิงค์ใหม่

---

### วิธีที่ 2: แก้โค้ดให้รองรับ Building 11/19 แยก sheet (ถ้าต้องการ)

แก้ไฟล์ `apps-script-deploy/02-air-system/Code.gs`:

#### เปลี่ยนบรรทัดที่ 37, 40:

```javascript
// เดิม
RECORDS_CA_ACTIVE: ['records_ca_B10', 'records_ca_B12', 'records_ca_B16', 'records_ca_OT'],
RECORDS_EM_ACTIVE: ['records_em_B10', 'records_em_B12', 'records_em_B16', 'records_em_OT'],

// ใหม่ (ถ้าต้องการแยก B11, B19)
RECORDS_CA_ACTIVE: ['records_ca_B10', 'records_ca_B11', 'records_ca_B12', 'records_ca_B16', 'records_ca_B19', 'records_ca_OT'],
RECORDS_EM_ACTIVE: ['records_em_B10', 'records_em_B11', 'records_em_B12', 'records_em_B16', 'records_em_B19', 'records_em_OT'],
```

#### เปลี่ยนบรรทัดที่ 458 (ฟังก์ชัน `normalizeBuildingSegment_`):

```javascript
// เดิม
const match = normalized.match(/^(?:BUILDING|BLDG|BLD|B)?(10|12|16)$/);

// ใหม่
const match = normalized.match(/^(?:BUILDING|BLDG|BLD|B)?(10|11|12|16|19)$/);
```

จากนั้น:
1. วางโค้ดใหม่ใน RPP2-air-record
2. เมนู **2) Setup approved active tabs** (จะสร้าง sheets ใหม่)
3. Deploy version ใหม่

---

### วิธีที่ 3: รวม Building 11/19 เข้ากับ OT (ง่ายที่สุด - แนะนำ)

**ไม่ต้องแก้โค้ด** แค่:

1. สร้าง `records_em_OT` และ `records_ca_OT` (ตามวิธีที่ 1)
2. Building 11/19 จะถูกบันทึกใน OT sheets เหล่านี้
3. Worksheet numbers จะเป็น: `AT-26-0001`, `AC-26-0001` (ไม่มีส่วน building)

---

## ผมแนะนำอะไร?

**ใช้วิธีที่ 1** (สร้าง OT sheets) เพราะ:
- ไม่ต้องแก้โค้ด
- ใช้เวลา 2 นาที
- ระบบพร้อมใช้งานทันที

Building 11/19 จะถูกจัดเก็บใน `_OT` sheets ซึ่งถูกออกแบบมาสำหรับ "Other Locations" อยู่แล้ว

---

## URL ที่ต้องมี (สำหรับตั้งค่า)

**ขอ Web App URL จาก 3 ระบบนี้:**

1. **RPP2-air-record** → Extensions → Apps Script → Deploy → Manage deployments → Copy URL `/exec`
2. **RPP2-water-record** → (เหมือนข้างบน)
3. **RPP2-cv-record** → (เหมือนข้างบน)

**จากนั้นนำ URL ไปใส่:**
- RPP2-air-record URL → **air-test** (เมนู "2) Set Air System URL")
- RPP2-water-record URL → **water-r** (เมนู "2) Set Water System URL")  
- RPP2-cv-record URL → **Testing** (เมนู "2) Set CV System URL")

---

## ทำให้ง่ายกว่านี้ได้ไหม?

ได้ครับ! ให้ส่ง URL `/exec` ทั้ง 3 ตัวมาให้ แล้วผมจะ:
1. อัปเดตโค้ดให้ hard-code URL เลย (ไม่ต้องตั้งผ่านเมนู)
2. สร้าง script ติดตั้งอัตโนมัติ

แต่ **ระวัง**: hard-code URL = ทุก PC ที่ใช้จะเชื่อมกับ System DB เดียวกัน
