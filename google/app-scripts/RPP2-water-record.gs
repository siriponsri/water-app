/**
 * ============================================
 * WATER RECORD APP - Google Apps Script (RPP2-water-record)
 * Deploy as Web App for API access
 * ============================================
 *
 * Verified against the real sheets (RPP2-water-record.xlsx):
 *   - records_pw_prw_B10/B12/B16/OT : PW / PRW Routine
 *   - records_wfi_B16/OT             : active WFI / PUS Routine
 *   - records_wfi                    : historical WFI records (read-only)
 *   - records_pq_old : PW PQ1-2/OLD      -> prefix PQ-OLD-XXXX (no reset)
 *   - records_pq_ocl : PW PQ1-2/OCL      -> prefix PQ-OCL-XXXX (no reset)
 *   - records_ra6    : PW RAMA6          -> prefix RA6-XXXX    (no reset)
 *   - records_wfi_pq : WFI PQ            -> prefix WP-PQ-XXXX  (ASSUMPTION - no live data yet)
 *
 * FLOW (driven by sync-master):
 *   1. Master Sync POSTs {action:'saveRecord', data:{...}} WITHOUT worksheetNo.
 *   2. This app resolves the target sheet from formType + recordStatus.
 *   3. This app AUTO-GENERATES worksheetNo with the correct prefix.
 *   4. This app RETURNS { success:true, worksheetNo:"WT-26-B10-0001", sheetName:"..." }.
 *   5. Master Sync writes worksheetNo back to the dashboard.
 *
 * Routing is decided HERE (server-side), so the dashboard only needs to send
 * formType ('PW-PRW' | 'PW' | 'WFI-PUS'), recordStatus, and building.
 * New routine records are routed to building-specific active tabs. The
 * unsuffixed routine tabs are legacy read-only backups.
 */

const ANF3_API_VERSION = '2026-09-02';
const ANF3_IMPLEMENTATION_VERSION = '7.1.0';
const ANF3_TIME_ZONE = 'Asia/Bangkok';
const ANF3_DOMAIN = 'water';
const ANF3_SETUP_VERSION_PROPERTY = 'ANF3_SETUP_VERSION';
const ANF3_COUNTER_APPLY_PROPERTY = 'ANF3_COUNTER_APPLY_ENABLED';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  SPREADSHEET_ID: '1aeMOagZPkoVA_LJxjVvmUL59cMtTTicUH5NzuYEhyY0',
  MASTER_DATA_SHEET: 'database',

  // PW / PRW record sheets
  RECORDS_ROUTINE_SHEET: 'records_pw_prw',   // Routine (WT)
  RECORDS_ROUTINE_ACTIVE: ['records_pw_prw_B10', 'records_pw_prw_B12', 'records_pw_prw_B16', 'records_pw_prw_OT'],
  RECORDS_PQ_OLD_SHEET:  'records_pq_old',   // PQ1-2/OLD
  RECORDS_PQ_OCL_SHEET:  'records_pq_ocl',   // PQ1-2/OCL
  RECORDS_RA6_SHEET:     'records_ra6',      // RAMA6

  // WFI / PUS record sheets
  RECORDS_WFI_SHEET:     'records_wfi',      // WFI Routine (WP)
  RECORDS_WFI_ACTIVE:    ['records_wfi_B16', 'records_wfi_OT'],
  RECORDS_WFI_PQ_SHEET:  'records_wfi_pq',   // WFI PQ

  LOGS_SHEET: 'logs',

  // Headers for PW/PRW record sheets (24 cols)
  RECORD_HEADERS: [
    'worksheetNo', 'formType', 'recordStatus', 'building', 'samplingDate', 'performedDate',
    'temp', 'incNo', 'rightEM', 'leftEM', 'negativeValue',
    'lotTSA', 'lotPCA', 'lotPlate', 'lotPipette',
    'determinedDate', 'concludedDate', 'approvedDate', 'docNo',
    'comment', 'samplesJson', 'createdAt', 'updatedAt', 'createdBy'
  ],

  // Headers for WFI/PUS record sheets (27 cols)
  WFI_RECORD_HEADERS: [
    'worksheetNo', 'formType', 'recordStatus', 'building', 'samplingDate', 'performedDate',
    'temp', 'incNo', 'rightHand', 'leftHand', 'rightEM', 'leftEM', 'negativeValue',
    'lotBuffer', 'lotTSA', 'lotPCA', 'lotPMembrane', 'lotForceps',
    'determinedDate', 'concludedDate', 'approvedDate', 'docNo',
    'comment', 'samplesJson', 'createdAt', 'updatedAt', 'createdBy'
  ],

  // Appended only by setupWaterSystem after the owner has backed up the clone.
  IDENTITY_HEADERS: ['anf3SourceRecordId', 'anf3Fingerprint', 'anf3SyncVersion'],

  // operatorName/operatorCode were added in v7.1o. An existing logs sheet
  // keeps its 5 headers; addLog() widens it in place on the next write.
  LOG_HEADERS: ['timestamp', 'action', 'worksheetNo', 'username', 'details', 'operatorName', 'operatorCode']
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('ANF3 Water System')
    .addItem('1) Check schema / configuration', 'verifyWaterSystemSetup')
    .addItem('2) Setup approved active tabs', 'setupWaterSystem')
    .addItem('3) Test health / search / get', 'testWaterHealth')
    .addItem('4) Dry-run duplicate / counters', 'reconcileWaterCountersDryRun')
    .addSeparator()
    .addItem('Admin: apply counter reconciliation', 'applyWaterCounterReconciliation')
    .addToUi();
}

