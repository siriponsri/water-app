/**
 * ANF3 Cleaning Validation — RPP2 System Web App
 * Bind to: RPP2-cv-record
 *
 * Responsibilities:
 *   - Receive CV sync payloads from Testing
 *   - Preserve route-specific samplesJson
 *   - Store Contact vs Rinse records in B10/B12/B16/OT physical shards
 *   - Return exact templatePayload keys for the provided DOCX templates
 *   - Provide GET/search endpoints for the web app
 *
 * Route identities:
 *   CONTACT_PLATE -> cv-contact
 *   PW_PRW        -> cv-rinse-pour
 *   WFI_PUS       -> cv-rinse-membrane
 */

const CVSYS = {
  TZ: 'Asia/Bangkok',
  API_VERSION: '2026-09-08',
  IMPLEMENTATION_VERSION: '8.3.0',
  TARGET_ID: '1g6klceQWA4Duy5Eq2Az0LE47-2WUUXZE2fAPFBSKHrE',

  CONTACT_SHEETS: [
    'records_cv_contact_B10',
    'records_cv_contact_B12',
    'records_cv_contact_B16',
    'records_cv_contact_OT'
  ],

  RINSE_SHEETS: [
    'record_cv_rinse_B10',
    'record_cv_rinse_B12',
    'record_cv_rinse_B16',
    'record_cv_rinse_OT'
  ],

  LOGS_SHEET: 'logs',

  CONTACT_HEADERS: [
    'worksheetNo',
    'formType',
    'productName',
    'lotNo',
    'building',
    'sectionName',
    'gradeControl',
    'samplingDate',
    'samplingTime',
    'performedDate',
    'lotContact',
    'lotTSA',

    // User-approved controls from Testing.
    // NOTE: the provided Contact DOCX currently has no placeholders in
    // the three result cells; these values are still stored and returned.
    'leftGloveResult',
    'rightGloveResult',
    'settlePlateResult',

    'determinedDate',
    'concludedDate',
    'approvedDate',
    'docNo',
    'comment',
    'samplesJson',
    'createdAt',
    'updatedAt',
    'createdBy'
  ],

  RINSE_HEADERS: [
    'worksheetNo',
    'formType',

    // Added so Cleaning Validation provenance is not lost in Rinse records.
    'productName',
    'sectionName',

    'building',
    'samplingDate',
    'performedDate',
    'temp',
    'incNo',
    'rightHand',
    'leftHand',
    'rightEM',
    'leftEM',
    'negativeValue',
    'lotBuffer',
    'lotTSA',
    'lotPCA',
    'lotPlate',
    'lotPipette',
    'lotPMembrane',
    'lotForceps',
    'determinedDate',
    'concludedDate',
    'approvedDate',
    'docNo',
    'comment',
    'samplesJson',
    'createdAt',
    'updatedAt',
    'createdBy'
  ],

  CONTROL_HEADERS: [
    'recordId',
    'domain',
    'recordStatus',
    'cvType',
    'sampleMatrix',
    'samplingFamily',
    'productLotNo',
    'cleaningRunNo',
    'sampleCount',
    'reviewStatus',
    'overallResult',
    'syncStatus',
    'sourceSystem',
    'sourceRecordKey',
    'syncVersion',
    'updatedBy',
    'anf3Fingerprint',
    'testMethod',
    'templateFamily'
  ],

  LOG_HEADERS: [
    'timestamp',
    'action',
    'recordId',
    'worksheetNo',
    'domain',
    'actor',
    'details',
    'payloadHash'
  ]
};


// ============================================================
// MENU / SETUP
// ============================================================

function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('ANF3 CV System')
    .addItem('Setup / verify schema', 'setupCvSystemSheets')
    .addItem('Check configuration', 'verifyCvSystemSetup')
    .addItem('Test helpers (no write)', 'testCvSystemHelpers')
    .addToUi();
}


function setupCvSystemSheets() {
  const ss = cvSpreadsheet_();

  for (let i = 0; i < CVSYS.CONTACT_SHEETS.length; i++) {
    ensureCvSheet_(
      ss,
      CVSYS.CONTACT_SHEETS[i],
      CVSYS.CONTACT_HEADERS.concat(CVSYS.CONTROL_HEADERS)
    );
  }

  for (let j = 0; j < CVSYS.RINSE_SHEETS.length; j++) {
    ensureCvSheet_(
      ss,
      CVSYS.RINSE_SHEETS[j],
      CVSYS.RINSE_HEADERS.concat(CVSYS.CONTROL_HEADERS)
    );
  }

  ensureCvSheet_(
    ss,
    CVSYS.LOGS_SHEET,
    CVSYS.LOG_HEADERS
  );

  SpreadsheetApp.getUi().alert(
    'CV schema พร้อมใช้งาน\n\n' +
    'Contact 4 shards + Rinse 4 shards + Logs: PASS'
  );
}

function verifyCvSystemSetup() {
  const ss = cvSpreadsheet_();
  const checks = [];

  for (let i = 0; i < CVSYS.CONTACT_SHEETS.length; i++) {
    checks.push(
      verifyCvSheet_(
        ss,
        CVSYS.CONTACT_SHEETS[i],
        CVSYS.CONTACT_HEADERS.concat(CVSYS.CONTROL_HEADERS)
      )
    );
  }

  for (let j = 0; j < CVSYS.RINSE_SHEETS.length; j++) {
    checks.push(
      verifyCvSheet_(
        ss,
        CVSYS.RINSE_SHEETS[j],
        CVSYS.RINSE_HEADERS.concat(CVSYS.CONTROL_HEADERS)
      )
    );
  }

  checks.push(
    verifyCvSheet_(
      ss,
      CVSYS.LOGS_SHEET,
      CVSYS.LOG_HEADERS
    )
  );

  let ok = true;
  let text = '';

  for (let k = 0; k < checks.length; k++) {
    if (!checks[k].ok) ok = false;

    text +=
      (checks[k].ok ? 'PASS ' : 'FAIL ') +
      checks[k].name +
      ': ' +
      checks[k].detail +
      '\n';
  }

  SpreadsheetApp.getUi().alert(
    'ANF3 CV System — ' + (ok ? 'READY' : 'NOT READY'),
    text,
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  return {
    ok: ok,
    checks: checks
  };
}

// ============================================================
// WEB APP
// ============================================================

function doGet(e) {
  const requestId = cvRequestId_();

  try {
    const p = e && e.parameter ? e.parameter : {};
    const action = String(p.action || 'ping').toLowerCase();

    if (action === 'ping') {
      return cvJson_({
        success: true,
        service: 'ANF3 CV System',
        domain: 'CV'
      }, 200, requestId);
    }

    if (action === 'schema') {
      return cvJson_({
        success: true,
        domain: 'CV',
        contactHeaders: CVSYS.CONTACT_HEADERS,
        rinseHeaders: CVSYS.RINSE_HEADERS,
        sampleContracts: cvSampleContracts_(),
        templateContracts: cvTemplateContracts_()
      }, 200, requestId);
    }

    if (action === 'get') {
      return getCvRecord_(p, requestId);
    }

    if (action === 'search') {
      return searchCvRecords_(p, requestId);
    }

    return cvError_(
      'UNKNOWN_ACTION',
      'Unknown action',
      400,
      requestId
    );

  } catch (e2) {
    console.error(e2);

    return cvError_(
      cvErrorCode_(e2),
      cvSafeError_(e2),
      400,
      requestId
    );
  }
}


function doPost(e) {
  const requestId = cvRequestId_();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('JSON body is required');
    }

    const payload = JSON.parse(e.postData.contents);

    if (String(payload.domain || '').toLowerCase() !== 'cv') {
      throw new Error('This endpoint accepts domain=cv only');
    }

    if (String(payload.action || '').toLowerCase() !== 'sync') {
      throw new Error('Only action=sync is supported');
    }

    return handleCvSync_(payload, requestId);

  } catch (e2) {
    console.error(e2);

    return cvError_(
      cvErrorCode_(e2),
      cvSafeError_(e2),
      400,
      requestId
    );
  }
}


