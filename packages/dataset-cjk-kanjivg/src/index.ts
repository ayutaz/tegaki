import { MANIFEST } from './manifest.ts';

export { KANJIVG_SHA } from './constants.ts';
export type { KanjiManifestEntry } from './manifest.ts';

// This module is written so it can be imported from a browser bundle (via
// the in-browser generator preview) as well as from Node. Two code paths:
//   - Node / Bun: read SVG files synchronously through node:fs.
//   - Vite browser bundle: `import.meta.glob(..., { eager: true, ?raw })`
//     inlines every kanjivg/*.svg file as a string at build time, keyed by
//     filename. That gives synchronous O(1) lookup without any file I/O.
// When neither path works (e.g. a non-Vite browser bundler), `getKanjiSvg`
// returns null and the caller falls back to the heuristic pipeline.

interface NodeBindings {
  readFileSync: typeof import('node:fs').readFileSync;
  existsSync: typeof import('node:fs').existsSync;
  resolve: typeof import('node:path').resolve;
  kanjivgDir: string;
  overrides: Record<string, string>;
}

let _node: NodeBindings | null | undefined;

function isNodeRuntime(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node;
}

function getNode(): NodeBindings | null {
  if (_node !== undefined) return _node;
  if (!isNodeRuntime()) {
    _node = null;
    return null;
  }
  try {
    // Dodge Vite's static analyzer: the `new Function(...)` returns `require`
    // at runtime (exists in Bun + Node CommonJS) and `null` otherwise (ESM
    // Node / browsers). The specifiers are reassembled at runtime so Vite
    // never sees a literal `"node:path"` import to externalize.
    const lookupRequire = new Function('return typeof require === "function" ? require : null');
    const req = lookupRequire() as ((m: string) => unknown) | null;
    if (!req) {
      _node = null;
      return null;
    }
    const fsSpec = ['node', 'fs'].join(':');
    const pathSpec = ['node', 'path'].join(':');
    const fs = req(fsSpec) as typeof import('node:fs');
    const path = req(pathSpec) as typeof import('node:path');
    const kanjivgDir = path.resolve(import.meta.dir, '..', 'kanjivg');
    const overridesPath = path.resolve(import.meta.dir, '..', 'fix-overrides.json');
    let overrides: Record<string, string> = {};
    try {
      if (fs.existsSync(overridesPath)) {
        const parsed = JSON.parse(fs.readFileSync(overridesPath, 'utf-8')) as {
          overrides?: Record<string, string>;
        };
        overrides = parsed.overrides ?? {};
      }
    } catch {
      // Malformed fix-overrides.json — ignore, ship manifest as-is.
    }
    _node = { readFileSync: fs.readFileSync, existsSync: fs.existsSync, resolve: path.resolve, kanjivgDir, overrides };
    return _node;
  } catch {
    _node = null;
    return null;
  }
}

function overrideKey(codepoint: number): string {
  return codepoint.toString(16).toUpperCase().padStart(4, '0');
}

// Vite-specific: `import.meta.glob` with `eager: true` and `?raw` inlines the
// entire matching file set as strings at build time. This makes every SVG
// accessible synchronously in the browser without any file I/O. In Node /
// Bun `import.meta.glob` is undefined, the access throws, and we fall
// through to the node:fs path via getNode().
let _browserSvgs: Map<number, string> | null | undefined;

function getBrowserSvgs(): Map<number, string> | null {
  if (_browserSvgs !== undefined) return _browserSvgs;
  try {
    // IMPORTANT: Vite's static analyzer only replaces `import.meta.glob(...)`
    // when it is used as a literal call expression. Assigning it to a variable
    // first (const glob = import.meta.glob; glob(...)) defeats the transform
    // and leaves `import.meta.glob` undefined at runtime. Keep this shape.
    // biome-ignore lint/suspicious/noExplicitAny: Vite-specific runtime API
    const svgs = (import.meta as any).glob('../kanjivg/*.svg', {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string> | undefined;
    if (!svgs || Object.keys(svgs).length === 0) {
      _browserSvgs = null;
      return null;
    }
    const map = new Map<number, string>();
    for (const [path, content] of Object.entries(svgs)) {
      const m = path.match(/([0-9a-f]+)\.svg$/i);
      if (m) map.set(Number.parseInt(m[1]!, 16), content);
    }
    _browserSvgs = map;
    return map;
  } catch {
    _browserSvgs = null;
    return null;
  }
}

/**
 * Load the raw KanjiVG SVG string for a single codepoint.
 *
 * Synchronous by design — the manifest lookup is O(1) and file I/O is cheap
 * when consumers ask for one glyph at a time from the Tegaki generator
 * pipeline. Returns `null` in browsers (where the filesystem isn't
 * available) so the in-browser preview falls through to the heuristic path.
 *
 * @param codepoint Unicode codepoint, e.g. `0x53f3` for 「右」. BMP only for the first release.
 */
export function getKanjiSvg(codepoint: number): string | null {
  const node = getNode();
  if (node) {
    const overrideSvg = node.overrides[overrideKey(codepoint)];
    if (overrideSvg) return overrideSvg;
  }
  // Browser inline blob first — it works even when MANIFEST is the committed
  // empty placeholder, because the blob is keyed directly by codepoint from
  // the SVG filename, not from the manifest.
  const browserSvgs = getBrowserSvgs();
  if (browserSvgs) {
    const svg = browserSvgs.get(codepoint);
    if (svg) return svg;
  }
  // Node fallback requires a populated manifest (generated by fetch-kanjivg).
  const entry = MANIFEST.get(codepoint);
  if (!entry || !node) return null;
  try {
    return node.readFileSync(node.resolve(node.kanjivgDir, entry.file), 'utf-8');
  } catch {
    return null;
  }
}

/** Cheap existence check (no file I/O). Used by the `isCJK(char) && dataset.has(char)` dispatch. */
export function hasKanji(codepoint: number): boolean {
  const node = getNode();
  if (node?.overrides[overrideKey(codepoint)]) return true;
  const browserSvgs = getBrowserSvgs();
  if (browserSvgs) return browserSvgs.has(codepoint) || MANIFEST.has(codepoint);
  return MANIFEST.has(codepoint);
}

/** Iterate every covered codepoint. Ascending-sorted, stable across runs. */
export function listCodepoints(): Iterable<number> {
  return MANIFEST.keys();
}

/** Fetch the raw manifest entry for a codepoint, or null if not covered. */
export function getManifestEntry(codepoint: number): import('./manifest.ts').KanjiManifestEntry | null {
  return MANIFEST.get(codepoint) ?? null;
}
