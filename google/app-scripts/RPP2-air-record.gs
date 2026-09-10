/**
 * ANF3 Air System / RPP2-air-record
 * Version: 7.1.0 | Time zone: Asia/Bangkok
 * Role: System DB bound project and organization-only Web App read API.
 * Setup order: verifyAirSystemSetup -> setupAirSystem -> deploy the web app
 *               -> testAirHealth/Search/Get -> deploy a new Web App version.
 * Warning: legacy unsuffixed tabs are read-only. Never reset counters or
 * enable production triggers without a backup and Gate D evidence.
 * ============================================
 *
 * Verified against the real sheets (RPP2-air-record.xlsx):
 *   - records_em_B10/B12/B16/OT : EM Air
 *   - records_ca_B10/B12/B16/OT : Compressed Air
 *   - database_em / database_ca      : master sampling points
 *
 * FLOW (driven by sync-master):
 *   1. Master Sync POSTs {action:'saveRecord', data:{...}, sheetName:'records_em'|'records_ca'}
 *      WITHOUT worksheetNo.
 *   2. This app AUTO-GENERATES worksheetNo with the correct prefix.
 *   3. This app RETURNS { success:true, worksheetNo:"AT-26-B10-0001" }.
 * Unsuffixed names remain API aliases only; the workbook has no aggregate tabs.
 */

const ANF3_API_VERSION = '2026-09-02';
const ANF3_IMPLEMENTATION_VERSION = '7.1.0';
const ANF3_TIME_ZONE = 'Asia/Bangkok';
const ANF3_DOMAIN = 'air';
const ANF3_SETUP_VERSION_PROPERTY = 'ANF3_SETUP_VERSION';
const ANF3_COUNTER_APPLY_PROPERTY = 'ANF3_COUNTER_APPLY_ENABLED';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  SPREADSHEET_ID: '1qhzgsO75jzCwg9h6NnIps1RauMHbyA9MJiwy699vono',
  RECORDS_CA_SHEET: 'records_ca',
  RECORDS_CA_ACTIVE: ['records_ca_B10', 'records_ca_B12', 'records_ca_B16', 'records_ca_OT'],
  DATABASE_CA_SHEET: 'database_ca',
  RECORDS_EM_SHEET: 'records_em',
  RECORDS_EM_ACTIVE: ['records_em_B10', 'records_em_B12', 'records_em_B16', 'records_em_OT'],
  DATABASE_EM_SHEET: 'database_em',
  LOGS_SHEET: 'logs',

  // Compressed Air records (20 cols)
  CA_RECORD_HEADERS: [
    'worksheetNo', 'recordStatus', 'building', 'samplingDate', 'performedDate',
    'temp', 'incNo', 'lotTSA', 'lotMedia', 'lotOther',
    'mfgMedia', 'expMedia', 'determinedDate', 'concludedDate', 'approvedDate',
    'docNo', 'samplesJson', 'createdAt', 'updatedAt', 'createdBy'
  ],

  // EM Air records (18 cols)
  EM_RECORD_HEADERS: [
    'worksheetNo', 'recordStatus', 'building', 'samplingDate', 'performedDate',
    'temp', 'incNo', 'lotMedia', 'mfgMedia', 'expMedia',
    'determinedDate', 'concludedDate', 'approvedDate', 'docNo',
    'samplesJson', 'createdAt', 'updatedAt', 'createdBy'
  ],

  // Appended only by setupAirSystem after the owner has backed up the clone.
  IDENTITY_HEADERS: ['anf3SourceRecordId', 'anf3Fingerprint', 'anf3SyncVersion'],

  // operatorName/operatorCode were added in v7.1o. An existing logs sheet
  // keeps its 5 headers; addLog() widens it in place on the next write.
  LOG_HEADERS: ['timestamp', 'action', 'worksheetNo', 'username', 'details', 'operatorName', 'operatorCode']
};

