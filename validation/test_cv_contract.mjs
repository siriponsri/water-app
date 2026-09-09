import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../js/cv-utils.js', import.meta.url), 'utf8');
const context = vm.createContext({
  console,
  window: { crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' } },
  formatDateDMY: value => String(value || '')
});
vm.runInContext(source, context);

function evaluate(expression) {
  return vm.runInContext(expression, context);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(evaluate('normalizeCvResult("9999").resultQualifier') === 'TNTC', '9999 must normalize to TNTC');
assert(evaluate('normalizeCvResult("0").resultDisplay') === '<1', '0 must display as <1');
assert(evaluate('parseCvSpec("≤ 5").operator') === '<=', 'Unicode ≤ must normalize to <=');
assert(evaluate('evaluateCvResult(normalizeCvResult("3"), parseCvSpec("≤ 5"))') === 'PASS', '3 <= 5 must pass');
assert(evaluate('evaluateCvResult(normalizeCvResult("6"), parseCvSpec("≤ 5"))') === 'FAIL', '6 <= 5 must fail');
assert(evaluate('calculateCvOverallResult([{excluded:false,resultStatus:"PASS"},{excluded:false,resultStatus:"REVIEW_REQUIRED"}])') === 'REVIEW_REQUIRED', 'Mixed unreviewed samples must require review');
assert(evaluate('createCvId("CVR")') === 'CVR-00000000-0000-4000-8000-000000000000', 'Stable ID helper failed');

console.log('CV domain unit checks passed');

