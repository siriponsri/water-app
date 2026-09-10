import type { Domain, WorkflowId } from './appData';

export type PrintFillKey = `${Domain}:${WorkflowId}:${string}`;
export type PrintFillValues = Record<string, string>;
export type PrintableField = { key: string; label: string; isResult: boolean; editable: boolean };

const STORAGE_KEY = 'anf3.print-fill.v1';

function storageKey(domain: Domain, workflow: WorkflowId, recordKey: string): PrintFillKey {
  return `${domain}:${workflow}:${recordKey}`;
}

function safeRead(): Record<string, PrintFillValues> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed as Record<string, PrintFillValues> : {};
  } catch {
    return {};
  }
}

export function readPrintFill(domain: Domain, workflow: WorkflowId, recordKey: string): PrintFillValues {
  const value = safeRead()[storageKey(domain, workflow, recordKey)];
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, String(entry || '')]));
}

export function writePrintFill(domain: Domain, workflow: WorkflowId, recordKey: string, values: PrintFillValues) {
  const all = safeRead();
  all[storageKey(domain, workflow, recordKey)] = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, String(value || '')])
  );
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* local-only aid is optional */ }
  window.dispatchEvent(new CustomEvent('anf3:print-fill'));
}

/** Only canonical keys already emitted by documentPayload may be overridden.
 * Filled values never become part of the System DB record. */
export function mergePrintFill(payload: Record<string, string>, values: PrintFillValues, route?: string) {
  const merged = { ...payload };
  const allowed = new Set(printableFields(payload, route).filter((field) => field.editable).map((field) => field.key));
  Object.entries(values).forEach(([key, value]) => {
    if (!allowed.has(key)) return;
    merged[key] = value == null ? '' : String(value);
    /* A few authoritative templates retain historical aliases in separate
       Word runs. Keep both copies in sync without exposing either alias. */
    for (const alias of PRINT_ALIASES[key] || []) {
      if (Object.prototype.hasOwnProperty.call(payload, alias)) merged[alias] = merged[key];
    }
  });
  return merged;
}

export function blankPayloadKeys(payload: Record<string, string>) {
  return Object.keys(payload).filter((key) => payload[key] === '');
}

type FieldRule = { key: string; label: string; isResult?: boolean; editable?: boolean };
type SampleRule = { prefix: string; label: string; isResult?: boolean };
type PrintSchema = { headers: FieldRule[]; samples: SampleRule[] };

const IDENTITY_HEADERS: FieldRule[] = [
  { key: 'docNo', label: 'Worksheet', editable: false },
  { key: 'building', label: 'Building', editable: false }
];

const COMMON_DATES: FieldRule[] = [
  { key: 'samplingDate', label: 'Sampling date' },
  { key: 'performedDate', label: 'Performed date' },
  { key: 'determinedDate', label: 'Determined date' },
  { key: 'concludedDate', label: 'Concluded date' },
  { key: 'approvedDate', label: 'Approved date' }
];

const CONTACT_DATES: FieldRule[] = [
  { key: 'samplingDate', label: 'Sampling date' },
  { key: 'performedDate', label: 'Performed date' },
  { key: 'determinedDate', label: 'Determined date' },
  { key: 'approvedDate', label: 'Approved date' }
];

const PW_HEADERS: FieldRule[] = [
  ...IDENTITY_HEADERS, ...COMMON_DATES,
  { key: 'incNo', label: 'Incident number' }, { key: 'leftEM', label: 'Left EM' },
  { key: 'rightEM', label: 'Right EM' }, { key: 'lotTSA', label: 'TSA lot' },
  { key: 'lotPCA', label: 'PCA lot' }, { key: 'lotPlate', label: 'Plate lot' },
  { key: 'lotPipette', label: 'Pipette lot' }, { key: 'negativeValue', label: 'Negative control', isResult: true },
  { key: 'temp', label: 'Room temperature' }, { key: 'comment', label: 'Comment' }
];

