/* =========================================================================
   Narrow declarations for the Node builtins the placeholder gate needs
   -------------------------------------------------------------------------
   `documentPlaceholders.test.ts` has to read the real `.docx` templates off
   disk, so it needs `node:fs` and friends. It runs under vitest, in Node —
   but it lives in `apps/web/src`, which `tsconfig.app.json` type-checks as
   browser code.

   This is deliberately NOT `@types/node`. That package would be pulled into
   the app's type scope wholesale, because `tsconfig.app.json` sets no `types`
   field and therefore includes every `@types` package it can see — which would
   make `process`, `Buffer` and `__dirname` type-check happily inside browser
   source, where none of them exist at runtime.

   Declaring the module names alone adds no globals. Only what the gate
   actually calls is described here; extend it if a gate needs more, and delete
   it if `@types/node` ever becomes a real dependency.
   ========================================================================= */

/** Just the byte-reading surface the zip parser uses. */
interface NodeByteView {
  readonly length: number;
  readUInt16LE(offset: number): number;
  readUInt32LE(offset: number): number;
  subarray(start?: number, end?: number): NodeByteView;
  toString(encoding?: string): string;
}

declare module 'node:fs' {
  export function readFileSync(path: string): NodeByteView;
}

declare module 'node:zlib' {
  export function inflateRawSync(buffer: NodeByteView): NodeByteView;
}

declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function dirname(path: string): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
