/** ANF3 Water — Simple create-only sync (bind this script to water-r) */
const WATER = {
  TZ: 'Asia/Bangkok',
  SOURCE_ID: '1rw_3OWuRLV791Y70kWJ4cyXDuxuHooAsoxWLCiiRw2M',
  RPP2_ID: '1aeMOagZPkoVA_LJxjVvmUL59cMtTTicUH5NzuYEhyY0',
  SOURCES: [
    { name: 'prw-pw', type: 'pw-prw', prefix: 'WT' },
    { name: 'wfi-pus', type: 'wfi-pus', prefix: 'WP' }
  ]
};

function onOpen(e) {
  addWaterSyncMenu_();
}

function onInstall(e) {
  onOpen(e);
}

// Run this ONCE manually from Apps Script if the menu is not visible yet.
function installWaterSyncMenu() {
  addWaterSyncMenu_();
  SpreadsheetApp.getUi().alert('Water Sync menu installed. Return to the sheet and reload once.');
}

function addWaterSyncMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('💧 Water Sync')
    .addItem('Sync PW-PRW → RPP2', 'syncWaterPWPRW')
    .addItem('Sync WFI-PUS → RPP2', 'syncWaterWFIPUS')
    .addSeparator()
    .addItem('Sync ทั้งสองระบบ', 'syncWaterToRPP2')
    .addToUi();
}

function syncWaterPWPRW() {
  return runWaterSync_('pw-prw', 'PW-PRW');
}

function syncWaterWFIPUS() {
  return runWaterSync_('wfi-pus', 'WFI-PUS');
}

function syncWaterToRPP2() {
  return runWaterSync_('', 'PW-PRW + WFI-PUS');
}

function runWaterSync_(onlyType, label) {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return ui.alert('มีการ Sync อื่นกำลังทำงานอยู่ กรุณากดลองใหม่');

  try {
    const source = SpreadsheetApp.openById(WATER.SOURCE_ID);
    const rpp2 = SpreadsheetApp.openById(WATER.RPP2_ID);
    const report = { created: 0, rows: 0, recovered: 0, warnings: [], errors: [] };

    WATER.SOURCES.forEach(function(cfg) {
      if (onlyType && cfg.type !== onlyType) return;
      mergeReport_(report, syncSource_(source, rpp2, cfg));
    });

    SpreadsheetApp.flush();
    showReport_(ui, report, label);
    return report;
  } catch (e) {
    ui.alert('Water Sync — ERROR', String(e.message || e), ui.ButtonSet.OK);
    throw e;
  } finally {
    lock.releaseLock();
  }
}

function syncSource_(sourceSS, rpp2SS, cfg) {
  const out = { created: 0, rows: 0, recovered: 0, warnings: [], errors: [] };
  const sh = sourceSS.getSheetByName(cfg.name);
  if (!sh) throw new Error('ไม่พบ source tab: ' + cfg.name);
  if (sh.getLastRow() < 2) return out;

  const data = sh.getDataRange().getValues();
  const c = sourceCols_(data[0], cfg.name);
  const groups = {};

  data.slice(1).forEach((row, i) => {
    // เงื่อนไขตาม requirement เท่านั้น
    if (!isTrue_(row[c.worksheetCreate]) || !isBlank_(row[c.syncStatus])) return;

    const date = dateKey_(row[c.samplingDate]);
    const building = text_(row[c.building]) || 'Unknown';
    const key = date + '|' + building.toUpperCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push({ row: row, rowNo: i + 2, date: date, building: building });
  });

  Object.keys(groups).forEach(key => {
    const items = groups[key];
    try {
      syncGroup_(sh, rpp2SS, cfg, c, items, out);
    } catch (e) {
      out.errors.push(cfg.name + ' / ' + key + ': ' + String(e.message || e));
    }
  });

  return out;
}