const WFI_HEADERS: FieldRule[] = [
  ...IDENTITY_HEADERS, ...COMMON_DATES,
  { key: 'incNo', label: 'Incident number' }, { key: 'leftEm', label: 'Left EM' },
  { key: 'rightEm', label: 'Right EM' }, { key: 'leftHand', label: 'Left hand' },
  { key: 'rightHand', label: 'Right hand' }, { key: 'lotTSA', label: 'TSA lot' },
  { key: 'lotBuffer', label: 'Buffer lot' }, { key: 'lotForceps', label: 'Forceps lot' },
  { key: 'lotMembrane', label: 'Membrane lot' }, { key: 'negativeValue', label: 'Negative control', isResult: true },
  { key: 'temp', label: 'Room temperature' }, { key: 'comment', label: 'Comment' }
];

const EM_HEADERS: FieldRule[] = [
  ...IDENTITY_HEADERS, ...COMMON_DATES,
  { key: 'incNo', label: 'Incident number' }, { key: 'floor', label: 'Floor' },
  { key: 'temp', label: 'Room temperature' }, { key: 'lotMedia', label: 'Media lot' },
  { key: 'mfgMedia', label: 'Media manufacture date' }, { key: 'expMedia', label: 'Media expiry date' }
];

const CA_HEADERS: FieldRule[] = [
  ...IDENTITY_HEADERS, ...COMMON_DATES,
  { key: 'incNo', label: 'Incident number' }, { key: 'tempRoom01', label: 'Room temperature' },
  { key: 'lotTSA', label: 'TSA lot' }, { key: 'mfgMedia', label: 'Media manufacture date' },
  { key: 'expMedia', label: 'Media expiry date' }, { key: 'lotOther', label: 'Other lot' }
];

const CONTACT_HEADERS: FieldRule[] = [
  ...IDENTITY_HEADERS, { key: 'productName', label: 'Product' }, ...CONTACT_DATES,
  { key: 'sectionName', label: 'Section' }, { key: 'samplingTime', label: 'Sampling time' },
  { key: 'lotContact', label: 'Contact lot' }, { key: 'lotTSA', label: 'TSA lot' },
  { key: 'lotNo', label: 'Media lot' }, { key: 'gradeControl', label: 'Grade control' }
];

const WATER_SAMPLES: SampleRule[] = [
  { prefix: 'samplingPoint', label: 'Sampling point' }, { prefix: 'tagNo', label: 'Sample tag' },
  { prefix: 'result1', label: 'Result I', isResult: true },
  { prefix: 'result2', label: 'Result II', isResult: true },
  { prefix: 'resultAvg', label: 'Average result', isResult: true }
];

const WFI_SAMPLES: SampleRule[] = [
  { prefix: 'samplingPoint', label: 'Sampling point' }, { prefix: 'tagNo', label: 'Sample tag' },
  { prefix: 'result', label: 'Result', isResult: true }
];

const AIR_SAMPLES: SampleRule[] = [
  { prefix: 'samplingPoint', label: 'Sampling point' }, { prefix: 'roomNo', label: 'Room / point' },
  { prefix: 'grade', label: 'Grade' }, { prefix: 'tempRoom', label: 'Sample temperature' },
  { prefix: 'rhRoom', label: 'Sample humidity' }, { prefix: 'timeIn', label: 'Start time' },
  { prefix: 'timeOut', label: 'End time' }, { prefix: 'occurResult', label: 'Result', isResult: true },
  { prefix: 'remark', label: 'Remark' }
];

const COMPRESSED_AIR_SAMPLES: SampleRule[] = [
  { prefix: 'samplingPoint', label: 'Sampling point' }, { prefix: 'roomNo', label: 'Room / point' },
  { prefix: 'grade', label: 'Grade' }, { prefix: 'temp', label: 'Sample temperature' },
  { prefix: 'rh', label: 'Sample humidity' }, { prefix: 'occResult', label: 'Result', isResult: true },
  { prefix: 'remark', label: 'Remark' }
];