// ============================================================
// SYNC
// ============================================================

function handleCvSync_(payload, requestId) {
  const items = Array.isArray(payload.items)
    ? payload.items
    : [];

  if (!items.length) {
    return cvJson_({
      success: true,
      count: 0,
      mappings: []
    }, 200, requestId);
  }

  // Do not call Session.getActiveUser(); keep permissions small.
  const actor = String(payload.username || 'Testing-sync');

  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);
  } catch (e) {
    throw new Error('BUSY_RETRY');
  }

  try {
    const ss = cvSpreadsheet_();

    const logs = requireCvSheet_(
      ss,
      CVSYS.LOGS_SHEET,
      CVSYS.LOG_HEADERS
    );

    const mappings = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i] || {};
      const incoming = item.data || {};
      const recordId = String(
        incoming.recordId ||
        item.recordId ||
        ''
      ).trim();

      if (!recordId) {
        throw new Error('recordId is required');
      }

      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/.test(recordId)) {
        throw new Error('Invalid recordId');
      }

      validateCvIncoming_(incoming);

      const existingLocation = findCvRecordLocation_(
        ss,
        recordId,
        incoming.worksheetNo
      );

      const existing = existingLocation
        ? existingLocation.record
        : null;

      const desired = cvRecordSheet_(
        ss,
        incoming
      );

      if (
        existingLocation &&
        existingLocation.sheet.getName() !== desired.getName()
      ) {
        throw new Error(
          'CONFLICT: CV sample matrix cannot change after record creation'
        );
      }

      const recordsSheet = existingLocation
        ? existingLocation.sheet
        : desired;

      const requestedNo = String(
        incoming.worksheetNo || ''
      ).trim();

      if (
        existing &&
        requestedNo &&
        requestedNo !== String(existing.worksheetNo || '')
      ) {
        throw new Error('CONFLICT: worksheetNo changed');
      }

      const worksheetNo = String(
        (existing && existing.worksheetNo) ||
        generateCvWorksheetNo_(ss, incoming)
      );

      const now = new Date();

      const samples = normalizeCvSamples_(
        recordId,
        worksheetNo,
        incoming,
        now
      );

      const fingerprint = String(
        incoming.anf3Fingerprint ||
        incoming.sourceFingerprint ||
        cvHash_({
          recordId: recordId,
          sourceRecordKey: incoming.sourceRecordKey || '',
          sampleMatrix: incoming.sampleMatrix || '',
          samples: samples
        })
      );

      if (
        existing &&
        existing.anf3Fingerprint &&
        existing.anf3Fingerprint === fingerprint
      ) {
        mappings.push({
          recordId: recordId,
          worksheetNo: worksheetNo,
          docNo: existing.docNo || worksheetNo,
          syncVersion: Number(existing.syncVersion || 0),
          action: 'NO_CHANGE',
          templateFamily: existing.templateFamily ||
            cvTemplateFamily_(incoming)
        });
        continue;
      }

      const syncVersion =
        Number(
          (existing && existing.syncVersion) ||
          incoming.syncVersion ||
          0
        ) + 1;

      const matrix = cvMatrix_(incoming.sampleMatrix);
      const family = matrix === 'CONTACT_PLATE'
        ? 'contact-plate'
        : 'rinse';

      const record = {
        recordId: recordId,
        worksheetNo: worksheetNo,
        domain: 'CV',
        recordStatus: incoming.recordStatus || 'NORMAL',
        cvType: cvType_(incoming.cvType),
        sampleMatrix: matrix,
        samplingFamily: family,

        productName: incoming.productName || incoming.ProductName || '',
        productLotNo: incoming.productLotNo || '',
        lotNo: incoming.lotNo || '',

        building: incoming.building || '',
        sectionName: incoming.sectionName || '',
        cleaningRunNo: incoming.cleaningRunNo || 1,

        samplingDate: cvNormalizeDate_(incoming.samplingDate),
        samplingTime: incoming.samplingTime || '',
        performedDate: cvNormalizeDate_(incoming.performedDate),

        determinedDate: cvNormalizeDate_(incoming.determinedDate),
        concludedDate: cvNormalizeDate_(incoming.concludedDate),
        approvedDate: cvNormalizeDate_(incoming.approvedDate),

        lotContact: incoming.lotContact || '',
        lotTSA: incoming.lotTSA || '',

        // Contact controls.
        gradeControl: incoming.gradeControl || '',
        leftGloveResult: incoming.leftGloveResult || '',
        rightGloveResult: incoming.rightGloveResult || '',
        settlePlateResult: incoming.settlePlateResult || '',

        // Rinse controls / laboratory fields.
        temp: incoming.temp || '',
        incNo: incoming.incNo || '',
        rightHand: incoming.rightHand || '',
        leftHand: incoming.leftHand || '',
        rightEM: incoming.rightEM || '',
        leftEM: incoming.leftEM || '',
        negativeValue: incoming.negativeValue || '',
        lotBuffer: incoming.lotBuffer || '',
        lotPCA: incoming.lotPCA || '',
        lotPlate: incoming.lotPlate || '',
        lotPipette: incoming.lotPipette || '',
        lotPMembrane: incoming.lotPMembrane ||
          incoming.lotMembrane ||
          '',
        lotForceps: incoming.lotForceps || '',

        docNo: incoming.docNo || worksheetNo,
        comment: incoming.comment || '',

        sampleCount: samples.length,
        reviewStatus: incoming.reviewStatus || 'DRAFT',
        overallResult:
          incoming.overallResult ||
          (existing && existing.overallResult) ||
          cvOverallResult_(samples),
        syncStatus: 'SYNCED',

        samplesJson: JSON.stringify(samples),

        sourceSystem: incoming.sourceSystem || 'Testing',
        sourceRecordKey: incoming.sourceRecordKey || recordId,
        syncVersion: syncVersion,

        createdAt:
          (existing && existing.createdAt) ||
          cvNormalizeDate_(incoming.createdAt) ||
          now,
        updatedAt: now,
        createdBy:
          (existing && existing.createdBy) ||
          incoming.createdBy ||
          actor,
        updatedBy: actor,

        anf3Fingerprint: fingerprint,

        testMethod: cvMethod_(incoming.testMethod),
        templateFamily: cvTemplateFamily_(incoming)
      };

      record.formType = matrix;

      upsertCvObject_(
        recordsSheet,
        'recordId',
        record
      );

      appendCvObject_(logs, {
        timestamp: now,
        action: 'UPSERT_CV_RECORD',
        recordId: recordId,
        worksheetNo: worksheetNo,
        domain: 'CV',
        actor: actor,
        details:
          'matrix=' + matrix +
          '; samples=' + samples.length +
          '; version=' + syncVersion +
          '; template=' + record.templateFamily,
        payloadHash: cvHash_(record)
      });

      mappings.push({
        recordId: recordId,
        worksheetNo: worksheetNo,
        docNo: record.docNo,
        syncVersion: syncVersion,
        action: existing ? 'UPDATED' : 'CREATED',
        templateFamily: record.templateFamily
      });
    }

    return cvJson_({
      success: true,
      count: mappings.length,
      mappings: mappings
    }, 200, requestId);

  } finally {
    lock.releaseLock();
  }
}


