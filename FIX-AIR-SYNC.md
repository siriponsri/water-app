# แก้ปัญหา Air Sync Error

## Error ที่เจอ
```
UPDATE ERROR AT-26-0065: Required Air requested resource
UPDATE ERROR AT-26-0068: Required Air requested resource
UPDATE ERROR AT-26-0066: Required Air requested resource
UPDATE ERROR AC-26-0025: Required Air requested resource
UPDATE ERROR AC-26-0029: Required Air requested resource
UPDATE ERROR AC-26-0030: Required Air requested resource
```

## สาเหตุ
Script Property `ANF3_SYSTEM_URL` ยังไม่ได้ตั้งค่าใน User Sheet

## วิธีแก้ (ใช้เวลา 5 นาที)

### 1. แก้ Air (air-test)
1. เปิด Google Sheets **air-test**
2. เมนู **🔄 RPP2 Sync** → **2) Set Air System URL**
3. วาง Web App URL ของ **RPP2-air-record** (ต้องลงท้าย `/exec`)
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
4. เมนู **1) Check readiness** → ต้องขึ้น `OK` ทุกบรรทัด
5. ทดสอบซิงค์แถวเดียวก่อน

### 2. แก้ Water (water-r)
1. เปิด Google Sheets **water-r**
2. เมนู **🔄 RPP2 Sync** → **2) Set Water System URL**
3. วาง Web App URL ของ **RPP2-water-record** (ต้องลงท้าย `/exec`)
4. เมนู **1) Check readiness** → ต้องขึ้น `OK` ทุกบรรทัด

### 3. แก้ CV (Testing)
1. เปิด Google Sheets **Testing** (หรือ Test)
2. เมนู **ANF3 CV Sync** → **2) Set CV System URL**
3. วาง Web App URL ของ **RPP2-cv-record** (ต้องลงท้าย `/exec`)
4. เมนู **1) Check readiness** → ต้องขึ้น `OK` ทุกบรรทัด

## หมายเหตุสำคัญ

- **ห้าม** ใส่ sync token ใน browser หรือ config ใดๆ
- System Web App URL ต้องตั้ง `Who has access` ให้แคบที่สุดที่ยังเรียกได้
- ถ้ายังเจอ `Unknown action` = ต้อง Deploy version ใหม่ที่ System DB
  - Deploy → Manage deployments → Edit → Version: **New version** → Deploy

## ตรวจสอบว่าแก้สำเร็จ

หลังตั้งค่าแล้ว:
1. กด **1) Check readiness** ในทุกชีต → ต้อง `OK` ครบ
2. ทดสอบซิงค์ 1 record
3. เช็ค execution log ไม่มี error แล้ว

## Web App URLs ที่ต้องหา

ดูใน `OWNER_DEPLOYMENT.md` หรือหาจาก:
1. เปิด RPP2-air-record → Extensions → Apps Script
2. Deploy → Manage deployments
3. Copy URL ที่ลงท้าย `/exec`

ทำซ้ำสำหรับ:
- RPP2-air-record → ใส่ใน air-test
- RPP2-water-record → ใส่ใน water-r
- RPP2-cv-record → ใส่ใน Testing