const SCHEMAS: Record<string, PrintSchema> = {
  'pw-prw': { headers: PW_HEADERS, samples: WATER_SAMPLES },
  'wfi-pus': { headers: WFI_HEADERS, samples: WFI_SAMPLES },
  'em-air': { headers: EM_HEADERS, samples: AIR_SAMPLES },
  'compressed-air': { headers: CA_HEADERS, samples: COMPRESSED_AIR_SAMPLES },
  'cleaning-validation-contact': {
    headers: CONTACT_HEADERS,
    samples: [
      { prefix: 'samplingPoint', label: 'Sampling point' },
      { prefix: 'Grade', label: 'Grade' }, { prefix: 'result', label: 'Result', isResult: true }
    ]
  },
  'cleaning-validation-rinse-pour': { headers: PW_HEADERS, samples: WATER_SAMPLES },
  'cleaning-validation-rinse-membrane': { headers: WFI_HEADERS, samples: WFI_SAMPLES }
};

/* The no-route form is retained for callers/tests that only have a payload.
   It is still an allowlist, never a payload-key humanizer. */
const DEFAULT_SCHEMA: PrintSchema = {
  headers: [
    ...IDENTITY_HEADERS, ...COMMON_DATES,
    { key: 'lotMembrane', label: 'Membrane lot' }, { key: 'lotBuffer', label: 'Buffer lot' },
    { key: 'lotForceps', label: 'Forceps lot' }, { key: 'floor', label: 'Floor' },
    { key: 'temp', label: 'Room temperature' }, { key: 'tempRoom01', label: 'Room temperature' },
    { key: 'sectionName', label: 'Section' }, { key: 'samplingTime', label: 'Sampling time' },
    { key: 'gradeControl', label: 'Grade control' },
    { key: 'negativeValue', label: 'Negative control', isResult: true }
  ],
  samples: [...WATER_SAMPLES, ...WFI_SAMPLES, ...AIR_SAMPLES, ...COMPRESSED_AIR_SAMPLES]
};

const PRINT_ALIASES: Record<string, string[]> = {
  productName: ['ProductName'],
  samplingTime: ['samplingTime ']
};

/** Return only fields explicitly approved for the selected document route. */
export function printableFields(payload: Record<string, string>, route?: string): PrintableField[] {
  const schema = route ? (SCHEMAS[route] || { headers: [], samples: [] }) : DEFAULT_SCHEMA;
  const fields: PrintableField[] = [];
  const seen = new Set<string>();
  const emittedKeys = new Set<string>();
  for (const field of schema.headers) {
    if (seen.has(field.label) || !Object.prototype.hasOwnProperty.call(payload, field.key)) continue;
    seen.add(field.label);
    emittedKeys.add(field.key);
    fields.push({ key: field.key, label: field.label, isResult: Boolean(field.isResult), editable: field.editable !== false });
  }
  for (const rule of schema.samples) {
    const escaped = rule.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keys = Object.keys(payload)
      .filter((candidate) => new RegExp(`^${escaped}\\d+$`).test(candidate))
      .sort((left, right) => Number(left.slice(rule.prefix.length)) - Number(right.slice(rule.prefix.length)));
    for (const key of keys) {
      if (emittedKeys.has(key)) continue;
      emittedKeys.add(key);
      fields.push({ key, label: `${rule.label} ${key.slice(rule.prefix.length)}`, isResult: Boolean(rule.isResult), editable: true });
    }
  }
  return fields;
}

const CONFLICT_LABELS: Record<string, string> = {
  ProductName: 'Product', productName: 'Product', 'samplingTime ': 'Sampling time',
  lotPMembrane: 'Membrane lot', sampleMatrix: 'Sample family', testMethod: 'Test method',
  analyst: 'Analyst', reviewer: 'Reviewer'
};

/** Resolve server conflict keys without ever putting a storage key in UI text. */
export function printFieldLabel(key: string, fields: PrintableField[]) {
  return fields.find((field) => field.key === key)?.label || CONFLICT_LABELS[key] || 'Other reviewed values';
}