function setupWaterSystem() {
  setupWaterActiveRecordSheets();
  PropertiesService.getScriptProperties().setProperty(ANF3_SETUP_VERSION_PROPERTY, ANF3_IMPLEMENTATION_VERSION);
  return verifyWaterSystemSetup();
}

function setupWaterActiveRecordSheets() {
  const spreadsheet = getWaterSpreadsheet_();
  CONFIG.RECORDS_ROUTINE_ACTIVE.forEach(name => ensureWaterShard_(spreadsheet, name, CONFIG.RECORD_HEADERS));
  CONFIG.RECORDS_WFI_ACTIVE.forEach(name => ensureWaterShard_(spreadsheet, name, CONFIG.WFI_RECORD_HEADERS));
  SpreadsheetApp.getUi().alert('Water active record sheets: PASS');
}

function ensureWaterShard_(spreadsheet, name, requiredHeaders) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.setFrozenRows(1);
  }
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), requiredHeaders.length)).getValues()[0];
  requiredHeaders.forEach((header, index) => {
    if (String(headers[index] || '').trim() !== header) throw new Error(name + ' column ' + (index + 1) + ' must be ' + header);
  });
  CONFIG.IDENTITY_HEADERS.forEach(header => {
    if (headers.indexOf(header) < 0) {
      headers.push(header);
      sheet.getRange(1, headers.length).setValue(header).setFontWeight('bold');
    }
  });
  return sheet;
}

function verifyWaterSystemSetup() {
  const spreadsheet = getWaterSpreadsheet_();
  const checks = [];
  const required = [
    [CONFIG.RECORDS_WFI_SHEET, CONFIG.WFI_RECORD_HEADERS]
  ];
  CONFIG.RECORDS_ROUTINE_ACTIVE.forEach(name => required.push([name, CONFIG.RECORD_HEADERS]));
  CONFIG.RECORDS_WFI_ACTIVE.forEach(name => required.push([name, CONFIG.WFI_RECORD_HEADERS]));
  [CONFIG.RECORDS_PQ_OLD_SHEET, CONFIG.RECORDS_PQ_OCL_SHEET, CONFIG.RECORDS_RA6_SHEET, CONFIG.RECORDS_WFI_PQ_SHEET].forEach(name => required.push([name, null]));
  required.forEach(item => checks.push(verifyWaterSheet_(spreadsheet, item[0], item[1], item[1] !== null && item[0] !== CONFIG.RECORDS_WFI_SHEET)));
  const properties = PropertiesService.getScriptProperties();
  checks.push({ name: 'setup version', ok: Boolean(properties.getProperty(ANF3_SETUP_VERSION_PROPERTY)), detail: properties.getProperty(ANF3_SETUP_VERSION_PROPERTY) || 'not recorded' });
  const duplicates = countWaterDuplicateWorksheetNos_(spreadsheet);
  checks.push({ name: 'duplicate issued numbers', ok: duplicates === 0, detail: String(duplicates) });
  const report = { ok: checks.every(check => check.ok), domain: ANF3_DOMAIN, implementationVersion: ANF3_IMPLEMENTATION_VERSION, checks: checks };
  Logger.log(JSON.stringify(report));
  return report;
}

function verifyWaterSheet_(spreadsheet, name, requiredHeaders, active) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) return { name: name, ok: requiredHeaders === null, detail: requiredHeaders === null ? 'legacy tab absent' : 'missing' };
  if (!requiredHeaders) return { name: name, ok: true, detail: 'legacy read-only' };
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(value => String(value || '').trim());
  const missing = requiredHeaders.concat(active ? CONFIG.IDENTITY_HEADERS : []).filter(header => headers.indexOf(header) < 0);
  return { name: name, ok: missing.length === 0, detail: missing.length ? 'missing: ' + missing.join(', ') : 'ready' };
}

function countWaterDuplicateWorksheetNos_(spreadsheet) {
  const seen = {};
  const duplicates = {};
  CONFIG.RECORDS_ROUTINE_ACTIVE.concat(CONFIG.RECORDS_WFI_ACTIVE, [CONFIG.RECORDS_WFI_SHEET, CONFIG.RECORDS_PQ_OLD_SHEET, CONFIG.RECORDS_PQ_OCL_SHEET, CONFIG.RECORDS_RA6_SHEET, CONFIG.RECORDS_WFI_PQ_SHEET]).forEach(name => {
    const sheet = spreadsheet.getSheetByName(name);
    if (!sheet || sheet.getLastRow() < 2) return;
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().forEach(row => {
      const key = String(row[0] || '').trim();
      if (!key) return;
      if (seen[key]) duplicates[key] = true;
      seen[key] = name;
    });
  });
  return Object.keys(duplicates).length;
}

