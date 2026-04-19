import { describe, expect, it } from 'bun:test';

import { getKanjiSvg, getManifestEntry, hasKanji, KANJIVG_SHA, listCodepoints } from './index.ts';
import { MANIFEST } from './manifest.ts';

describe('KANJIVG_SHA', () => {
  it('is pinned to r20250816', () => {
    expect(KANJIVG_SHA).toBe('r20250816');
  });
});

describe('API contract with empty manifest', () => {
  it('returns null for any codepoint when manifest has no entry', () => {
    // Always true for uncovered codepoints regardless of manifest state.
    expect(getKanjiSvg(0x1f600)).toBeNull(); // 😀 emoji, never covered
    expect(hasKanji(0x1f600)).toBe(false);
    expect(getManifestEntry(0x1f600)).toBeNull();
  });

  it('listCodepoints returns an iterable', () => {
    const iter = listCodepoints();
    expect(iter).toBeDefined();
    // Should not throw when iterated even if empty.
    const all = Array.from(iter);
    expect(Array.isArray(all)).toBe(true);
  });
});

// The remaining suites only run once the manifest has been populated by
// `bun run fetch-kanjivg`. They act as contract tests for the bundled data.
const hasData = MANIFEST.size > 0;
const describeData = hasData ? describe : describe.skip;

describeData('Coverage — Jōyō kanji (2,136 chars)', () => {
  it('covers 100% of Jōyō kanji', async () => {
    const { JOYO } = await import('../scripts/allowlist.ts');
    const missing = JOYO.filter((cp) => !hasKanji(cp));
    expect(missing).toEqual([]);
  });
});

describeData('Coverage — Jinmeiyō kanji (863 chars)', () => {
  it('covers ≥ 95% of Jinmeiyō kanji', async () => {
    const { JINMEI } = await import('../scripts/allowlist.ts');
    const covered = JINMEI.filter((cp) => hasKanji(cp)).length;
    expect(covered / JINMEI.length).toBeGreaterThanOrEqual(0.95);
  });
});

describeData('Coverage — Kana (89 hiragana + 90 katakana)', () => {
  it('covers 100% of hiragana', async () => {
    const { HIRAGANA } = await import('../scripts/allowlist.ts');
    const missing = HIRAGANA.filter((cp) => !hasKanji(cp));
    expect(missing).toEqual([]);
  });

  it('covers 100% of katakana', async () => {
    const { KATAKANA } = await import('../scripts/allowlist.ts');
    const missing = KATAKANA.filter((cp) => !hasKanji(cp));
    expect(missing).toEqual([]);
  });
});

describeData('getKanjiSvg — representative glyphs', () => {
  it('returns a well-formed SVG for 右 (U+53F3)', () => {
    const svg = getKanjiSvg(0x53f3);
    expect(svg).not.toBeNull();
    expect(svg!).toMatch(/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!DOCTYPE[^>]*>\s*)?<svg\b/);
    expect(svg!).toContain('kvg:StrokePaths_053f3');
  });

  it('returns an SVG for き (U+304D)', () => {
    const svg = getKanjiSvg(0x304d);
    expect(svg).not.toBeNull();
    expect(svg!).toMatch(/<svg\b/);
  });

  it('returns an SVG for ア (U+30A2)', () => {
    const svg = getKanjiSvg(0x30a2);
    expect(svg).not.toBeNull();
    expect(svg!).toMatch(/<svg\b/);
  });
});

describeData('Variant files are excluded', () => {
  it('no manifest entry maps to a file with a variant suffix', () => {
    const variantRe = /-(Kaisho|Jinmei|HyogaiKanji|DaSeM)/;
    const offenders: string[] = [];
    for (const entry of MANIFEST.values()) {
      if (variantRe.test(entry.file)) offenders.push(entry.file);
    }
    expect(offenders).toEqual([]);
  });
});
