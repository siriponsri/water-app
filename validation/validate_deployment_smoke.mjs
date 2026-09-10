/* Read-only Apps Script deployment smoke check.
 *
 * Live mode reads only. Fixture mode exercises the same cursor and building
 * checks without contacting a deployment, so the validator is testable in CI.
 *
 * Live:
 *   ANF3_WATER_SMOKE_URL=https://.../exec ANF3_AIR_SMOKE_URL=https://.../exec node validation/validate_deployment_smoke.mjs
 * Fixture:
 *   node validation/validate_deployment_smoke.mjs --fixture validation/fixtures/deployment-smoke.json
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const fixtureFlag = args.indexOf('--fixture');
const fixturePath = fixtureFlag >= 0 ? args[fixtureFlag + 1] : '';
const waterUrl = process.env.ANF3_WATER_SMOKE_URL || '';
const airUrl = process.env.ANF3_AIR_SMOKE_URL || '';
const cvUrl = process.env.ANF3_CV_SMOKE_URL || '';
const configuredTimeout = Number.parseInt(process.env.ANF3_SMOKE_TIMEOUT_MS || '', 10);
const REQUEST_TIMEOUT_MS = Number.isFinite(configuredTimeout) && configuredTimeout >= 1000
  ? configuredTimeout
  : 30000;

const cases = [
  ['water', 'pw-prw', ['Building 10', 'Building 12', 'Building 16', 'Other']],
  ['water', 'wfi-pus', ['Building 16', 'Other']],
  ['air', 'em-air', ['Building 10', 'Building 12', 'Building 16', 'Other']],
  ['air', 'compressed-air', ['Building 10', 'Building 12', 'Building 16', 'Other']]
];
cases.push(['cv', 'cv', ['Building 10', 'Building 12', 'Building 16', 'Other']]);

export function assertAppsScriptExecUrl(value, name) {
  let parsed;
  try { parsed = new URL(String(value)); } catch { throw new Error(`${name} must be a valid HTTPS Google Apps Script /exec URL`); }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[^/]+\/exec$/.test(parsed.pathname) || parsed.search || parsed.hash) {
    throw new Error(`${name} must be a valid HTTPS Google Apps Script /exec URL`);
  }
  return parsed.href;
}

function segment(value) {
  /* Match only a complete building token. Values such as
   * "Building 19, OSD-PW (Building 10)" are intentionally Other, matching
   * the Apps Script filter that preserves the original source text. */
  const text = String(value || '').trim().toUpperCase().replace(/[\s_.-]+/g, '');
  const match = text.match(/^(?:BUILDING|BLDG|BLD|B)?(10|12|16)$/);
  return match ? `B${match[1]}` : 'OTHER';
}

function assertLivePayload(payload, domain, workflow, context) {
  if (payload?.ok !== true || payload?.success !== true || Number(payload?.status) !== 200) {
    throw new Error(`${context}: invalid success/status envelope`);
  }
  const meta = payload.meta;
  if (!meta || meta.domain !== domain || !meta.apiVersion || !meta.implementationVersion || meta.timeZone !== 'Asia/Bangkok') {
    throw new Error(`${context}: response meta does not match the ANF3 contract`);
  }
  if (meta.workflow && meta.workflow !== workflow) {
    throw new Error(`${context}: response workflow does not match the request`);
  }
}

function fixturePages(fixture, domain, workflow, building) {
  const pageSet = fixture?.[domain]?.[workflow]?.[building];
  if (!Array.isArray(pageSet)) throw new Error(`fixture is missing ${domain}/${workflow}/${building}`);
  return pageSet;
}

async function fetchWithTimeout(url, context) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.ok === false || payload.success === false) {
      throw new Error(`${context}: ${String(payload?.error || response.status)}`);
    }
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${context}: request timed out after ${REQUEST_TIMEOUT_MS} ms`);
    }
    if (error instanceof Error && error.message.startsWith(`${context}:`)) throw error;
    throw new Error(`${context}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function runDeploymentSmoke({ urls = {}, fixture = null, log = console.log } = {}) {
  const results = [];
  for (const [domain, workflow, buildings] of cases) {
    const endpoint = urls[domain];
    if (!fixture && !endpoint) throw new Error(`${domain} smoke URL is not configured`);
    if (!fixture) assertAppsScriptExecUrl(endpoint, `${domain} smoke URL`);
    for (const building of buildings) {
      const seen = new Set();
      let cursor = '';
      let pages = 0;
      do {
        let payload;
        if (fixture) {
          const pageSet = fixturePages(fixture, domain, workflow, building);
          payload = pageSet[pages];
          if (!payload) throw new Error(`${workflow} ${building}: fixture cursor did not terminate safely`);
        } else {
          const request = new URL(endpoint);
          request.searchParams.set('action', 'search');
          request.searchParams.set('workflow', workflow);
          request.searchParams.set('building', building);
          request.searchParams.set('limit', '100');
          if (cursor) request.searchParams.set('cursor', cursor);
          const context = `${domain}/${workflow} ${building} page ${pages + 1}${cursor ? ` cursor ${cursor}` : ' initial'}`;
          payload = await fetchWithTimeout(request, context);
          assertLivePayload(payload, domain, workflow, context);
        }
        const data = payload?.data;
        if (!data || !Array.isArray(data.items)) throw new Error(`${workflow} ${building}: response items is not an array`);
        for (const item of data.items) {
          if (segment(item?.building) !== segment(building)) {
            throw new Error(`${workflow} ${building}: received mixed building ${item?.building || '(blank)'}`);
          }
        }
        const next = data.nextCursor == null ? '' : String(data.nextCursor);
        pages += 1;
        if (next && (seen.has(next) || pages > 100)) {
          throw new Error(`${workflow} ${building}: cursor did not terminate safely`);
        }
        if (next) seen.add(next);
        cursor = next;
      } while (cursor);
      const result = { domain, workflow, building, pages };
      results.push(result);
      log(`PASS ${workflow} ${building}: ${pages} page(s), logical building scope preserved`);
    }
  }
  return results;
}

async function main() {
  if (fixturePath) {
    if (!fs.existsSync(fixturePath)) throw new Error(`fixture not found: ${fixturePath}`);
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    await runDeploymentSmoke({ fixture });
    return;
  }
  if (!waterUrl || !airUrl || !cvUrl) {
    console.error('NOT RUN: set ANF3_WATER_SMOKE_URL, ANF3_AIR_SMOKE_URL, and ANF3_CV_SMOKE_URL to explicit /exec URLs, or use --fixture.');
    process.exitCode = 2;
    return;
  }
  await runDeploymentSmoke({ urls: {
    water: assertAppsScriptExecUrl(waterUrl, 'ANF3_WATER_SMOKE_URL'),
    air: assertAppsScriptExecUrl(airUrl, 'ANF3_AIR_SMOKE_URL'),
    cv: assertAppsScriptExecUrl(cvUrl, 'ANF3_CV_SMOKE_URL')
  } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`FAIL ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
