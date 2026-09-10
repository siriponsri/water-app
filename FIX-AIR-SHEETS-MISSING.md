# แก้ปัญหา "Required Air sheet not found"

## ปัญหา
```
CREATE ERROR 2026-08-27_Building 11: Required Air requested resource
```

Error นี้แปลว่า **RPP2-air-record ยังไม่มี sheet ที่ต้องใช้**

## วิธีแก้ (ใช้เวลา 2 นาที)

### ใน RPP2-air-record (System DB):

1. เปิด **RPP2-air-record** (Spreadsheet ID: `1qhzgsO75jzCwg9h6NnIps1RauMHbyA9MJiwy699vono`)

2. **Extensions → Apps Script**

3. เมนู **ANF3 Air System** → **1) Check schema / configuration**

4. ดูว่า check ไหน FAIL → จะบอกว่า sheet ไหนหายไป

5. **เมนู ANF3 Air System → 2) Setup approved active tabs**
   - สคริปต์จะสร้าง sheets ที่จำเป็นให้อัตโนมัติ:
     - `records_em_B10`
     - `records_em_B12`
     - `records_em_B16`
     - `records_em_OT`
     - `records_ca_B10`
     - `records_ca_B12`
     - `records_ca_B16`
     - `records_ca_OT`

6. **1) Check schema / configuration** อีกครั้ง → ต้อง OK ทุกบรรทัด

7. **Deploy → Manage deployments → Edit → Version: New version → Deploy**

## ทำไมต้องมี sheets เหล่านี้?

ระบบใหม่แยก records ตาม **Building** เพื่อ:
- ป้องกัน worksheet number ซ้ำ
- ค้นหาเร็วขึ้น
- แต่ละ building มี counter เป็นของตัวเอง

Format: `AT-26-B10-0001` = Air EM, ปี 2026, Building 10, เลขที่ 0001

## ทำซ้ำกับ Water และ CV

### RPP2-water-record:
1. Extensions → Apps Script
2. เมนู **ANF3 Water System → 2) Setup approved active tabs**
3. Deploy version ใหม่

### RPP2-cv-record:
1. Extensions → Apps Script
2. เมนู **ANF3 CV System → 2) Setup approved active tabs**
3. Deploy version ใหม่

## หลังแก้แล้ว

กลับไป **air-test** → ลองซิงค์อีกครั้ง → ควรผ่าน

## ถ้ายังพัง

ดู execution log ว่า error เปลี่ยนเป็นอะไร แล้วส่งมาให้ดูครับ
