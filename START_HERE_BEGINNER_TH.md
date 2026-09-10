# เริ่มใช้งาน ANF3 Laboratory Records บนเครื่องใหม่

## สำหรับผู้ใช้งาน Local App

1. แตก ZIP ไปยัง Desktop หรือ Documents
2. ดับเบิลคลิก `START-ANF3.bat`
3. ครั้งแรกต้องต่ออินเทอร์เน็ตเพื่อดาวน์โหลด Python runtime และ package ลงในโฟลเดอร์โปรแกรม
4. ไม่ต้อง Run as administrator
5. รอให้ browser เปิด `http://127.0.0.1:8000`
6. เปิดหน้าต่าง server ค้างไว้ระหว่างใช้งาน
7. ปิดด้วย Ctrl+C เมื่อเลิกใช้

ถ้าต้องสร้าง PDF เครื่องต้องมี Microsoft Word พร้อม `pywin32` หรือ LibreOffice รายละเอียดอยู่ใน `OWNER.md`

## สิ่งที่ทำในเว็บ

1. เลือก Water, Air หรือ Cleaning Validation
2. เลือก workflow
3. ค้นและเปิด record ปัจจุบันจาก System DB
4. Preview PDF
5. Print, Download หรือ Save to Desktop

เว็บเป็น read-only ไม่มีการสร้าง แก้ไข ลบ หรือ Sync record งานเหล่านี้ทำใน Google Sheets ผ่าน Apps Script เท่านั้น

## สำหรับ Owner/Developer ที่ย้ายเครื่อง

อ่านตามลำดับ:

1. `OWNER.md` - วิธี copy/deploy Apps Script และส่งให้ผู้ใช้
2. `PLAN.md` - requirement และ acceptance criteria
3. `llm-wiki/index.md` - architecture, Google Sheet contract และ decision log
4. `DESIGN.md` - design system และ interaction
5. `TEST_PLAN.md` - test cases

ติดตั้ง dependency สำหรับพัฒนาต่อ:

```powershell
pnpm install --frozen-lockfile
.\INSTALL.bat
```

ตรวจและ build:

```powershell
rtk pnpm check
rtk pnpm test
rtk pnpm build
rtk proxy .\.venv\Scripts\python.exe -m pytest server\tests -q
```

## ข้อจำกัดก่อนใช้ Production

- Air/Water Web Apps ต้อง Deploy เป็น New version เพื่อรองรับ `search/get`
- ต้องใส่ CV System `/exec` URL จริงใน `.env.production` แล้ว build ใหม่
- CV rinse PDF ยังปิดไว้จนมี approved rinse templates
- Growth Promotion เป็น synthetic training fixture จนกว่า Microbiology/QA จะอนุมัติ
- ห้ามเดา URL, token, sheet mapping, SOP criteria หรือ template behavior
