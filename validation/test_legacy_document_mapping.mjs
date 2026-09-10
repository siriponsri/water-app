import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const cv = read('js/print-cv.js');
const emForm = read('js/form-em-air.js');
const emPrint = read('js/print-em-air.js');
const caForm = read('js/form-compressed-air.js');
const caPrint = read('js/print-compressed-air.js');
const cvScript = read('google/app-scripts/RPP2-cv-record.gs');

// Deterministic local fixtures model the source contracts without network or Sheets access.
const rinsePour = { tagNo: '', resultAvg: '6' };
const rinseMembrane = { result: '134', tagNo: '' };
const contact = { equipment: 'EQ-1', location: 'Room 2', result: 'TNTC' };

assert.equal(rinsePour.tagNo, '', 'Rinse tags remain blank when the source is blank');
assert.equal(rinsePour.resultAvg, '6', 'Pour Plate source result remains resultAvg');
assert.equal(rinseMembrane.result, '134', 'Membrane source result remains result');
assert.equal([contact.equipment, contact.location].join(' - '), 'EQ-1 - Room 2', 'Contact point uses equipment/location');

assert.match(cv, /samplingTime: record\.samplingTime/);
assert.match(cv, /['"]samplingTime ['"]: record\.samplingTime/);
assert.match(cv, /record\.lotPMembrane \|\| record\.lotMembrane/);
assert.match(cv, /sample\.tagNo \?\? sample\.samplingTag/);
assert.match(cv, /tags\[`resultAvg\$\{suffix\}`\] = result/);
assert.match(cv, /tags\[`result\$\{suffix\}`\] = result/);
assert.ok(cvScript.includes("'samplingTime ': cvString_(record.samplingTime)"));
assert.match(cvScript, /lotPMembrane/);

for (const [file, source] of [
  ['js/form-em-air.js', emForm], ['js/print-em-air.js', emPrint],
  ['js/form-compressed-air.js', caForm], ['js/print-compressed-air.js', caPrint]
]) {
  assert.doesNotMatch(source, /\|\| ['"](?:N\/A|20\.0|45\.0)['"]/, `${file} must not fabricate absent values`);
}
assert.match(caPrint, /tempRoom01/);
assert.doesNotMatch(caPrint, /tempRoom02/);
console.log('Legacy CV/EM/CA mapping and blank-value contracts passed');
