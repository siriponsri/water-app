import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const fixedUtilities = {
  formatDate: (_date, _zone, format) => format === 'yy' ? '26' : '2026-09-01',
  newBlob: value => ({ getBytes: () => Buffer.from(String(value)), getDataAsString: () => String(value) }),
  base64EncodeWebSafe: value => Buffer.from(value).toString('base64url'),
  base64DecodeWebSafe: value => Buffer.from(value, 'base64url')
};

function load(path, extra = {}) {
  const source = fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const context = vm.createContext({
    console,
    Utilities: fixedUtilities,
    Session: { getScriptTimeZone: () => 'Asia/Bangkok' },
    ...extra
  });
  vm.runInContext(source, context);
  return expression => vm.runInContext(expression, context);
}

const air = load('google/app-scripts/RPP2-air-record.gs');
air(`getRecordsSheet = () => ({ getDataRange: () => ({ getValues: () => [
  ['worksheetNo', 'docNo'],
  ['AT-26-B10-0004', 'AT-26-B10-0004'],
  ['AT-26-B12-0009', 'AT-26-B12-0009'],
  ['AT-26-0007', 'AT-26-0007']
] }) })`);
assert.equal(air(`normalizeBuildingSegment_(' Building 10 ')`), 'B10');
assert.equal(air(`normalizeBuildingSegment_('Building 11')`), '');
assert.equal(air(`getNextDocNo('em', null, 'B10').nextDocNo`), 'AT-26-B10-0005');
assert.equal(air(`getNextDocNo('em', null, 'Building 12').nextDocNo`), 'AT-26-B12-0010');
assert.equal(air(`getNextDocNo('em', null, 'Building 19').nextDocNo`), 'AT-26-0008');
assert.equal(air(`airActiveSheet_('ca', 'Building 16')`), 'records_ca_B16');
assert.equal(air(`airActiveSheet_('ca', 'Building 11')`), 'records_ca_OT');

const water = load('google/app-scripts/RPP2-water-record.gs');
water(`getWaterSheetByName = () => ({ getDataRange: () => ({ getValues: () => [
  ['worksheetNo', 'docNo'],
  ['WT-26-B10-0012', 'WT-26-B10-0012'],
  ['WT-26-B16-0002', 'WT-26-B16-0002'],
  ['WT-26-0003', 'WT-26-0003']
] }) })`);
assert.equal(water(`getNextDocNo('Routine', null, 'PW-PRW', 'Building 10').nextDocNo`), 'WT-26-B10-0013');
assert.equal(water(`getNextDocNo('Routine', null, 'PW-PRW', 'Building 16').nextDocNo`), 'WT-26-B16-0003');
assert.equal(water(`getNextDocNo('Routine', null, 'PW-PRW', 'Other').nextDocNo`), 'WT-26-0004');
assert.equal(water(`waterActiveSheet_(targetFromSheet('records_pw_prw'), 'Building 12')`), 'records_pw_prw_B12');
assert.equal(water(`waterActiveSheet_(targetFromSheet('records_wfi'), 'Building 10')`), 'records_wfi_OT');
assert.equal(water(`waterActiveSheet_(targetFromSheet('records_wfi'), 'Building 12')`), 'records_wfi_OT');
assert.equal(water(`waterActiveSheet_(targetFromSheet('records_wfi'), 'Building 16')`), 'records_wfi_B16');

const cv = load('google/app-scripts/RPP2-cv-record.gs');
cv(`cvRecordSheet_ = () => ({ getLastRow: () => 5, getDataRange: () => ({ getValues: () => [['worksheetNo'], ['CV-26-B10-0007'], ['CV-26-B12-0008'], ['CVR-26-0004'], ['CV-26-0003']] }) })`);
cv(`objects_ = () => [
  { worksheetNo: 'CV-26-B10-0007' },
  { worksheetNo: 'CV-26-B12-0008' },
  { worksheetNo: 'CVR-26-0004' },
  { worksheetNo: 'CV-26-0003' }
]`);
const cvSpreadsheet = `{ getSheetByName: () => ({ getLastColumn: () => 50, getLastRow: () => 5, getRange: () => ({ getValues: () => [['worksheetNo','formType','productName','lotNo','building','sectionName','gradeControl','samplingDate','samplingTime','performedDate','lotContact','lotTSA','leftGloveResult','rightGloveResult','settlePlateResult','determinedDate','concludedDate','approvedDate','docNo','comment','samplesJson','createdAt','updatedAt','createdBy','recordId','domain','recordStatus','cvType','sampleMatrix','samplingFamily','productLotNo','cleaningRunNo','sampleCount','reviewStatus','overallResult','syncStatus','sourceSystem','sourceRecordKey','syncVersion','updatedBy','anf3Fingerprint','testMethod','templateFamily'],['CV-26-B10-0007'],['CV-26-B12-0008'],['CVR-26-0004'],['CV-26-0003']] }), getDataRange: () => ({ getValues: () => [['worksheetNo','formType','productName','lotNo','building','sectionName','gradeControl','samplingDate','samplingTime','performedDate','lotContact','lotTSA','leftGloveResult','rightGloveResult','settlePlateResult','determinedDate','concludedDate','approvedDate','docNo','comment','samplesJson','createdAt','updatedAt','createdBy','recordId','domain','recordStatus','cvType','sampleMatrix','samplingFamily','productLotNo','cleaningRunNo','sampleCount','reviewStatus','overallResult','syncStatus','sourceSystem','sourceRecordKey','syncVersion','updatedBy','anf3Fingerprint','testMethod','templateFamily'],['CV-26-B10-0007'],['CV-26-B12-0008'],['CVR-26-0004'],['CV-26-0003']] }) }) }`;
assert.equal(cv(`generateCvWorksheetNo_(${cvSpreadsheet}, { sampleMatrix: 'CONTACT_PLATE', building: 'Building 10' })`), 'CV-26-B10-0008');
assert.equal(cv(`generateCvWorksheetNo_(${cvSpreadsheet}, { sampleMatrix: 'CONTACT_PLATE', building: 'Building 19' })`), 'CV-26-OT-0001');
assert.equal(cv(`generateCvWorksheetNo_(${cvSpreadsheet}, { sampleMatrix: 'RINSE', building: 'Building 10' })`), 'CVR-26-B10-0001');
assert.equal(cv(`cvWorksheetProfile_({ sampleMatrix: 'RINSE', building: 'Building 16' }).buildingSegment`), 'B16');

console.log('Building-aware worksheet numbering and shard routing: PASS');