// ============================================================
// SAMPLE NORMALIZATION
// ============================================================

function normalizeCvSamples_(
  recordId,
  worksheetNo,
  incoming,
  now
) {
  let raw = incoming.samples;

  if (!Array.isArray(raw)) {
    try {
      raw = incoming.samplesJson
        ? JSON.parse(incoming.samplesJson)
        : [];
    } catch (e) {
      throw new Error(
        'samplesJson is invalid: ' + e.message
      );
    }
  }

  if (!raw.length) {
    throw new Error(
      'At least one CV sample is required'
    );
  }

  const matrix = cvMatrix_(incoming.sampleMatrix);
  const out = [];

  for (let i = 0; i < raw.length; i++) {
    const s = raw[i] || {};
    let normalized;

    if (matrix === 'CONTACT_PLATE') {
      normalized = {
        index: i + 1,
        samplingPoint: cvString_(s.samplingPoint),
        equipment: cvString_(s.equipment),
        location: cvString_(s.location),
        grade: cvString_(s.grade),
        result: cvString_(
          s.result !== undefined
            ? s.result
            : s.resultDisplay
        )
      };

    } else if (matrix === 'PW_PRW') {
      normalized = {
        index: i + 1,
        samplingPoint: cvString_(s.samplingPoint),
        samplingTag: cvString_(
          s.samplingTag !== undefined
            ? s.samplingTag
            : s.tagNo
        ),
        location: cvString_(s.location),
        noLocation: cvString_(s.noLocation),
        waterType: cvString_(s.waterType),
        result1: cvString_(s.result1),
        result2: cvString_(s.result2),
        resultAvg: cvString_(
          s.resultAvg !== undefined
            ? s.resultAvg
            : s.resultDisplay
        )
      };

    } else {
      normalized = {
        index: i + 1,
        samplingPoint: cvString_(s.samplingPoint),
        samplingTag: cvString_(
          s.samplingTag !== undefined
            ? s.samplingTag
            : s.tagNo
        ),
        location: cvString_(s.location),
        noLocation: cvString_(s.noLocation),
        waterType: cvString_(s.waterType),
        result: cvString_(
          s.result !== undefined
            ? s.result
            : s.resultDisplay
        )
      };
    }

    // Preserve exceptional source information only when meaningful.
    if (
      s.excluded === true ||
      String(s.excluded || '').toUpperCase() === 'TRUE'
    ) {
      normalized.excluded = true;
    }

    const remark = cvString_(s.remark || s.note);
    if (remark) normalized.remark = remark;

    out.push(normalized);
  }

  return out;
}

// ============================================================
// VALIDATION / ROUTING
// ============================================================

function validateCvIncoming_(incoming) {
  const matrix = cvMatrix_(incoming.sampleMatrix);

  if (!matrix) {
    throw new Error(
      'Unsupported CV sample matrix'
    );
  }

  const expected = matrix === 'CONTACT_PLATE'
    ? 'CONTACT_PLATE'
    : matrix === 'PW_PRW'
      ? 'POUR_PLATE'
      : 'MEMBRANE_FILTRATION';

  const actual = cvMethod_(
    incoming.testMethod ||
    incoming.method
  );

  if (actual && actual !== expected) {
    throw new Error(
      'Invalid CV test method for sample matrix'
    );
  }

  let raw = incoming.samples;

  if (!Array.isArray(raw)) {
    try {
      raw = incoming.samplesJson
        ? JSON.parse(incoming.samplesJson)
        : [];
    } catch (e) {
      throw new Error('samplesJson is invalid');
    }
  }

  if (!raw.length) {
    throw new Error(
      'At least one CV sample is required'
    );
  }

  const max = matrix === 'CONTACT_PLATE'
    ? 10
    : 30;

  if (raw.length > max) {
    throw new Error(
      'Too many samples for template: ' +
      raw.length +
      ' > ' +
      max
    );
  }
}


function cvRecordSheet_(ss, incoming) {
  const matrix = cvMatrix_(incoming.sampleMatrix);
  const segment = cvBuildingSegment_(incoming.building);

  const name = matrix === 'CONTACT_PLATE'
    ? 'records_cv_contact_' + segment
    : 'record_cv_rinse_' + segment;

  const requiredHeaders = matrix === 'CONTACT_PLATE'
    ? CVSYS.CONTACT_HEADERS.concat(CVSYS.CONTROL_HEADERS)
    : CVSYS.RINSE_HEADERS.concat(CVSYS.CONTROL_HEADERS);

  return requireCvSheet_(
    ss,
    name,
    requiredHeaders
  );
}

