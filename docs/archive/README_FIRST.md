# ANF3 Luna Max Handoff + SVG Asset Pack

ชุดนี้ออกแบบสำหรับวางทับ root ของ `ANF3-Laboratory-Records-20260901` ก่อนสั่ง Luna Max

## ไฟล์ที่จะทับของเดิม

- `HANDOFF_LUNA_MAX.md`
- `PLAN.md`
- `DESIGN.md`
- `ARCHITECTURE_RECOMMENDATIONS.md`
- `OWNER.md`
- `TEST_PLAN.md`

## ไฟล์ใหม่

- `LUNA_MAX_GOAL.md` — prompt `/goal` ไม่เกิน 4,000 ตัวอักษร
- `AUDIT_REPORT_BUILDING_WORKFLOW.md` — ผล audit และข้อยืนยัน Owner
- `docs/CABINET_WORKFLOW_MATRIX.md` — 16 active destinations ที่ต้องมีครบ
- `docs/CV_TEMPLATE_ROUTING_CONTRACT.md` — กติกา CV Contact/Rinse และการแยกจาก Water
- `docs/SCALE_UP_CONFIGURATION_CONTRACT.md` — registry/layout/capacity สำหรับ scale up
- `docs/APPS_SCRIPT_6_FILE_CONTRACT.md`
- `design-assets/manifest.json`
- `design-assets/README.md`
- `design-assets/*.svg` — SVG package พร้อมใช้

## วิธีใช้

1. สำรอง project เดิม
2. แตก ZIP ชุดนี้ที่ root ของ project และเลือก Replace files
3. ตรวจว่า `games/**` ยังอยู่ครบ ชุดนี้ไม่มีไฟล์ใดวางทับใน `games/`
4. เปิด `LUNA_MAX_GOAL.md`
5. Copy เฉพาะข้อความใน code block ไปใช้กับ Luna Max
6. Luna ต้อง audit และถาม Gate A ก่อนเริ่มแก้ code ตาม `HANDOFF_LUNA_MAX.md`

## SVG package

Luna ต้องอ่าน `design-assets/manifest.json` ก่อนใช้ asset สีแฟ้มมีความหมายตายตัวดังนี้:

- Blue → Building 10
- Violet → Building 12
- Mint → Building 16
- Orange → Other Locations (Building 11 และ 19 โดยยังเก็บ identity แยกกัน)
- Pink → Reserve เท่านั้น แสดง `Coming Soon` และกดไม่ได้

Matrix ปัจจุบันมี 16 active destinations: B10 = 4, B12 = 4, B16 = 5, Other Locations = 3. CV มีหนึ่งแฟ้มต่อ B10/B12/B16 แล้วเลือก Contact Plate หรือ Rinse ภายใน โดย Rinse ต้องเลือก Pour Plate หรือ Membrane Filtration และใช้ Template CV Rinse ที่แยกไฟล์/registry/version/hash จาก Water เสมอ

SVG ทั้งหมดเป็นต้นฉบับของชุดนี้ ไม่มี external image/runtime dependency และข้อมูล dynamic เช่น workflow, building, count และ status ต้อง render ด้วย semantic React/HTML ไม่ bake ลงภาพ

## Scope freeze

งานนี้ห้ามแก้ Games โดยเด็ดขาด ชุด overlay ไม่มี `games/**`, `_archived/frontend-v6/games/**` หรือ `docs/MICRO_LAB_GAMES_IMPLEMENTATION_PLAN.md`
