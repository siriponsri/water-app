import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const projects = {
  air: {
    user: read('google/app-scripts/air-test.gs'),
    system: read('google/app-scripts/RPP2-air-record.gs'),
    workflows: ['compressed-air', 'em-air']
  },
  water: {
    user: read('google/app-scripts/water-r.gs'),
    system: read('google/app-scripts/RPP2-water-record.gs'),
    workflows: ['pw-prw', 'wfi-pus']
  },
  cv: {
    user: read('google/app-scripts/Testing.gs'),
    system: read('google/app-scripts/RPP2-cv-record.gs'),
    workflows: ['cv']
  }
};

for (const [domain, project] of Object.entries(projects)) {
  assert.doesNotMatch(project.user, /ANF3_SYNC_TOKEN|X-ANF3-Sync-Token/, `${domain} user has no sync-token dependency`);
  assert.doesNotMatch(project.system, /ANF3_SYNC_TOKEN|X-ANF3-Sync-Token/, `${domain} system has no sync-token dependency`);
  assert.match(project.system, /LockService\.getScriptLock\(\)/, `${domain} serializes mutations`);
  assert.match(project.system, /action === 'search'|case 'search'/, `${domain} exposes search`);
  assert.match(project.system, /action === 'get'|case 'get'/, `${domain} exposes get`);
  assert.doesNotMatch(project.system, /error\.stack|stack:\s*error/, `${domain} does not expose stack traces`);
  for (const workflow of project.workflows) {
    assert.ok(project.system.includes(`'${workflow}'`), `${domain} allowlists ${workflow}`);
  }
}

assert.match(projects.air.system, /RECORDS_EM_ACTIVE.*records_em_B10.*records_em_OT/s, 'Air active shard allowlist');
assert.match(projects.water.system, /RECORDS_ROUTINE_ACTIVE.*records_pw_prw_B10.*records_pw_prw_OT/s, 'Water active shard allowlist');
assert.match(projects.water.system, /RECORDS_WFI_ACTIVE:\s*\['records_wfi_B16', 'records_wfi_OT'\]/, 'Water WFI uses workbook shards');
assert.match(projects.cv.system, /CONTACT_SHEETS:\s*\[/, 'CV contact shards match workbook');
assert.match(projects.cv.system, /records_cv_contact_B10.*records_cv_contact_OT/s, 'CV contact shard names match workbook');
assert.match(projects.cv.system, /RINSE_SHEETS:\s*\[/, 'CV rinse shards match workbook');
assert.match(projects.cv.system, /record_cv_rinse_B10.*record_cv_rinse_OT/s, 'CV rinse shard names match workbook');
assert.doesNotMatch(projects.cv.system, /records_cv_samples/, 'CV stores samplesJson in its parent workbook tabs');
assert.match(projects.cv.system, /prefix[\s\S]{0,120}CVR|CVR-YY/, 'CV rinse uses CVR prefix');
assert.match(projects.air.system, /Legacy backup records are read-only/, 'Air protects legacy backup');
assert.match(projects.water.system, /Legacy backup records are read-only/, 'Water protects legacy backup');

const legacyPrintFiles = [
  'js/print-pw-prw.js',
  'js/print-wfi-pus.js',
  'js/print-compressed-air.js',
  'js/print-em-air.js'
];
for (const path of legacyPrintFiles) {
  const source = read(path);
  assert.match(source, /URLSearchParams\(window\.location\.search\)\.get\('worksheetNo'\)/, `${path} consumes worksheetNo`);
}

console.log('Apps Script security/read contracts and legacy worksheet selection: PASS');