// ============================================
// WEB APP ENTRY POINTS
// ============================================
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = String(params.action || 'ping').toLowerCase();
  try {
    if (action === 'search') return searchWaterResponse_(params);
    if (action === 'get') return getWaterResponse_(params);
    let result;
    switch (action) {
      case 'ping':
        result = { success: true, message: 'Water Record API is running' };
        break;
      case 'getMasterData':
        result = { success: true, data: getMasterData() };
        break;
      case 'getRecords':
        result = { success: true, data: getRecords(params.status || 'Routine', params.sheetName || null) };
        break;
      case 'getRecord':
        result = { success: true, data: getRecord(params.worksheetNo, params.status || 'Routine', params.sheetName || null) };
        break;
      case 'pull':
        result = { success: true, data: getRecords(params.status || 'Routine', params.sheetName || null) };
        break;
      case 'getNextDocNo':
        result = { success: true, data: getNextDocNo(params.status || 'Routine', params.sheetName || null, params.formType || '', params.building || '') };
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
    return jsonResponse_(result, result.success === false ? 400 : 200);
  } catch (error) {
    return jsonResponse_({ success: false, error: safeError_(error) }, 400);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error('JSON body is required');
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'sync';
    if (['sync', 'saveRecord', 'deleteRecord', 'log'].indexOf(action) < 0) throw new Error('Unsupported mutation action');
    const lock = LockService.getScriptLock();
    try { lock.waitLock(30000); } catch (error) { throw new Error('BUSY_RETRY'); }
    let result;
    try { switch (action) {
      case 'sync':
        result = syncRecords(data.items, data.username);
        break;
      case 'saveRecord':
        result = saveRecord(data.record || data.data);
        break;
      case 'deleteRecord':
        result = deleteRecord(data.worksheetNo);
        break;
      case 'log':
        result = addLog(data.log);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }} finally { lock.releaseLock(); }
    return jsonResponse_(result, result.success === false ? 400 : 200);
  } catch (error) {
    return jsonResponse_({ success: false, error: safeError_(error) }, 400);
  }
}

function createCORSResponse(data) {
  return jsonResponse_(data, data && data.success === false ? 400 : 200);
}

function doOptions(e) { return createCORSResponse({}); }

/**
 * Delete a record by worksheetNo from the given sheet.
 * Not-found is treated as success (already gone).
 */
function deleteRecord(worksheetNo, sheetName) {
  if (!worksheetNo) return { success: false, error: 'worksheetNo required' };
  const target = targetFromWorksheetNo_(worksheetNo);
  if (!target) return { success: false, error: 'Unsupported Water worksheet number' };
  const location = findWaterRecordLocation_(worksheetNo, target);
  if (!location) return { success: true, deleted: 0, worksheetNo: worksheetNo };
  if (location.legacy) return { success: false, error: 'Legacy backup records are read-only', worksheetNo: worksheetNo };
  const sheet = getWaterSheetByName(location.sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(worksheetNo)) {
      sheet.deleteRow(i + 1);
      return { success: true, deleted: 1, worksheetNo: worksheetNo };
    }
  }
  return { success: true, deleted: 0, worksheetNo: worksheetNo };
}

// ============================================
// TARGET RESOLUTION (sheet + worksheetNo prefix)
// ============================================
/**
 * Decide which records sheet + prefix to use.
 * Priority: explicit sheetName  >  formType+recordStatus.
 */
function resolveWaterTarget(formType, recordStatus, explicitSheetName) {
  if (explicitSheetName) return targetFromSheet(explicitSheetName);

  const ft = String(formType || '').toUpperCase();
  const status = recordStatus || 'Routine';
  const isWFI = ft.indexOf('WFI') !== -1 || ft.indexOf('PUS') !== -1;

  if (isWFI) {
    // WFI/PUS always -> records_wfi (WP-YY-XXXX), regardless of the recordStatus label
    // (recordStatus values like "PQ3-Day1", "Speacial" are tags, not a reason to split numbering)
    return targetFromSheet(CONFIG.RECORDS_WFI_SHEET);
  }
  switch (status) {
    case 'PQ1-2/OLD': return targetFromSheet(CONFIG.RECORDS_PQ_OLD_SHEET);
    case 'PQ1-2/OCL': return targetFromSheet(CONFIG.RECORDS_PQ_OCL_SHEET);
    case 'RAMA6':     return targetFromSheet(CONFIG.RECORDS_RA6_SHEET);
    case 'Routine':
    default:          return targetFromSheet(CONFIG.RECORDS_ROUTINE_SHEET);
  }
}

function targetFromSheet(sheetName) {
  if (CONFIG.RECORDS_ROUTINE_ACTIVE.indexOf(sheetName) >= 0) return { sheetName: sheetName, prefix: 'WT', yearReset: true, legacy: false, family: 'pw-prw' };
  if (CONFIG.RECORDS_WFI_ACTIVE.indexOf(sheetName) >= 0) return { sheetName: sheetName, prefix: 'WP', yearReset: true, legacy: false, family: 'wfi-pus' };
  switch (sheetName) {
    case CONFIG.RECORDS_WFI_SHEET:    return { sheetName: sheetName, prefix: 'WP',     yearReset: true, legacy: true, family: 'wfi-pus' };
    case CONFIG.RECORDS_WFI_PQ_SHEET: return { sheetName: sheetName, prefix: 'WP-PQ',  yearReset: false };
    case CONFIG.RECORDS_PQ_OLD_SHEET: return { sheetName: sheetName, prefix: 'PQ-OLD', yearReset: false };
    case CONFIG.RECORDS_PQ_OCL_SHEET: return { sheetName: sheetName, prefix: 'PQ-OCL', yearReset: false };
    case CONFIG.RECORDS_RA6_SHEET:    return { sheetName: sheetName, prefix: 'RA6',    yearReset: false };
    case CONFIG.RECORDS_ROUTINE_SHEET: return { sheetName: sheetName, prefix: 'WT', yearReset: true, legacy: true, family: 'pw-prw' };
    default: throw new Error('Unsupported Water sheet');
  }
}

function waterWorkflowFromRecord_(record) {
  const value = String(record && (record.workflow || record.formType) || '').trim().toLowerCase().replace(/[ _]/g, '-');
  if (value === 'pw-prw' || value === 'pw' || value === 'prw' || value === 'water-prw') return 'pw-prw';
  if (value === 'wfi-pus' || value === 'wfi' || value === 'pus' || value === 'water-wfi') return 'wfi-pus';
  throw new Error('Unsupported Water workflow');
}

