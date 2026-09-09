import * as THREE from 'three';

/* THREE.Color cannot parse oklch(), and every colour in this project is an
 * oklch custom property. Rather than keep a second, drifting palette in JS,
 * paint the token onto a 1×1 canvas and read the sRGB bytes back. One
 * definition, in tokens.css; the room is lit from the same values as the page. */
export function resolveToken(token: string, fallback = '#808080'): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return new THREE.Color(fallback);
  context.fillStyle = fallback;
  context.fillStyle = value;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

export function resolveTokenCss(token: string, fallback = '#808080'): string {
  return `#${resolveToken(token, fallback).getHexString()}`;
}

const ROOM_TOKENS = [
  '--room-carcass', '--room-shelf', '--room-shadowbox', '--room-worktop', '--room-worktop-edge',
  '--room-wall', '--room-chrome', '--room-label', '--room-print', '--room-print-ink', '--room-key',
  '--room-fill', '--color-ink', '--color-muted', '--color-paper-2'
] as const;

export type RoomPalette = Record<(typeof ROOM_TOKENS)[number], THREE.Color> & { labelCss: string; inkCss: string; mutedCss: string };

export function readRoomPalette(): RoomPalette {
  const palette = {} as RoomPalette;
  ROOM_TOKENS.forEach((token) => { palette[token] = resolveToken(token); });
  palette.labelCss = resolveTokenCss('--room-print', '#fbfaf6');
  palette.inkCss = resolveTokenCss('--room-print-ink', '#26221a');
  palette.mutedCss = resolveTokenCss('--color-muted', '#666666');
  return palette;
}

export type BinderPaint = { spine: THREE.Color; band: THREE.Color; bandInkCss: string; spineCss: string };

/* `revision` is not read — it exists so callers can bust their own useMemo
 * when the reader changes a binder colour. */
export function readBinderPaint(group: string, _revision = 0): BinderPaint {
  const key = group.toLowerCase();
  return {
    spine: resolveToken(`--${key}-spine`),
    band: resolveToken(`--${key}-band`),
    bandInkCss: resolveTokenCss(`--${key}-band-ink`, '#222222'),
    spineCss: resolveTokenCss(`--${key}-spine`, '#cccccc')
  };
}
