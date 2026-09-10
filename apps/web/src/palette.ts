/* =========================================================================
   Binder colours the reader can change
   -------------------------------------------------------------------------
   A building's hue is what tells one binder from another, on screen and on
   the real shelf. The default set is transcribed from photographs of the
   physical box files, so by default the screen matches the room.

   Some people need something else — red-green colour vision deficiency
   affects roughly 8% of men, and this palette's two hardest pairs
   (blue/violet, green/amber) are exactly the ones it confuses. So the reader
   may pick their own, freely, per browser. Nothing here is ever written to
   the System DB, shared with another machine, or baked into a build.

   What the reader picks is one hue per building. The five tokens a building
   needs — the solid identity colour, the 3D spine board, the printed label
   band, the ink on that band, and the page wash — are DERIVED from it at
   fixed lightness and chroma targets. Picking one colour therefore cannot
   produce an unreadable combination: the relationships that make the set work
   are held by this file, not by the person choosing.
   ========================================================================= */

export const GROUP_KEYS = ['b10', 'b12', 'b16', 'other', 'reserve'] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const GROUP_LABELS: Record<GroupKey, string> = {
  b10: 'Building 10',
  b12: 'Building 12',
  b16: 'Building 16',
  other: 'Other Locations',
  reserve: 'Reserve — Coming Soon'
};

const STORAGE_KEY = 'anf3.binder-colours.v1';
export const PALETTE_EVENT = 'anf3:palette';

/* ---------------------------- colour maths -------------------------------
   sRGB <-> OKLCH. The browser can parse oklch() but cannot hand it back, and
   THREE cannot parse it at all, so the conversion lives here in one place. */

function srgbToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(value: number) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((ch) => ch + ch).join('') : clean;
  const r = srgbToLinear(parseInt(full.slice(0, 2), 16) / 255);
  const g = srgbToLinear(parseInt(full.slice(2, 4), 16) / 255);
  const b = srgbToLinear(parseInt(full.slice(4, 6), 16) / 255);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

function oklchToLinearRgb(L: number, C: number, hDeg: number) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ];
}

const inGamut = (rgb: number[]) => rgb.every((v) => v > -0.001 && v < 1.001);

/** Largest chroma that still fits inside sRGB at this lightness and hue.
 *  Asking for more does not give a more colourful result — the browser clips
 *  it, and the colour you get is not the one you specified. */
function maxChroma(l: number, h: number) {
  let low = 0;
  let high = 0.45;
  for (let step = 0; step < 40; step += 1) {
    const mid = (low + high) / 2;
    if (inGamut(oklchToLinearRgb(l, mid, h))) low = mid; else high = mid;
  }
  return low;
}