function waterTargetForWorkflow_(workflow) {
  return workflow === 'wfi-pus'
    ? targetFromSheet(CONFIG.RECORDS_WFI_SHEET)
    : targetFromSheet(CONFIG.RECORDS_ROUTINE_SHEET);
}

function targetFromWorksheetNo_(worksheetNo) {
  const value = String(worksheetNo || '').trim().toUpperCase();
  if (value.indexOf('WT-') === 0) return targetFromSheet(CONFIG.RECORDS_ROUTINE_SHEET);
  if (value.indexOf('WP-') === 0 && value.indexOf('WP-PQ-') !== 0) return targetFromSheet(CONFIG.RECORDS_WFI_SHEET);
  if (value.indexOf('WP-PQ-') === 0) return targetFromSheet(CONFIG.RECORDS_WFI_PQ_SHEET);
  if (value.indexOf('PQ-OLD-') === 0) return targetFromSheet(CONFIG.RECORDS_PQ_OLD_SHEET);
  if (value.indexOf('PQ-OCL-') === 0) return targetFromSheet(CONFIG.RECORDS_PQ_OCL_SHEET);
  if (value.indexOf('RA6-') === 0) return targetFromSheet(CONFIG.RECORDS_RA6_SHEET);
  return null;
}

// ============================================
// MASTER DATA
// ============================================
function getMasterData() {
  const ss = getWaterSpreadsheet_();
  const sheet = ss.getSheetByName(CONFIG.MASTER_DATA_SHEET);
  if (!sheet) throw new Error('Master data sheet not found');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

// ============================================
// RECORDS
// ============================================
/**
 * Get/create a record sheet by name, choosing PW or WFI headers automatically.
 */
function getWaterSheetByName(sheetName) {
  targetFromSheet(sheetName);
  const ss = getWaterSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Required Water sheet not found: ' + sheetName);
  return sheet;
}

/** Back-compat helper: resolve sheet from status (or explicit name). */
function getRecordsSheet(status, directSheetName) {
  if (directSheetName) return getWaterSheetByName(directSheetName);
  const target = resolveWaterTarget('', status, null);
  return getWaterSheetByName(target.sheetName);
}

function getRecords(status, sheetName) {
  if (sheetName === CONFIG.RECORDS_ROUTINE_SHEET) {
    return CONFIG.RECORDS_ROUTINE_ACTIVE.reduce((records, name) => records.concat(getRecords(status, name)), []);
  }
  const sheet = getRecordsSheet(status || 'Routine', sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      if (h === 'samplesJson') {
        try { obj.samples = JSON.parse(row[i] || '[]'); } catch (err) { obj.samples = []; }
      } else {
        obj[h] = row[i];
      }
    });
    return obj;
  });
}

function getRecord(worksheetNo, status, sheetName) {
  if (sheetName === CONFIG.RECORDS_ROUTINE_SHEET) {
    return getRecords(status, sheetName).find(r => String(r.worksheetNo) === String(worksheetNo)) || null;
  }
  const records = getRecords(status || 'Routine', sheetName);
  return records.find(r => String(r.worksheetNo) === String(worksheetNo)) || null;
}

/**
 * Save a single record (insert or update). AUTO-GENERATES worksheetNo if empty.
 */
function saveRecord(record, ignoredSheetName) {
  const source = record && typeof record === 'object' ? record : {};
  const workflow = waterWorkflowFromRecord_(source);
  const sourceRecordId = String(source.sourceRecordId || source.anf3SourceRecordId || '').trim();
  if (!sourceRecordId) throw new Error('sourceRecordId is required');
  const requestedTarget = waterTargetForWorkflow_(workflow);
  const existingByNumber = source.worksheetNo ? findWaterRecordByWorksheet_(source.worksheetNo) : null;
  const existingByIdentity = findWaterRecordBySourceId_(sourceRecordId, requestedTarget.family);
  if (existingByNumber && existingByIdentity && existingByNumber.sheetName !== existingByIdentity.sheetName) throw new Error('CONFLICT');
  const existingLocation = existingByNumber || existingByIdentity;
  if (existingLocation && existingLocation.legacy) throw new Error('Legacy backup records are read-only');
  const target = existingLocation ? targetFromSheet(existingLocation.sheetName) : targetFromSheet(waterActiveSheet_(requestedTarget, source.building));
  const sheet = getWaterSheetByName(target.sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  assertIdentityHeaders_(headers);
  record = sanitizeRecord_(source, headers);
  record.formType = workflow;
  record.anf3SourceRecordId = sourceRecordId;
  record.anf3Fingerprint = String(source.anf3Fingerprint || source.sourceFingerprint || fingerprintWaterRecord_(source));
  record.anf3SyncVersion = Number((existingLocation && existingLocation.record && existingLocation.record.anf3SyncVersion) || 0) + 1;

  if (existingLocation && source.worksheetNo && String(existingLocation.record.worksheetNo) !== String(source.worksheetNo)) throw new Error('CONFLICT');
  if (existingLocation && existingLocation.record.anf3SourceRecordId && String(existingLocation.record.anf3SourceRecordId) !== sourceRecordId) throw new Error('CONFLICT');
  if (existingLocation && existingLocation.record.anf3Fingerprint && existingLocation.record.anf3Fingerprint === record.anf3Fingerprint) {
    return { success: true, action: 'no_change', worksheetNo: existingLocation.record.worksheetNo, docNo: existingLocation.record.docNo || existingLocation.record.worksheetNo, sheetName: existingLocation.sheetName };
  }

  if (!record.worksheetNo || record.worksheetNo === '') {
    const next = getNextDocNo(record.recordStatus, target.sheetName, record.formType, record.building);
    record.worksheetNo = next.nextDocNo;
    record.docNo = next.nextDocNo;
  }

  // Find existing row by worksheetNo (column 0)
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(record.worksheetNo)) { rowIndex = i + 1; break; }
  }

  const rowData = headers.map(h => {
    if (h === 'samplesJson') return JSON.stringify(record.samples || []);
    return (record[h] !== undefined && record[h] !== null) ? record[h] : '';
  });

  if (rowIndex > 0) {
    const mismatch = target.yearReset ? worksheetBuildingMismatch_(record.worksheetNo, record.building, target.prefix) : '';
    if (mismatch) addLog({ action: 'WORKSHEET_BUILDING_MISMATCH', worksheetNo: record.worksheetNo, username: record.createdBy || '', details: mismatch });
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    return { success: true, action: 'updated', worksheetNo: record.worksheetNo, docNo: record.docNo, sheetName: target.sheetName };
  }
  sheet.appendRow(rowData);
  return { success: true, action: 'inserted', worksheetNo: record.worksheetNo, docNo: record.docNo, sheetName: target.sheetName };
}

