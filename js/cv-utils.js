/**
 * Cleaning Validation domain helpers.
 * CV is a separate data domain from Water Test, even when the matrix is PW/PRW or WFI/PUS.
 */

const CV_CONFIG = Object.freeze({
  domain: 'CV',
  formType: 'cleaning-validation',
  maxSampleRows: 30,
  contactPlateRowsPerPage: 10,
  matrices: Object.freeze({
    CONTACT_PLATE: Object.freeze({
      label: 'Contact Plate',
      samplingMethod: 'Contact plate',
      testMethod: 'Contact plate',
      unit: 'CFU/plate'
    }),
    PW_PRW: Object.freeze({
      label: 'Rinse — PW / PRW',
      samplingMethod: 'Rinse-PW',
      testMethod: 'Pour plate',
      unit: 'CFU/mL'
    }),
    WFI_PUS: Object.freeze({
      label: 'Rinse — WFI / PUS',
      samplingMethod: 'Rinse-WFI',
      testMethod: 'Memb. Filtration',
      unit: 'CFU/100 mL'
    })
  })
});

function createCvId(prefix = 'CVR') {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${random}`;
}

function normalizeCvResult(rawValue) {
  const raw = String(rawValue ?? '').trim();
  const upper = raw.toUpperCase();

  if (!raw || upper === 'N/A' || upper === 'NT' || upper === 'NOT TESTED') {
    return { resultValue: null, resultQualifier: 'NOT_TESTED', resultDisplay: raw || 'Not tested' };
  }
  if (upper === 'TNTC' || upper === '9999') {
    return { resultValue: null, resultQualifier: 'TNTC', resultDisplay: 'TNTC' };
  }
  if (raw === '<1' || raw === '0') {
    return { resultValue: 0, resultQualifier: 'LESS_THAN_ONE', resultDisplay: '<1' };
  }

  const numeric = Number(raw);
  if (Number.isFinite(numeric)) {
    return { resultValue: numeric, resultQualifier: 'NUMERIC', resultDisplay: String(numeric) };
  }

  return { resultValue: null, resultQualifier: 'NOT_TESTED', resultDisplay: raw };
}

function parseCvSpec(specText) {
  const text = String(specText ?? '').trim();
  const match = text.match(/^(<=|>=|≤|≥|<|>|=)\s*(-?\d+(?:\.\d+)?)/);
  if (!match) return { operator: '', value: null, text };
  const operator = match[1] === '≤' ? '<=' : (match[1] === '≥' ? '>=' : match[1]);
  return { operator, value: Number(match[2]), text };
}

function evaluateCvResult(result, spec) {
  if (result.resultQualifier === 'NOT_TESTED') return 'REVIEW_REQUIRED';
  if (result.resultQualifier === 'TNTC') {
    return ['<', '<=', '='].includes(spec.operator) ? 'FAIL' : 'REVIEW_REQUIRED';
  }
  if (!spec.operator || spec.value === null) return 'REVIEW_REQUIRED';

  const value = result.resultQualifier === 'LESS_THAN_ONE' ? 0 : result.resultValue;
  if (!Number.isFinite(value)) return 'REVIEW_REQUIRED';

  const checks = {
    '<': value < spec.value,
    '<=': value <= spec.value,
    '>': value > spec.value,
    '>=': value >= spec.value,
    '=': value === spec.value
  };
  return checks[spec.operator] ? 'PASS' : 'FAIL';
}

function calculateCvOverallResult(samples) {
  const active = samples.filter(sample => !sample.excluded);
  if (!active.length) return 'REVIEW_REQUIRED';
  if (active.some(sample => sample.resultStatus === 'FAIL')) return 'FAIL';
  if (active.every(sample => sample.resultStatus === 'PASS')) return 'PASS';
  return 'REVIEW_REQUIRED';
}

function escapeCvHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function cvDisplayDate(value) {
  return value ? formatDateDMY(value) : '-';
}
