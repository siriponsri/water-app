# ANF3 Laboratory Records — Verification and Final Delivery Gate

**Rule:** Evidence before claims.  
**Environment rule:** Automated/static tests can run offline; production Apps Script/Google authorization tests require controlled owner action and must be labeled honestly.  
**Scope rule:** Games are regression-only and must not be modified.

---

## 1. Test evidence standard

For every command/test, record:

- test ID and description;
- date/time and environment;
- code/release version;
- command or owner action;
- fixture used, without sensitive production data;
- expected result;
- actual result;
- PASS/FAIL/BLOCKED;
- evidence path or screenshot;
- defect/fix/rerun reference.

Do not paste tokens, full deployment URLs, spreadsheet IDs if restricted, record personal data, or absolute sensitive paths into evidence.

---

## 2. Test layers

| Layer | Purpose | Mandatory |
|---|---|---|
| L0 | Repository/scope/secret hygiene | Yes |
| L1 | Static syntax/contract validation | Yes |
| L2 | Unit tests | Yes |
| L3 | Backend/template tests | Yes |
| L4 | Frontend component/router/cache tests | Yes |
| L5 | Test-clone Apps Script integration | Yes before production |
| L6 | Browser E2E/visual/accessibility | Yes |
| L7 | Windows no-code install/start/PDF | Yes on target class PC |
| L8 | Production cutover smoke | Owner action required |

---

## 3. L0 — Repository and scope controls

### 3.1 Games freeze

Before work:

- create `validation/games-baseline.sha256` for `games/**`;
- capture shared-file game route/text/storage behavior.

After work:

- standalone `games/**` hash must match;
- `_archived/frontend-v6/games/**` unchanged;
- `docs/MICRO_LAB_GAMES_IMPLEMENTATION_PLAN.md` unchanged;
- shared-file game diff contains no behavior/text/style/storage/route change;
- existing game tests pass.

Any unapproved game change is a release blocker.

### 3.2 Secret scan

Scan source/release for:

- `ANF3_SYNC_TOKEN` values, bearer/token-like literals;
- `.env` secrets;
- production URLs classified restricted;
- credentials/private keys;
- personal/record data;
- generated logs containing request payloads.

Known key names/template placeholders are allowed; values are not.

### 3.3 Release hygiene

Reject release containing:

- `node_modules`;
- cache/temp/editor files;
- generated Word/PDF records;
- production logs/data exports;
- unreviewed screenshots containing real data;
- duplicate copy-ready Apps Script mirrors;
- test failure artifacts mislabeled as final.

---

## 4. L1 — Static and contract tests

### Frontend

- TypeScript typecheck.
- Production build.
- Unit-test discovery has no `.only`/skipped critical tests.
- No mutation token/env key referenced in browser source/build.
- Route config includes all approved non-game routes and unchanged game routes.
- Three.js is lazy-loaded, not in critical initial chunk where testable.
- No external font/image dependency contrary to policy.

### Six Apps Script files

For every `Code.gs`:

- syntax parse/check;
- role/version/time-zone constants;
- owner setup/verify functions;
- explicit domain/workflow/action allowlists;
- no hardcoded token;
- no arbitrary client-provided target tab/range;
- System mutation uses LockService;
- User writeback uses stable identity;
- errors omit stack/config/token;
- no Games dependency.

Assert exactly six production copy-ready Apps Script files. The SVG `manifest.json` is required for assets, but is not an Apps Script source file and must not be counted as one of the six.

### SVG assets

- `manifest.json` parses and every listed file exists.
- Every SVG parses as XML and has `viewBox`.
- No external URL/script/image reference.
- No embedded production data.
- Asset semantic mapping matches design tokens.
- Orange asset is mapped only to Other Locations; pink asset is disabled reserve labeled `Coming Soon`.
- Manifest covers all audited cabinet, workflow, CV-method, system, and reference assets.
- Render smoke at 1× and 2× scale; no clipping.

