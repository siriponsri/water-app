# ✅ อัปเดตโค้ดเสร็จแล้ว - พร้อมใช้งาน

## สิ่งที่ทำไปแล้ว

ได้ hard-code URL ทั้ง 3 ระบบเข้าไปในโค้ดแล้ว:
- ✅ Air System URL
- ✅ Water System URL  
- ✅ CV System URL

## ขั้นตอนติดตั้ง (ใช้เวลา 5 นาที)

### 1. อัปเดต Air (air-test)

1. เปิด Google Sheets **air-test**
2. **Extensions → Apps Script**
3. **เลือกโค้ดเดิมทั้งหมด → Delete**
4. **Copy โค้ดจาก:** `apps-script-deploy/01-air-user/Code.gs`
5. **วางทั้งหมด → Save (💾)**
6. ปิดหน้า Apps Script
7. **รีเฟรช** Google Sheets
8. เมนู **🔄 RPP2 Sync → 1) Check readiness** → ต้องขึ้น **OK** ทุกบรรทัด
9. **ลองซิงค์ได้เลย**

---

### 2. อัปเดต Water (water-r)

1. เปิด Google Sheets **water-r**
2. **Extensions → Apps Script**
3. **เลือกโค้ดเดิมทั้งหมด → Delete**
4. **Copy โค้ดจาก:** `apps-script-deploy/03-water-user/Code.gs`
5. **วางทั้งหมด → Save (💾)**
6. ปิดหน้า Apps Script
7. **รีเฟรช** Google Sheets
8. เมนู **🔄 RPP2 Sync → 1) Check readiness** → ต้องขึ้น **OK** ทุกบรรทัด

---

### 3. อัปเดต CV (Testing)

1. เปิด Google Sheets **Testing** (หรือ Test)
2. **Extensions → Apps Script**
3. **เลือกโค้ดเดิมทั้งหมด → Delete**
4. **Copy โค้ดจาก:** `apps-script-deploy/05-cv-user/Code.gs`
5. **วางทั้งหมด → Save (💾)**
6. ปิดหน้า Apps Script
7. **รีเฟรช** Google Sheets
8. เมนู **ANF3 CV Sync → 1) Check readiness** → ต้องขึ้น **OK** ทุกบรรทัด

---

### 4. ✅ แก้ปัญหา Building 11/19 (สำคัญ!)

**ใน RPP2-air-record:**

1. **Extensions → Apps Script**
2. เมนู **ANF3 Air System → 2) Setup approved active tabs**
   - จะสร้าง sheets ที่จำเป็น:
     - `records_em_B10`, `records_em_B12`, `records_em_B16`, **`records_em_OT`**
     - `records_ca_B10`, `records_ca_B12`, `records_ca_B16`, **`records_ca_OT`**
3. เมนู **1) Check schema / configuration** → ต้อง OK ทุกบรรทัด
4. **Deploy → Manage deployments → Edit (ดินสอ) → Version: New version → Deploy**

**ทำซ้ำกับ RPP2-water-record และ RPP2-cv-record:**
- เมนู **ANF3 Water System → 2) Setup approved active tabs**
- เมนู **ANF3 CV System → 2) Setup approved active tabs**
- Deploy version ใหม่ทั้งสองตัว

---

## ทดสอบ

### Air
1. เปิด **air-test**
2. เมนู **🔄 RPP2 Sync → ซิงค์ทั้งหมด (Air)**
3. ควรผ่านโดยไม่มี error

### Water
1. เปิด **water-r**
2. เมนู **🔄 RPP2 Sync → ซิงค์ทั้งหมด (Water)**

### CV
1. เปิด **Testing**
2. เมนู **ANF3 CV Sync → Sync marked rows**

---

## สิ่งที่เปลี่ยนไป

### ก่อน (ยุ่งยาก):
1. Deploy System DB → Copy URL
2. ไปที่ User Sheet → Set URL ผ่านเมนู
3. Check readiness
4. ซิงค์

### ตอนนี้ (ง่าย):
1. วางโค้ดใหม่
2. Save
3. ซิงค์ได้เลย

---

## ข้อมูล URL ที่ hard-code ไว้

| ระบบ | URL |
|------|-----|
| Air | `https://script.google.com/.../AKfycbz7lr5vMWM5wgZafC5XGxdAu72scGv2KDl7ixNe5FnGoPjSF0SOjH9QgA_Bztk5n6Oo/exec` |
| Water | `https://script.google.com/.../AKfycbx4qsCLhw7KlIw2_wNRCxlqm_PsAIYvtmpxf-7dCJYEe5ptlY5e2tnDKNmTKCKcIAPK/exec` |
| CV | `https://script.google.com/.../AKfycbxYYVB38c1wFPrF3yp9dDcljktXcwVQ4_b5rOd0mf33iAjYHkkQEazW6TaJXNq0eHSP/exec` |

**หมายเหตุ:** URL เหล่านี้ยังสามารถ override ได้ผ่าน Script Properties หากต้องการเปลี่ยนในภายหลัง

---

## แก้ปัญหา

### ถ้ายังเจอ "Required Air requested resource"
- ตรวจสอบว่าทำขั้นตอนที่ 4 (Setup approved active tabs) แล้วหรือยัง
- Deploy version ใหม่ของ RPP2-air-record แล้วหรือยัง

### ถ้า Check readiness ขึ้น FAIL
- ชื่อคอลัมน์ในชีตไม่ตรง → แก้ให้ตรงกับที่โค้ดต้องการ
- ชีตหายไป → สร้างชีตที่ขาด

### ถ้าซิงค์แล้วไม่มีอะไรเกิดขึ้น
- ลืมติ๊ก `worksheetCreate` หรือ `cvSyncNow`
- ชีตเปิดผิดตัว

---

## เปรียบเทียบก่อน-หลัง

| สถานการณ์ | ก่อน | หลัง |
|-----------|------|------|
| ติดตั้งเครื่องใหม่ | ต้องตั้ง URL ทุกครั้ง | วางโค้ด → ใช้ได้เลย |
| URL เปลี่ยน | ต้องไปตั้งใหม่ทุกชีต | แก้ code ที่เดียว |
| Check readiness | 3 ขั้น (sheet + URL + version) | 2 ขั้น (sheet + version) |
| Error message | "ยังไม่ตั้ง URL" | ไม่มีอีกแล้ว |

---

## สำหรับผู้ดูแลระบบ

### เปลี่ยน URL ในอนาคต

แก้ไฟล์เหล่านี้:
- `apps-script-deploy/01-air-user/Code.gs` (บรรทัด ~593)
- `apps-script-deploy/03-water-user/Code.gs` (บรรทัด ~978)
- `apps-script-deploy/05-cv-user/Code.gs` (บรรทัด ~705)

ค้นหา `HARDCODED_` แล้วแก้ URL

### ถ้าต้องการ override URL ชั่วคราว

ยังใช้เมนู "Set ... System URL" ได้ตามเดิม Script Property จะมีความสำคัญสูงกว่า hardcoded value
