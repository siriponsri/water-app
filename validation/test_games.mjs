import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../games/feller.js', import.meta.url), 'utf8');
const sandbox = {
  window: {},
  document: { addEventListener() {} },
  console,
  localStorage: { getItem() { return null; }, setItem() {} },
  setInterval() { return 1; },
  clearInterval() {},
  Number,
  Math,
  Error,
  Object,
  String,
  Array
};
vm.runInNewContext(source, sandbox, { filename: 'feller.js' });

assert.ok(sandbox.window.FellerGame, 'FellerGame test API missing');
sandbox.window.FellerGame.validateFixtures();

const f = sandbox.window.FellerGame.fellerCorrection;
const expected = [
  [400, 1, 1], [400, 21, 22], [400, 50, 53], [400, 100, 115],
  [400, 200, 277], [400, 300, 553], [400, 399, 2228], [400, 400, 2628],
  [300, 50, 55], [300, 100, 121], [300, 149, 205], [300, 200, 329],
  [300, 250, 535], [300, 299, 1585], [300, 300, 1885]
];
expected.forEach(([holes, positives, corrected]) => {
  assert.equal(f(holes, positives), corrected, `${holes}/${positives}`);
});
assert.throws(() => f(300, 301));
assert.throws(() => f(0, 0));

const growthSource = fs.readFileSync(new URL('../games/growth-promotion.js', import.meta.url), 'utf8');
assert.match(growthSource, /anf3Games\.growthPromotion\.best\.v1/);
assert.match(growthSource, /SCENARIOS\s*=\s*\[/);
assert.equal((growthSource.match(/id:\s*'GPT-/g) || []).length, 12, 'Expected 12 GPT scenarios');

const allGameSource = source + growthSource + fs.readFileSync(new URL('../games/game-common.js', import.meta.url), 'utf8');
assert.doesNotMatch(allGameSource, /waterDB|pendingSync|SCRIPT_URL|Google\s*Sheets/i);

console.log('Game logic and data-boundary checks passed');