/**
 * Sync multiple records (optional batch endpoint; master uses saveRecord).
 */
function syncRecords(items, username) {
  const results = [];
  (items || []).forEach(item => {
    try {
      if (item.action === 'upsert' || !item.action) {
          const result = saveRecord(item.data);
        results.push(result);
        addLog({ action: 'SYNC_' + result.action.toUpperCase(), worksheetNo: result.worksheetNo, username: username });
      }
    } catch (error) {
      results.push({ success: false, worksheetNo: item.worksheetNo, error: error.message });
    }
  });
  return { success: true, synced: results.length, results: results };
}

// ============================================
// NEXT DOCUMENT NUMBER
// ============================================
function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/**
 * Next worksheetNo for the resolved target sheet.
 * Yearly-reset prefixes only count current-year rows.
 */
function getNextDocNo(status, sheetName, formType, building) {
  const target = resolveWaterTarget(formType, status, sheetName);
  const sheet = getWaterSheetByName(target.sheetName);
  const data = sheet.getDataRange().getValues();
  const year = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yy');
  const buildingSegment = target.yearReset ? normalizeBuildingSegment_(building) : '';

  let maxSeq = 0;
  if (data.length > 1) {
    const headers = data[0];
    const docNoIndex = headers.indexOf('docNo');
    const pre = escapeRegExp(target.prefix);
    const pattern = target.yearReset
      ? new RegExp('^' + pre + '-' + year + '-' + (buildingSegment ? buildingSegment + '-' : '') + '(\\d{4})$')
      : new RegExp('^' + pre + '-(\\d{4})$');

    data.slice(1).forEach(row => {
      const rawDoc = String((docNoIndex !== -1 ? row[docNoIndex] : '') || '');
      const rawWs = String(row[0] || '');
      const doc = rawDoc.charAt(0) === "'" ? rawDoc.slice(1) : rawDoc;
      const ws = rawWs.charAt(0) === "'" ? rawWs.slice(1) : rawWs;
      const ref = doc || ws;
      const m = ref.match(pattern);
      if (m) { const seq = parseInt(m[1], 10); if (seq > maxSeq) maxSeq = seq; }
    });
  }

  const nextSeq = maxSeq + 1;
  const seqStr = String(nextSeq).padStart(4, '0');
  const nextDocNo = target.yearReset
    ? target.prefix + '-' + year + '-' + (buildingSegment ? buildingSegment + '-' : '') + seqStr
    : target.prefix + '-' + seqStr;

  return {
    status: status || 'Routine',
    formType: formType || '',
    sheetName: target.sheetName,
    prefix: target.prefix,
    yearReset: target.yearReset,
    maxSeq: maxSeq,
    nextSeq: nextSeq,
    buildingSegment: buildingSegment,
    nextDocNo: nextDocNo
  };
}

function normalizeBuildingSegment_(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/[ _-]+/g, '');
  const match = normalized.match(/^(?:BUILDING|BLDG|BLD|B)?(10|12|16)$/);
  return match ? 'B' + match[1] : '';
}

function worksheetBuildingMismatch_(worksheetNo, building, prefix) {
  const number = String(worksheetNo || '').trim().toUpperCase();
  const match = number.match(new RegExp('^' + escapeRegExp(prefix) + '-\\d{2}-(?:(B10|B12|B16)-)?\\d{4}$'));
  if (!match) return '';
  const numberSegment = match[1] || '';
  const currentSegment = normalizeBuildingSegment_(building);
  return numberSegment === currentSegment ? '' : 'numberBuilding=' + (numberSegment || 'OTHER') + '; currentBuilding=' + (currentSegment || 'OTHER');
}

