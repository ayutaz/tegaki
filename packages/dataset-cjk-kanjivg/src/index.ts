import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { KANJIVG_DIR } from './constants.ts';
import { MANIFEST } from './manifest.ts';

export { KANJIVG_SHA } from './constants.ts';
export type { KanjiManifestEntry } from './manifest.ts';

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
  const entry = MANIFEST.get(codepoint);
  if (!entry) return null;
  try {
    return readFileSync(join(KANJIVG_DIR, entry.file), 'utf-8');
  } catch {
    return null;
  }
}

/** Cheap existence check (no file I/O). Used by the `isCJK(char) && dataset.has(char)` dispatch. */
export function hasKanji(codepoint: number): boolean {
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
