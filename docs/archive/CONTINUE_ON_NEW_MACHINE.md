# รับช่วงงานต่อบนเครื่องใหม่ด้วย Codex

ไฟล์นี้เป็น entry point สำหรับ Codex session ใหม่หลังแตก ZIP

## 1. เตรียมโฟลเดอร์

1. แตก ZIP ไปยังโฟลเดอร์ที่เขียนได้
2. เปิด Codex โดยเลือก root ของโฟลเดอร์นี้
3. ตรวจว่า terminal อยู่ที่ root ซึ่งมี `AGENTS.md`, `OWNER.md` และ `PLAN.md`
4. รัน `rtk --version` หากไม่มี `rtk` ให้ติดตั้ง/ตั้งค่าตาม environment ของ Codex เครื่องใหม่ก่อนทำ command อื่น

## 2. Prompt สำหรับ Session ใหม่

ใช้ prompt นี้ได้ทันที:

```text
/goal อ่าน AGENTS.md, OWNER.md, PLAN.md, CONTINUE_ON_NEW_MACHINE.md, HANDOFF_LUNA_MAX.md และ llm-wiki/index.md ให้ครบ จากนั้น audit สถานะจาก source และ validation artifacts โดยห้ามย้อนกลับไปใช้ legacy form/local-first flow งานที่เหลือคือช่วย owner ปิด Google Apps Script deployment gates, ใส่ CV /exec URL จริง, rebuild, ทดสอบ live search/get และ approved PDF E2E หากไม่แน่ใจ URL, token, sheet mapping, SOP criteria หรือ template ให้ถาม owner
```

## 3. Source Of Truth

อ่านตามลำดับ:

1. `AGENTS.md` - repository rules และคำสั่งต้องขึ้นต้นด้วย `rtk`
2. `OWNER.md` - deployment steps ภาษาไทยและ owner-controlled values
3. `PLAN.md` - approved contract, acceptance criteria และ checklist
4. `llm-wiki/index.md` - durable cross-session knowledge
5. `llm-wiki/google-sheet-contracts.md` - IDs, shards, numbering และ API boundary
6. `HANDOFF_LUNA_MAX.md` - current concise state
7. `DESIGN.md` - frontend/interaction specification

## 4. สถานะที่ทำเสร็จแล้ว

- React/Vite read-only app, hash routes และ System DB API client
- Three.js laboratory workbench พร้อม Water, Air, Cleaning Validation, Coming soon
- Low-glare light theme, corrected dark theme, hover label, reduced-motion/mobile 2D fallback
- Text-fit/overflow audit ที่ 320, 375, 414, 768 และ 1440
- Calendar, inventory 95-row hash gate, tools และเกมห้ารอบ
- Hardened local Flask PDF API และ 7 focused Pytest cases
- Air/Water/CV Apps Script source, building-aware numbering, active shards, locks และ token boundary
- Thai `OWNER.md`, Apps Script guide และ `llm-wiki/`
- One-click non-admin `START-ANF3.bat`

## 5. งานที่ยังต้องใช้ Owner หรือ Live Google

1. Air System Web App: paste source and Deploy New version; old live deployment returns `Unknown action` for `search`
2. Water System Web App: same as Air
3. CV System: obtain actual `/exec` URL from owner-controlled deployment
4. Set matching domain tokens in both User and System Script Properties
5. Put CV URL in `.env.production`, then rebuild and recreate ZIP
6. Run controlled live `ping/search/get`, insert/update, shard, immutable-number and log checks
7. Generate one approved real PDF on the work PC and visually compare with the controlled template/source record
8. Enable CV rinse PDF only after the approved PW/PRW and WFI/PUS template families pass the target-PC smoke test
9. Keep Growth Promotion labelled synthetic until Microbiology/QA approval exists

Live MCP/clasp was not exposed in the finishing session and `clasp` CLI was absent. Retry discovery in the new session before claiming live Sheet verification.

## 6. Baseline Verification

```powershell
rtk pnpm install --frozen-lockfile
rtk pnpm check
rtk pnpm test
rtk pnpm build
.\INSTALL.bat
rtk proxy .\.venv\Scripts\python.exe -m pytest server\tests -q
rtk test node validation/test_worksheet_numbering.mjs
rtk test node validation/test_apps_script_security.mjs
rtk test node validation/test_games.mjs
rtk test node validation/test_cv_contract.mjs
rtk proxy python validation/validate_cv_package.py
rtk proxy python validation/validate_release.py
rtk proxy python scripts/build_inventory_index.py --verify
```

Expected baseline:

- TypeScript check passes
- 5 Vitest tests pass
- 7 Flask tests pass
- worksheet numbering/shard, Apps Script security, games and CV validators pass
- inventory verifies 95 rows across 16 pages
- release structural check passes

## 7. Local Run

- ผู้ใช้ทั่วไป: ดับเบิลคลิก `START-ANF3.bat`
- Developer: `rtk pnpm dev` และเปิด Vite URL; Flask API ใช้ `START-SERVER.bat`
- Production local build: `http://127.0.0.1:8000`

ห้ามใส่ mutation token ใน frontend, source, ZIP, screenshot หรือ chat
