import type { Domain, Workflow } from './appData';

export type RecordValue = string | number | boolean | null | undefined | RecordValue[] | { [key: string]: RecordValue };
export type RecordData = Record<string, RecordValue>;
export type SearchItem = {
  recordKey: string;
  worksheetNo?: string;
  recordId?: string;
  docNo?: string;
  building?: string;
  samplingDate?: string;
  /* Both servers already return this; it was simply never declared, so the
     list could not show it. */
  performedDate?: string;
  /* A short summary of the points sampled, added so a list row can show them
     without fetching every record — see `searchAirResponse_`. */
  samplingPoints?: string;
  sourceClass?: string;
  recordStatus?: string;
  reviewStatus?: string;
  sampleMatrix?: string;
  testMethod?: string;
  templateFamily?: string;
  sampleTypes?: string[];
  sampleCount?: number;
  productName?: string;
};
export type CachedRecord = {
  id: string;
  domain: Domain;
  workflow: Workflow['id'];
  recordKey: string;
  record: RecordData;
  samples: RecordData[];
  fetchedAt: string;
};

export const READ_CACHE_DB_NAME = 'anf3-read-cache-v1';
const DB_VERSION = 1;

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(READ_CACHE_DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('records')) database.createObjectStore('records', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('searchPages')) database.createObjectStore('searchPages', { keyPath: 'id' });
      if (!database.objectStoreNames.contains('metadata')) database.createObjectStore('metadata', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open read cache'));
  });
}

async function transact<T>(storeName: string, mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = work(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Read cache operation failed'));
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => { database.close(); reject(transaction.error || new Error('Read cache transaction aborted')); };
  });
}

export const recordCacheId = (domain: Domain, workflow: Workflow['id'], recordKey: string) => `${domain}:${workflow}:${recordKey}`;

export async function getCachedRecord(domain: Domain, workflow: Workflow['id'], recordKey: string) {
  if (!('indexedDB' in window)) return undefined;
  return transact<CachedRecord | undefined>('records', 'readonly', (store) => store.get(recordCacheId(domain, workflow, recordKey)));
}

export async function putCachedRecord(value: Omit<CachedRecord, 'id'>) {
  if (!('indexedDB' in window)) return;
  await transact<IDBValidKey>('records', 'readwrite', (store) => store.put({ ...value, id: recordCacheId(value.domain, value.workflow, value.recordKey) }));
}

/* The filters that decide WHICH SET of records a search returns — which
 * binder the reader has open. Free-text `q`, `from` and `to` are deliberately
 * excluded: they refine a set rather than choose one, and keying on them would
 * leave the offline fallback empty unless the reader retyped the same query. */
const SCOPE_KEYS = ['building', 'gasType', 'waterType', 'samplingFamily', 'testMethod', 'samplingMode'] as const;

/* Declared structurally rather than imported from `api.ts`, which imports this
 * module — a type-only cycle is erased at build time but still a cycle to read
 * around. */
type SearchScope = Partial<Record<(typeof SCOPE_KEYS)[number], string | undefined>>;

/**
 * The cache entry for one workflow AND one scope.
 *
 * Keyed on the workflow alone, Building 10 Air Sampling and Building 12 Air
 * Sampling shared a single entry, so going offline in one binder showed the
 * other building's worksheets — wrong records under a heading naming the
 * building they do not belong to.
 *
 * A scope with no filters still keys on the bare workflow id, which keeps
 * previously cached entries readable and is the shape
 * `validation/validate_interaction.mjs` seeds its fixture with.
 */
export function searchCacheKey(workflow: Workflow['id'], scope?: SearchScope) {
  const parts = SCOPE_KEYS
    .map((key) => [key, String(scope?.[key] || '').trim().toLowerCase()] as const)
    .filter(([, value]) => value && value !== 'all')
    .map(([key, value]) => `${key}=${value}`);
  return parts.length ? `${workflow}|${parts.join('&')}` : workflow;
}

export async function getCachedSearch(workflow: Workflow['id'], scope?: SearchScope) {
  if (!('indexedDB' in window)) return [];
  const key = searchCacheKey(workflow, scope);
  const result = await transact<{ id: string; items: SearchItem[] } | undefined>('searchPages', 'readonly', (store) => store.get(key));
  return result?.items || [];
}

export async function putCachedSearch(workflow: Workflow['id'], items: SearchItem[], scope?: SearchScope) {
  if (!('indexedDB' in window)) return;
  const id = searchCacheKey(workflow, scope);
  await transact<IDBValidKey>('searchPages', 'readwrite', (store) => store.put({ id, items, fetchedAt: new Date().toISOString() }));
}
