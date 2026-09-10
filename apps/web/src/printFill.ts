import type { Domain, WorkflowId } from './appData';

export type PrintFillKey = `${Domain}:${WorkflowId}:${string}`;
export type PrintFillValues = Record<string, string>;

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
export function mergePrintFill(payload: Record<string, string>, values: PrintFillValues) {
  const merged = { ...payload };
  Object.entries(values).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) merged[key] = String(value || '');
  });
  return merged;
}

export function blankPayloadKeys(payload: Record<string, string>) {
  return Object.keys(payload).filter((key) => payload[key] === '');
}

const HEADER_FIELDS = [
  ['productName', 'Product'], ['ProductName', 'Product'], ['building', 'Building'], ['sectionName', 'Section'],
  ['samplingDate', 'Sampling date'], ['performedDate', 'Performed date'], ['samplingTime', 'Sampling time'],
  ['temp', 'Room temperature'], ['lotTSA', 'TSA lot'], ['lotPCA', 'PCA lot'], ['lotPlate', 'Plate lot'],
  ['lotPipette', 'Pipette lot'], ['lotMembrane', 'Membrane lot'], ['lotForceps', 'Forceps lot'],
  ['lotBuffer', 'Buffer lot'], ['negativeValue', 'Negative control'], ['comment', 'Comment'],
  ['determinedDate', 'Determined date'], ['concludedDate', 'Concluded date'], ['approvedDate', 'Approved date']
] as const;

const SAMPLE_FIELDS = [
  ['samplingPoint', 'Sampling point'], ['roomNo', 'Room / point'], ['grade', 'Grade'],
  ['result1', 'Result I'], ['result2', 'Result II'], ['resultAvg', 'Average result'],
  ['result', 'Result'], ['occResult', 'Result'], ['occurResult', 'Result'], ['remark', 'Remark'],
  ['tempRoom', 'Sample temperature'], ['rhRoom', 'Sample humidity'], ['temp', 'Sample temperature'],
  ['rh', 'Sample humidity'], ['timeIn', 'Start time'], ['timeOut', 'End time']
] as const;

export type PrintableField = { key: string; label: string; isResult: boolean };

/** An allowlist per printable field family, deliberately independent of DOCX
 * placeholders. Unknown payload fields are never surfaced to the operator. */
export function printableFields(payload: Record<string, string>): PrintableField[] {
  const fields: PrintableField[] = [];
  for (const [key, label] of HEADER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) fields.push({ key, label, isResult: label.includes('Result') || label === 'Negative control' });
  }
  for (const [prefix, label] of SAMPLE_FIELDS) {
    for (const key of Object.keys(payload).filter((candidate) => new RegExp(`^${prefix}\\d+$`).test(candidate)).sort()) {
      fields.push({ key, label: `${label} ${key.slice(prefix.length)}`, isResult: label === 'Result' || label.startsWith('Result') });
    }
  }
  return fields;
}