// ============================================
// LOGS
// ============================================
function getLogsSheet() {
  const ss = getWaterSpreadsheet_();
  let sheet = ss.getSheetByName(CONFIG.LOGS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.LOGS_SHEET);
    sheet.appendRow(CONFIG.LOG_HEADERS);
    sheet.getRange(1, 1, 1, CONFIG.LOG_HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function addLog(log) {
  const sheet = getLogsSheet();
  ensureLogHeaders_(sheet);
  sheet.appendRow([
    new Date().toISOString(),
    log.action || '',
    log.worksheetNo || '',
    // The readable form, "name (code)". The code is repeated in its own
    // column so the sheet can be filtered by person without parsing names --
    // the failure mode the free-text `createdBy` column already demonstrates.
    log.username || '',
    log.details || '',
    log.operatorName || '',
    log.operatorCode || ''
  ]);
  return { success: true };
}

/**
 * A logs sheet created before v7.1o has 5 headers. Widen it once, in place,
 * so the two new columns are labelled instead of arriving as bare F and G.
 * Existing rows keep their values; only the header row is touched.
 */
function ensureLogHeaders_(sheet) {
  const wanted = CONFIG.LOG_HEADERS;
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(wanted);
    sheet.getRange(1, 1, 1, wanted.length).setFontWeight('bold');
    return;
  }
  const width = sheet.getLastColumn();
  if (width >= wanted.length) return;
  sheet.getRange(1, width + 1, 1, wanted.length - width)
    .setValues([wanted.slice(width)])
    .setFontWeight('bold');
}

// ============================================
// TEST
// ============================================
function testSetup() {
  Logger.log('PW Routine next: ' + getNextDocNo('Routine', null, 'PW-PRW').nextDocNo);
  Logger.log('WFI Routine next: ' + getNextDocNo('Routine', null, 'WFI-PUS').nextDocNo);
  Logger.log('Master data records: ' + getMasterData().length);
}

function testWaterHealth() {
  const result = { ok: true, service: 'ANF3 Water System', domain: ANF3_DOMAIN, implementationVersion: ANF3_IMPLEMENTATION_VERSION, timeZone: ANF3_TIME_ZONE };
  Logger.log(JSON.stringify(result));
  SpreadsheetApp.getUi().alert('Water health: PASS');
  return result;
}

function testWaterSearch() {
  const result = searchWaterResponse_({ workflow: 'pw-prw', limit: '1' });
  Logger.log(result.getContent());
  return result;
}

function testWaterGet() {
  const result = searchWaterResponse_({ workflow: 'wfi-pus', limit: '1' });
  Logger.log(result.getContent());
  return result;
}

function reconcileWaterCountersDryRun() {
  const spreadsheet = getWaterSpreadsheet_();
  const rows = [];
  [['pw-prw', 'WT', CONFIG.RECORDS_ROUTINE_ACTIVE], ['wfi-pus', 'WP', CONFIG.RECORDS_WFI_ACTIVE]].forEach(item => {
    item[2].forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      const highest = sheet ? highestWaterSequence_(sheet, item[1]) : 0;
      rows.push({ workflow: item[0], sheetName: sheetName, highestSequence: highest, nextSequence: highest + 1 });
    });
  });
  Logger.log(JSON.stringify(rows));
  return rows;
}