function cvMatrix_(value) {
  const token = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[ _.,:;\-/]+/g, '');

  if (
    token.indexOf('CONTACT') >= 0 ||
    token === 'CV' ||
    token === 'CEHT'
  ) {
    return 'CONTACT_PLATE';
  }

  if (
    token.indexOf('PWPRW') >= 0 ||
    token === 'PWPRW'
  ) {
    return 'PW_PRW';
  }

  if (
    token.indexOf('WFIPUS') >= 0 ||
    token === 'WFIPUS'
  ) {
    return 'WFI_PUS';
  }

  return '';
}


function cvMethod_(value) {
  const token = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[ _.-]+/g, '_');

  if (token.indexOf('POUR') >= 0) {
    return 'POUR_PLATE';
  }

  if (
    token.indexOf('MEMBRANE') >= 0 ||
    token.indexOf('MEMB') >= 0 ||
    token.indexOf('FILTRATION') >= 0
  ) {
    return 'MEMBRANE_FILTRATION';
  }

  if (token.indexOf('CONTACT') >= 0) {
    return 'CONTACT_PLATE';
  }

  return '';
}


function cvType_(value) {
  const token = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[ _.-]+/g, '');

  return token === 'CEHT'
    ? 'CEHT'
    : 'CV';
}


function cvTemplateFamily_(record) {
  const matrix = cvMatrix_(
    record && record.sampleMatrix
  );

  if (matrix === 'CONTACT_PLATE') {
    return 'cv-contact';
  }

  const method = cvMethod_(
    record && record.testMethod
  );

  if (
    matrix === 'PW_PRW' ||
    method === 'POUR_PLATE'
  ) {
    return 'cv-rinse-pour';
  }

  if (
    matrix === 'WFI_PUS' ||
    method === 'MEMBRANE_FILTRATION'
  ) {
    return 'cv-rinse-membrane';
  }

  return '';
}


// ============================================================
// WORKSHEET NUMBER — BUILDING-SCOPED SEQUENCE
//
// Contact:
//   CV-YY-B10-0001
//   CV-YY-B12-0001
//   CV-YY-B16-0001
//   CV-YY-OT-0001
//
// Rinse (Pour Plate + Membrane share the CVR sequence per building):
//   CVR-YY-B10-0001
//   CVR-YY-B12-0001
//   CVR-YY-B16-0001
//   CVR-YY-OT-0001
//
// Each prefix + building has its own independent counter.
// ============================================================

function generateCvWorksheetNo_(ss, incoming) {
  const yy = Utilities.formatDate(
    new Date(),
    CVSYS.TZ,
    'yy'
  );

  const profile = cvWorksheetProfile_(incoming);

  const pattern = new RegExp(
    '^' +
    profile.prefix +
    '-' +
    yy +
    '-' +
    profile.buildingSegment +
    '-(\\d{4})$'
  );

  let max = 0;

  // Each prefix + building has an independent sequence,
  // so the physical shard is the authoritative counter source.
  const shard = cvRecordSheet_(ss, incoming);
  const rows = cvObjects_(shard);

  for (let i = 0; i < rows.length; i++) {
    const match = String(
      rows[i].worksheetNo || ''
    )
      .trim()
      .toUpperCase()
      .match(pattern);

    if (match) {
      max = Math.max(
        max,
        Number(match[1])
      );
    }
  }

  return (
    profile.prefix +
    '-' +
    yy +
    '-' +
    profile.buildingSegment +
    '-' +
    cvPad4_(max + 1)
  );
}

function cvWorksheetProfile_(incoming) {
  const matrix = cvMatrix_(
    incoming && incoming.sampleMatrix
  );

  return {
    prefix:
      matrix === 'CONTACT_PLATE'
        ? 'CV'
        : 'CVR',

    // Building segment is now mandatory for BOTH Contact and Rinse.
    // B10/B12/B16 keep their own sequence; every other/blank value -> OT.
    buildingSegment:
      cvBuildingSegment_(
        incoming && incoming.building
      )
  };
}


function cvBuildingSegment_(value) {
  const token = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[ _-]+/g, '');

  const m = token.match(
    /^(?:BUILDING|BLDG|BLD|B)?(10|12|16)$/
  );

  return m ? 'B' + m[1] : 'OT';
}


// ============================================================
// GET / SEARCH
// ============================================================

function getCvRecord_(params, requestId) {
  const key = String(
    params.recordKey ||
    params.recordId ||
    params.worksheetNo ||
    ''
  ).trim();

  if (!key) {
    throw new Error(
      'recordId or worksheetNo is required'
    );
  }

  const ss = cvSpreadsheet_();

  let location = null;

  if (params.recordId) {
    location = findCvRecordLocation_(
      ss,
      key,
      ''
    );
  } else {
    location = findCvRecordLocation_(
      ss,
      '',
      key
    );

    if (!location) {
      location = findCvRecordLocation_(
        ss,
        key,
        ''
      );
    }
  }

  if (!location) {
    return cvError_(
      'NOT_FOUND',
      'Record not found',
      404,
      requestId
    );
  }

  const record = location.record;
  delete record._rowNumber;

  const samples = cvParseSamples_(
    record.samplesJson
  );

  record.samplingFamily =
    record.samplingFamily ||
    (
      cvMatrix_(record.sampleMatrix) === 'CONTACT_PLATE'
        ? 'contact-plate'
        : 'rinse'
    );

  record.templateFamily =
    record.templateFamily ||
    cvTemplateFamily_(record);

  const templatePayload =
    buildCvTemplatePayload_(
      record,
      samples
    );

  return cvJson_({
    success: true,
    data: {
      record: record,
      samples: samples,

      // Web app may pass this map directly to DOCX placeholder replacement.
      templatePayload: templatePayload
    }
  }, 200, requestId);
}


