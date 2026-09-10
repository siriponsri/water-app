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

const HIDDEN_PAYLOAD_KEYS = /^(docNo|sampleCount|testMethod|samplingFamily|tagNo\d+|Grade\d+)$/;

/** Presentation labels are deliberately separate from DOCX keys. The payload
 * remains compatible with the legacy renderer while the operator never sees
 * a placeholder or storage alias. */
export function printableFields(payload: Record<string, string>) {
  return Object.keys(payload).filter((key) => !HIDDEN_PAYLOAD_KEYS.test(key)).map((key) => ({
    key,
    label: key
      .replace(/resultAvg(\d*)/i, 'Average result $1')
      .replace(/result1(\d*)/i, 'Result I $1')
      .replace(/result2(\d*)/i, 'Result II $1')
      .replace(/^result(\d*)$/i, 'Result $1')
      .replace(/samplingPoint(\d*)/i, 'Sampling point $1')
      .replace(/lotMembrane/i, 'Membrane lot')
      .replace(/lot([A-Z])/g, (_, letter) => `Media lot ${letter}`)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/(\d+)$/, ' $1')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (letter) => letter.toUpperCase())
  }));
}