function applyWaterCounterReconciliation() {
  const ui = SpreadsheetApp.getUi();
  const enabled = PropertiesService.getScriptProperties().getProperty(ANF3_COUNTER_APPLY_PROPERTY) === 'YES';
  if (!enabled) throw new Error('Counter apply is disabled. Set the owner-controlled gate property after backup and Gate D approval.');
  if (ui.alert('Apply Water counter reconciliation?', 'This writes only counter properties after the owner has approved the cutover.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  reconcileWaterCountersDryRun().forEach(row => PropertiesService.getScriptProperties().setProperty('ANF3_COUNTER_' + row.workflow + '_' + row.sheetName, String(row.highestSequence)));
  ui.alert('Water counters updated. Record the change in the cutover evidence.');
}

function highestWaterSequence_(sheet, prefix) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  const pattern = new RegExp('^' + escapeRegExp(prefix) + '-[^-]+-(?:B10|B12|B16)-?(\\d{4})$|^' + escapeRegExp(prefix) + '-[^-]+-(\\d{4})$');
  let highest = 0;
  values.forEach(row => {
    const match = String(row[0] || '').trim().toUpperCase().match(pattern);
    if (match) highest = Math.max(highest, Number(match[1] || match[2] || 0));
  });
  return highest;
}

// ============================================
// ANF3 READ CONTRACT + MUTATION SECURITY
// ============================================
function waterWorkflowSheets_(workflow) {
  const key = String(workflow || '').toLowerCase();
  if (key === 'pw-prw') return CONFIG.RECORDS_ROUTINE_ACTIVE.concat([CONFIG.RECORDS_ROUTINE_SHEET, CONFIG.RECORDS_PQ_OLD_SHEET, CONFIG.RECORDS_PQ_OCL_SHEET, CONFIG.RECORDS_RA6_SHEET]);
  if (key === 'wfi-pus') return CONFIG.RECORDS_WFI_ACTIVE.concat([CONFIG.RECORDS_WFI_SHEET, CONFIG.RECORDS_WFI_PQ_SHEET]);
  throw new Error('Unsupported Water workflow');
}

function waterActiveSheet_(target, building) {
  if (!target.yearReset || target.legacy === false) return target.sheetName;
  const segment = normalizeBuildingSegment_(building);
  if (target.family === 'pw-prw') {
    const suffix = segment || 'OT';
    const pwTarget = CONFIG.RECORDS_ROUTINE_ACTIVE.find(name => name.endsWith('_' + suffix));
    if (pwTarget) return pwTarget;
  }
  if (target.family === 'wfi-pus') {
    const suffix = segment === 'B16' ? 'B16' : 'OT';
    const wfiTarget = CONFIG.RECORDS_WFI_ACTIVE.find(name => name.endsWith('_' + suffix));
    if (wfiTarget) return wfiTarget;
  }
  throw new Error('No active Water sheet for target');
}

function waterTargetSheets_(target) {
  if (target.family === 'pw-prw') return CONFIG.RECORDS_ROUTINE_ACTIVE;
  if (target.family === 'wfi-pus') return CONFIG.RECORDS_WFI_ACTIVE.concat([CONFIG.RECORDS_WFI_SHEET]);
  return [target.sheetName];
}

function findWaterRecordLocation_(worksheetNo, target) {
  const sheets = waterTargetSheets_(target);
  for (let index = 0; index < sheets.length; index += 1) {
    const record = getRecord(worksheetNo, 'Routine', sheets[index]);
    if (record) {
      const located = targetFromSheet(sheets[index]);
      return { record: record, sheetName: sheets[index], legacy: located.legacy === true };
    }
  }
  return null;
}

function findWaterRecordByWorksheet_(worksheetNo) {
  const target = targetFromWorksheetNo_(worksheetNo);
  if (!target) return null;
  const sheets = waterTargetSheets_(target);
  for (let index = 0; index < sheets.length; index += 1) {
    const record = getRecord(worksheetNo, 'Routine', sheets[index]);
    if (record) {
      const located = targetFromSheet(sheets[index]);
      return { record: record, sheetName: sheets[index], legacy: located.legacy === true };
    }
  }
  return null;
}

function findWaterRecordBySourceId_(sourceRecordId, family) {
  const sheets = family === 'wfi-pus'
    ? CONFIG.RECORDS_WFI_ACTIVE.concat([CONFIG.RECORDS_WFI_SHEET])
    : CONFIG.RECORDS_ROUTINE_ACTIVE.concat([CONFIG.RECORDS_ROUTINE_SHEET]);
  for (let index = 0; index < sheets.length; index += 1) {
    const record = getRecords('Routine', sheets[index]).find(item => String(item.anf3SourceRecordId || '') === String(sourceRecordId));
    if (record) return { record: record, sheetName: sheets[index], legacy: index === sheets.length - 1 };
  }
  return null;
}

function getWaterSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  return active && active.getId() === CONFIG.SPREADSHEET_ID ? active : SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function sanitizeRecord_(record, headers) {
  const source = record && typeof record === 'object' ? record : {};
  const clean = {};
  headers.forEach(header => {
    if (header === 'samplesJson') return;
    if (Object.prototype.hasOwnProperty.call(source, header)) clean[header] = source[header];
  });
  if (source.sourceRecordId !== undefined) clean.anf3SourceRecordId = String(source.sourceRecordId).trim();
  if (source.anf3SourceRecordId !== undefined) clean.anf3SourceRecordId = String(source.anf3SourceRecordId).trim();
  if (source.sourceFingerprint !== undefined) clean.anf3Fingerprint = String(source.sourceFingerprint);
  if (source.anf3Fingerprint !== undefined) clean.anf3Fingerprint = String(source.anf3Fingerprint);
  clean.samples = Array.isArray(source.samples) ? source.samples : [];
  return clean;
}

function assertIdentityHeaders_(headers) {
  const missing = CONFIG.IDENTITY_HEADERS.filter(header => headers.indexOf(header) < 0);
  if (missing.length) throw new Error('Run setupWaterSystem first: missing identity columns');
}

function fingerprintWaterRecord_(record) {
  const source = record && typeof record === 'object' ? record : {};
  return JSON.stringify({
    formType: source.formType || source.workflow || '',
    building: source.building || '',
    samplingDate: source.samplingDate || '',
    performedDate: source.performedDate || '',
    samples: Array.isArray(source.samples) ? source.samples : []
  });
}

function searchWaterResponse_(params) {
  const workflow = String(params.workflow || '').toLowerCase();
  waterWorkflowFromRecord_({ workflow: workflow });
  const q = String(params.q || '').trim().toLowerCase();
  const from = validateDateParam_(params.from);
  const to = validateDateParam_(params.to);
  const building = String(params.building || '').trim();
  const limit = Math.min(100, Math.max(1, Number(params.limit || 30)));
  const offset = decodeCursor_(params.cursor);
  let records = [];
  waterWorkflowSheets_(workflow).forEach(sheetName => {
    records = records.concat(getRecords('Routine', sheetName).map(record => Object.assign(record, { sourceClass: sheetName.indexOf('_') >= 0 ? 'active' : 'legacy' })));
  });
  const recordsByNumber = {};
  records.forEach(record => {
    const key = String(record.worksheetNo || '').trim();
    if (!key || !recordsByNumber[key] || recordsByNumber[key].sourceClass === 'legacy') recordsByNumber[key] = record;
  });
  records = Object.keys(recordsByNumber).map(key => recordsByNumber[key]);
  const waterType = String(params.waterType || '').trim().toLowerCase();
  const matches = records.filter(record => {
    const date = isoDate_(record.samplingDate);
    if (from && (!date || date < from)) return false;
    if (to && (!date || date > to)) return false;
    if (building && !waterBuildingMatches_(record.building, building)) return false;
    if (waterType && waterType !== 'all' && !waterSampleMatchesAny_(record.samples, 'waterType', waterType)) return false;
    return !q || [record.worksheetNo, record.docNo, record.building, record.recordStatus]
      .some(value => String(value || '').toLowerCase().indexOf(q) >= 0);
  }).sort((a, b) => String(isoDate_(b.samplingDate)).localeCompare(String(isoDate_(a.samplingDate))));
  const items = matches.slice(offset, offset + limit).map(record => ({
    recordKey: String(record.worksheetNo || ''),
    worksheetNo: record.worksheetNo || '',
    docNo: record.docNo || '',
    building: record.building || '',
    samplingDate: isoDate_(record.samplingDate),
    performedDate: isoDate_(record.performedDate),
    recordStatus: record.recordStatus || 'Routine',
    sampleCount: Array.isArray(record.samples) ? record.samples.length : 0,
    sourceClass: record.sourceClass || 'active',
    samplingPoints: waterSamplingPoints_(record.samples),
    sampleTypes: waterSampleTypes_(record.samples)
  }));
  const next = offset + items.length < matches.length ? encodeCursor_(offset + items.length) : null;
  return jsonResponse_({ ok: true, success: true, data: { items: items, nextCursor: next }, meta: waterMeta_(workflow), status: 200 }, 200);
}

function waterFilterValues_(value) {
  return String(value || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
}

function waterToken_(value) {
  return String(value || '').trim().toLowerCase().replace(/[\\s_.-]+/g, '');
}

function waterSampleMatchesAny_(samples, field, requested) {
  const wanted = waterFilterValues_(requested).map(waterToken_);
  if (!wanted.length || wanted.indexOf('all') >= 0) return true;
  return (Array.isArray(samples) ? samples : []).some(sample => wanted.indexOf(waterToken_(sample && sample[field])) >= 0);
}

function waterBuildingMatches_(actual, requested) {
  const wanted = waterFilterValues_(requested);
  if (!wanted.length || wanted.indexOf('all') >= 0) return true;
  const value = waterToken_(actual);
  const match = value.match(/^(?:building|bldg|bld|b)?(10|11|12|16|19)$/);
  const actualSegment = match ? 'b' + match[1] : 'other';
  return wanted.some(candidate => {
    const candidateToken = waterToken_(candidate);
    if (candidateToken === 'other' || candidateToken === 'otherlocations' || candidateToken === 'ot') return actualSegment === 'other' || actualSegment === 'b11' || actualSegment === 'b19';
    const candidateMatch = candidateToken.match(/^(?:building|bldg|bld|b)?(10|11|12|16|19)$/);
    return candidateMatch ? actualSegment === 'b' + candidateMatch[1] : value === candidateToken;
  });
}

function waterSamplingPoints_(samples) {
  const points = (Array.isArray(samples) ? samples : []).map(sample => String((sample && (sample.samplingPoint || sample.roomNo || sample.room || sample.location)) || '').trim()).filter(Boolean);
  return points.slice(0, 3).join(' · ') + (points.length > 3 ? ' …' : '');
}

function waterSampleTypes_(samples) {
  const values = [];
  (Array.isArray(samples) ? samples : []).forEach(sample => {
    const value = String((sample && (sample.waterType || sample.type)) || '').trim();
    if (value && values.indexOf(value) < 0) values.push(value);
  });
  return values;
}

function getWaterResponse_(params) {
  const workflow = String(params.workflow || '').toLowerCase();
  const recordKey = String(params.recordKey || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._\/-]{1,79}$/.test(recordKey)) throw new Error('Invalid recordKey');
  let record = null;
  waterWorkflowSheets_(workflow).some(sheetName => {
    record = getRecord(recordKey, 'Routine', sheetName);
    return Boolean(record);
  });
  if (!record) return jsonResponse_({ ok: false, success: false, error: 'Record not found', status: 404 }, 404);
  const samples = Array.isArray(record.samples) ? record.samples : [];
  const normalized = Object.assign({}, record, {
    samplingDate: isoDate_(record.samplingDate),
    performedDate: isoDate_(record.performedDate)
  });
  delete normalized.samples;
  return jsonResponse_({ ok: true, success: true, data: { record: normalized, samples: samples }, meta: waterMeta_(workflow), status: 200 }, 200);
}

function waterMeta_(workflow) {
  return { domain: ANF3_DOMAIN, workflow: workflow, apiVersion: ANF3_API_VERSION, implementationVersion: ANF3_IMPLEMENTATION_VERSION, timeZone: ANF3_TIME_ZONE };
}

function validateDateParam_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Invalid date');
  return text;
}

