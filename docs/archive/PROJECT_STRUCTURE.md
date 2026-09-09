# ANF3 Project Structure — Current Read-only React Release

> The detailed v2 tree below is retained as historical migration context. It is
> not the supported architecture. Current ownership is: `apps/web/` for the React
> UI, `server/` for the localhost PDF/static service, `apps-script-deploy/` for
> the six copy-ready Apps Script projects, and `inventory_catalog.pdf` plus
> `apps/web/public/catalog/` for the local catalog. See `PLAN.md` for the complete
> source-of-truth structure and retirement policy.

## 📁 New Folder Structure

```
water-app/
├── apps-script/                    # ⭐ NEW: Google Apps Script files
│   ├── 00_CONFIG.gs               # Configuration & IDs
│   ├── 01_MAIN_SYNC.gs            # Air sync functions
│   ├── 02_WATER_SYNC.gs           # Water sync functions
│   ├── 03_UTILITIES.gs            # Validation & helpers
│   ├── 04_WORKSHEET_NO.gs         # ⭐ Auto-generate & bidirectional mapping
│   ├── 05_SAMPLES_JSON.gs         # JSON builders
│   ├── 06_UPSERT_LOG.gs           # Database operations
│   ├── 07_TRIGGERS_TEST.gs        # Test functions
│   ├── 08_WEB_APP_API.gs          # ⭐ REST API for water-app
│   └── README.md                  # Script documentation
│
├── special-forms/                  # ⭐ NEW: Modern special forms
│   ├── search.html                # 🔍 Search & Print (with filters)
│   ├── fill-in-values.html        # 📝 Fill-in additional values
│   └── control-values.html        # 🎯 QC control values entry
│
├── js/
│   ├── rpp2-reader.js             # ⭐ NEW: API client for reading RPP2
│   ├── print-*.js                 # ✅ KEEP: Print functions
│   ├── utils.js                   # ✅ KEEP: Utilities
│   ├── db.js                      # ✅ KEEP: IndexedDB (now optional)
│   └── app.js                     # ✅ KEEP: Main app
│
├── _archived/                      # ⭐ NEW: Old files moved here
│   ├── form-*.js                  # ❌ REMOVED: Form modules
│   ├── sync.js                    # ❌ REMOVED: Old sync logic
│   └── index_old.html             # Backup of old homepage
│
├── pw-prw/
│   └── print.html                 # ✅ KEEP: Water PRW/PW print
│
├── wfi-pus/
│   └── print.html                 # ✅ KEEP: Water WFI print
│
├── em-air/
│   └── print.html                 # ✅ KEEP: Air EM print
│
├── compressed-air/
│   └── print.html                 # ✅ KEEP: Air CA print
│
├── server/
│   ├── pdf_server.py              # ✅ KEEP: PDF generation server
│   └── convert_word_to_pdf.py    # ✅ KEEP: Converter
│
├── templates/                      # ✅ KEEP: Word templates
│
├── input/                          # Reference Excel files
│   ├── air-test-form.xlsx
│   ├── water-test-form.xlsx
│   ├── RPP2-air.xlsx
│   ├── RPP2-water.xlsx
│   └── index.json
│
├── index.html                      # ⭐ NEW: Modern homepage
├── DEPLOYMENT_GUIDE.md            # ⭐ NEW: Complete deployment guide
├── ARCHITECTURE_RECOMMENDATIONS.md # ⭐ NEW: UX recommendations
└── README.md                       # Project overview (to be updated)
```

---

## 🔄 What Changed?

### ✅ Added (NEW)