### Python/backend

- Dependency install from locked/bounded requirements.
- Syntax/import tests.
- server default bind is `127.0.0.1`.
- debug disabled in production path.
- workflow/template allowlists and request size limit present.

---

## 5. L2 — Unit tests

### Building normalization

Test case/whitespace variants:

- `10`, `B10`, `Building 10` → B10
- equivalent 12/16
- 11, 19, other, blank, unknown → unsegmented/OT
- preserve original building display value
- do not fuzzy-match strings that could misroute

### Worksheet numbers

- AT/AC/WT/WP/CV segmented and unsegmented formats.
- CVR never segmented.
- Bangkok year boundary behavior.
- independent scope by prefix/year/building.
- existing number immutability.
- collision skip produces no duplicate.
- failure after counter advance permits gap, not reuse.
- legacy special Water prefixes preserved.

### Idempotency

- identical request → same record and worksheet number, no duplicate.
- same stable ID + changed allowed field → update, no renumber.
- same stable ID + conflicting domain/workflow → conflict.
- repeated CV parent/sample request → no duplicate parent/children.
- sample reorder follows approved stable sample identity behavior.

### Routing

- Every Air and Water workflow × B10/B12/B16/OT combination.
- unknown workflow/building target cannot escape allowlist.
- legacy mutation rejected.
- update of existing issued record remains in approved current location.

### Frontend policy

- cabinet and list routes are equivalent.
- building filter passes correct normalized value.
- cached record is labeled read-only.
- PDF actions disabled until current-session fresh get.
- offline and service-down states distinguished.
- CV Rinse route is available when the local service reports the approved Water template family and the matching CV adapter capability.
- Pour Plate resolves only to `cleaning-validation-rinse-pour`; Membrane Filtration only to `cleaning-validation-rinse-membrane`.
- CV Rinse route keys and adapters are distinct from Water; the Rinse-PW/PRW and Rinse-WFI/PUS resolved template families intentionally match the approved Water template files.

---

## 6. L3 — Flask/PDF/template tests

### API security

- body over limit → safe rejection.
- unknown workflow → rejection.
- arbitrary template/path/filename → rejection.
- path traversal sequences → rejection.
- invalid `pdfId` → safe not-found.
- absolute path never returned.
- save conflict → 409-style contract/explicit confirmation flow.

### Approved fixture matrix

Use synthetic/approved fixtures for:

- PW/PRW
- WFI/PUS
- Compressed Air
- EM Air
- CV Contact Plate
- CV Rinse — Pour Plate
- CV Rinse — Membrane Filtration

Validate:

- document opens;
- expected template selected;
- worksheet number and key fields appear correctly;
- Thai glyphs/marks are intact;
- sample rows fit/page-break correctly;
- no unresolved placeholder remains;
- generated filename safe;
- preview/download/save behavior works.

CV Rinse with a missing/unknown method, a Water workflow key, or a client-supplied template path must be rejected. Valid Rinse fixtures must select the matching CV-owned adapter and resolve to the approved `pw-prw-template.docx` or `wfi-pus-template.docx` family.

### Microsoft Word target-PC smoke

On Windows deployment class:

- Word installed/support detected;
- conversion completes for each approved template family;
- Word process does not remain orphaned;
- temp/output cleanup behaves safely;
- repeated generation does not overwrite without confirmation.

If this test is not run, mark `OWNER ACTION REQUIRED`; do not claim PDF production readiness.

---

## 7. L4 — Frontend tests

### Router and navigation

- Cabinet binder routes to correct domain/workflow/building.
- List view routes identically.
- browser back preserves filters/selection where specified.
- unknown route has safe home action.
- game routes remain unchanged.

### Search/data

- debounce 250–350 ms.
- superseded request aborted.
- filter change resets cursor.
- limit/cursor encoded safely.
- empty search versus service failure states differ.
- cached results appear only with visible freshness/status.
- fresh get updates cache and action availability.