function syncGroup_(sourceSheet, rpp2SS, cfg, c, items, out) {
  const first = items[0].row;
  const building = items[0].building;
  const route = route_(cfg.type, building);
  const target = rpp2SS.getSheetByName(route.tab);
  if (!target) throw new Error('ไม่พบ target tab: ' + route.tab);

  const statuses = unique_(items.map(x => x.row[c.recordStatus]));
  if (statuses.length > 1) {
    out.warnings.push(
      items[0].date + ' / ' + building +
      ' มี recordStatus [' + statuses.join(', ') +
      '] → RPP2 ใช้ค่าจากแถวแรก: ' + text_(first[c.recordStatus])
    );
  }

  // ถ้ามี worksheetNo อยู่แล้ว ให้ถือว่าเป็นข้อมูลเดิม/การ recovery ก่อน
  // IMPORTANT: เลข legacy เช่น WP-26-0139 อาจอยู่ใน records_wfi เดิมอยู่แล้ว
  // จึงต้องค้น RPP2 ทั้ง family ก่อน ห้ามบังคับให้เลขเก่ากลายเป็น WP-26-B16-xxxx
  const existingNos = unique_(items.map(function(x) { return x.row[c.worksheetNo]; }));
  if (existingNos.length > 1) throw new Error('พบ worksheetNo มากกว่า 1 ค่าในกลุ่มเดียวกัน');

  let worksheetNo = existingNos[0] || '';

  if (worksheetNo) {
    const found = findWorksheetInRPP2_(rpp2SS, cfg.type, worksheetNo);
    if (found) {
      items.forEach(function(x) {
        sourceSheet.getRange(x.rowNo, c.syncStatus + 1).setValue('synced');
      });
      out.recovered++;
      out.rows += items.length;

      if (found.getName() !== route.tab) {
        out.warnings.push(
          worksheetNo + ' มีอยู่แล้วใน ' + found.getName() +
          ' → mark synced เท่านั้น ไม่สร้างซ้ำใน ' + route.tab
        );
      }
      return;
    }

    // ถ้ามีเลขเดิมใน water-r แต่ค้นไม่พบใน RPP2 จะ append ได้เฉพาะเลข format ใหม่ที่ตรง route
    // เพื่อป้องกันการสร้าง historical/legacy number ลงผิด shard โดยไม่ตั้งใจ
    if (!validNo_(worksheetNo, cfg.prefix, route.segment)) {
      throw new Error(
        'พบ worksheetNo เดิม ' + worksheetNo +
        ' แต่ค้นไม่พบใน RPP2 และเลขไม่ตรง format ใหม่ของ ' + route.tab +
        ' (หากต้องการสร้างใหม่ ให้ล้าง worksheet No. ของกลุ่มนี้ก่อนแล้ว Sync อีกครั้ง)'
      );
    }
  } else {
    worksheetNo = nextNo_(target, sourceSheet, c.worksheetNo, cfg.prefix, route.segment);
    items.forEach(function(x) {
      sourceSheet.getRange(x.rowNo, c.worksheetNo + 1).setValue(worksheetNo);
    });
  }

  // Recovery รอบที่เลขใหม่ถูก reserve และเคย append สำเร็จแล้ว
  if (hasWorksheet_(target, worksheetNo)) {
    items.forEach(function(x) {
      sourceSheet.getRange(x.rowNo, c.syncStatus + 1).setValue('synced');
    });
    out.recovered++;
    out.rows += items.length;
    return;
  }

  const samples = items.map((x, i) => ({
    index: i + 1,
    samplingPoint: text_(x.row[c.samplingPoint]),
    samplingTag: text_(x.row[c.samplingTag]),
    location: text_(x.row[c.location]),
    noLocation: text_(x.row[c.noLocation]),
    waterType: text_(x.row[c.waterType]),
    result1: '',
    result2: '',
    resultAvg: ''
  }));

  const now = new Date().toISOString();
  appendByHeader_(target, {
    worksheetNo: worksheetNo,
    formType: cfg.type,
    recordStatus: text_(first[c.recordStatus]) || 'Routine',
    building: building,
    samplingDate: first[c.samplingDate] || '',
    performedDate: first[c.performedDate] || '',
    determinedDate: first[c.determinedDate] || '',
    docNo: worksheetNo,
    comment: '',
    samplesJson: JSON.stringify(samples),
    createdAt: now,
    updatedAt: now,
    createdBy: 'water-r-sync'
  });

  items.forEach(x => sourceSheet.getRange(x.rowNo, c.syncStatus + 1).setValue('synced'));
  out.created++;
  out.rows += items.length;
}

function route_(type, building) {
  const b = buildingCode_(building);

  if (type === 'pw-prw') {
    const segment = ['B10', 'B12', 'B16'].includes(b) ? b : 'OT';
    return { tab: 'records_pw_prw_' + segment, segment: segment };
  }

  if (type === 'wfi-pus') {
    const segment = b === 'B16' ? 'B16' : 'OT';
    return { tab: 'records_wfi_' + segment, segment: segment };
  }

  throw new Error('Unsupported water type: ' + type);
}