export function oklchToHex(l: number, c: number, h: number) {
  const safe = Math.min(c, maxChroma(l, h) * 0.995);
  const rgb = oklchToLinearRgb(l, safe, h).map((v) => Math.round(Math.min(1, Math.max(0, linearToSrgb(v))) * 255));
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function relativeLuminance(l: number, c: number, h: number) {
  const [r, g, b] = oklchToLinearRgb(l, Math.min(c, maxChroma(l, h)), h).map((v) => Math.min(1, Math.max(0, v)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const la = relativeLuminance(...a);
  const lb = relativeLuminance(...b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* --------------------------- deriving a set ------------------------------
   These targets are the same ones the shipped palette was tuned to, and the
   same ones validation/contrast.mjs measures. Holding them constant is what
   lets the reader pick any hue without being able to break legibility. */
type Derived = { plain: string; spine: string; band: string; bandInk: string; wash: string };

const TARGETS = {
  light: { plain: 0.48, spine: 0.80, band: 0.72, wash: 0.90 },
  dark: { plain: 0.80, spine: 0.71, band: 0.64, wash: 0.30 }
};

export function deriveSet(baseHex: string, mode: 'light' | 'dark'): Derived {
  const { h } = hexToOklch(baseHex);
  const t = TARGETS[mode];
  const at = (l: number, want: number) => oklchToHex(l, Math.min(want, maxChroma(l, h) * 0.95), h);
  /* The band ink is the one value that must flip: a pale band takes dark ink,
     a dark band takes pale ink. Decide it by measuring, not by hue. */
  const bandL = t.band;
  const bandC = Math.min(0.11, maxChroma(bandL, h) * 0.95);
  const darkInk = contrast([0.20, 0.04, h], [bandL, bandC, h]);
  const lightInk = contrast([0.98, 0.01, h], [bandL, bandC, h]);
  return {
    plain: at(t.plain, 0.16),
    spine: at(t.spine, 0.11),
    band: at(bandL, 0.11),
    bandInk: darkInk >= lightInk ? oklchToHex(0.20, 0.04, h) : oklchToHex(0.98, 0.01, h),
    wash: at(t.wash, mode === 'light' ? 0.075 : 0.07)
  };
}

/* ------------------------------ storage ---------------------------------- */

export type PaletteOverrides = Partial<Record<GroupKey, string>>;

export function readOverrides(): PaletteOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object') return {};
    const out: PaletteOverrides = {};
    for (const key of GROUP_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) out[key] = value;
    }
    return out;
  } catch { return {}; }
}

function writeOverrides(value: PaletteOverrides) {
  try {
    if (Object.keys(value).length) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* a disabled store must never stop the app rendering */ }
  window.dispatchEvent(new CustomEvent(PALETTE_EVENT));
}

export function setGroupColour(group: GroupKey, hex: string | null) {
  const next = readOverrides();
  if (hex) next[group] = hex; else delete next[group];
  writeOverrides(next);
}

export function resetPalette() { writeOverrides({}); }

/** The colour currently in force for a group, whether chosen or shipped. */
export function currentHex(group: GroupKey): string {
  const override = readOverrides()[group];
  if (override) return override;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--${group}`).trim();
  const match = raw.match(/oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)/);
  if (!match) return '#808080';
  return oklchToHex(Number(match[1]) / 100, Number(match[2]), Number(match[3]));
}

/* --------------------------- applying it --------------------------------- */

/** Writes the reader's choices onto :root as the same token names the rest of
 *  the project already reads — CSS, and the 3D scene through theme.ts. Called
 *  on load and whenever a choice changes or the lamp is switched. */
export function applyPalette(mode: 'light' | 'dark') {
  const overrides = readOverrides();
  const root = document.documentElement;
  for (const group of GROUP_KEYS) {
    const chosen = overrides[group];
    const names = [`--${group}`, `--${group}-spine`, `--${group}-band`, `--${group}-band-ink`, `--${group}-wash`];
    if (!chosen) { names.forEach((name) => root.style.removeProperty(name)); continue; }
    const set = deriveSet(chosen, mode);
    root.style.setProperty(names[0], set.plain);
    root.style.setProperty(names[1], set.spine);
    root.style.setProperty(names[2], set.band);
    root.style.setProperty(names[3], set.bandInk);
    root.style.setProperty(names[4], set.wash);
  }
  root.dataset.palette = Object.keys(overrides).length ? 'custom' : 'shipped';
}

/* ---------------------------- telling them ------------------------------- */

export type PaletteWarning = { group: GroupKey; kind: 'contrast' | 'clash'; text: string };

/** Free choice, honest feedback. Two things actually hurt: a hue too pale to
 *  carry its own label text, and two buildings that end up indistinguishable —
 *  which on this shelf means picking up the wrong binder. */
export function paletteWarnings(mode: 'light' | 'dark'): PaletteWarning[] {
  const warnings: PaletteWarning[] = [];
  const hues: { group: GroupKey; l: number; c: number; h: number }[] = [];

  for (const group of GROUP_KEYS) {
    const { h } = hexToOklch(currentHex(group));
    const t = TARGETS[mode];
    const plainL = t.plain;
    const plainC = Math.min(0.16, maxChroma(plainL, h) * 0.95);
    hues.push({ group, l: plainL, c: plainC, h });
    const paperL = mode === 'light' ? 0.972 : 0.15;
    const ratio = contrast([plainL, plainC, h], [paperL, 0.005, 88]);
    if (ratio < 4.5) {
      warnings.push({
        group, kind: 'contrast',
        text: `${GROUP_LABELS[group]} sits at ${ratio.toFixed(1)}:1 against the page. Small labels in this colour will be hard to read; 4.5:1 is the minimum.`
      });
    }
  }

  for (let i = 0; i < hues.length; i += 1) {
    for (let j = i + 1; j < hues.length; j += 1) {
      let delta = Math.abs(hues[i].h - hues[j].h);
      if (delta > 180) delta = 360 - delta;
      if (delta < 22) {
        warnings.push({
          group: hues[j].group, kind: 'clash',
          text: `${GROUP_LABELS[hues[j].group]} and ${GROUP_LABELS[hues[i].group]} are only ${Math.round(delta)}° apart. On the shelf they will look like the same binder.`
        });
      }
    }
  }
  return warnings;
}
