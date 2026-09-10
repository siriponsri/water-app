# วิธีติดตั้ง ANF3 Games Patch

แพตช์นี้สร้างสำหรับ `ANF3-Laboratory-Records-20260901.zip` ที่แนบมา

1. ปิดหน้าต่าง `ANF3 Laboratory Records` และ command window ที่กำลังรันระบบ
2. สำรองโฟลเดอร์โปรเจกต์เดิม 1 ชุด
3. แตก ZIP นี้ลงในโฟลเดอร์โปรเจกต์เดิม
4. เมื่อ Windows ถาม ให้เลือก **Replace the files in the destination**
5. เปิดระบบด้วย `START-ANF3.bat` ตามเดิม
6. เข้าเมนู **Tools → Games**

สิ่งที่ถูกแทนที่มีเฉพาะ React Games routes, source ของเกม, เอกสารประกอบ, README และ production build ใน `dist/` โมดูลบันทึกผลห้องปฏิบัติการ, PDF, Google Apps Script, inventory และ template ไม่ถูกแก้ไข

เส้นทางเดิม `#/games/feller` จะพาไปเกม `The Sixth Plate` โดยอัตโนมัติ เพื่อไม่ให้ bookmark เดิมขึ้นหน้าเสีย

รายละเอียดผลการตรวจอยู่ที่ `validation/GAMES_PATCH_REPORT.md`