function onOpen() {
  SpreadsheetApp.getUi().createMenu('ANF3 Air System')
    .addItem('1) Check schema / configuration', 'verifyAirSystemSetup')
    .addItem('2) Setup approved active tabs', 'setupAirSystem')
    .addItem('3) Test health / search / get', 'testAirHealth')
    .addItem('4) Dry-run duplicate / counters', 'reconcileAirCountersDryRun')
    .addSeparator()
    .addItem('Admin: apply counter reconciliation', 'applyAirCounterReconciliation')
    .addToUi();
}

function setupAirSystem() {
  setupAirActiveRecordSheets();
  PropertiesService.getScriptProperties().setProperty(ANF3_SETUP_VERSION_PROPERTY, ANF3_IMPLEMENTATION_VERSION);
  return verifyAirSystemSetup();
}

function setupAirActiveRecordSheets() {
  const spreadsheet = getAirSpreadsheet_();
  CONFIG.RECORDS_EM_ACTIVE.forEach(name => ensureAirShard_(spreadsheet, name, CONFIG.EM_RECORD_HEADERS));
  CONFIG.RECORDS_CA_ACTIVE.forEach(name => ensureAirShard_(spreadsheet, name, CONFIG.CA_RECORD_HEADERS));
  SpreadsheetApp.getUi().alert('Air active record sheets: PASS');
}

function ensureAirShard_(spreadsheet, name, requiredHeaders) {
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

function verifyAirSystemSetup() {
  const spreadsheet = getAirSpreadsheet_();
  const checks = [];
  const required = [];
  CONFIG.RECORDS_EM_ACTIVE.forEach(name => required.push([name, CONFIG.EM_RECORD_HEADERS]));
  CONFIG.RECORDS_CA_ACTIVE.forEach(name => required.push([name, CONFIG.CA_RECORD_HEADERS]));
  required.forEach(item => checks.push(verifyAirSheet_(spreadsheet, item[0], item[1], true)));
  const properties = PropertiesService.getScriptProperties();
  checks.push({ name: 'setup version', ok: Boolean(properties.getProperty(ANF3_SETUP_VERSION_PROPERTY)), detail: properties.getProperty(ANF3_SETUP_VERSION_PROPERTY) || 'not recorded' });
  const duplicates = countAirDuplicateWorksheetNos_(spreadsheet);
  checks.push({ name: 'duplicate issued numbers', ok: duplicates === 0, detail: String(duplicates) });
  const report = { ok: checks.every(check => check.ok), domain: ANF3_DOMAIN, implementationVersion: ANF3_IMPLEMENTATION_VERSION, checks: checks };
  Logger.log(JSON.stringify(report));
  return report;
}

function verifyAirSheet_(spreadsheet, name, requiredHeaders, active) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) return { name: name, ok: false, detail: 'missing' };
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0].map(value => String(value || '').trim());
  const missing = requiredHeaders.concat(active ? CONFIG.IDENTITY_HEADERS : []).filter(header => headers.indexOf(header) < 0);
  return { name: name, ok: missing.length === 0, detail: missing.length ? 'missing: ' + missing.join(', ') : 'ready' };
}

