// Allowlist of Unicode codepoints included in this package's SVG bundle.
//
// The `fetch-kanjivg.ts` script filters the upstream KanjiVG tarball against
// this allowlist before copying the SVGs into `kanjivg/`.
//
// Scope:
//   - Hiragana  (U+3041–U+3096, plus ゝ ゞ)
//   - Katakana  (U+30A1–U+30FA, plus ヽ ヾ)
//   - Jōyō kanji (2,136, from kanji-codepoints.ts)
//   - Jinmeiyō kanji (805, CJK-Unified only; KanjiVG has no SVGs in the
//     Compatibility Ideographs block so those are dropped at list-build time)
//
// Out of scope (handled by fallback heuristics at runtime):
//   - JIS Level 3/4 kanji
//   - CJK Compatibility Ideographs
//   - Hentaigana, variation selectors, emoji
//
// Because the SVGs are lazy-loaded in the browser (Vite's non-eager
// `import.meta.glob` produces a per-file dynamic import), adding a few
// thousand codepoints to the allowlist has no effect on the initial page
// weight — only the kanji the user actually previews are fetched.

import { JINMEI_CODEPOINTS, JOYO_CODEPOINTS } from './kanji-codepoints.ts';

function range(start: number, endInclusive: number): number[] {
  const out: number[] = [];
  for (let cp = start; cp <= endInclusive; cp++) out.push(cp);
  return out;
}

/** Hiragana: U+3041–U+3096 (small+regular) plus U+309D,U+309E (ゝ, ゞ). */
export const HIRAGANA: readonly number[] = Object.freeze([...range(0x3041, 0x3096), 0x309d, 0x309e]);

/** Katakana: U+30A1–U+30FA (small+regular) plus U+30FD,U+30FE (ヽ, ヾ). */
export const KATAKANA: readonly number[] = Object.freeze([...range(0x30a1, 0x30fa), 0x30fd, 0x30fe]);

/** Jōyō kanji (常用漢字, 2,136 chars). */
export const JOYO: readonly number[] = JOYO_CODEPOINTS;

/** Jinmeiyō kanji (人名用漢字, CJK-Unified subset = 805 chars). */
export const JINMEI: readonly number[] = JINMEI_CODEPOINTS;

/** CJK Unified Ideographs range. Used only when TEGAKI_KANJIVG_FULL=1 is set. */
export const CJK_UNIFIED_START = 0x4e00;
export const CJK_UNIFIED_END = 0x9fff;

/**
 * Effective allowlist set, built from the constants above.
 *
 * - Kana are always included.
 * - Jōyō and Jinmeiyō kanji are always included (kanji-codepoints.ts).
 * - Setting `TEGAKI_KANJIVG_FULL=1` additionally expands to the entire CJK
 *   Unified block for contributors experimenting with wider coverage.
 */
export function buildAllowedCodepoints(): Set<number> {
  const set = new Set<number>();
  for (const cp of HIRAGANA) set.add(cp);
  for (const cp of KATAKANA) set.add(cp);
  for (const cp of JOYO) set.add(cp);
  for (const cp of JINMEI) set.add(cp);
  if (process.env.TEGAKI_KANJIVG_FULL === '1') {
    for (let cp = CJK_UNIFIED_START; cp <= CJK_UNIFIED_END; cp++) set.add(cp);
  }
  return set;
}
