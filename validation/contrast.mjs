/* Reads tokens.css, resolves the oklch() literals, and reports WCAG contrast
 * for the pairs the interface actually puts next to each other. Run it after
 * any palette change: `node validation/contrast.mjs`. Non-zero exit on a fail.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(here, '..', 'apps', 'web', 'src', 'tokens.css'), 'utf8');

/* --- oklch -> linear sRGB ------------------------------------------------ */
function oklchToLinearRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const clamp01 = (x) => Math.min(1, Math.max(0, x));
/* A colour outside sRGB gets clipped by the browser, so the chroma you asked
 * for is not the chroma you see — and the contrast computed from it is a lie.
 * Anything more than a rounding error outside the cube is reported. */
const inGamut = (rgb) => rgb.every((c) => c > -0.002 && c < 1.002);
const relLuminance = ([r, g, b]) =>
  0.2126 * clamp01(r) + 0.7152 * clamp01(g) + 0.0722 * clamp01(b);

function contrast(a, b) {
  const la = relLuminance(a), lb = relLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* --- parse the two theme blocks ------------------------------------------ */
function block(selector) {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`missing block ${selector}`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  return css.slice(open, close);
}
function tokensIn(text) {
  const out = {};
  const re = /(--[a-z0-9-]+)\s*:\s*oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*\)/gi;
  let m;
  while ((m = re.exec(text))) out[m[1]] = oklchToLinearRgb(Number(m[2]) / 100, Number(m[3]), Number(m[4]));
  return out;
}
const light = tokensIn(block(':root {'));
const dark = { ...light, ...tokensIn(block(":root[data-theme='dark']")) };

/* --- the pairs the interface really renders ------------------------------ */
const AA_TEXT = 4.5;   // body and small text
const AA_LARGE = 3;    // >=24px, and non-text edges that must be seen
const PAIRS = [
  ['--color-ink', '--color-paper', AA_TEXT, 'body text on the page'],
  ['--color-ink', '--color-paper-2', AA_TEXT, 'body text on the rail and toolbar'],
  ['--color-ink', '--color-paper-3', AA_TEXT, 'body text on a card'],
  ['--color-muted', '--color-paper', AA_TEXT, 'secondary text on the page'],
  ['--color-muted', '--color-paper-2', AA_TEXT, 'secondary text on the rail'],
  ['--color-muted', '--color-paper-3', AA_TEXT, 'secondary text on a card'],
  ['--color-neutral', '--color-paper-3', AA_TEXT, 'the colophon and captions'],
  ['--color-neutral', '--color-paper', AA_TEXT, 'placeholder and hint text'],
  ['--color-accent', '--color-paper', AA_TEXT, 'links and the active marker'],
  ['--color-accent', '--color-paper-3', AA_TEXT, 'links inside a card'],
  ['--color-accent-ink', '--color-accent', AA_TEXT, 'text on a primary button'],
  ['--color-focus', '--color-paper', AA_LARGE, 'the focus ring'],
  ['--color-ok', '--color-paper-3', AA_TEXT, 'an in-limit result'],
  ['--color-warn', '--color-paper-3', AA_TEXT, 'an alert-level result'],
  ['--color-danger', '--color-paper-3', AA_TEXT, 'an out-of-limit result'],
  ['--color-rule', '--color-paper', 1.18, 'a hairline on the page'],
  ['--color-rule', '--color-paper-3', 1.18, 'a hairline on a card'],
  ['--color-paper-3', '--color-paper', 1.06, 'a card lifting off the page'],
  ['--color-paper-2', '--color-paper', 1.06, 'a recessed panel'],
];
/* Every building hue carries the crumb text and the shelf spine. */
for (const b of ['b10', 'b12', 'b16', 'other', 'reserve']) {
  PAIRS.push([`--${b}`, '--color-paper', AA_TEXT, `${b} crumb text on the page`]);
  PAIRS.push([`--${b}`, `--${b}-wash`, AA_TEXT, `${b} text on its own wash`]);
  PAIRS.push([`--${b}-wash`, '--color-paper', 1.06, `${b} wash reads as a tint, not as paper`]);
  PAIRS.push([`--${b}-band-ink`, `--${b}-band`, AA_TEXT, `${b} printed label band`]);
}

let failures = 0;
for (const [name, tokens] of [['light', light], ['dark', dark]]) {
  console.log(`\n${name}`);
  const clipped = Object.entries(tokens).filter(([, rgb]) => !inGamut(rgb)).map(([t]) => t);
  if (clipped.length) { failures += clipped.length; console.log(`  FAIL out of sRGB gamut: ${clipped.join(', ')}`); }
  for (const [fg, bg, min, what] of PAIRS) {
    if (!tokens[fg] || !tokens[bg]) { console.log(`  ?  ${fg} / ${bg} — not an oklch literal, skipped`); continue; }
    const ratio = contrast(tokens[fg], tokens[bg]);
    const pass = ratio >= min;
    if (!pass) failures++;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${ratio.toFixed(2)} (need ${min})  ${what}`);
  }
}
console.log(failures ? `\n${failures} failing pair(s)` : '\nall pairs pass');
process.exit(failures ? 1 : 0);