function searchCvRecords_(params, requestId) {
  const query = String(
    params.q || ''
  )
    .trim()
    .toLowerCase();

  const building = cvBuildingFilterToken_(params.building || '');

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number(params.limit || 30)
    )
  );

  const ss = cvSpreadsheet_();

  let records = [];

  const names = cvAllRecordSheets_();

  for (let i = 0; i < names.length; i++) {
    records = records.concat(
      cvObjects_(
        ss.getSheetByName(names[i])
      )
    );
  }

  records = records.filter(function(r) {
    if (!query) return true;

    const fields = [
      r.worksheetNo,
      r.recordId,
      r.productName,
      r.productLotNo,
      r.sectionName
    ];

    for (let j = 0; j < fields.length; j++) {
      if (
        String(fields[j] || '')
          .toLowerCase()
          .indexOf(query) >= 0
      ) {
        return true;
      }
    }

    return false;
  });

  records = records.filter(function(r) {
    return !building || cvBuildingFilterToken_(r.building || '') === building;
  });

  const requestedMethod = cvMethod_(params.testMethod || '');
  if (requestedMethod) {
    records = records.filter(function(r) {
      return cvMethod_(r.testMethod || r.method || '') === requestedMethod;
    });
  }

  records.reverse();

  const items = records
    .slice(0, limit)
    .map(function(r) {
      return {
        recordKey: r.recordId,
        recordId: r.recordId,
        worksheetNo: r.worksheetNo || '',
        productName: r.productName || '',
        productLotNo: r.productLotNo || '',
        sectionName: r.sectionName || '',
        building: r.building || '',
        sampleMatrix: r.sampleMatrix || '',
        testMethod: r.testMethod || '',
        samplingDate:
          cvNormalizeDate_(
            r.samplingDate
          ),
        sampleCount:
          Number(r.sampleCount || 0),
         reviewStatus:
           r.reviewStatus || '',
         performedDate:
           cvNormalizeDate_(r.performedDate),
         samplingPoints:
           cvSamplingPoints_(cvParseSamples_(r.samplesJson)),
         templateFamily:
          r.templateFamily ||
          cvTemplateFamily_(r)
      };
    });

  return cvJson_({
    success: true,
    count: records.length,
    data: {
      items: items
    }
  }, 200, requestId);
}

function cvSamplingPoints_(samples) {
  const points = (Array.isArray(samples) ? samples : []).map(function(sample) {
    return String((sample && (sample.samplingPoint || sample.tagNo || sample.samplingTag || sample.location)) || '').trim();
  }).filter(Boolean);
  return points.slice(0, 3).join(' · ') + (points.length > 3 ? ' …' : '');
}

function cvBuildingFilterToken_(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/[ _-]+/g, '');
  const match = raw.match(/^(?:building|bldg|bld|b)?(10|11|12|16|19)$/);
  return match ? 'building' + match[1] : raw;
}


// ============================================================
// TEMPLATE PAYLOAD
// ============================================================

function buildCvTemplatePayload_(record, samples) {
  const matrix = cvMatrix_(
    record.sampleMatrix
  );

  if (matrix === 'CONTACT_PLATE') {
    return buildContactTemplatePayload_(
      record,
      samples
    );
  }

  if (matrix === 'PW_PRW') {
    return buildPourTemplatePayload_(
      record,
      samples
    );
  }

  return buildMembraneTemplatePayload_(
    record,
    samples
  );
}


function buildContactTemplatePayload_(record, samples) {
  const p = {
    ProductName: cvString_(record.productName),
    docNo: cvString_(record.docNo || record.worksheetNo),
    lotNo: cvString_(record.lotNo),
    building: cvString_(record.building),

    // The provided DOCX literally contains <samplingTime > with a trailing
    // space. Return both aliases so a renderer can support either form.
    samplingTime: cvString_(record.samplingTime),
    'samplingTime ': cvString_(record.samplingTime),

    sectionName: cvString_(record.sectionName),
    samplingDate: cvString_(record.samplingDate),
    lotContact: cvString_(record.lotContact),
    lotTSA: cvString_(record.lotTSA),
    gradeControl: cvString_(record.gradeControl),

    performedDate: cvString_(record.performedDate),
    determinedDate: cvString_(record.determinedDate),
    approvedDate: cvString_(record.approvedDate),

    // Stored and exposed even though the current contact DOCX has no
    // placeholders in these three Result cells.
    leftGloveResult: cvString_(record.leftGloveResult),
    rightGloveResult: cvString_(record.rightGloveResult),
    settlePlateResult: cvString_(record.settlePlateResult)
  };

  for (let i = 1; i <= 10; i++) {
    const s = samples[i - 1] || {};
    const n = cvPad2_(i);

    p['samplingPoint' + n] =
      cvString_(s.samplingPoint);

    p['Grade' + n] =
      cvString_(s.grade);

    p['result' + n] =
      cvString_(
        s.result !== undefined
          ? s.result
          : s.resultDisplay
      );
  }

  return p;
}


function buildPourTemplatePayload_(record, samples) {
  const p = {
    docNo: cvString_(record.docNo || record.worksheetNo),
    building: cvString_(record.building),
    samplingDate: cvString_(record.samplingDate),

    lotPipette: cvString_(record.lotPipette),
    lotPlate: cvString_(record.lotPlate),
    lotPCA: cvString_(record.lotPCA),
    lotTSA: cvString_(record.lotTSA),

    negativeValue: cvString_(record.negativeValue),
    leftEM: cvString_(record.leftEM),
    rightEM: cvString_(record.rightEM),

    incNo: cvString_(record.incNo),
    temp: cvString_(record.temp),
    performedDate: cvString_(record.performedDate),

    determinedDate: cvString_(record.determinedDate),
    concludedDate: cvString_(record.concludedDate),
    approvedDate: cvString_(record.approvedDate),
    comment: cvString_(record.comment)
  };

  for (let i = 1; i <= 30; i++) {
    const s = samples[i - 1] || {};
    const n = cvPad2_(i);

    p['tagNo' + n] =
      cvString_(
        s.tagNo !== undefined
          ? s.tagNo
          : s.samplingTag
      );

    p['samplingPoint' + n] =
      cvString_(s.samplingPoint);

    p['result1' + n] =
      cvString_(s.result1);

    p['result2' + n] =
      cvString_(s.result2);

    p['resultAvg' + n] =
      cvString_(
        s.resultAvg !== undefined
          ? s.resultAvg
          : s.resultDisplay
      );
  }

  return p;
}


function buildMembraneTemplatePayload_(record, samples) {
  const p = {
    docNo: cvString_(record.docNo || record.worksheetNo),
    building: cvString_(record.building),
    samplingDate: cvString_(record.samplingDate),

    // RPP2 stores lotPMembrane; the provided WFI DOCX uses <lotMembrane>.
    lotMembrane: cvString_(record.lotPMembrane),
    lotForceps: cvString_(record.lotForceps),
    lotBuffer: cvString_(record.lotBuffer),
    lotTSA: cvString_(record.lotTSA),

    negativeValue: cvString_(record.negativeValue),

    // WFI DOCX uses lowercase "m" in Em.
    leftEm: cvString_(record.leftEM),
    rightEm: cvString_(record.rightEM),

    leftHand: cvString_(record.leftHand),
    rightHand: cvString_(record.rightHand),

    incNo: cvString_(record.incNo),
    temp: cvString_(record.temp),
    performedDate: cvString_(record.performedDate),

    determinedDate: cvString_(record.determinedDate),
    concludedDate: cvString_(record.concludedDate),
    approvedDate: cvString_(record.approvedDate),
    comment: cvString_(record.comment)
  };

  for (let i = 1; i <= 30; i++) {
    const s = samples[i - 1] || {};
    const n = cvPad2_(i);

    p['tagNo' + n] =
      cvString_(
        s.tagNo !== undefined
          ? s.tagNo
          : s.samplingTag
      );

    p['samplingPoint' + n] =
      cvString_(s.samplingPoint);

    p['result' + n] =
      cvString_(
        s.result !== undefined
          ? s.result
          : s.resultDisplay
      );
  }

  return p;
}


