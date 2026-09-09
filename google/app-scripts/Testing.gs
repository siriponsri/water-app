/**
 * ANF3 Cleaning Validation — simple user sync v1.1
 * Bind to: Testing
 *
 * CREATE-ONLY workflow:
 *   worksheetCreate = TRUE + syncStatus blank
 *   -> route by method
 *   -> group
 *   -> split to template capacity
 *   -> POST to RPP2 CV System Web App
 *   -> write worksheetNo + synced back
 *
 * Routing source of truth:
 *   Contact plate                    -> CONTACT_PLATE -> cv-contact
 *   Rinse + Pour plate               -> PW_PRW        -> cv-rinse-pour
 *   Rinse + Membrane Filtration      -> WFI_PUS       -> cv-rinse-membrane
 *
 * Important: for Rinse, Test-Method decides the template.
 * "Rinse-PW + Memb. Filtration" therefore routes to WFI_PUS.
 */

const CVS = {
  TZ: 'Asia/Bangkok',
  SOURCE_ID: '1ZHzetpPt1fpHx4ftxKiPFjsW0RIXYoraFVOxz2mRdGg',
  SOURCE_SHEET: 'CV',

  // Existing RPP2-cv-record deployment URL from the previous CV script.
  // If the deployment itself is replaced instead of updated, replace this URL.
  SYSTEM_URL: 'https://script.google.com/macros/s/AKfycbxYYVB38c1wFPrF3yp9dDcljktXcwVQ4_b5rOd0mf33iAjYHkkQEazW6TaJXNq0eHSP/exec',

  MAX_CONTACT: 10,
  MAX_RINSE: 30
};


// ============================================================
// MENU
// ============================================================

function onOpen(e) {
  addCvSyncMenu_();
}

function onInstall(e) {
  onOpen(e);
}

function installCvSyncMenu() {
  addCvSyncMenu_();
  SpreadsheetApp.getUi().alert(
    'CV Sync menu installed. Return to Testing and reload once.'
  );
}

function addCvSyncMenu_() {
  SpreadsheetApp.getUi()
    .createMenu('🧼 CV Sync')
    .addItem('Sync Contact Plate → RPP2', 'syncCvContact')
    .addItem('Sync Rinse — Pour Plate → RPP2', 'syncCvPour')
    .addItem('Sync Rinse — Membrane Filtration → RPP2', 'syncCvMembrane')
    .addSeparator()
    .addItem('Sync ทั้งหมด', 'syncCvAll')
    .addToUi();
}

function syncCvContact() {
  return runCvSync_('CONTACT_PLATE', 'Contact Plate');
}

function syncCvPour() {
  return runCvSync_('PW_PRW', 'Rinse — Pour Plate');
}

function syncCvMembrane() {
  return runCvSync_('WFI_PUS', 'Rinse — Membrane Filtration');
}

function syncCvAll() {
  return runCvSync_('', 'All CV routes');
}


// ============================================================
// MAIN
// ============================================================

