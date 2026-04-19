import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { KANJIVG_DIR } from './constants.ts';
import { MANIFEST } from './manifest.ts';

export { KANJIVG_SHA } from './constants.ts';
export type { KanjiManifestEntry } from './manifest.ts';

interface FixOverrides {
  readonly overrides: Record<string, string>;
}

const OVERRIDES_PATH = resolve(import.meta.dir, '..', 'fix-overrides.json');

// Phase 6 escape hatch: corrections for upstream KanjiVG errors. Keys are
// uppercase hex codepoints (e.g. "5A69" for 娩). Loaded eagerly — the file
// ships empty and is typically small, so the one-time cost is negligible.
const FIX_OVERRIDES: Record<string, string> = (() => {
  try {
    if (!existsSync(OVERRIDES_PATH)) return {};
    const parsed = JSON.parse(readFileSync(OVERRIDES_PATH, 'utf-8')) as Partial<FixOverrides>;
    return parsed.overrides ?? {};
  } catch {
    return {};
  }
})();

function overrideKey(codepoint: number): string {
  return codepoint.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Load the raw KanjiVG SVG string for a single codepoint.
 *
 * Synchronous by design — the manifest lookup is O(1) and file I/O is cheap
 * when consumers ask for one glyph at a time from the Tegaki generator
 * pipeline. Callers that need parallel fan-out can wrap this in a worker.
 *
 * @param codepoint Unicode codepoint, e.g. `0x53f3` for 「右」. BMP only for the first release.
 * @returns UTF-8 SVG markup, or `null` if the codepoint is not covered
 *          (JIS L3/L4, CJK Compatibility, emoji, etc.).
 */
export function getKanjiSvg(codepoint: number): string | null {
  const overrideSvg = FIX_OVERRIDES[overrideKey(codepoint)];
  if (overrideSvg) return overrideSvg;
  const entry = MANIFEST.get(codepoint);
  if (!entry) return null;
  try {
    return readFileSync(resolve(KANJIVG_DIR, entry.file), 'utf-8');
  } catch {
    return null;
  }
}

/** Cheap existence check (no file I/O). Used by the `isCJK(char) && dataset.has(char)` dispatch. */
export function hasKanji(codepoint: number): boolean {
  if (FIX_OVERRIDES[overrideKey(codepoint)]) return true;
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
