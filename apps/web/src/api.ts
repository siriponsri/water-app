import type { Domain, Workflow } from './appData';
import type { RecordData, SearchItem } from './storage';

export type RecordFilters = {
  q?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
  building?: string;
  gasType?: string;
  waterType?: string;
  samplingFamily?: string;
  testMethod?: string;
  samplingMode?: string;
};

/* Compiled in from .env.production at build time. */
const endpoints: Record<Domain, string> = {
  water: String(import.meta.env.VITE_WATER_READ_URL || '').trim(),
  air: String(import.meta.env.VITE_AIR_READ_URL || '').trim(),
  cv: String(import.meta.env.VITE_CV_READ_URL || '').trim()
};

/**
 * Overrides the compiled-in URLs from `dist/config.json`.
 *
 * Baking the endpoints into the bundle meant that changing one of them
 * required Node, pnpm and a rebuild — on a laboratory PC that has none of
 * those, and never will. A published Apps Script /exec URL is configuration,
 * not code: the owner should be able to paste it into a text file and refresh.
 *
 * A key left empty in config.json falls through to the build-time value, so
 * filling in one line changes exactly one domain and nothing else.
 */
export function applyRuntimeConfig(config: unknown) {
  if (!config || typeof config !== 'object') return;
  const source = config as Record<string, unknown>;
  const keys: [Domain, string][] = [['water', 'waterReadUrl'], ['air', 'airReadUrl'], ['cv', 'cvReadUrl']];
  for (const [domain, key] of keys) {
    const value = String(source[key] || '').trim();
    if (value) endpoints[domain] = value;
  }
}

/** Reads dist/config.json if it is there. Never throws: a missing or malformed
 *  file simply leaves the compiled-in values in place. */
export async function loadRuntimeConfig() {
  try {
    const response = await fetch('config.json', { cache: 'no-store' });
    if (!response.ok) return;
    applyRuntimeConfig(await response.json());
  } catch { /* file absent, offline, or not JSON — keep the built-in values */ }
}

export class ServiceError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

function endpointFor(domain: Domain) {
  const endpoint = endpoints[domain];
  if (!endpoint) throw new ServiceError(`${domain} System DB URL is not configured`);
  return endpoint;
}

/* The System DB answers with its own short strings, and relayed verbatim they
 * tell the reader nothing they can act on. The one that matters most is
 * "Unknown action": it does not mean the request was malformed, it means the
 * Web App serving this URL is an older deployment that predates the search and
 * get actions. Saving Code.gs in the Apps Script editor does NOT change what
 * /exec serves — a deployment is pinned to a version, so the owner must run
 * Deploy → Manage deployments → Edit → Version: New version. That trap has
 * cost this project a day, so the app now says so where it happens. */
function explainSystemError(raw: unknown, status: number) {
  const message = String(raw || '').trim();
  if (/unknown action/i.test(message)) {
    return 'The System DB Web App is an older deployment and does not know this request yet. In its Apps Script project: Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy. Saving the code alone does not change what the /exec URL serves.';
  }
  if (/unauthorized|forbidden/i.test(message) || status === 401 || status === 403) {
    return 'The System DB Web App refused the request. Check that it is deployed with "Who has access: Anyone".';
  }
  if (/not found/i.test(message) || status === 404) {
    return 'The System DB Web App URL did not resolve. Check the /exec URL in .env.production, then rebuild.';
  }
  return message || `System DB request failed (${status})`;
}

async function readJson(url: URL, signal?: AbortSignal) {
  /* credentials MUST stay 'omit'.
   *
   * A Google Apps Script Web App deployed for "Anyone" answers with
   * `Access-Control-Allow-Origin: *`. The fetch spec forbids the browser from
   * accepting a wildcard origin when the request's credentials mode is
   * 'include', so `credentials: 'include'` made every System DB read fail with
   *   "The value of the 'Access-Control-Allow-Origin' header in the response
   *    must not be the wildcard '*' when the request's credentials mode is
   *    'include'"
   * followed by net::ERR_FAILED — the Water and Air tabs never loaded.
   *
   * Nothing here needs cookies: the endpoint is a public read. Sending the
   * user's Google session to it was both the cause of the failure and a thing
   * we should not do. */
  const response = await fetch(url, { signal, cache: 'no-store', credentials: 'omit', redirect: 'follow' });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.ok === false || payload.success === false) {
    throw new ServiceError(explainSystemError(payload?.error, response.status), Number(payload?.status || response.status));
  }
  return payload;
}

export async function searchSystem(workflow: Workflow, filters: RecordFilters, signal?: AbortSignal) {
  const url = new URL(endpointFor(workflow.domain));
  url.searchParams.set('action', 'search');
  url.searchParams.set('workflow', workflow.id);
  if (filters.q) url.searchParams.set('q', filters.q);
  if (filters.from) url.searchParams.set('from', filters.from);
  if (filters.to) url.searchParams.set('to', filters.to);
  if (filters.cursor) url.searchParams.set('cursor', filters.cursor);
  if (filters.building) url.searchParams.set('building', filters.building);
  if (filters.gasType) url.searchParams.set('gasType', filters.gasType);
  if (filters.waterType) url.searchParams.set('waterType', filters.waterType);
  if (filters.samplingFamily) url.searchParams.set('samplingFamily', filters.samplingFamily);
  if (filters.testMethod) url.searchParams.set('testMethod', filters.testMethod);
  if (filters.samplingMode) url.searchParams.set('samplingMode', filters.samplingMode);
  url.searchParams.set('limit', String(filters.limit || 30));
  const payload = await readJson(url, signal);
  const data = payload.data || {};
  return { items: (Array.isArray(data.items) ? data.items : []) as SearchItem[], nextCursor: data.nextCursor || null, meta: payload.meta || {} };
}

/** Read every cursor page for a List scope. The server owns filtering; this
 * helper only follows opaque cursors and stops if a broken endpoint repeats one. */
export async function searchAllSystem(
  workflow: Workflow,
  filters: RecordFilters,
  signal?: AbortSignal,
  maxPages = 100,
) {
  const items: SearchItem[] = [];
  let cursor = filters.cursor;
  let meta: Record<string, unknown> = {};

  for (let page = 0; page < maxPages; page += 1) {
    const result = await searchSystem(workflow, { ...filters, cursor, limit: filters.limit || 100 }, signal);
    items.push(...result.items);
    meta = result.meta;
    if (!result.nextCursor || result.nextCursor === cursor || result.items.length === 0) break;
    cursor = result.nextCursor;
  }

  return { items, meta };
}

export async function getSystemRecord(workflow: Workflow, recordKey: string, signal?: AbortSignal) {
  const url = new URL(endpointFor(workflow.domain));
  url.searchParams.set('action', 'get');
  url.searchParams.set('workflow', workflow.id);
  url.searchParams.set('recordKey', recordKey);
  const payload = await readJson(url, signal);
  const data = payload.data || {};
  return {
    record: (data.record || {}) as RecordData,
    samples: (Array.isArray(data.samples) ? data.samples : []) as RecordData[],
    fetchedAt: String(payload.meta?.fetchedAt || new Date().toISOString())
  };
}

export function endpointConfigured(domain: Domain) {
  return Boolean(endpoints[domain]);
}