function runCvSync_(onlyMatrix, label) {
  const ui = SpreadsheetApp.getUi();
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(5000)) {
    ui.alert('มีการ Sync อื่นกำลังทำงานอยู่ กรุณากดลองใหม่');
    return null;
  }

  try {
    const ss = SpreadsheetApp.openById(CVS.SOURCE_ID);
    const sheet = ss.getSheetByName(CVS.SOURCE_SHEET);
    if (!sheet) throw new Error('ไม่พบ source tab: ' + CVS.SOURCE_SHEET);
    if (sheet.getLastRow() < 2) {
      ui.alert('ไม่พบข้อมูล CV');
      return null;
    }

    const data = sheet.getDataRange().getValues();
    const c = cvCols_(data[0]);
    const selected = [];
    const rejected = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      if (!cvTrue_(row[c.worksheetCreate])) continue;
      if (!cvBlank_(row[c.syncStatus])) continue;

      let profile;
      try {
        profile = cvProfile_(row, c);
      } catch (e) {
        rejected.push(
          'Row ' + (i + 1) + ': ' + String(e.message || e)
        );
        continue;
      }

      if (onlyMatrix && profile.sampleMatrix !== onlyMatrix) continue;

      selected.push({
        row: row,
        rowNo: i + 1,
        profile: profile
      });
    }

    if (!selected.length) {
      let msg = 'ไม่พบแถวที่ worksheetCreate = TRUE และ syncStatus ว่าง';
      if (rejected.length) msg += '\n\nValidation:\n- ' + rejected.join('\n- ');
      ui.alert('CV Sync → RPP2 (' + label + ')', msg, ui.ButtonSet.OK);
      return {
        records: 0,
        rows: 0,
        validationErrors: rejected.length
      };
    }

    const chunks = buildCvChunks_(selected, c);
    const items = [];

    for (let j = 0; j < chunks.length; j++) {
      items.push(buildCvPayloadItem_(chunks[j], c));
    }

    const response = UrlFetchApp.fetch(CVS.SYSTEM_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({
        action: 'sync',
        domain: 'cv',
        apiVersion: '2026-09-08',
        requestId: Utilities.getUuid(),
        // Do not call Session.getActiveUser(); it caused userinfo.email permission errors.
        username: 'Testing-sync',
        items: items
      }),
      muteHttpExceptions: true,
      followRedirects: true
    });

    const http = response.getResponseCode();
    let body;

    try {
      body = JSON.parse(response.getContentText());
    } catch (e2) {
      throw new Error(
        'RPP2 CV System returned non-JSON (HTTP ' + http + ')'
      );
    }

    if (
      http < 200 ||
      http >= 300 ||
      body.success === false ||
      body.ok === false ||
      (body.success !== true && body.ok !== true)
    ) {
      throw new Error(body.error || 'RPP2 CV System sync failed');
    }

    const mappingById = {};
    const mappings = Array.isArray(body.mappings) ? body.mappings : [];

    for (let m = 0; m < mappings.length; m++) {
      if (mappings[m] && mappings[m].recordId) {
        mappingById[String(mappings[m].recordId)] = mappings[m];
      }
    }

    let syncedRows = 0;
    const routeCounts = {
      CONTACT_PLATE: 0,
      PW_PRW: 0,
      WFI_PUS: 0
    };

    for (let k = 0; k < chunks.length; k++) {
      const chunk = chunks[k];
      const item = items[k];
      const mapping = mappingById[item.recordId];

      if (!mapping || !mapping.worksheetNo) {
        throw new Error(
          'RPP2 response omitted worksheet mapping for ' + item.recordId
        );
      }

      routeCounts[chunk.profile.sampleMatrix]++;

      for (let r = 0; r < chunk.rows.length; r++) {
        const sourceRowNo = chunk.rows[r].rowNo;

        sheet.getRange(sourceRowNo, c.worksheetNo + 1)
          .setValue(mapping.worksheetNo);

        sheet.getRange(sourceRowNo, c.syncStatus + 1)
          .setValue('synced');

        sheet.getRange(sourceRowNo, c.worksheetCreate + 1)
          .setValue(false);

        syncedRows++;
      }
    }

    SpreadsheetApp.flush();

    let report =
      'สร้าง/Recovery worksheet: ' + chunks.length + '\n' +
      'แถวที่ sync สำเร็จ: ' + syncedRows + '\n' +
      'Contact Plate: ' + routeCounts.CONTACT_PLATE + '\n' +
      'Rinse — Pour Plate: ' + routeCounts.PW_PRW + '\n' +
      'Rinse — Membrane: ' + routeCounts.WFI_PUS + '\n' +
      'Validation skipped: ' + rejected.length;

    if (rejected.length) {
      report += '\n\nValidation:\n- ' + rejected.join('\n- ');
    }

    ui.alert(
      'CV Sync → RPP2 (' + label + ')',
      report,
      ui.ButtonSet.OK
    );

    return {
      records: chunks.length,
      rows: syncedRows,
      validationErrors: rejected.length
    };

  } catch (e) {
    ui.alert(
      'CV Sync — ERROR',
      String(e && e.message ? e.message : e),
      ui.ButtonSet.OK
    );
    throw e;

  } finally {
    lock.releaseLock();
  }
}