### PDF actions

- disabled while cached/offline/service unavailable.
- preview generates only after allowed fresh record.
- print/download/save remain separate.
- save conflict asks before overwrite.
- missing local service gives actionable state.

### Health

- Air/Water/CV/local service independently represented.
- `navigator.onLine=true` with failed API does not show all-ready.
- last success time visible.
- retry updates status.

---

## 8. L5 — Test-clone Apps Script integration

Use copies of all six Sheets. Never start with production.

### Common mutation sequence

For each workflow/building fixture:

1. Verify setup PASS.
2. Mark source record ready.
3. Sync once.
4. Confirm correct active store and issued number.
5. Sync identical record again.
6. Confirm no extra row/number/sample.
7. Change one allowed field and sync.
8. Confirm update and immutable number.
9. Change building after issue.
10. Confirm approved mismatch behavior and audit event.
11. Use wrong token.
12. Confirm rejection and zero mutation.

### Air matrix

- EM Air B10/B12/B16/OT.
- Compressed Air B10/B12/B16/OT.
- legacy read search/get.
- legacy mutation rejection.

### Water matrix

- PW/PRW B10/B12/B16/OT.
- WFI/PUS B10/B12/B16/OT.
- legacy special prefix preservation.
- exact missing-tab setup dry-run/apply behavior if applicable.

### CV matrix

- Contact Plate B10/B12/B16/OT with multiple samples.
- Rinse with building data but unsegmented CVR number.
- retry/changed sample set.
- ambiguous mixed group rejection.
- orphan/duplicate verification report.

### Concurrency

Trigger/manual or two controlled clients attempt simultaneous mutations:

- one lock holder completes;
- other receives busy/retry or serializes safely;
- no duplicate number/record/sample;
- log/run IDs distinguish attempts.

### Read API

- health correct domain/version.
- search filters/pagination/bounds.
- get record/samples.
- invalid action/workflow/date/cursor/record key.
- active+legacy aggregation and deterministic duplicate handling.
- no sensitive config in errors.

---

## 9. L6 — Browser E2E, visual, responsive, accessibility

### Viewports

- 1440×900
- 1024×768
- 768×1024
- 414×896
- 375×812
- 320×568

### Required screenshots

- light cabinet 1440;
- dark cabinet 1440;
- cabinet focus/hover state;
- list view;
- 768 simplified cabinet;
- 375 and 320 mobile binders;
- record master-detail 1440;
- record detail 375;
- offline/cached state;
- domain unavailable;
- no-WebGL SVG fallback;
- reduced-motion state.

### Visual assertions

- no horizontal page overflow;
- no clipped Thai vowel/tone mark;
- all binder labels readable without hover;
- shelf baseline/objects do not collide;
- cabinet does not hide behind header;
- icons consistent and sharp;
- dark mode keeps binder distinction and label contrast;
- no fake/placeholder image.

### Accessibility

- keyboard-only route through header, toggle, every binder, search, list, detail, PDF actions;
- visible focus;
- Enter/Space activate binders;
- semantic landmark/headings;
- accessible names include workflow/building;
- no color-only meaning;
- reduced motion honored;
- screen-reader announcements for search count/status;
- modal focus trap/restore;
- 200% zoom;
- touch targets ≥44×44 px.

### Performance

Record:

- initial JS/CSS/asset sizes;
- Three.js lazy chunk size;
- initial shell usability timing on a representative workplace PC;
- cabinet render responsiveness;
- search response behavior under slow network.

Set and document practical budgets from baseline. A large Three.js bundle must not block list/search shell.

---

## 10. L7 — Clean Windows/no-code-owner dry-run

Use a clean or representative owner PC:

1. Extract ZIP into a path with and without spaces.
2. Run installer without administrator rights.
3. Verify clear PASS/error handling.
4. Start app one-click.
5. Confirm browser opens after health ready.
6. Start twice; confirm safe port/process handling.
7. Stop/restart according to guide.
8. Verify endpoint configuration process without developer tooling.
9. Run record search and one approved PDF.
10. Verify logs/troubleshooting path.
11. Follow rollback steps in test environment.