function testCvCompactSamplesV83() {
  const now = new Date();

  const contact = normalizeCvSamples_(
    'CVREC-test-contact',
    'CV-26-B10-0001',
    {
      sampleMatrix: 'CONTACT_PLATE',
      samples: [{
        index: 1,
        samplingPoint: 'Machine - Surface',
        equipment: 'Machine',
        location: 'Surface',
        grade: 'D',
        result: '2'
      }]
    },
    now
  );

  if (
    contact.length !== 1 ||
    contact[0].result !== '2' ||
    Object.prototype.hasOwnProperty.call(contact[0], 'sampleId') ||
    Object.prototype.hasOwnProperty.call(contact[0], 'resultValue')
  ) {
    throw new Error('Compact Contact normalization failed');
  }

  const pour = normalizeCvSamples_(
    'CVREC-test-pour',
    'CVR-26-B16-0001',
    {
      sampleMatrix: 'PW_PRW',
      samples: [{
        index: 1,
        samplingPoint: 'Bottle filling - Filling tube-1',
        samplingTag: '',
        location: 'Filling tube-1',
        noLocation: '16-1-107',
        waterType: 'PW',
        result1: '',
        result2: '',
        resultAvg: 'TNTC'
      }]
    },
    now
  );

  if (
    pour[0].noLocation !== '16-1-107' ||
    pour[0].waterType !== 'PW' ||
    pour[0].resultAvg !== 'TNTC'
  ) {
    throw new Error('Compact Pour normalization failed');
  }

  const pourPayload = buildPourTemplatePayload_(
    {
      worksheetNo: 'CVR-26-B16-0001',
      building: 'Building 16'
    },
    pour
  );

  if (
    pourPayload.tagNo01 !== '' ||
    pourPayload.resultAvg01 !== 'TNTC'
  ) {
    throw new Error('Pour template payload alias failed');
  }

  const membrane = normalizeCvSamples_(
    'CVREC-test-membrane',
    'CVR-26-B16-0002',
    {
      sampleMatrix: 'WFI_PUS',
      samples: [{
        index: 1,
        samplingPoint: 'Vial filling machine - Needle-1',
        samplingTag: '',
        location: 'Needle-1',
        noLocation: '16-1-107',
        waterType: 'WFI',
        result: '134'
      }]
    },
    now
  );

  const membranePayload = buildMembraneTemplatePayload_(
    {
      worksheetNo: 'CVR-26-B16-0002',
      building: 'Building 16'
    },
    membrane
  );

  if (
    membrane[0].waterType !== 'WFI' ||
    membranePayload.result01 !== '134'
  ) {
    throw new Error('Compact Membrane normalization failed');
  }

  Logger.log('testCvCompactSamplesV83: PASS');
  return true;
}


// ============================================================
// CONTRACT INTROSPECTION
// ============================================================

function cvSampleContracts_() {
  return {
    CONTACT_PLATE: {
      templateFamily: 'cv-contact',
      capacity: 10,
      fields: [
        'index',
        'samplingPoint',
        'equipment',
        'location',
        'grade',
        'result'
      ],
      optionalFields: [
        'excluded',
        'remark'
      ]
    },

    PW_PRW: {
      templateFamily: 'cv-rinse-pour',
      capacity: 30,
      fields: [
        'index',
        'samplingPoint',
        'samplingTag',
        'location',
        'noLocation',
        'waterType',
        'result1',
        'result2',
        'resultAvg'
      ],
      optionalFields: [
        'excluded',
        'remark'
      ]
    },

    WFI_PUS: {
      templateFamily: 'cv-rinse-membrane',
      capacity: 30,
      fields: [
        'index',
        'samplingPoint',
        'samplingTag',
        'location',
        'noLocation',
        'waterType',
        'result'
      ],
      optionalFields: [
        'excluded',
        'remark'
      ]
    }
  };
}

function cvTemplateContracts_() {
  return {
    'cv-contact': {
      template: 'cv-contact-template',
      capacity: 10,
      note:
        'Current DOCX has no placeholders for leftGloveResult/rightGloveResult/settlePlateResult.'
    },

    'cv-rinse-pour': {
      template: 'pw-prw-template',
      capacity: 30
    },

    'cv-rinse-membrane': {
      template: 'wfi-pus-template',
      capacity: 30,
      aliases: {
        lotPMembrane: 'lotMembrane',
        leftEM: 'leftEm',
        rightEM: 'rightEm'
      }
    }
  };
}


function cvAllRecordSheets_() {
  return CVSYS.CONTACT_SHEETS.concat(
    CVSYS.RINSE_SHEETS
  );
}


function cvRecordSheetName_(matrix, building) {
  const segment = cvBuildingSegment_(building);

  return cvMatrix_(matrix) === 'CONTACT_PLATE'
    ? 'records_cv_contact_' + segment
    : 'record_cv_rinse_' + segment;
}


// ============================================================
// RECORD LOCATION / RESULT
// ============================================================

function findCvRecordLocation_(
  ss,
  recordId,
  worksheetNo
) {
  const names = cvAllRecordSheets_();

  for (let i = 0; i < names.length; i++) {
    const sheet = ss.getSheetByName(names[i]);
    if (!sheet) continue;

    let record = recordId
      ? findCvObject_(
          sheet,
          'recordId',
          recordId
        )
      : null;

    if (!record && worksheetNo) {
      record = findCvObject_(
        sheet,
        'worksheetNo',
        worksheetNo
      );
    }

    if (record) {
      return {
        sheet: sheet,
        record: record
      };
    }
  }

  return null;
}


function cvOverallResult_(samples) {
  const active = samples.filter(function(s) {
    return s.excluded !== true;
  });

  if (!active.length) {
    return 'REVIEW_REQUIRED';
  }

  let hasStatus = false;

  for (let i = 0; i < active.length; i++) {
    if (active[i].resultStatus) hasStatus = true;
    if (active[i].resultStatus === 'FAIL') {
      return 'FAIL';
    }
  }

  if (!hasStatus) {
    return 'REVIEW_REQUIRED';
  }

  for (let j = 0; j < active.length; j++) {
    if (active[j].resultStatus !== 'PASS') {
      return 'REVIEW_REQUIRED';
    }
  }

  return 'PASS';
}