// ============================================================
// GROUPING + TEMPLATE CAPACITY
// ============================================================

function buildCvChunks_(rows, c) {
  const groups = {};

  for (let i = 0; i < rows.length; i++) {
    const item = rows[i];
    const p = item.profile;
    const row = item.row;

    // Worksheet identity.
    // Equipment and Location stay sample-level and do NOT split the worksheet.
    const key = [
      p.samplingDate,
      p.sampleMatrix,
      p.building,
      cvText_(row[c.item]),
      cvText_(row[c.room]),
      p.cvType,
      p.recordStatus,
      p.cleaningRunNo
    ].join('|');

    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const chunks = [];
  const keys = Object.keys(groups).sort();

  for (let g = 0; g < keys.length; g++) {
    const groupRows = groups[keys[g]];
    groupRows.sort(function(a, b) {
      return a.rowNo - b.rowNo;
    });

    const profile = groupRows[0].profile;
    const size = profile.sampleMatrix === 'CONTACT_PLATE'
      ? CVS.MAX_CONTACT
      : CVS.MAX_RINSE;

    for (let start = 0; start < groupRows.length; start += size) {
      chunks.push({
        groupKey: keys[g],
        chunkNo: Math.floor(start / size) + 1,
        profile: profile,
        rows: groupRows.slice(start, start + size)
      });
    }
  }

  return chunks;
}


// ============================================================
// ROUTING
// ============================================================

function cvProfile_(row, c) {
  const samp = cvToken_(row[c.sampMethod]);
  const test = cvToken_(row[c.testMethod]);

  let matrix = '';
  let normalizedMethod = '';
  let templateFamily = '';

  if (samp.indexOf('CONTACT') >= 0) {
    matrix = 'CONTACT_PLATE';
    normalizedMethod = 'CONTACT_PLATE';
    templateFamily = 'cv-contact';

  } else if (test.indexOf('POUR') >= 0) {
    matrix = 'PW_PRW';
    normalizedMethod = 'POUR_PLATE';
    templateFamily = 'cv-rinse-pour';

  } else if (
    test.indexOf('MEMBRANE') >= 0 ||
    test.indexOf('MEMB') >= 0 ||
    test.indexOf('FILTRATION') >= 0
  ) {
    matrix = 'WFI_PUS';
    normalizedMethod = 'MEMBRANE_FILTRATION';
    templateFamily = 'cv-rinse-membrane';

  } else {
    throw new Error(
      'ไม่สามารถ route ได้: Samp-Method="' +
      cvText_(row[c.sampMethod]) +
      '", Test-Method="' +
      cvText_(row[c.testMethod]) + '"'
    );
  }

  return {
    sampleMatrix: matrix,
    testMethod: normalizedMethod,
    templateFamily: templateFamily,
    samplingDate: cvDate_(row[c.samplingDate]),
    building: cvBuilding_(row[c.building]),
    cvType: cvType_(row[c.cvType]),
    recordStatus: cvRecordStatus_(row[c.recordStatus]),
    cleaningRunNo: cvPositiveInt_(row[c.runNo], 1)
  };
}


// ============================================================
// PAYLOAD BUILDERS
// ============================================================

function buildCvPayloadItem_(chunk, c) {
  const first = chunk.rows[0].row;
  const p = chunk.profile;

  const sourceRows = chunk.rows.map(function(x) {
    return x.rowNo;
  });

  const identity = {
    groupKey: chunk.groupKey,
    chunkNo: chunk.chunkNo,
    sourceRows: sourceRows
  };

  const recordId = 'CVREC-' + cvShortHash_(identity);
  const samples = [];

  for (let i = 0; i < chunk.rows.length; i++) {
    samples.push(
      buildCvSample_(
        recordId,
        chunk.rows[i].row,
        c,
        p,
        i + 1
      )
    );
  }

  const record = {
    recordId: recordId,
    worksheetNo: '',
    domain: 'CV',

    recordStatus: p.recordStatus,
    cvType: p.cvType,
    sampleMatrix: p.sampleMatrix,
    samplingFamily: p.sampleMatrix === 'CONTACT_PLATE'
      ? 'contact-plate'
      : 'rinse',
    testMethod: p.testMethod,
    templateFamily: p.templateFamily,

    building: p.building,
    // Contact template metadata is record-level. The current source does not
    // provide an approved section field, so keep the placeholder blank.
    sectionName: '',
    productName: cvText_(first[c.item]),
    productLotNo: '',
    cleaningRunNo: p.cleaningRunNo,

    samplingDate: p.samplingDate,
    samplingTime: '',
    performedDate: '',
    determinedDate: '',
    concludedDate: '',
    approvedDate: '',

    // Template/lab fields not present in Testing remain blank.
    lotContact: '',
    lotTSA: '',
    comment: '',

    // Compact, document-oriented sample contract.
    // Product/Item remains record-level as productName.
    samples: samples,
    samplesJson: JSON.stringify(samples),

    // Preserve evaluation at record level without bloating every sample.
    overallResult: cvOverallResultFromRows_(chunk.rows, c),

    sourceSystem: 'Testing',
    sourceRecordKey: [
      chunk.groupKey,
      'chunk=' + chunk.chunkNo,
      'rows=' + sourceRows.join(',')
    ].join('|'),

    createdBy: 'Testing-sync',
    updatedBy: 'Testing-sync'
  };

  if (p.sampleMatrix === 'CONTACT_PLATE') {
    record.gradeControl = cvFirstNonBlank_(
      chunk.rows,
      c.grade
    );

    // User-approved mapping.
    record.leftGloveResult = cvControlValue_(
      cvFirstNonBlank_(chunk.rows, c.fingerLeft)
    );
    record.rightGloveResult = cvControlValue_(
      cvFirstNonBlank_(chunk.rows, c.fingerRight)
    );
    record.settlePlateResult = cvControlValue_(
      cvFirstNonBlank_(chunk.rows, c.settlePlate)
    );

  } else {
    // User-approved: Rinse controls are completed in RPP2/web app later.
    record.temp = '';
    record.incNo = '';
    record.rightHand = '';
    record.leftHand = '';
    record.rightEM = '';
    record.leftEM = '';
    record.negativeValue = '';
    record.lotBuffer = '';
    record.lotPCA = '';
    record.lotPlate = '';
    record.lotPipette = '';
    record.lotPMembrane = '';
    record.lotForceps = '';
  }

  record.anf3Fingerprint = cvShortHash_({
    route: p.sampleMatrix,
    sourceRecordKey: record.sourceRecordKey,
    samples: samples
  });

  return {
    id: recordId,
    recordId: recordId,
    action: 'upsert',
    domain: 'cv',
    data: record
  };
}


function buildCvSample_(recordId, row, c, profile, index) {
  const equipment = cvText_(row[c.equipment]);
  const location = cvText_(row[c.location]);
  const samplingPoint = cvSamplingPoint_(equipment, location);
  const result = cvResult_(row[c.result]);
  const excluded = cvTrue_(row[c.exclude]);
  const remark = cvText_(row[c.note]);

  if (profile.sampleMatrix === 'CONTACT_PLATE') {
    const contact = {
      index: index,
      samplingPoint: samplingPoint,
      equipment: equipment,
      location: location,
      grade: cvText_(row[c.grade]),
      result: result.display
    };

    // Keep exceptional source information without bloating normal samples.
    if (excluded) contact.excluded = true;
    if (remark) contact.remark = remark;

    return contact;
  }

  // Rinse intentionally follows the compact Water-style contract.
  // samplingTag is blank because Testing does not provide a real tag.
  const rinse = {
    index: index,
    samplingPoint: samplingPoint,
    samplingTag: '',
    location: location,
    noLocation: cvText_(row[c.room]),
    waterType: cvWaterType_(row[c.sampMethod])
  };

  if (profile.sampleMatrix === 'PW_PRW') {
    // Testing has only the final reported Result.
    // Do not invent replicate I / II.
    rinse.result1 = '';
    rinse.result2 = '';
    rinse.resultAvg = result.display;
  } else {
    // WFI/PUS membrane template has one result column.
    rinse.result = result.display;
  }

  if (excluded) rinse.excluded = true;
  if (remark) rinse.remark = remark;

  return rinse;
}

// ============================================================
// RESULT / SPEC
// ============================================================

function cvResult_(value) {
  const raw = cvText_(value);
  const upper = raw.toUpperCase();

  if (!raw) {
    return {
      value: '',
      qualifier: 'NOT_TESTED',
      display: ''
    };
  }

  if (upper === '9999' || upper === 'TNTC') {
    return {
      value: '',
      qualifier: 'TNTC',
      display: 'TNTC'
    };
  }

  if (raw === '<1') {
    return {
      value: 0,
      qualifier: 'LESS_THAN_ONE',
      display: '<1'
    };
  }

  const number = Number(raw);

  if (isFinite(number)) {
    return {
      value: number,
      qualifier: 'NUMERIC',
      display: raw
    };
  }

  return {
    value: '',
    qualifier: 'TEXT',
    display: raw
  };
}


function cvSpec_(value) {
  const raw = cvText_(value);
  if (!raw) return { value: '', text: '' };

  const number = Number(raw);

  return {
    value: isFinite(number) ? number : '',
    text: raw
  };
}


function cvEvaluate_(result, spec, excluded) {
  if (excluded) return 'EXCLUDED';
  if (spec.value === '') return 'REVIEW_REQUIRED';

  if (result.qualifier === 'TNTC') return 'FAIL';

  if (
    result.qualifier === 'NUMERIC' ||
    result.qualifier === 'LESS_THAN_ONE'
  ) {
    return Number(result.value) <= Number(spec.value)
      ? 'PASS'
      : 'FAIL';
  }

  return 'REVIEW_REQUIRED';
}



function cvOverallResultFromRows_(items, c) {
  let hasActive = false;
  let allPass = true;

  for (let i = 0; i < items.length; i++) {
    const row = items[i].row;
    const excluded = cvTrue_(row[c.exclude]);

    if (excluded) continue;

    hasActive = true;

    const status = cvEvaluate_(
      cvResult_(row[c.result]),
      cvSpec_(row[c.spec]),
      false
    );

    if (status === 'FAIL') return 'FAIL';
    if (status !== 'PASS') allPass = false;
  }

  if (!hasActive) return 'REVIEW_REQUIRED';
  return allPass ? 'PASS' : 'REVIEW_REQUIRED';
}


function cvControlValue_(value) {
  return cvResult_(value).display;
}


// ============================================================
// SOURCE COLUMNS
// ============================================================

function cvCols_(headers) {
  return {
    worksheetNo: cvFindCol_(headers, ['worksheetNo', 'worksheet No.']),
    worksheetCreate: cvFindCol_(headers, ['worksheetCreate']),
    syncStatus: cvFindCol_(headers, ['syncStatus']),

    building: cvFindCol_(headers, ['Bld', 'building']),
    room: cvFindCol_(headers, ['room']),
    grade: cvFindCol_(headers, ['Grade', 'grade']),
    item: cvFindCol_(headers, ['ProductName', 'productName', 'Item']),
    equipment: cvFindCol_(headers, ['Equipment']),
    location: cvFindCol_(headers, ['Location']),
    samplingDate: cvFindCol_(headers, ['Sampling date']),
    sampMethod: cvFindCol_(headers, ['Samp-Method']),
    testMethod: cvFindCol_(headers, ['Test-Method']),
    cvType: cvFindCol_(headers, ['CV/CEHT']),
    recordStatus: cvFindCol_(headers, ['Normal/ReSamp']),
    runNo: cvFindCol_(headers, ['ครั้งที่']),
    count: cvFindCol_(headers, ['Count']),
    result: cvFindCol_(headers, ['Result']),
    spec: cvFindCol_(headers, ['Spec']),
    unit: cvFindCol_(headers, ['Unit']),
    settlePlate: cvFindCol_(headers, ['Settle Plate']),
    fingerLeft: cvFindCol_(headers, ['Finger Dab-Left']),
    fingerRight: cvFindCol_(headers, ['Finger Dab-Right']),
    exclude: cvFindCol_(headers, ['Exclude']),
    note: cvFindCol_(headers, ['Note'])
  };
}


function cvFindCol_(headers, aliases) {
  for (let a = 0; a < aliases.length; a++) {
    const wanted = cvNormHeader_(aliases[a]);

    for (let i = 0; i < headers.length; i++) {
      if (cvNormHeader_(headers[i]) === wanted) return i;
    }
  }

  throw new Error(
    'ไม่พบคอลัมน์: ' + aliases.join(' / ')
  );
}


// ============================================================
// NORMALIZATION
// ============================================================

function cvSamplingPoint_(equipment, location) {
  if (equipment && location) return equipment + ' - ' + location;
  return equipment || location || '';
}


function cvWaterType_(samplingMethod) {
  const token = cvToken_(samplingMethod);

  if (token.indexOf('WFI') >= 0) return 'WFI';
  if (token.indexOf('PUS') >= 0) return 'PUS';
  if (token.indexOf('PRW') >= 0) return 'PRW';
  if (token.indexOf('PW') >= 0) return 'PW';

  return '';
}


function cvBuilding_(value) {
  const raw = cvText_(value);
  if (!raw) return '';

  const token = raw
    .toUpperCase()
    .replace(/[ _-]+/g, '');

  const match = token.match(
    /^(?:BUILDING|BLDG|BLD|B)?(\d+)(?:\.0+)?$/
  );

  return match
    ? 'Building ' + match[1]
    : raw;
}

// Publicly named normalization hook used by the release wiring audit. Keep
// the legacy helper as the implementation so existing sync code is unchanged.
function normalizeCvBuilding_(value) {
  return cvBuilding_(value);
}


function cvType_(value) {
  return cvToken_(value) === 'CEHT' ? 'CEHT' : 'CV';
}


function cvRecordStatus_(value) {
  const token = cvToken_(value);

  return (
    token.indexOf('RESAMP') >= 0 ||
    token.indexOf('RESAMPLE') >= 0
  )
    ? 'RESAMPLE'
    : 'NORMAL';
}


function cvDate_(value) {
  if (!value) return '';

  if (
    Object.prototype.toString.call(value) === '[object Date]' &&
    !isNaN(value.getTime())
  ) {
    return Utilities.formatDate(
      value,
      CVS.TZ,
      'yyyy-MM-dd'
    );
  }

  const raw = cvText_(value);

  // dd/mm/yyyy from Testing.
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return (
      m[3] + '-' +
      cvPad2_(Number(m[2])) + '-' +
      cvPad2_(Number(m[1]))
    );
  }

  const parsed = new Date(raw);

  if (!isNaN(parsed.getTime())) {
    return Utilities.formatDate(
      parsed,
      CVS.TZ,
      'yyyy-MM-dd'
    );
  }

  return raw;
}