function nextNo_(target, source, sourceNoCol, prefix, segment) {
  const yy = Utilities.formatDate(new Date(), WATER.TZ, 'yy');
  const re = new RegExp('^' + prefix + '-' + yy + '-' + segment + '-(\\d{4})$');
  let max = 0;

  if (target.getLastRow() > 1) {
    target.getRange(2, 1, target.getLastRow() - 1, 1).getValues().forEach(r => {
      const m = text_(r[0]).toUpperCase().match(re);
      if (m) max = Math.max(max, Number(m[1]));
    });
  }

  // รวมเลขที่ reserve อยู่ใน water-r ด้วย ป้องกันเลขซ้ำหลัง failed run
  if (source.getLastRow() > 1) {
    source.getRange(2, sourceNoCol + 1, source.getLastRow() - 1, 1).getValues().forEach(r => {
      const m = text_(r[0]).toUpperCase().match(re);
      if (m) max = Math.max(max, Number(m[1]));
    });
  }

  return prefix + '-' + yy + '-' + segment + '-' + String(max + 1).padStart(4, '0');
}

function validNo_(no, prefix, segment) {
  const yy = Utilities.formatDate(new Date(), WATER.TZ, 'yy');
  return new RegExp('^' + prefix + '-' + yy + '-' + segment + '-\\d{4}$')
    .test(text_(no).toUpperCase());
}

function findWorksheetInRPP2_(rpp2SS, type, worksheetNo) {
  const tabs = type === 'wfi-pus'
    ? ['records_wfi_B16', 'records_wfi_OT', 'records_wfi']
    : ['records_pw_prw_B10', 'records_pw_prw_B12', 'records_pw_prw_B16', 'records_pw_prw_OT', 'records_pw_prw'];

  for (let i = 0; i < tabs.length; i++) {
    const sh = rpp2SS.getSheetByName(tabs[i]);
    if (sh && hasWorksheet_(sh, worksheetNo)) return sh;
  }
  return null;
}

function hasWorksheet_(sheet, no) {
  if (sheet.getLastRow() < 2) return false;
  return Boolean(
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(String(no)).matchEntireCell(true).findNext()
  );
}

function appendByHeader_(sheet, record) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  ['worksheetNo', 'formType', 'recordStatus', 'building', 'samplingDate', 'docNo', 'samplesJson']
    .forEach(h => { if (!headers.includes(h)) throw new Error(sheet.getName() + ' ไม่มีคอลัมน์ ' + h); });

  const row = headers.map(h => Object.prototype.hasOwnProperty.call(record, h) ? record[h] : '');
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
}

function sourceCols_(headers, sheetName) {
  const map = {};
  headers.forEach((h, i) => map[norm_(h)] = i);

  const names = [
    'samplingDate', 'samplingPoint', 'samplingTag', 'recordStatus',
    'worksheetNo', 'worksheetCreate', 'noLocation', 'building',
    'location', 'waterType', 'performedDate', 'determinedDate', 'syncStatus'
  ];

  const c = {};
  names.forEach(name => {
    const i = map[norm_(name)];
    if (i === undefined) throw new Error(sheetName + ' ไม่มีคอลัมน์ ' + name);
    c[name] = i;
  });
  return c;
}

function buildingCode_(value) {
  const s = text_(value).toUpperCase().replace(/[ _-]+/g, '');
  const m = s.match(/^(?:BUILDING|BLDG|BLD|B)?(10|12|16)$/);
  return m ? 'B' + m[1] : 'OT';
}

function dateKey_(value) {
  if (!value) return 'NO_DATE';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, WATER.TZ, 'yyyy-MM-dd');
  }
  return text_(value) || 'NO_DATE';
}

function norm_(value) {
  return String(value || '').toLowerCase().replace(/[\s._-]+/g, '');
}

function text_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function isBlank_(value) {
  return value === '' || value === null || value === undefined;
}

function isTrue_(value) {
  return value === true || text_(value).toUpperCase() === 'TRUE';
}

function unique_(values) {
  return [...new Set(values.map(text_).filter(Boolean))];
}

function mergeReport_(a, b) {
  a.created += b.created;
  a.rows += b.rows;
  a.recovered += b.recovered;
  a.warnings.push(...b.warnings);
  a.errors.push(...b.errors);
}

function showReport_(ui, r, label) {
  let msg =
    'สร้าง worksheet ใหม่: ' + r.created + '\n' +
    'แถวที่ sync สำเร็จ: ' + r.rows + '\n' +
    'Recovery (ไม่สร้างซ้ำ): ' + r.recovered + '\n' +
    'Errors: ' + r.errors.length;

  if (r.warnings.length) msg += '\n\nWarnings:\n- ' + r.warnings.join('\n- ');
  if (r.errors.length) msg += '\n\nErrors:\n- ' + r.errors.join('\n- ');
  if (!r.created && !r.rows && !r.errors.length) {
    msg += '\n\nไม่พบแถวที่ worksheetCreate = TRUE และ syncStatus ว่าง';
  }
  ui.alert('Water Sync → RPP2' + (label ? ' (' + label + ')' : ''), msg, ui.ButtonSet.OK);
}