function isoDate_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, 'Asia/Bangkok', 'yyyy-MM-dd');
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : String(value);
}

function encodeCursor_(offset) {
  return Utilities.base64EncodeWebSafe(Utilities.newBlob(String(offset)).getBytes()).replace(/=+$/, '');
}

function decodeCursor_(cursor) {
  if (!cursor) return 0;
  try {
    const value = Number(Utilities.newBlob(Utilities.base64DecodeWebSafe(String(cursor))).getDataAsString());
    if (!Number.isInteger(value) || value < 0) throw new Error('Invalid cursor');
    return value;
  } catch (error) { throw new Error('Invalid cursor'); }
}

function jsonResponse_(data, status) {
  const responseStatus = status || data.status || 200;
  const ok = data && data.ok !== undefined ? data.ok : !(data && data.success === false);
  const body = Object.assign({}, data, {
    ok: ok,
    success: data && data.success !== undefined ? data.success : ok,
    status: responseStatus,
    meta: Object.assign({
      domain: ANF3_DOMAIN,
      apiVersion: ANF3_API_VERSION,
      implementationVersion: ANF3_IMPLEMENTATION_VERSION,
      requestId: requestId_(),
      processedAt: new Date().toISOString(),
      timeZone: ANF3_TIME_ZONE
    }, data && data.meta ? data.meta : {})
  });
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}

function requestId_() {
  try { return Utilities.getUuid(); } catch (error) { return 'water-' + new Date().getTime(); }
}

function safeError_(error) {
  const message = String(error && error.message || error || 'Request failed');
  if (/BUSY_RETRY|CONFLICT|Legacy backup records are read-only|Unsupported Water|Invalid|required|Unknown action/i.test(message)) return message.replace(/(?:spreadsheet|sheet not found|range)[^.]*/ig, 'requested resource');
  return 'Request failed';
}