function cvFirstNonBlank_(items, columnIndex) {
  for (let i = 0; i < items.length; i++) {
    const value = items[i].row[columnIndex];
    if (!cvBlank_(value)) return value;
  }
  return '';
}


function cvPositiveInt_(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}


// ============================================================
// GENERIC HELPERS
// ============================================================

function cvShortHash_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    JSON.stringify(value),
    Utilities.Charset.UTF_8
  );

  let out = '';

  for (let i = 0; i < bytes.length; i++) {
    out += ('0' + (bytes[i] & 255).toString(16)).slice(-2);
  }

  return out.slice(0, 16);
}


function cvToken_(value) {
  return cvText_(value)
    .toUpperCase()
    .replace(/[ _.,:;\-/]+/g, '');
}


function cvNormHeader_(value) {
  return cvText_(value)
    .toLowerCase()
    .replace(/[\s._%-]+/g, '');
}


function cvText_(value) {
  return value === null || value === undefined
    ? ''
    : String(value).trim();
}


function cvTrue_(value) {
  return value === true ||
    cvText_(value).toUpperCase() === 'TRUE';
}


function cvBlank_(value) {
  return value === '' ||
    value === null ||
    value === undefined;
}


function cvPad2_(n) {
  return n < 10 ? '0' + n : String(n);
}


