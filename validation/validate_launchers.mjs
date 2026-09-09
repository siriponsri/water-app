/* =========================================================================
   The Windows launchers
   -------------------------------------------------------------------------
   These .bat files cannot be executed here, and they are the first thing a
   laboratory PC runs — a typo in one is a black window that flashes and
   closes, which is exactly the failure the owner reported before. So the
   parts that CAN be checked without Windows are checked: that every label a
   script jumps to exists, that every file it calls is really in the package,
   that no failure path exits without holding the window open, and that the
   share-drive launcher still does the things it exists to do.
   ========================================================================= */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const LAUNCHERS = ['START-ANF3.bat', 'START-SERVER.bat', 'INSTALL.bat', 'BUILD-DIST.bat', 'INSTALL-MSOFFICE-SUPPORT.bat'];

for (const name of LAUNCHERS) {
  const source = read(name);
  const lines = source.split(/\r?\n/);

  /* Every label jumped to must exist, or the script dies with
     "The system cannot find the batch label specified". */
  const labels = new Set(
    lines.map((line) => line.match(/^\s*:([A-Za-z_][\w]*)/)).filter(Boolean).map((match) => match[1].toLowerCase())
  );
  const jumps = [...source.matchAll(/\b(?:goto|call)\s+:([A-Za-z_][\w]*)/g)].map((match) => match[1].toLowerCase());
  for (const target of new Set(jumps)) {
    if (target === 'eof') continue; // :eof is built in
    check(labels.has(target), `${name}: jumps to :${target}, which is not defined`);
  }

  /* Batch is whitespace-fragile: an unbalanced quote silently swallows the
     rest of a line. */
  lines.forEach((line, index) => {
    const quotes = (line.match(/"/g) || []).length;
    check(quotes % 2 === 0, `${name}:${index + 1}: odd number of quotes — "${line.trim().slice(0, 60)}"`);
  });

  /* Every .bat this script calls has to be in the package. */
  for (const match of source.matchAll(/call\s+"%[A-Z_]+%([A-Za-z0-9._-]+\.bat)"/g)) {
    check(fs.existsSync(path.join(ROOT, match[1])), `${name}: calls ${match[1]}, which is not in the package`);
  }

  /* A window that closes on failure tells the operator nothing. */
  check(/pause|:hold/i.test(source), `${name}: no pause on any path — a failure would just flash and close`);
}

/* ---- the share-drive contract, which is the point of START-ANF3.bat ---- */
const launcher = read('START-ANF3.bat');

check(fs.existsSync(path.join(ROOT, 'VERSION.txt')),
  'VERSION.txt is missing — the launcher compares it to decide whether a PC needs refreshing');

check(/LOCALAPPDATA/.test(launcher),
  'START-ANF3.bat no longer copies to %LOCALAPPDATA% — running several PCs from the share drive corrupts the venv, the log and the PDF output');

check(/robocopy/i.test(launcher),
  'START-ANF3.bat no longer uses robocopy — xcopy does not handle UNC paths reliably');

/* The per-machine state must never be copied down from the master, or every
   PC inherits another machine's environment, port file and audit log. */
for (const excluded of ['.venv', 'node_modules', 'pdfs', 'words']) {
  check(new RegExp(`/XD[^\\n]*"${excluded.replace('.', '\\.')}"`).test(launcher),
    `START-ANF3.bat must exclude ${excluded}/ from the copy`);
}
for (const excluded of ['.anf3-port', 'activity-log.jsonl', 'log-forward.json']) {
  check(new RegExp(`/XF[^\\n]*"${excluded.replace(/\./g, '\\.')}"`).test(launcher),
    `START-ANF3.bat must exclude ${excluded} from the copy`);
}

check(/if errorlevel 8/.test(launcher),
  'START-ANF3.bat must treat robocopy exit codes >= 8 as failure (0-7 are success)');

check(/if\s+\/i\s+"%APP_DIR%"=="%LOCAL_DIR%"\s+goto\s+:run_here/i.test(launcher),
  'START-ANF3.bat must short-circuit when it is already the local copy, or it hands over to itself forever');

/* The token must never reach a laboratory PC through the copy. */
check(!/ANF3_SYNC_TOKEN/.test(launcher), 'START-ANF3.bat must not mention the sync token');

if (failures.length) {
  console.error('Launcher checks FAILED:');
  for (const failure of failures) console.error('  - ' + failure);
  process.exit(1);
}
console.log(`Launchers OK — ${LAUNCHERS.length} scripts, labels resolve, share-drive copy contract intact.`);
