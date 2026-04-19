// Node entry. Browser bundlers resolve `./browser.ts` instead via the
// `browser` export condition (see package.json), so it is safe to use
// node:fs / node:path directly here.

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { MANIFEST } from './manifest.ts';

export { KANJIVG_SHA } from './constants.ts';
export type { KanjiManifestEntry } from './manifest.ts';

interface FixOverrides {
  readonly overrides: Record<string, string>;
}

const OVERRIDES_PATH = resolve(import.meta.dir, '..', 'fix-overrides.json');
const KANJIVG_DIR = resolve(import.meta.dir, '..', 'kanjivg');

// Phase 6 escape hatch: KanjiVG error corrections keyed by uppercase hex
// codepoint. Loaded eagerly — the file ships empty and is small enough that
// the one-time read cost is negligible.
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
 * Load the raw KanjiVG SVG string for a single codepoint. Synchronous file
 * read through node:fs. Returns `null` when the codepoint is not covered
 * (JIS L3/L4, emoji, etc.) or when the manifest entry's file is missing
 * (typical before `bun run fetch-kanjivg` has been invoked).
 */
export function getKanjiSvg(codepoint: number): string | null {
  const override = FIX_OVERRIDES[overrideKey(codepoint)];
  if (override) return override;
  const entry = MANIFEST.get(codepoint);
  if (!entry) return null;
  try {
    return readFileSync(resolve(KANJIVG_DIR, entry.file), 'utf-8');
  } catch {
    return null;
  }
}

/** Cheap existence check (no file I/O). */
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