// ============================================================
// SHEET HELPERS
// ============================================================

function cvSpreadsheet_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();

  if (
    active &&
    active.getId() === CVSYS.TARGET_ID
  ) {
    return active;
  }

  return SpreadsheetApp.openById(
    CVSYS.TARGET_ID
  );
}


function ensureCvSheet_(
  ss,
  name,
  requiredHeaders
) {
  let sheet = ss.getSheetByName(name);

  if (!sheet) {
    sheet = ss.insertSheet(name);
  }

  const lastColumn = sheet.getLastColumn();

  const headers = lastColumn
    ? sheet
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0]
        .map(function(v) {
          return String(v || '').trim();
        })
    : [];

  for (let i = 0; i < requiredHeaders.length; i++) {
    const h = requiredHeaders[i];

    if (headers.indexOf(h) < 0) {
      headers.push(h);
      sheet
        .getRange(1, headers.length)
        .setValue(h);
    }
  }

  if (headers.length) {
    sheet
      .getRange(1, 1, 1, headers.length)
      .setBackground('#007d74')
      .setFontColor('#ffffff')
      .setFontWeight('bold');

    sheet.setFrozenRows(1);
  }

  return sheet;
}


function requireCvSheet_(
  ss,
  name,
  requiredHeaders
) {
  const sheet = ss.getSheetByName(name);

  if (!sheet) {
    throw new Error(
      'CV schema is not configured: ' + name
    );
  }

  const headers = sheet
    .getRange(
      1,
      1,
      1,
      Math.max(1, sheet.getLastColumn())
    )
    .getValues()[0]
    .map(function(v) {
      return String(v || '').trim();
    });

  for (let i = 0; i < requiredHeaders.length; i++) {
    if (headers.indexOf(requiredHeaders[i]) < 0) {
      throw new Error(
        name +
        ' missing header: ' +
        requiredHeaders[i] +
        '. Run Setup / verify schema first.'
      );
    }
  }

  return sheet;
}


function verifyCvSheet_(
  ss,
  name,
  requiredHeaders
) {
  const sheet = ss.getSheetByName(name);

  if (!sheet) {
    return {
      name: name,
      ok: false,
      detail: 'missing'
    };
  }

  const headers = sheet
    .getRange(
      1,
      1,
      1,
      Math.max(1, sheet.getLastColumn())
    )
    .getValues()[0]
    .map(function(v) {
      return String(v || '').trim();
    });

  const missing = [];

  for (let i = 0; i < requiredHeaders.length; i++) {
    if (headers.indexOf(requiredHeaders[i]) < 0) {
      missing.push(requiredHeaders[i]);
    }
  }

  return {
    name: name,
    ok: missing.length === 0,
    detail: missing.length
      ? 'missing: ' + missing.join(', ')
      : 'ready'
  };
}


function upsertCvObject_(
  sheet,
  keyHeader,
  object
) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(v) {
      return String(v || '').trim();
    });

  const existing = findCvObject_(
    sheet,
    keyHeader,
    object[keyHeader]
  );

  const row = headers.map(function(h) {
    return Object.prototype.hasOwnProperty.call(
      object,
      h
    )
      ? object[h]
      : '';
  });

  if (existing) {
    sheet
      .getRange(
        existing._rowNumber,
        1,
        1,
        headers.length
      )
      .setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}


function appendCvObject_(sheet, object) {
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .map(function(v) {
      return String(v || '').trim();
    });

  const row = headers.map(function(h) {
    return Object.prototype.hasOwnProperty.call(
      object,
      h
    )
      ? object[h]
      : '';
  });

  sheet.appendRow(row);
}


function findCvObject_(
  sheet,
  keyHeader,
  keyValue
) {
  if (!sheet || !keyValue) return null;

  const values = sheet.getDataRange().getValues();
  if (!values.length) return null;

  const headers = values[0].map(function(v) {
    return String(v || '').trim();
  });

  const idx = headers.indexOf(keyHeader);

  if (idx < 0) {
    throw new Error(
      sheet.getName() +
      ' missing ' +
      keyHeader +
      ' header'
    );
  }

  for (let i = 1; i < values.length; i++) {
    if (
      String(values[i][idx] || '') ===
      String(keyValue)
    ) {
      const obj = cvRowObject_(
        headers,
        values[i]
      );

      obj._rowNumber = i + 1;
      return obj;
    }
  }

  return null;
}


function cvObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(v) {
    return String(v || '').trim();
  });

  const out = [];

  for (let i = 1; i < values.length; i++) {
    let hasData = false;

    for (let j = 0; j < values[i].length; j++) {
      if (values[i][j] !== '') {
        hasData = true;
        break;
      }
    }

    if (!hasData) continue;

    const obj = cvRowObject_(
      headers,
      values[i]
    );

    obj._rowNumber = i + 1;
    out.push(obj);
  }

  return out;
}


function cvRowObject_(headers, row) {
  const obj = {};

  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i];
  }

  return obj;
}


// ============================================================
// GENERIC HELPERS
// ============================================================

function cvParseSamples_(value) {
  if (Array.isArray(value)) return value;

  try {
    return value
      ? JSON.parse(value)
      : [];
  } catch (e) {
    return [];
  }
}


function cvNormalizeDate_(value) {
  if (!value) return '';

  if (
    Object.prototype.toString.call(value) === '[object Date]' &&
    !isNaN(value.getTime())
  ) {
    return Utilities.formatDate(
      value,
      CVSYS.TZ,
      'yyyy-MM-dd'
    );
  }

  return String(value);
}


function cvRequestId_() {
  try {
    return Utilities.getUuid();
  } catch (e) {
    return 'cv-' + new Date().getTime();
  }
}


