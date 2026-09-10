/* Proves the browser and the local server are actually connected.
 *
 * The v7.1 release shipped with none of them connected, and nothing caught it:
 * vite resolves .env files relative to `root` (apps/web), while
 * .env.production sits at the repo root, so every VITE_*_READ_URL was dropped
 * from the bundle. The app built, the tests passed, the release gate passed —
 * and the running app said "System DB URL is not configured" for all three
 * domains. This check exists so that cannot happen again.
 *
 *   node validation/validate_wiring.mjs           structure only
 *   node validation/validate_wiring.mjs --built   also check ./dist
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(ROOT, p), 'utf8');
const failures = [];
const notes = [];
const check = (ok, message) => { if (!ok) failures.push(message); };

/* 1. vite must look for .env where .env.production actually is ------------- */
const viteConfig = read('vite.config.ts');
const rootMatch = viteConfig.match(/root:\s*'([^']+)'/);
check(Boolean(rootMatch), 'vite.config.ts has no `root`');
if (rootMatch && rootMatch[1] !== '.') {
  const envDir = viteConfig.match(/envDir:\s*'([^']+)'/);
  check(Boolean(envDir),
    `vite root is '${rootMatch[1]}' but no envDir is set — .env.production at the repo root will be ignored`);
  if (envDir) {
    const resolved = path.resolve(ROOT, rootMatch[1], envDir[1]);
    check(existsSync(path.join(resolved, '.env.production')),
      `envDir '${envDir[1]}' does not resolve to the folder holding .env.production`);
  }
}

/* A stale compiled config beats the TypeScript one in some vite versions. */
for (const stray of ['vite.config.js', 'vite.config.mjs', 'vite.config.cjs']) {
  check(!existsSync(path.join(ROOT, stray)),
    `${stray} exists next to vite.config.ts — delete it, a stale compiled config can win config resolution`);
}

/* 2. the dev proxy must reach the local server ----------------------------- */
check(/proxy:\s*\{[^}]*'\/api'/.test(viteConfig),
  'vite.config.ts has no /api dev proxy — `pnpm dev` cannot reach the Flask server');

/* 3. every domain the UI offers must have a read URL ----------------------- */
const DOMAINS = { water: 'VITE_WATER_READ_URL', air: 'VITE_AIR_READ_URL', cv: 'VITE_CV_READ_URL' };
const env = Object.fromEntries(read('.env.production').split('\n')
  .filter((line) => line.trim() && !line.trim().startsWith('#'))
  .map((line) => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }));

const configured = [];
for (const [domain, key] of Object.entries(DOMAINS)) {
  const value = env[key] || '';
  if (!value) { notes.push(`${key} is empty — the ${domain} tab will report "System DB URL is not configured"`); continue; }
  check(/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(value),
    `${key} is not a Google Apps Script /exec URL: ${value}`);
  configured.push([key, value]);
}