1. **apps-script/** folder
   - All Google Apps Script code
   - Bidirectional sync logic
   - REST API for water-app

2. **special-forms/** folder
   - Search & Print (with filters)
   - Fill-in Values form
   - Control Values form

3. **js/rpp2-reader.js**
   - API client for reading/updating RPP2 data
   - Caching for performance
   - Error handling

4. **Documentation**
   - DEPLOYMENT_GUIDE.md (complete step-by-step)
   - ARCHITECTURE_RECOMMENDATIONS.md (UX best practices)

### ❌ Removed (ARCHIVED)

1. **Form modules** (moved to `_archived/`)
   - js/form-compressed-air.js
   - js/form-em-air.js
   - js/form-pw-prw.js
   - js/form-wfi-pus.js
   - js/form-utils.js

2. **Sync logic** (moved to `_archived/`)
   - js/sync.js (replaced by Apps Script)

3. **Old homepage**
   - index.html (backed up to `_archived/index_old.html`)

### ✅ Kept (UNCHANGED)

1. **Print functions** - Still work as before
   - js/print-*.js
   - pw-prw/print.html
   - wfi-pus/print.html
   - em-air/print.html
   - compressed-air/print.html

2. **PDF Server**
   - server/pdf_server.py
   - server/convert_word_to_pdf.py

3. **Templates & Assets**
   - templates/ folder
   - css/ folder

---

## 🎯 File Responsibilities

### Apps Script Layer (Backend)

| File | Purpose | Key Functions |
|------|---------|---------------|
| 00_CONFIG.gs | Configuration | Spreadsheet IDs, settings |
| 01_MAIN_SYNC.gs | Air sync | syncAirEM(), syncAirCA() |
| 02_WATER_SYNC.gs | Water sync | syncWaterPRW(), syncWaterWFI() |
| 03_UTILITIES.gs | Helpers | readSheetAsObjects(), validate*() |
| 04_WORKSHEET_NO.gs | ⭐ WorksheetNo | generateWorksheetNo(), mapWorksheetNoBack() |
| 05_SAMPLES_JSON.gs | JSON builders | buildAirEMSamplesJson(), etc. |
| 06_UPSERT_LOG.gs | DB operations | upsertTargetRow(), appendLog() |
| 07_TRIGGERS_TEST.gs | Testing | test*(), createDailyTrigger() |
| 08_WEB_APP_API.gs | ⭐ REST API | doGet(), doPost(), handleFetch() |

### Frontend Layer (water-app)

| File | Purpose | API Calls |
|------|---------|-----------|
| special-forms/search.html | Search & filter records | rpp2Reader.search() |
| special-forms/fill-in-values.html | Fill additional fields | rpp2Reader.getRecord(), .updateRecord() |
| special-forms/control-values.html | Enter QC values | rpp2Reader.getRecord(), .updateRecord() |
| js/rpp2-reader.js | API client | Handles all API communication |
| index.html | Homepage | Navigation hub |

---

## 🔌 Data Flow

### Old Flow (v1.0)
```
User → water-app (form) → IndexedDB → sync.js → Google Sheets
```

### New Flow (v2.0)
```
User → Google Sheets (air-test-form, water-test-form)
         ↓
    Apps Script (daily 06:15)
         ↓
    Auto-generate worksheetNo
         ↓
    Upsert to RPP2
         ↓
    Map worksheetNo back to source ⭐ BIDIRECTIONAL
         ↓
    water-app reads from RPP2 (via API)
         ↓
    Special forms update specific fields
```

---

## 🚀 Quick Start for Development

### 1. Test Apps Script Locally

```javascript
// In Apps Script Editor:
testSyncAirEM()
testSyncWaterPRW()
viewAllWorksheetNoCounters()
```

### 2. Test water-app Locally

```bash
# Start Python server (for PDF generation)
cd server
python pdf_server.py

# Open water-app in browser
# Navigate to water-app/index.html
```

### 3. Configure API Connection

1. Deploy Apps Script as Web App
2. Copy Web App URL
3. Open water-app/index.html
4. Click "⚙️ Configure API"
5. Paste URL

---

## 📦 Dependencies

### Apps Script (Backend)
- Google Apps Script runtime
- No external libraries needed
- Uses native: SpreadsheetApp, PropertiesService, ContentService

### water-app (Frontend)
- **No build step required** - Pure HTML/CSS/JS
- Modern browser with ES6 support
- Fetch API (for API calls)
- LocalStorage (for API URL config)

### PDF Server (Optional)
- Python 3.8+
- Flask
- python-docx
- docx2pdf (Windows) or LibreOffice (Linux/Mac)

---

## 🔧 Configuration Files

### Apps Script Configuration

**File:** `apps-script/00_CONFIG.gs`

Key settings to update:
```javascript
CONFIG.SOURCE_AIR_ID = 'YOUR_AIR_TEST_FORM_ID'
CONFIG.SOURCE_WATER_ID = 'YOUR_WATER_TEST_FORM_ID'
CONFIG.TARGET_AIR_ID = 'YOUR_RPP2_AIR_ID'
CONFIG.TARGET_WATER_ID = 'YOUR_RPP2_WATER_ID'
CONFIG.TIMEZONE = 'Asia/Bangkok'
CONFIG.TRIGGER_HOUR = 6
CONFIG.TRIGGER_MINUTE = 15
```

### water-app Configuration

**Stored in:** Browser LocalStorage

Key: `rpp2_script_url`
Value: Apps Script Web App URL

Set via:
- Homepage: Click "⚙️ Configure API"
- JavaScript: `rpp2Reader.setScriptURL('https://...')`

---

## 📊 Data Sources

### Source Sheets (User Input)

| Spreadsheet | Sheet Name | Purpose |
|-------------|------------|---------|
| air-test-form | recordAir | Air EM sampling data |
| air-test-form | recordCA | Air CA sampling data |
| water-test-form | prw-pw | Water PRW/PW sampling data |
| water-test-form | wfi-pus | Water WFI sampling data |

### Target Sheets (Archive)

| Spreadsheet | Sheet Name | Purpose |
|-------------|------------|---------|
| RPP2-air-record | records_em | Air EM archived records |
| RPP2-air-record | records_ca | Air CA archived records |
| RPP2-air-record | logs | Air system logs |
| RPP2-water-record | records_pw_prw | Water PRW/PW archived records |
| RPP2-water-record | records_wfi | Water WFI archived records |
| RPP2-water-record | logs | Water system logs |

---

## 🎨 UI Components

### Special Forms Features

**Search & Filter:**
- Quick filters (Today, Week, Month, All)
- Date range picker
- Building filter
- Form type filter
- Batch selection
- Batch print

**Fill-in Values:**
- Auto-save (every 2 seconds)
- Date validation
- Save status indicator
- Field hints

**Control Values:**
- Real-time validation
- Visual pass/fail indicators
- Range checking
- Color-coded inputs

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Batch Print** - UI ready but implementation pending
2. **Mobile Print** - May require desktop for PDF generation
3. **Offline Mode** - Requires internet for API calls
4. **Large Dataset** - Search may be slow with 1000+ records

### Planned Improvements

- [ ] Implement batch print (merge multiple PDFs)
- [ ] Add dashboard with charts
- [ ] Add export to Excel function
- [ ] Optimize search with pagination
- [ ] Add manual entry form (admin only)

---

## 📝 Migration Notes

### From v1.0 to v2.0

**Breaking Changes:**
- Form entry moved from water-app to Google Sheets
- Old sync.js deprecated
- IndexedDB now optional (used only for cache)

**Data Migration:**
- No data migration needed
- Existing RPP2 data remains unchanged
- Running numbers initialized from existing data

**User Impact:**
- Users must adapt to Google Sheets input
- Print functions remain the same
- Special forms are NEW features

---

## 🔐 Security Considerations

### Apps Script
- Runs with user's Google account permissions
- Access controlled by Google Sheets permissions
- Web App deployed with "Anyone with Google account"
- No sensitive data in script (IDs are not secrets)

### water-app
- API URL stored in LocalStorage (client-side)
- No authentication tokens
- Relies on Apps Script authorization
- CORS handled by Apps Script

---

## 📚 Additional Resources

- [Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API Reference](https://developers.google.com/sheets/api)
- [Fetch API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

---

## 🤝 Contributing

When making changes:

1. **Apps Script:**
   - Test in Apps Script Editor first
   - Run test functions before deploying
   - Document new functions in README.md

2. **water-app:**
   - Test in multiple browsers
   - Ensure mobile responsive
   - Follow existing UI patterns

3. **Documentation:**
   - Update DEPLOYMENT_GUIDE.md for deployment changes
   - Update this file for structure changes
   - Add comments in code for complex logic

---

**Version:** 2.0  
**Last Updated:** 2026-06-05  
**Maintainer:** ANF3 QC Team
