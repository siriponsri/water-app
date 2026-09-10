import type { Domain, WorkflowId } from './appData';

export type PrintQueueItem = {
  domain: Domain;
  workflow: WorkflowId;
  recordKey: string;
  worksheetNo: string;
  scope: string;
  returnTo?: string;
  cvMethod?: string;
};

const STORAGE_KEY = 'anf3.print-queue.v1';
export const PRINT_QUEUE_EVENT = 'anf3:print-queue';

function valid(item: unknown): item is PrintQueueItem {
  if (!item || typeof item !== 'object') return false;
  const value = item as Partial<PrintQueueItem>;
  return Boolean(value.domain && value.workflow && value.recordKey && value.worksheetNo && value.scope);
}

export function readPrintQueue(): PrintQueueItem[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(valid) : [];
  } catch {
    return [];
  }
}

export function writePrintQueue(items: PrintQueueItem[]) {
  const unique = items.filter(valid).filter((item, index, all) => all.findIndex((candidate) =>
    candidate.domain === item.domain && candidate.workflow === item.workflow && candidate.recordKey === item.recordKey
  ) === index);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  } catch {
    /* The print page can still use the navigation state for the current turn. */
  }
  window.dispatchEvent(new CustomEvent(PRINT_QUEUE_EVENT));
  return unique;
}

export function clearPrintQueue() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(PRINT_QUEUE_EVENT));
}

export function queueScope(items: PrintQueueItem[]) {
  return items[0]?.scope || '';
}

export function queueReturnTo(items: PrintQueueItem[]) {
  const route = items[0]?.returnTo;
  return route && route.startsWith('/list') ? route : '/list';
}