/* 4. the API surface the browser calls must exist on the server ------------ */
const server = read('server/pdf_server.py');
const app = read('apps/web/src/App.tsx');
const called = [...app.matchAll(/['"`](\/api\/[a-z0-9\-/]*)/gi)]
  .map((m) => m[1].replace(/\/$/, ''))
  .filter((v, i, a) => a.indexOf(v) === i);
for (const endpoint of called) {
  const base = endpoint.split('/').slice(0, 3).join('/');
  check(server.includes(`@app.route('${base}`),
    `App.tsx calls ${endpoint} but server/pdf_server.py has no route for ${base}`);
}

/* 5. every PDF route the UI can send must be registered on the server ------ */
const appData = read('apps/web/src/appData.ts');
const policy = read('apps/web/src/recordPolicy.ts');
const routes = [...(appData + policy).matchAll(/'(pw-prw|wfi-pus|compressed-air|em-air|cleaning-validation-[a-z-]+)'/g)]
  .map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i);
for (const route of routes) {
  check(new RegExp(`['"]${route}['"]\\s*:`).test(server),
    `the UI can request PDF workflow '${route}' but the server registry has no entry for it`);
}

/* 6. the CV sync must write the building label the read API filters on ----- */
const cvUser = read('google/app-scripts/Testing.gs');
check(cvUser.includes('function normalizeCvBuilding_'),
  '05-cv-user/Code.gs has no normalizeCvBuilding_ — the CV sheet stores "10" while the app filters on "Building 10", so the CV tab can never return a row');
check(!/building:\s*String\((?:row|first|value)\.Bld/.test(cvUser),
  '05-cv-user/Code.gs still writes a raw Bld value into `building`');

/* 7. cross-origin reads must not ask for credentials ----------------------- */
/* strip comments first: the explanation of this bug necessarily quotes it */
const api = read('apps/web/src/api.ts').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
check(!/credentials:\s*'include'/.test(api),
  "api.ts uses credentials:'include' — a Google Apps Script Web App answers with Access-Control-Allow-Origin: *, which the browser refuses for a credentialed request; every System DB read fails with net::ERR_FAILED");

/* 8. the runtime override must survive the build --------------------------- */
{
  /* Beside the launchers, NOT in dist/: `pnpm build` empties dist, so a copy
   * there would be wiped on every rebuild and the owner would lose the URLs
   * they pasted in. */
  const cfg = path.join(ROOT, 'config.json');
  check(existsSync(cfg), 'config.json is missing from the app root — the owner cannot change a System DB URL without Node');
  check(!existsSync(path.join(ROOT, 'dist', 'config.json')),
    'dist/config.json exists — a rebuild would silently reset the owner\'s URLs; keep it at the app root only');
  if (existsSync(cfg)) {
    const parsed = JSON.parse(readFileSync(cfg, 'utf8'));
    for (const key of ['waterReadUrl', 'airReadUrl', 'cvReadUrl']) {
      check(key in parsed, `config.json has no "${key}" key`);
    }
    /* Scan the values only — the _readme deliberately names the token in
     * order to warn against it, and must not trip its own check. */
    const values = Object.entries(parsed)
      .filter(([key]) => key !== '_readme')
      .map(([, value]) => JSON.stringify(value)).join(' ');
    check(!/ANF3_SYNC_TOKEN|token/i.test(values),
      'a value in config.json looks like a token — this file reaches the browser; it holds public read URLs only');
    for (const [key, value] of Object.entries(parsed)) {
      if (key === '_readme' || !value) continue;
      check(/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(value)),
        `config.json ${key} is not a Google Apps Script /exec URL: ${value}`);
    }
  }
}
const main = read('apps/web/src/main.tsx');
check(main.includes('loadRuntimeConfig'),
  'main.tsx does not load config.json, so the runtime override never applies');

/* 9. the activity log must never put a write token in the browser ---------- */
const src = ['apps/web/src/operator.ts', 'apps/web/src/App.tsx', 'apps/web/src/api.ts']
  .map((f) => read(f)).join('\n');
check(!/syncToken|ANF3_SYNC_TOKEN/.test(src),
  'browser source mentions a sync token — the activity log must post to the LOCAL server only; forwarding to Sheets happens server-side from server/log-forward.json');
check(!existsSync(path.join(ROOT, 'server', 'log-forward.json')),
  'server/log-forward.json is present in the tree — it holds a sync token and must never be packaged; ship log-forward.example.json instead');

/* 10. with --built, the URLs must actually be inside the bundle ------------ */
if (process.argv.includes('--built')) {
  const dist = path.join(ROOT, 'dist', 'assets');
  if (!existsSync(dist)) {
    failures.push('dist/assets is missing — run `pnpm build` before --built');
  } else {
    const bundle = readdirSync(dist).filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(path.join(dist, f), 'utf8')).join('');
    for (const [key, value] of configured) {
      check(bundle.includes(value), `${key} is set in .env.production but is NOT in the built bundle`);
    }
  }
}

for (const note of notes) console.log(`note  ${note}`);
if (failures.length) {
  console.error('\nWiring check failed:');
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log(`\nWiring OK — ${configured.length}/3 domains configured, ${called.length} API paths and ${routes.length} PDF routes match the server.`);
