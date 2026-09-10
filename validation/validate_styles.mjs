/* Every className used in the app must exist in a stylesheet.
 *
 * The Tools page shipped as one run-on paragraph and the Calendar as a cropped
 * box in the corner, because `.tool-list` and `.calendar-frame` were written in
 * App.tsx and never given a rule. Nine gates, 38 tests and a release check all
 * passed on pages that had no layout — nothing compared markup against CSS.
 * This does.
 *
 * It also checks WHICH stylesheet, not merely that a rule exists somewhere.
 * `games.css` is imported only by the four components under `games/`, so a
 * class defined only there is not loaded on any other page. Concatenating
 * every stylesheet before looking hid exactly that: `.sr-only` was used by
 * the settings page, defined only in `games.css`, and this gate reported all
 * clear while the label sat on screen as ordinary visible text.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'apps', 'web', 'src');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = walk(SRC);
const classesIn = (paths) => new Set(
  paths.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]))
);

/* Two scopes, because the app loads two different sets of stylesheets.
   `main.tsx` loads styles.css for every page; games.css rides along only with
   the components under games/. A class used outside games/ therefore has to be
   defined outside games.css. */
const cssFiles = files.filter((f) => f.endsWith('.css'));
const gamesCss = cssFiles.filter((f) => f.includes(`${path.sep}games${path.sep}`));
const appCss = cssFiles.filter((f) => !gamesCss.includes(f));
const definedApp = classesIn(appCss);
const defined = classesIn(cssFiles);

/* Class names the app applies. Template literals are common here, so pull the
 * static words out of them too and ignore the interpolated parts. */
const used = new Map();
for (const file of files.filter((f) => f.endsWith('.tsx'))) {
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
    const raw = (match[1] || match[2] || '').replace(/\$\{[^}]*\}/g, ' ');
    for (const name of raw.split(/\s+/).filter(Boolean)) {
      /* A fragment ending in "-" is the static prefix of an interpolation
       * (`is-${state}`), not a class the page ever applies. */
      if (name.endsWith('-')) continue;
      if (!/^[a-z][\w-]*$/i.test(name)) continue;
      if (!used.has(name)) used.set(name, path.relative(ROOT, file));
    }
  }
}

const missing = [...used].filter(([name]) => !defined.has(name));

/* Used outside games/, but only ever defined in games.css — so the rule is
   not loaded on the page that applies it. This renders as an unstyled
   element rather than as an error, which is why it needs a gate. */
const unreachable = [...used].filter(([name, file]) =>
  defined.has(name) && !definedApp.has(name) && !file.includes(`${path.sep}games${path.sep}`)
);

if (missing.length || unreachable.length) {
  if (missing.length) {
    console.error('\nClass names used in markup with no rule in any stylesheet:');
    for (const [name, file] of missing) console.error(`  .${name}  — ${file}`);
  }
  if (unreachable.length) {
    console.error('\nDefined only in games.css, but used outside games/ — the page that');
    console.error('applies these never loads that stylesheet, so they render unstyled:');
    for (const [name, file] of unreachable) console.error(`  .${name}  — ${file}`);
  }
  console.error('\nEither style them where the page can reach them, or stop applying them.');
  process.exit(1);
}
console.log(`Styles OK — all ${used.size} class names resolve in a stylesheet their page actually loads.`);
