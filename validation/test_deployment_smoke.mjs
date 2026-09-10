import fs from 'node:fs';
import { assertAppsScriptExecUrl, runDeploymentSmoke } from './validate_deployment_smoke.mjs';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/deployment-smoke.json', import.meta.url), 'utf8'));
const silent = () => {};

async function mustFail(value, expected) {
  try {
    await (typeof value === 'function' ? value() : runDeploymentSmoke({ fixture: value, log: silent }));
  } catch (error) {
    if (!String(error?.message || error).includes(expected)) {
      throw new Error(`Expected ${expected}, got ${error?.message || error}`);
    }
    return;
  }
  throw new Error(`Expected deployment smoke failure containing ${expected}`);
}

await runDeploymentSmoke({ fixture, log: silent });

for (const valid of ['https://script.google.com/macros/s/ABC/exec']) assertAppsScriptExecUrl(valid, 'fixture URL');
for (const invalid of [
  'http://script.google.com/macros/s/ABC/exec',
  'https://example.com/macros/s/ABC/exec',
  'https://script.google.com/macros/s/ABC/dev',
  'https://script.google.com/macros/s/ABC/exec?x=1'
]) await mustFail(() => assertAppsScriptExecUrl(invalid, 'fixture URL'), '/exec URL');

const repeated = structuredClone(fixture);
repeated.water['pw-prw']['Building 10'] = [
  { data: { items: [], nextCursor: 'loop' } },
  { data: { items: [], nextCursor: 'loop' } }
];
await mustFail(repeated, 'cursor did not terminate safely');

const unterminated = structuredClone(fixture);
unterminated.water['pw-prw']['Building 10'] = [
  { data: { items: [], nextCursor: 'one' } },
  { data: { items: [], nextCursor: 'two' } }
];
await mustFail(unterminated, 'fixture cursor did not terminate safely');

const mixedBuilding = structuredClone(fixture);
mixedBuilding.water['pw-prw']['Building 10'][0].data.items[0].building = 'Building 12';
await mustFail(mixedBuilding, 'received mixed building');

const multipleFailures = structuredClone(fixture);
multipleFailures.water['pw-prw'].Other[0].data.items[0].building = 'Building 12';
multipleFailures.air['em-air'].Other[0].data.items[0].building = 'Building 10';
const aggregateLogs = [];
await mustFail(
  () => runDeploymentSmoke({ fixture: multipleFailures, continueOnError: true, log: (message) => aggregateLogs.push(message) }),
  'Deployment smoke failed for 2 scope(s)'
);
if (!aggregateLogs.some((message) => message.includes('PASS cv Building 16'))) {
  throw new Error('continueOnError did not inspect scopes after an earlier failure');
}

const preservedOtherText = structuredClone(fixture);
preservedOtherText.water['pw-prw'].Other[0].data.items[0].building = 'Building 19, OSD-PW (Building 10)';
await runDeploymentSmoke({ fixture: preservedOtherText, log: silent });

console.log('PASS deployment smoke validator: valid routes, repeated cursors, unterminated fixtures, and mixed buildings');