Have a person follow `OWNER.md` without verbal developer help. Any missing assumption is a documentation defect.

---

## 11. L8 — Production cutover smoke

Requires Gate D and owner authorization.

- backups verified;
- six new codes pasted in approved order;
- three System deployments updated with approved access;
- three health endpoints pass;
- three User projects validate correct domain URL/token state;
- one controlled record per supported workflow syncs correctly;
- retries produce no duplicates;
- React reads production current record;
- approved PDF produces correct document;
- triggers enabled only after success;
- next scheduled execution reviewed;
- rollback materials retained.

If production access is unavailable, report this layer as `OWNER ACTION REQUIRED`, not PASS.

---

## 12. Defect severity

| Severity | Meaning | Release effect |
|---|---|---|
| S0 | data loss/corruption, duplicate controlled number, secret exposure, destructive Games change | Block immediately |
| S1 | wrong routing/record/PDF, auth bypass, production workflow unusable | Block release |
| S2 | major UX/accessibility/degraded-state failure with workaround | Fix before release unless owner explicitly defers non-safety item |
| S3 | visual polish/document wording issue | Fix or document with owner agreement |

No S0/S1 open at delivery. Do not downgrade to pass by changing the test expectation after failure.

---

## 13. Final Delivery Gate

Run after all fixes and before packaging. No new features during this gate.

### Code and tests

- [ ] Typecheck/build/tests pass from clean install.
- [ ] Six Apps Script static validators pass.
- [ ] Flask tests and approved PDF fixtures pass.
- [ ] Test-clone integration matrix passes.
- [ ] Browser E2E at all required sizes passes.
- [ ] Accessibility/reduced-motion/no-WebGL passes.
- [ ] Games hash/diff/regression passes.

### Data/security

- [ ] No duplicate-number/idempotency/routing defect.
- [ ] Active/legacy mutation boundary passes.
- [ ] No hardcoded or released secret.
- [ ] Public/read access matches owner decision.
- [ ] Error responses/logs do not leak internals.
- [ ] Release contains no production/generated data.

### Design/assets

- [ ] SVG manifest valid and complete.
- [ ] All supplied assets render correctly.
- [ ] Pink is disabled `Coming Soon`; orange is Other Locations only.
- [ ] All 16 active destinations in the audited matrix exist in Cabinet and List views.
- [ ] CV Rinse adapter and shared Water-template routing tests pass.
- [ ] Cabinet/List semantic parity confirmed.
- [ ] Light/dark/mobile screenshots visually approved.

### No-code ownership

- [ ] Exactly six pasteable Code.gs files.
- [ ] Owner guide names exact functions/menus.
- [ ] Clean Windows dry-run passes.
- [ ] Install/start/update/backup/rollback steps complete.
- [ ] Owner-only production steps clearly labeled.

### Package

- [ ] ZIP inventory reviewed.
- [ ] Apply/overlay and rollback instructions included.
- [ ] Version/build metadata correct.
- [ ] No cache/node_modules/temp/duplicate source.
- [ ] SHA-256 for release recorded.

---

## 14. `validation/FINAL_DELIVERY_REPORT.md` required structure

1. Executive result: PASS / BLOCKED / OWNER ACTION REQUIRED
2. Owner decisions and approval gates
3. Scope completed and Games freeze statement
4. Architecture/deployment selected
5. Six Apps Script inventory and validation
6. Test summary by L0–L8
7. PDF/template matrix
8. Visual/accessibility/performance evidence
9. Security/secret/release hygiene result
10. Open findings/limitations
11. Exact owner production actions remaining
12. Release filename, size, SHA-256, and apply/rollback instructions

The report must distinguish “not tested,” “blocked,” and “failed.” Absence of evidence is not a pass.
