// Allowlist of Unicode codepoints included in this package's SVG bundle.
//
// The `fetch-kanjivg.ts` script filters the upstream KanjiVG tarball against
// this allowlist so the resulting package stays under the 5 MB size budget
// (see docs/tickets/phase-1-dataset-package.md NFR-5.2).
//
// Scope for the first Japanese release:
//   - Hiragana  (U+3041–U+3096, plus ゝ ゞ)
//   - Katakana  (U+30A1–U+30FA, plus ヽ ヾ)
//   - CJK Unified Ideographs in the Jōyō + Jinmeiyō sets
//
// Out of scope (handled by fallback heuristics at runtime):
//   - JIS Level 3/4 kanji
//   - CJK Compatibility Ideographs
//   - Hentaigana, variation selectors, emoji

function range(start: number, endInclusive: number): number[] {
  const out: number[] = [];
  for (let cp = start; cp <= endInclusive; cp++) out.push(cp);
  return out;
}

/** Hiragana: U+3041–U+3096 (small+regular) plus U+309D,U+309E (ゝ, ゞ). */
export const HIRAGANA: readonly number[] = Object.freeze([...range(0x3041, 0x3096), 0x309d, 0x309e]);

/** Katakana: U+30A1–U+30FA (small+regular) plus U+30FD,U+30FE (ヽ, ヾ). */
export const KATAKANA: readonly number[] = Object.freeze([...range(0x30a1, 0x30fa), 0x30fd, 0x30fe]);

/**
 * Jōyō kanji (常用漢字, 2,136 chars). Populated by `fetch-kanjivg.ts` from a
 * pinned public list; committed as-is to the repository. An empty array means
 * "use every CJK codepoint KanjiVG ships with, filtered only by Unicode block" —
 * the initial bootstrap state before the script has been run.
 */
export const JOYO: readonly number[] = Object.freeze([]);

/**
 * Jinmeiyō kanji (人名用漢字, 863 chars). Same bootstrap semantics as JOYO.
 */
export const JINMEI: readonly number[] = Object.freeze([]);

/** CJK Unified Ideographs range used when JOYO/JINMEI are unpopulated. */
export const CJK_UNIFIED_START = 0x4e00;
export const CJK_UNIFIED_END = 0x9fff;

/**
 * Effective allowlist set, built from the constants above.
 *
 * - Kana are always included (179 chars, ~1 MB of SVGs).
 * - Jōyō and Jinmeiyō kanji are included when their codepoint arrays are
 *   populated (TODO — they currently default to empty).
 * - Setting `TEGAKI_KANJIVG_FULL=1` in the environment overrides the empty
 *   default with the full CJK Unified range for contributors experimenting
 *   with wider coverage locally.
 *
 * The committed package ships kana-only until the Jōyō/Jinmeiyō arrays are
 * filled in, so the 5 MB budget (NFR-5.2) stays satisfied by default.
 */
export function buildAllowedCodepoints(): Set<number> {
  const set = new Set<number>();
  for (const cp of HIRAGANA) set.add(cp);
  for (const cp of KATAKANA) set.add(cp);
  for (const cp of JOYO) set.add(cp);
  for (const cp of JINMEI) set.add(cp);
  if (JOYO.length === 0 && JINMEI.length === 0 && process.env.TEGAKI_KANJIVG_FULL === '1') {
    for (let cp = CJK_UNIFIED_START; cp <= CJK_UNIFIED_END; cp++) set.add(cp);
  }
  return set;
}