function cvJson_(value, status, requestId) {
  const code = status || 200;

  const body = Object.assign(
    {},
    value,
    {
      ok:
        value.ok === undefined
          ? value.success !== false
          : value.ok,

      status: code,

      meta: Object.assign(
        {},
        value.meta || {},
        {
          domain: 'cv',
          apiVersion: CVSYS.API_VERSION,
          implementationVersion:
            CVSYS.IMPLEMENTATION_VERSION,
          requestId:
            requestId ||
            cvRequestId_(),
          processedAt:
            new Date().toISOString(),
          timeZone: CVSYS.TZ
        }
      )
    }
  );

  return ContentService
    .createTextOutput(
      JSON.stringify(body)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


function cvError_(
  code,
  message,
  status,
  requestId
) {
  return cvJson_({
    success: false,
    ok: false,
    errorCode: code || 'REQUEST_FAILED',
    error: message || 'Request failed'
  }, status || 400, requestId);
}


function cvSafeError_(e) {
  const message = String(
    e && e.message ||
    e ||
    'Request failed'
  );

  return /spreadsheet|sheet not found|stack|range/i.test(message)
    ? 'Requested resource is unavailable'
    : message;
}


function cvErrorCode_(e) {
  const m = String(
    e && e.message ||
    e ||
    ''
  ).toUpperCase();

  if (m.indexOf('NOT FOUND') >= 0) {
    return 'NOT_FOUND';
  }

  if (m.indexOf('CONFLICT') >= 0) {
    return 'CONFLICT';
  }

  if (m.indexOf('BUSY') >= 0) {
    return 'BUSY_RETRY';
  }

  if (
    m.indexOf('INVALID') >= 0 ||
    m.indexOf('REQUIRED') >= 0 ||
    m.indexOf('UNSUPPORTED') >= 0 ||
    m.indexOf('TOO MANY') >= 0
  ) {
    return 'VALIDATION_ERROR';
  }

  return 'REQUEST_FAILED';
}


function cvHash_(value) {
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


function cvString_(value) {
  return value === null || value === undefined
    ? ''
    : String(value);
}


function cvPad2_(n) {
  return n < 10
    ? '0' + n
    : String(n);
}


function cvPad3_(n) {
  let s = String(n);
  while (s.length < 3) s = '0' + s;
  return s;
}


function cvPad4_(n) {
  let s = String(n);
  while (s.length < 4) s = '0' + s;
  return s;
}


// ============================================================
// NO-WRITE TESTS
// ============================================================

function testCvSystemHelpers() {
  const sample = {
    sampleMatrix: 'PW_PRW',
    testMethod: 'POUR_PLATE'
  };

  if (
    cvTemplateFamily_(sample) !==
    'cv-rinse-pour'
  ) {
    throw new Error(
      'Pour template route failed'
    );
  }

  if (
    cvTemplateFamily_({
      sampleMatrix: 'WFI_PUS',
      testMethod: 'MEMBRANE_FILTRATION'
    }) !== 'cv-rinse-membrane'
  ) {
    throw new Error(
      'Membrane template route failed'
    );
  }

  // Numbering-profile tests (no write).
  const contactB10 = cvWorksheetProfile_({
    sampleMatrix: 'CONTACT_PLATE',
    building: 'Building 10'
  });

  const rinseB12 = cvWorksheetProfile_({
    sampleMatrix: 'PW_PRW',
    building: 'Building 12'
  });

  const rinseB16 = cvWorksheetProfile_({
    sampleMatrix: 'WFI_PUS',
    building: '16'
  });

  const contactOT = cvWorksheetProfile_({
    sampleMatrix: 'CONTACT_PLATE',
    building: 'Building 19'
  });

  const rinseOT = cvWorksheetProfile_({
    sampleMatrix: 'PW_PRW',
    building: ''
  });

  if (
    contactB10.prefix !== 'CV' ||
    contactB10.buildingSegment !== 'B10'
  ) {
    throw new Error(
      'Contact B10 numbering profile failed'
    );
  }

  if (
    rinseB12.prefix !== 'CVR' ||
    rinseB12.buildingSegment !== 'B12'
  ) {
    throw new Error(
      'Rinse B12 numbering profile failed'
    );
  }

  if (
    rinseB16.prefix !== 'CVR' ||
    rinseB16.buildingSegment !== 'B16'
  ) {
    throw new Error(
      'Rinse B16 numbering profile failed'
    );
  }

  if (
    contactOT.buildingSegment !== 'OT' ||
    rinseOT.buildingSegment !== 'OT'
  ) {
    throw new Error(
      'OT numbering profile failed'
    );
  }


  // Physical shard routing tests (no write).
  if (
    cvRecordSheetName_(
      'CONTACT_PLATE',
      'Building 10'
    ) !== 'records_cv_contact_B10'
  ) {
    throw new Error(
      'Contact B10 shard route failed'
    );
  }

  if (
    cvRecordSheetName_(
      'CONTACT_PLATE',
      'Building 19'
    ) !== 'records_cv_contact_OT'
  ) {
    throw new Error(
      'Contact OT shard route failed'
    );
  }

  if (
    cvRecordSheetName_(
      'PW_PRW',
      'Building 12'
    ) !== 'record_cv_rinse_B12'
  ) {
    throw new Error(
      'Rinse Pour B12 shard route failed'
    );
  }

  if (
    cvRecordSheetName_(
      'WFI_PUS',
      'Building 16'
    ) !== 'record_cv_rinse_B16'
  ) {
    throw new Error(
      'Rinse Membrane B16 shard route failed'
    );
  }

  if (
    cvRecordSheetName_(
      'WFI_PUS',
      ''
    ) !== 'record_cv_rinse_OT'
  ) {
    throw new Error(
      'Rinse OT shard route failed'
    );
  }

  const allShards = cvAllRecordSheets_();

  if (
    allShards.length !== 8 ||
    allShards.indexOf('records_cv_contact_B10') < 0 ||
    allShards.indexOf('record_cv_rinse_OT') < 0
  ) {
    throw new Error(
      'Eight-shard registry failed'
    );
  }

  const contactPayload =
    buildContactTemplatePayload_(
      {
        productName: 'TEST',
        worksheetNo: 'CV-26-B10-0001',
        building: 'Building 10'
      },
      [{
        samplingPoint: 'Mixer - Bowl',
        grade: 'D',
        result: '2'
      }]
    );

  if (
    contactPayload.samplingPoint01 !==
    'Mixer - Bowl'
  ) {
    throw new Error(
      'Contact payload failed'
    );
  }

  const pourPayload =
    buildPourTemplatePayload_(
      {
        worksheetNo: 'CVR-26-B12-0001'
      },
      [{
        tagNo: '',
        samplingPoint: 'Filling - Tube 1',
        result1: '',
        result2: '',
        resultAvg: '6'
      }]
    );

  if (
    pourPayload.resultAvg01 !== '6'
  ) {
    throw new Error(
      'Pour payload failed'
    );
  }

  const membranePayload =
    buildMembraneTemplatePayload_(
      {
        worksheetNo: 'CVR-26-B16-0001',
        lotPMembrane: 'M01',
        leftEM: '1'
      },
      [{
        tagNo: '',
        samplingPoint: 'Filling - Needle 1',
        result: '0'
      }]
    );

  if (
    membranePayload.lotMembrane !== 'M01' ||
    membranePayload.leftEm !== '1'
  ) {
    throw new Error(
      'Membrane aliases failed'
    );
  }

  SpreadsheetApp.getUi().alert(
    'CV helper test: PASS\nไม่มีการเขียนข้อมูลลงชีต'
  );

  return true;
}
