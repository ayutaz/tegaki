// Browser-only entry. Routed via the `browser` condition in package.json
// exports so Vite (and other browser bundlers) never try to evaluate the
// Node-only entry in `./index.ts`, which imports node:fs / node:path.
//
// Lazy loading strategy
// ---------------------
// The dataset covers ~3,000 codepoints (kana + jōyō + jinmeiyō, ~23 MB of
// SVG source). Eager inlining via `import.meta.glob({ eager: true })` would
// push every byte into the initial bundle, which is unacceptable for the
// website preview. Instead we use a *lazy* glob — Vite produces one dynamic
// import per file and we only load the SVGs the caller explicitly asks for
// via `preloadKanji`. `getKanjiSvg` is synchronous against a local cache:
// callers must `await preloadKanji([...codepoints])` before running the
// pipeline, otherwise lookups return null.

import { MANIFEST } from './manifest.ts';

export { KANJIVG_SHA } from './constants.ts';
export type { KanjiManifestEntry } from './manifest.ts';

type SvgLoader = () => Promise<string>;

// Augment the global ImportMeta with Vite's `glob` helper. This keeps the
// call site below a plain literal `import.meta.glob(...)`, which Vite's
// static analyser requires to inline the per-file dynamic imports.
declare global {
  interface ImportMeta {
    glob: (p: string, o: { query?: string; import?: string; eager?: boolean }) => Record<string, SvgLoader>;
  }
}

let _loaders: Record<string, SvgLoader> | null | undefined;

function getLoaders(): Record<string, SvgLoader> | null {
  if (_loaders !== undefined) return _loaders;
  try {
    // IMPORTANT: Vite's static analyzer only replaces `import.meta.glob(...)`
    // when it appears as a literal, non-optional call expression — any sugar
    // (assigning to a variable, optional chaining, a guard check) leaves the
    // call un-transformed and `glob` undefined at runtime. Call it directly.
    const loaders = import.meta.glob('../kanjivg/*.svg', {
      query: '?raw',
      import: 'default',
    });
    _loaders = Object.keys(loaders).length > 0 ? loaders : null;
    return _loaders;
  } catch {
    _loaders = null;
    return null;
  }
}

/** Map from file basename ("04e00.svg") → loader. Computed once per page. */
let _byFile: Map<string, SvgLoader> | null | undefined;
function getLoadersByFile(): Map<string, SvgLoader> | null {
  if (_byFile !== undefined) return _byFile;
  const loaders = getLoaders();
  if (!loaders) {
    _byFile = null;
    return null;
  }
  const map = new Map<string, SvgLoader>();
  for (const [path, loader] of Object.entries(loaders)) {
    const m = path.match(/([^/\\]+\.svg)$/i);
    if (m) map.set(m[1]!, loader);
  }
  _byFile = map;
  return map;
}

/** Preloaded SVG cache keyed by codepoint. Populated by `preloadKanji`. */
const _svgCache = new Map<number, string>();

/**
 * Pre-fetch the SVGs for the given codepoints so that subsequent synchronous
 * `getKanjiSvg` calls can succeed. Codepoints not covered by the dataset are
 * silently skipped (the pipeline falls back to heuristic skeletonization).
 *
 * Safe to call repeatedly — already-cached codepoints are not re-fetched.
 */
export async function preloadKanji(codepoints: Iterable<number>): Promise<void> {
  const byFile = getLoadersByFile();
  if (!byFile) return;

  const pending: Promise<void>[] = [];
  for (const cp of codepoints) {
    if (_svgCache.has(cp)) continue;
    const entry = MANIFEST.get(cp);
    if (!entry) continue;
    const loader = byFile.get(entry.file);
    if (!loader) continue;
    pending.push(
      loader().then((svg) => {
        _svgCache.set(cp, svg);
      }),
    );
  }
  await Promise.all(pending);
}

/**
 * Synchronous SVG lookup. Returns null when the codepoint is not covered or
 * has not been preloaded yet — callers are expected to `await preloadKanji`
 * first. Reserved for the pipeline's synchronous per-glyph loop.
 */
export function getKanjiSvg(codepoint: number): string | null {
  return _svgCache.get(codepoint) ?? null;
}

/**
 * Cheap existence check against the auto-generated manifest. Does not trigger
 * a network fetch — use `preloadKanji` when you actually need the SVG.
 */
export function hasKanji(codepoint: number): boolean {
  return MANIFEST.has(codepoint);
}

/**
 * Whether the SVG for this codepoint has already been preloaded and is ready
 * for synchronous `getKanjiSvg`. Callers can use this to gate pipeline work
 * and avoid a heuristic-fallback flash on the render before preload resolves.
 */
export function isKanjiReady(codepoint: number): boolean {
  return _svgCache.has(codepoint);
}

/** Iterate every covered codepoint (from the manifest). */
export function listCodepoints(): Iterable<number> {
  return MANIFEST.keys();
}

/** Fetch the raw manifest entry for a codepoint, or null if not covered. */
export function getManifestEntry(codepoint: number): import('./manifest.ts').KanjiManifestEntry | null {
  return MANIFEST.get(codepoint) ?? null;
}
