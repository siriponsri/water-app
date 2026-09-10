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
    if (Object.prototype.hasOwnProperty.call(payload, key) && payload[key] === '') merged[key] = String(value || '');
  });
  return merged;
}

export function blankPayloadKeys(payload: Record<string, string>) {
  return Object.keys(payload).filter((key) => payload[key] === '');
}