function cvPad3_(n) {
  let s = String(n);
  while (s.length < 3) s = '0' + s;
  return s;
}


// ============================================================
// COMPACT SAMPLE CONTRACT — LOCAL HELPER TEST
// ============================================================

function testCvCompactSampleContract() {
  const headers = [
    'worksheetNo', 'worksheetCreate', 'Bld', 'room', 'Grade',
    'Item', 'Equipment', 'Location', 'Sampling date',
    'Samp-Method', 'Test-Method', 'CV/CEHT', 'Normal/ReSamp',
    'ครั้งที่', 'Count', 'Result', 'Spec', 'Unit',
    'Settle Plate', 'Finger Dab-Left', 'Finger Dab-Right',
    'Exclude', 'Note', 'syncStatus'
  ];

  const c = cvCols_(headers);

  const contactRow = [
    '', true, '10', '10-1-001', 'D',
    'Risperidone', 'Rapid mixer granulator', 'Bowl with Top dish',
    '08/09/2026', 'Contact plate', 'Contact plate',
    'CV', 'Normal', 1, 2, 2, 50, 'cfu',
    '', '', '', false, '', ''
  ];

  const contactProfile = cvProfile_(contactRow, c);
  const contact = buildCvSample_(
    'CVREC-test',
    contactRow,
    c,
    contactProfile,
    1
  );

  if (
    contact.samplingPoint !==
      'Rapid mixer granulator - Bowl with Top dish' ||
    contact.grade !== 'D' ||
    contact.result !== '2' ||
    Object.prototype.hasOwnProperty.call(contact, 'sampleId') ||
    Object.prototype.hasOwnProperty.call(contact, 'resultValue')
  ) {
    throw new Error('Contact compact sample contract failed');
  }

  const pourRow = [
    '', true, '16', '16-1-107', 'D',
    'Product A', 'Bottle filling', 'Filling tube-1',
    '08/09/2026', 'Rinse-PW', 'Pour plate',
    'CV', 'Normal', 1, 9999, 9999, 100, 'cfu/ml',
    '', '', '', false, '', ''
  ];

  const pourProfile = cvProfile_(pourRow, c);
  const pour = buildCvSample_(
    'CVREC-test',
    pourRow,
    c,
    pourProfile,
    1
  );

  if (
    pour.samplingTag !== '' ||
    pour.noLocation !== '16-1-107' ||
    pour.waterType !== 'PW' ||
    pour.result1 !== '' ||
    pour.result2 !== '' ||
    pour.resultAvg !== 'TNTC'
  ) {
    throw new Error('Pour compact sample contract failed');
  }

  const membraneRow = [
    '', true, '16', '16-1-107', 'A',
    'Product B', 'Vial filling machine', 'Needle-1',
    '08/09/2026', 'Rinse-WFI', 'Memb. Filtration',
    'CV', 'Normal', 1, 134, 134, 10, 'cfu/100ml',
    '', '', '', false, '', ''
  ];

  const membraneProfile = cvProfile_(membraneRow, c);
  const membrane = buildCvSample_(
    'CVREC-test',
    membraneRow,
    c,
    membraneProfile,
    1
  );

  if (
    membrane.samplingTag !== '' ||
    membrane.noLocation !== '16-1-107' ||
    membrane.waterType !== 'WFI' ||
    membrane.result !== '134'
  ) {
    throw new Error('Membrane compact sample contract failed');
  }

  const item = buildCvPayloadItem_({
    groupKey: 'test',
    chunkNo: 1,
    profile: contactProfile,
    rows: [{ row: contactRow, rowNo: 2 }]
  }, c);

  if (item.data.productName !== 'Risperidone') {
    throw new Error('Testing.Item -> record.productName failed');
  }

  Logger.log('testCvCompactSampleContract: PASS');
  return true;
}