function countAirDuplicateWorksheetNos_(spreadsheet) {
  const seen = {};
  const duplicates = {};
  CONFIG.RECORDS_EM_ACTIVE.concat(CONFIG.RECORDS_CA_ACTIVE).forEach(name => {
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
    if (action === 'search') return searchAirResponse_(params);
    if (action === 'get') return getAirResponse_(params);
    let result;
    switch (action) {
      case 'ping':
        result = { success: true, message: 'Air Record API is running' };
        break;
      case 'getMasterData':
        result = { success: true, data: getMasterData(params.sheetName || CONFIG.DATABASE_CA_SHEET) };
        break;
      case 'getRecords':
        result = { success: true, data: getRecords(params.sheetName || CONFIG.RECORDS_CA_SHEET) };
        break;
      case 'getRecord':
        result = { success: true, data: getRecord(params.worksheetNo, params.sheetName || CONFIG.RECORDS_CA_SHEET) };
        break;
      case 'pull':
        result = { success: true, data: getRecords(params.sheetName || CONFIG.RECORDS_CA_SHEET) };
        break;
      case 'getNextDocNo':
        result = { success: true, data: getNextDocNo(params.formType || 'ca', params.sheetName || null, params.building || '') };
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

// ============================================
// TEXT FIELD HELPERS
// ============================================
function forceTextColumns(sheet, headers, columnNames) {
  columnNames.forEach(name => {
    const idx = headers.indexOf(name);
    if (idx !== -1) {
      sheet.getRange(1, idx + 1, sheet.getMaxRows(), 1).setNumberFormat('@');
    }
  });
}

function toTextValue(v) {
  if (v === undefined || v === null) return '';
  return String(v);
}

/**
 * Delete a record by worksheetNo from the given sheet.
 * Not-found is treated as success (already gone).
 */
function deleteRecord(worksheetNo, sheetName) {
  if (!worksheetNo) return { success: false, error: 'worksheetNo required' };
  const text = String(worksheetNo).trim().toUpperCase();
  const formType = text.indexOf('AT-') === 0 ? 'em' : text.indexOf('AC-') === 0 ? 'ca' : null;
  if (!formType) return { success: false, error: 'Unsupported Air worksheet number' };
  const location = findAirRecordLocation_(worksheetNo, formType);
  if (!location) return { success: true, deleted: 0, worksheetNo: worksheetNo };
  if (location.legacy) return { success: false, error: 'Legacy backup records are read-only', worksheetNo: worksheetNo };
  const sheet = getRecordsSheet(location.sheetName);
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
// MASTER DATA
// ============================================
function getMasterData(sheetName) {
  assertAirSheet_(sheetName, true);
  const ss = getAirSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Master data sheet not found: ' + sheetName);
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
function getRecordsSheet(sheetName) {
  assertAirSheet_(sheetName, false);
  const ss = getAirSpreadsheet_();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Required Air sheet not found: ' + sheetName);
  return sheet;
}

function getRecords(sheetName) {
  sheetName = sheetName || CONFIG.RECORDS_CA_SHEET;
  if (sheetName === CONFIG.RECORDS_EM_SHEET || sheetName === CONFIG.RECORDS_CA_SHEET) {
    const names = sheetName === CONFIG.RECORDS_EM_SHEET ? CONFIG.RECORDS_EM_ACTIVE : CONFIG.RECORDS_CA_ACTIVE;
    return names.reduce((records, name) => records.concat(getRecords(name)), []);
  }
  const sheet = getRecordsSheet(sheetName);
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

function getRecord(worksheetNo, sheetName) {
  if (sheetName === CONFIG.RECORDS_EM_SHEET || sheetName === CONFIG.RECORDS_CA_SHEET) {
    return getRecords(sheetName).find(r => String(r.worksheetNo) === String(worksheetNo)) || null;
  }
  const records = getRecords(sheetName || CONFIG.RECORDS_CA_SHEET);
  return records.find(r => String(r.worksheetNo) === String(worksheetNo)) || null;
}

/**
 * Save a single record (insert or update). AUTO-GENERATES worksheetNo if empty.
 */
function saveRecord(record, ignoredSheetName) {
  const source = record && typeof record === 'object' ? record : {};
  const formType = airFormTypeFromWorkflow_(source.workflow || source.formType);
  const sourceRecordId = String(source.sourceRecordId || source.anf3SourceRecordId || '').trim();
  if (!sourceRecordId) throw new Error('sourceRecordId is required');
  const existingByNumber = source.worksheetNo ? findAirRecordLocation_(source.worksheetNo, formType) : null;
  const existingByIdentity = findAirRecordBySourceId_(sourceRecordId, formType);
  if (existingByNumber && existingByIdentity && existingByNumber.sheetName !== existingByIdentity.sheetName) throw new Error('CONFLICT');
  const existingLocation = existingByNumber || existingByIdentity;
  if (existingLocation && existingLocation.legacy) throw new Error('Legacy backup records are read-only');
  const sheetName = existingLocation ? existingLocation.sheetName : airActiveSheet_(formType, source.building);
  const sheet = getRecordsSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  assertIdentityHeaders_(headers);
  record = sanitizeRecord_(source, headers);
  record.workflow = formType === 'em' ? 'em-air' : 'compressed-air';
  record.anf3SourceRecordId = sourceRecordId;
  record.anf3Fingerprint = String(source.anf3Fingerprint || source.sourceFingerprint || fingerprintAirRecord_(source));
  record.anf3SyncVersion = Number((existingLocation && existingLocation.record && existingLocation.record.anf3SyncVersion) || 0) + 1;

  if (existingLocation && source.worksheetNo && String(existingLocation.record.worksheetNo) !== String(source.worksheetNo)) throw new Error('CONFLICT');
  if (existingLocation && existingLocation.record.anf3SourceRecordId && String(existingLocation.record.anf3SourceRecordId) !== sourceRecordId) throw new Error('CONFLICT');
  if (existingLocation && existingLocation.record.anf3Fingerprint && existingLocation.record.anf3Fingerprint === record.anf3Fingerprint) {
    return { success: true, action: 'no_change', worksheetNo: existingLocation.record.worksheetNo, docNo: existingLocation.record.docNo || existingLocation.record.worksheetNo, sheetName: existingLocation.sheetName };
  }

  // Keep media dates as plain text in RPP2-air-record.
  // These target columns correspond to source mfgDate / expDate from air-test.
  forceTextColumns(sheet, headers, ['mfgMedia', 'expMedia']);

  if (!record.worksheetNo || record.worksheetNo === '') {
    const next = getNextDocNo(formType, sheetName, record.building);
    record.worksheetNo = next.nextDocNo;
    record.docNo = next.nextDocNo;
  }

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(record.worksheetNo)) { rowIndex = i + 1; break; }
  }

  const rowData = headers.map(h => {
    if (h === 'samplesJson') return JSON.stringify(record.samples || []);

    // Store media dates as string, not as Date/number values.
    if (h === 'mfgMedia' || h === 'expMedia') return toTextValue(record[h]);

    return (record[h] !== undefined && record[h] !== null) ? record[h] : '';
  });

  if (rowIndex > 0) {
    const mismatch = worksheetBuildingMismatch_(record.worksheetNo, record.building, formType === 'em' ? 'AT' : 'AC');
    if (mismatch) addLog({ action: 'WORKSHEET_BUILDING_MISMATCH', worksheetNo: record.worksheetNo, username: record.createdBy || '', details: mismatch });
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    return { success: true, action: 'updated', worksheetNo: record.worksheetNo, docNo: record.docNo, sheetName: sheetName };
  }
  sheet.appendRow(rowData);
  return { success: true, action: 'inserted', worksheetNo: record.worksheetNo, docNo: record.docNo, sheetName: sheetName };
}

function syncRecords(items, username, sheetName) {
  const results = [];
  const conflicts = [];
  (items || []).forEach(item => {
    try {
      if (item.action === 'upsert' || !item.action) {
        const payload = item.data || item.record || {};
        const formType = airFormTypeFromWorkflow_(payload.workflow || payload.formType);
        const location = item.worksheetNo ? findAirRecordLocation_(item.worksheetNo, formType) : null;
        const existing = location ? location.record : null;
        if (existing && existing.updatedAt > payload.updatedAt) {
          conflicts.push({ worksheetNo: item.worksheetNo, serverUpdatedAt: existing.updatedAt, clientUpdatedAt: payload.updatedAt });
        } else {
          const result = saveRecord(payload);
          results.push(result);
          addLog({ action: 'SYNC_' + result.action.toUpperCase(), worksheetNo: result.worksheetNo, username: username });
        }
      }
    } catch (error) {
      results.push({ success: false, worksheetNo: item.worksheetNo, error: error.message });
    }
  });
  if (conflicts.length > 0) return { success: false, error: 'conflict', conflicts: conflicts, synced: results };
  return { success: true, synced: results.length, results: results };
}

// ============================================
// NEXT DOCUMENT NUMBER
// ============================================
/**
 * CA: AC-YY[-building]-XXXX, EM: AT-YY[-building]-XXXX.
 * Sequences are independent by prefix + Bangkok year + normalized building.
 */
function getNextDocNo(formType, sheetName, building) {
  formType = (formType || 'ca').toLowerCase();
  let prefix, targetSheet;
  if (formType === 'em') { prefix = 'AT'; }
  else { prefix = 'AC'; }
  targetSheet = airActiveSheet_(formType, building);

  const sheet = getRecordsSheet(targetSheet);
  const data = sheet.getDataRange().getValues();
  const year = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yy');
  const buildingSegment = normalizeBuildingSegment_(building);

  let maxSeq = 0;
  if (data.length > 1) {
    const headers = data[0];
    const docNoIndex = headers.indexOf('docNo');
    const pattern = new RegExp('^' + prefix + '-' + year + '-' + (buildingSegment ? buildingSegment + '-' : '') + '(\\d{4})$');
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
  const nextDocNo = prefix + '-' + year + '-' + (buildingSegment ? buildingSegment + '-' : '') + String(nextSeq).padStart(4, '0');
  return { formType: formType, prefix: prefix, buildingSegment: buildingSegment, sheetName: targetSheet, maxSeq: maxSeq, nextSeq: nextSeq, nextDocNo: nextDocNo };
}

function normalizeBuildingSegment_(value) {
  const normalized = String(value || '').trim().toUpperCase().replace(/[ _-]+/g, '');
  const match = normalized.match(/^(?:BUILDING|BLDG|BLD|B)?(10|12|16)$/);
  return match ? 'B' + match[1] : '';
}

function worksheetBuildingMismatch_(worksheetNo, building, prefix) {
  const number = String(worksheetNo || '').trim().toUpperCase();
  const match = number.match(new RegExp('^' + prefix + '-\\d{2}-(?:(B10|B12|B16)-)?\\d{4}$'));
  if (!match) return '';
  const numberSegment = match[1] || '';
  const currentSegment = normalizeBuildingSegment_(building);
  return numberSegment === currentSegment ? '' : 'numberBuilding=' + (numberSegment || 'OTHER') + '; currentBuilding=' + (currentSegment || 'OTHER');
}

// ============================================
// LOGS
// ============================================
function getLogsSheet() {
  const ss = getAirSpreadsheet_();
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
  Logger.log('EM next: ' + getNextDocNo('em').nextDocNo);
  Logger.log('CA next: ' + getNextDocNo('ca').nextDocNo);
}

function testAirHealth() {
  const result = { ok: true, service: 'ANF3 Air System', domain: ANF3_DOMAIN, implementationVersion: ANF3_IMPLEMENTATION_VERSION, timeZone: ANF3_TIME_ZONE };
  Logger.log(JSON.stringify(result));
  SpreadsheetApp.getUi().alert('Air health: PASS');
  return result;
}

function testAirSearch() {
  const result = searchAirResponse_({ workflow: 'em-air', limit: '1' });
  Logger.log(result.getContent());
  return result;
}

function testAirGet() {
  const result = searchAirResponse_({ workflow: 'em-air', limit: '1' });
  Logger.log(result.getContent());
  return result;
}

function reconcileAirCountersDryRun() {
  const spreadsheet = getAirSpreadsheet_();
  const rows = [];
  [['em', 'AT', CONFIG.RECORDS_EM_ACTIVE], ['ca', 'AC', CONFIG.RECORDS_CA_ACTIVE]].forEach(item => {
    item[2].forEach(sheetName => {
      const sheet = spreadsheet.getSheetByName(sheetName);
      const highest = sheet ? highestAirSequence_(sheet, item[1]) : 0;
      rows.push({ workflow: item[0] === 'em' ? 'em-air' : 'compressed-air', sheetName: sheetName, highestSequence: highest, nextSequence: highest + 1 });
    });
  });
  Logger.log(JSON.stringify(rows));
  return rows;
}

function applyAirCounterReconciliation() {
  const ui = SpreadsheetApp.getUi();
  const enabled = PropertiesService.getScriptProperties().getProperty(ANF3_COUNTER_APPLY_PROPERTY) === 'YES';
  if (!enabled) throw new Error('Counter apply is disabled. Set the owner-controlled gate property after backup and Gate D approval.');
  if (ui.alert('Apply Air counter reconciliation?', 'This writes only counter properties after the owner has approved the cutover.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  reconcileAirCountersDryRun().forEach(row => PropertiesService.getScriptProperties().setProperty('ANF3_COUNTER_' + row.workflow + '_' + row.sheetName, String(row.highestSequence)));
  ui.alert('Air counters updated. Record the change in the cutover evidence.');
}

function highestAirSequence_(sheet, prefix) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(1, sheet.getLastColumn())).getValues();
  const pattern = new RegExp('^' + prefix + '-[^-]+-(?:B10|B12|B16)-?(\\d{4})$|^' + prefix + '-[^-]+-(\\d{4})$');
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
function airWorkflowSheet_(workflow) {
  const map = { 'compressed-air': CONFIG.RECORDS_CA_SHEET, 'em-air': CONFIG.RECORDS_EM_SHEET };
  const sheetName = map[String(workflow || '').toLowerCase()];
  if (!sheetName) throw new Error('Unsupported Air workflow');
  return sheetName;
}

function airFormTypeFromWorkflow_(workflow) {
  const value = String(workflow || '').trim().toLowerCase().replace(/[ _]/g, '-');
  if (value === 'em' || value === 'em-air' || value === 'air-em') return 'em';
  if (value === 'ca' || value === 'ca-gas' || value === 'compressed-air' || value === 'air-ca') return 'ca';
  throw new Error('Unsupported Air workflow');
}

function airFormTypeFromSheet_(sheetName) {
  const name = String(sheetName || '');
  if (name === CONFIG.RECORDS_EM_SHEET || CONFIG.RECORDS_EM_ACTIVE.indexOf(name) >= 0) return 'em';
  if (name === CONFIG.RECORDS_CA_SHEET || CONFIG.RECORDS_CA_ACTIVE.indexOf(name) >= 0) return 'ca';
  throw new Error('Unsupported Air sheet');
}

function airWorkflowSheets_(workflow, includeLegacy) {
  const base = airWorkflowSheet_(workflow);
  const formType = airFormTypeFromSheet_(base);
  const active = formType === 'em' ? CONFIG.RECORDS_EM_ACTIVE.slice() : CONFIG.RECORDS_CA_ACTIVE.slice();
  return includeLegacy === false ? active : active.concat([base]);
}

function airActiveSheet_(formType, building) {
  const segment = normalizeBuildingSegment_(building);
  const suffix = segment || 'OT';
  const sheets = formType === 'em' ? CONFIG.RECORDS_EM_ACTIVE : CONFIG.RECORDS_CA_ACTIVE;
  const target = sheets.find(name => name.endsWith('_' + suffix));
  if (!target) throw new Error('No active Air sheet for building ' + (segment || 'OT'));
  return target;
}

function findAirRecordLocation_(worksheetNo, formType) {
  const sheets = formType === 'em' ? CONFIG.RECORDS_EM_ACTIVE : CONFIG.RECORDS_CA_ACTIVE;
  for (let index = 0; index < sheets.length; index += 1) {
    const record = getRecord(worksheetNo, sheets[index]);
    if (record) return { record: record, sheetName: sheets[index], legacy: false };
  }
  return null;
}

function findAirRecordBySourceId_(sourceRecordId, formType) {
  const sheets = formType === 'em' ? CONFIG.RECORDS_EM_ACTIVE : CONFIG.RECORDS_CA_ACTIVE;
  for (let index = 0; index < sheets.length; index += 1) {
    const records = getRecords(sheets[index]);
    const record = records.find(item => String(item.anf3SourceRecordId || '') === String(sourceRecordId));
    if (record) return { record: record, sheetName: sheets[index], legacy: false };
  }
  return null;
}

function getAirSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  return active && active.getId() === CONFIG.SPREADSHEET_ID ? active : SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function assertAirSheet_(sheetName, master) {
  const allowed = master
    ? [CONFIG.DATABASE_CA_SHEET, CONFIG.DATABASE_EM_SHEET]
    : [CONFIG.RECORDS_CA_SHEET, CONFIG.RECORDS_EM_SHEET].concat(CONFIG.RECORDS_CA_ACTIVE, CONFIG.RECORDS_EM_ACTIVE);
  if (allowed.indexOf(String(sheetName || '')) < 0) throw new Error('Unsupported Air sheet');
}

function assertIdentityHeaders_(headers) {
  const missing = CONFIG.IDENTITY_HEADERS.filter(header => headers.indexOf(header) < 0);
  if (missing.length) throw new Error('Run setupAirSystem first: missing identity columns');
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

function fingerprintAirRecord_(record) {
  const source = record && typeof record === 'object' ? record : {};
  const stable = {
    workflow: source.workflow || source.formType || '',
    building: source.building || '',
    samplingDate: source.samplingDate || '',
    performedDate: source.performedDate || '',
    samples: Array.isArray(source.samples) ? source.samples : []
  };
  return JSON.stringify(stable);
}

function searchAirResponse_(params) {
  const workflow = String(params.workflow || '').toLowerCase();
  airFormTypeFromWorkflow_(workflow);
  const rawRecords = airWorkflowSheets_(workflow, true).reduce((all, sheetName) => all.concat(getRecords(sheetName).map(record => Object.assign(record, { sourceClass: sheetName.indexOf('_') >= 0 ? 'active' : 'legacy' }))), []);
  const recordsByNumber = {};
  rawRecords.forEach(record => {
    const key = String(record.worksheetNo || '').trim();
    if (!key || !recordsByNumber[key] || recordsByNumber[key].sourceClass === 'legacy') recordsByNumber[key] = record;
  });
  const records = Object.keys(recordsByNumber).map(key => recordsByNumber[key]);
  const q = String(params.q || '').trim().toLowerCase();
  const gasType = String(params.gasType || '').trim().toLowerCase();
  const samplingMode = String(params.samplingMode || '').trim().toLowerCase();
  const building = String(params.building || '').trim();
  const from = validateDateParam_(params.from);
  const to = validateDateParam_(params.to);
  const limit = Math.min(100, Math.max(1, Number(params.limit || 30)));
  const offset = decodeCursor_(params.cursor);
  const matches = records.filter(record => {
    const date = isoDate_(record.samplingDate);
    if (from && (!date || date < from)) return false;
    if (to && (!date || date > to)) return false;
    if (building && !airBuildingMatches_(record.building, building)) return false;
    if (gasType && gasType !== 'all' && !airSampleMatchesAny_(record.samples, 'gasType', gasType)) return false;
    if (samplingMode && samplingMode !== 'all' && !airSampleMatchesAny_(record.samples, 'samplingMode', samplingMode)) return false;
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
    samplingPoints: airSamplingPoints_(record.samples),
    sampleTypes: airSampleTypes_(record.samples)
  }));
  const next = offset + items.length < matches.length ? encodeCursor_(offset + items.length) : null;
  return jsonResponse_({ ok: true, success: true, data: { items: items, nextCursor: next }, meta: airMeta_(workflow), status: 200 }, 200);
}

function airFilterValues_(value) {
  return String(value || '').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
}

function airToken_(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_.-]+/g, '');
}

function airSampleMatchesAny_(samples, field, requested) {
  const wanted = airFilterValues_(requested).map(airToken_);
  if (!wanted.length || wanted.indexOf('all') >= 0) return true;
  return (Array.isArray(samples) ? samples : []).some(sample => wanted.indexOf(airToken_(sample && sample[field])) >= 0);
}

function airBuildingMatches_(actual, requested) {
  const wanted = airFilterValues_(requested);
  if (!wanted.length || wanted.indexOf('all') >= 0) return true;
  const value = airToken_(actual);
  const match = value.match(/^(?:building|bldg|bld|b)?(10|11|12|16|19)$/);
  const actualSegment = match ? 'b' + match[1] : 'other';
  return wanted.some(candidate => {
    const candidateToken = airToken_(candidate);
    if (candidateToken === 'other' || candidateToken === 'otherlocations' || candidateToken === 'ot') return actualSegment === 'other' || actualSegment === 'b11' || actualSegment === 'b19';
    const candidateMatch = candidateToken.match(/^(?:building|bldg|bld|b)?(10|11|12|16|19)$/);
    return candidateMatch ? actualSegment === 'b' + candidateMatch[1] : value === candidateToken;
  });
}

function airSamplePoints_(samples) {
  const points = (Array.isArray(samples) ? samples : []).map(sample => String((sample && (sample.samplingPoint || sample.roomNo || sample.room || sample.location)) || '').trim()).filter(Boolean);
  return points.slice(0, 3).join(' · ') + (points.length > 3 ? ' …' : '');
}

function airSamplingPoints_(samples) {
  return airSamplePoints_(samples);
}

function airSampleTypes_(samples) {
  const values = [];
  (Array.isArray(samples) ? samples : []).forEach(sample => {
    const value = String((sample && (sample.gasType || sample.type)) || '').trim();
    if (value && values.indexOf(value) < 0) values.push(value);
  });
  return values;
}

function getAirResponse_(params) {
  const workflow = String(params.workflow || '').toLowerCase();
  const recordKey = String(params.recordKey || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._\/-]{1,79}$/.test(recordKey)) throw new Error('Invalid recordKey');
  const formType = airFormTypeFromSheet_(airWorkflowSheet_(workflow));
  const location = findAirRecordLocation_(recordKey, formType);
  const record = location && location.record;
  if (!record) return jsonResponse_({ ok: false, success: false, error: 'Record not found', status: 404 }, 404);
  const samples = Array.isArray(record.samples) ? record.samples : [];
  const normalized = Object.assign({}, record, {
    samplingDate: isoDate_(record.samplingDate),
    performedDate: isoDate_(record.performedDate)
  });
  delete normalized.samples;
  return jsonResponse_({ ok: true, success: true, data: { record: normalized, samples: samples }, meta: airMeta_(workflow), status: 200 }, 200);
}

function airMeta_(workflow) {
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
  try { return Utilities.getUuid(); } catch (error) { return 'air-' + new Date().getTime(); }
}

function safeError_(error) {
  const message = String(error && error.message || error || 'Request failed');
  if (/BUSY_RETRY|CONFLICT|Legacy backup records are read-only|Unsupported Air|Invalid|required|Unknown action/i.test(message)) return message.replace(/(?:spreadsheet|sheet not found|range)[^.]*/ig, 'requested resource');
  return 'Request failed';
}
