// Browser-only entry. Routed via the `browser` condition in package.json
// exports so Vite (and other browser bundlers) never try to evaluate the
// Node-only entry in `./index.ts`, which imports node:fs / node:path.
//
// KanjiVG SVGs are inlined at build time via `import.meta.glob` with
// `{ eager: true, query: '?raw', import: 'default' }`, giving synchronous
// O(1) lookup by codepoint with no file I/O at runtime.

import { MANIFEST } from './manifest.ts';

export { KANJIVG_SHA } from './constants.ts';
export type { KanjiManifestEntry } from './manifest.ts';

let _browserSvgs: Map<number, string> | null | undefined;

function getBrowserSvgs(): Map<number, string> | null {
  if (_browserSvgs !== undefined) return _browserSvgs;
  try {
    // IMPORTANT: Vite's static analyzer only replaces `import.meta.glob(...)`
    // when it appears as a literal call expression. Assigning it to a variable
    // first (e.g. `const glob = import.meta.glob; glob(...)`) disables the
    // transform and leaves `import.meta.glob` undefined at runtime.
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
 * Load the raw KanjiVG SVG string for a single codepoint. Browser build —
 * reads from the Vite-inlined blob, never from the filesystem.
 */
export function getKanjiSvg(codepoint: number): string | null {
  const browserSvgs = getBrowserSvgs();
  if (!browserSvgs) return null;
  return browserSvgs.get(codepoint) ?? null;
}

/** Cheap existence check. Consults the inline blob + the manifest placeholder. */
export function hasKanji(codepoint: number): boolean {
  const browserSvgs = getBrowserSvgs();
  if (browserSvgs?.has(codepoint)) return true;
  return MANIFEST.has(codepoint);
}

/** Iterate every covered codepoint. Ascending-sorted, stable across runs. */
export function listCodepoints(): Iterable<number> {
  const browserSvgs = getBrowserSvgs();
  if (browserSvgs && browserSvgs.size > 0) {
    return [...browserSvgs.keys()].sort((a, b) => a - b);
  }
  return MANIFEST.keys();
}

/** Fetch the raw manifest entry for a codepoint, or null if not covered. */
export function getManifestEntry(codepoint: number): import('./manifest.ts').KanjiManifestEntry | null {
  return MANIFEST.get(codepoint) ?? null;
}
