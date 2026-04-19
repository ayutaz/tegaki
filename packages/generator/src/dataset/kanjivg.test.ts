import { describe, expect, it } from 'bun:test';

import { classifyEndpoint, parseD, parseKanjiSvg } from './kanjivg.ts';

// ── Fixtures ────────────────────────────────────────────────────────────────
// Trimmed excerpts from upstream KanjiVG r20250816. Shapes are intentionally
// kept byte-identical to upstream so regressions in path parsing surface in
// CI. Sources:
//   - https://raw.githubusercontent.com/KanjiVG/kanjivg/r20250816/kanji/053f3.svg  (右)
//   - https://raw.githubusercontent.com/KanjiVG/kanjivg/r20250816/kanji/07530.svg  (田)
//   - https://raw.githubusercontent.com/KanjiVG/kanjivg/r20250816/kanji/0304d.svg  (き)
//   - https://raw.githubusercontent.com/KanjiVG/kanjivg/r20250816/kanji/030a2.svg  (ア)

const SVG_MIGI = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="http://kanjivg.tagaini.net" width="109" height="109" viewBox="0 0 109 109">
  <g id="kvg:StrokePaths_053f3" style="fill:none;stroke:#000000;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;">
    <g id="kvg:053f3" kvg:element="右">
      <g id="kvg:053f3-g1" kvg:element="丆">
        <path id="kvg:053f3-s1" kvg:type="㇒" d="M53.5,21.5c0.62,1.12,0.5,2.5-1.5,5C45,35.5,33,48.5,20,56.5" />
        <path id="kvg:053f3-s2" kvg:type="㇐" d="M13,42.15c1.9,0.56,5.4,0.73,7.29,0.56c10.96-1.04,49.21-7.35,58.09-7.35c3.16,0,5.06,0.27,6.64,0.55" />
      </g>
      <g id="kvg:053f3-g2" kvg:element="口" kvg:radical="general">
        <path id="kvg:053f3-s3" kvg:type="㇑" d="M38.75,48.29c0.62,1.21,0.77,2.08,1.01,3.66c0.24,1.58,1.34,29.34,1.34,30.5" />
        <path id="kvg:053f3-s4" kvg:type="㇕b" d="M42.01,50.54c8.99-1.04,34.53-3.83,39.34-4.28c4.01-0.38,6.18,1.99,5.9,4.48c-0.42,3.73-1.42,20.37-1.84,28.06" />
        <path id="kvg:053f3-s5" kvg:type="㇐b" d="M44.75,81.27c7.25-0.52,30.25-2.27,40.64-2.27" />
      </g>
    </g>
  </g>
</svg>`;

const SVG_TA = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="http://kanjivg.tagaini.net" width="109" height="109" viewBox="0 0 109 109">
  <g id="kvg:StrokePaths_07530" style="fill:none;stroke:#000000;stroke-width:3;">
    <g id="kvg:07530" kvg:element="田" kvg:radical="general">
      <path id="kvg:07530-s1" kvg:type="㇑" d="M28.87,22.29c0.85,0.85,1.45,2.34,1.45,3.25c0,0.91,0.05,39.71,0.05,50.2" />
      <path id="kvg:07530-s2" kvg:type="㇕a" d="M31.36,23.71c3.03-0.11,44.06-5.2,46.82-5.33c2.29-0.11,4.1,1.68,4.1,4.02c0,3.66,0,44.77-0.01,55.37" />
      <path id="kvg:07530-s3" kvg:type="㇑a" d="M54.47,24.9c0.53,0.6,1.11,2.35,1.11,3.12c0,0.76,0.08,38.84,0.08,50.2" />
      <path id="kvg:07530-s4" kvg:type="㇐a" d="M31.22,50.21c4.28-0.21,47.64-3.96,50.91-3.96" />
      <path id="kvg:07530-s5" kvg:type="㇐a" d="M31.65,78.06c6.62-0.31,38.97-1.94,50.56-1.94" />
    </g>
  </g>
</svg>`;

const SVG_KI = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="http://kanjivg.tagaini.net" width="109" height="109" viewBox="0 0 109 109">
  <g id="kvg:StrokePaths_0304d" style="fill:none;stroke:#000000;stroke-width:3;">
    <g id="kvg:0304d" kvg:element="き">
      <path id="kvg:0304d-s1" d="M18.75,32.75c3.75,0.5,7.38,0.5,11.29,0.04c10.83-1.29,38.59-4.79,47.91-5.16c3.77-0.15,6.19-0.22,7.8,0" />
      <path id="kvg:0304d-s2" d="M23.87,53.84c3.13,0.66,5.54,0.79,8.65,0.33c11.95-1.79,34.73-4.92,46.12-5.29c2.81-0.09,5.36,0.12,8,0.71" />
      <path id="kvg:0304d-s3" d="M52.12,18.25c1.25,1.25,1.78,2.6,1.88,4.5c1,23,0.25,42.38-2.05,53.8c-2.39,11.89-6.94,10.08-11.97,2.08" />
      <path id="kvg:0304d-s4" d="M80.79,61.02c0.09,0.73-0.18,1.89-0.82,2.87C73.25,73.62,58.12,86.5,30.75,95.25" />
    </g>
  </g>
</svg>`;

const SVG_A = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="http://kanjivg.tagaini.net" width="109" height="109" viewBox="0 0 109 109">
  <g id="kvg:StrokePaths_030a2" style="fill:none;stroke:#000000;stroke-width:3;">
    <g id="kvg:030a2" kvg:element="ア">
      <path id="kvg:030a2-s1" d="M23.5,26.25c2.41,1.56,4.37,2.25,7.75,1.5c11.5-2.56,33.25-5.31,44.5-6.06c3.38-0.22,5.88,0.31,8.12,2.25" />
      <path id="kvg:030a2-s2" d="M53.12,41.12c0.79,1.5,1.12,3.12,0.91,5.35C52,65.5,41.88,80.12,21.25,90" />
    </g>
  </g>
</svg>`;

// ── classifyEndpoint ────────────────────────────────────────────────────────

describe('classifyEndpoint', () => {
  it('maps ㇐ / ㇑ to tome (horizontal and vertical strokes)', () => {
    expect(classifyEndpoint('㇐')).toBe('tome');
    expect(classifyEndpoint('㇑')).toBe('tome');
  });

  it('maps ㇔ to dot', () => {
    expect(classifyEndpoint('㇔')).toBe('dot');
  });

  it('maps hane shapes (㇀ ㇆ ㇚ …) to hane', () => {
    expect(classifyEndpoint('㇀')).toBe('hane');
    expect(classifyEndpoint('㇆')).toBe('hane');
    expect(classifyEndpoint('㇚')).toBe('hane');
  });

  it('maps harai shapes (㇏ ㇒ ㇓ ㇇) to harai', () => {
    expect(classifyEndpoint('㇏')).toBe('harai');
    expect(classifyEndpoint('㇒')).toBe('harai');
    expect(classifyEndpoint('㇓')).toBe('harai');
    expect(classifyEndpoint('㇇')).toBe('harai');
  });

  it('strips junction-subtype suffixes (a/b/c/v)', () => {
    expect(classifyEndpoint('㇐b')).toBe('tome');
    expect(classifyEndpoint('㇑a')).toBe('tome');
    expect(classifyEndpoint('㇕b')).toBe('default'); // ㇕ is a "fold" shape, not in our 4 buckets
  });

  it('handles slash notation by taking the first option', () => {
    expect(classifyEndpoint('㇔/㇀')).toBe('dot');
  });

  it('returns default for null, undefined, empty string, or unknown shapes', () => {
    expect(classifyEndpoint(null)).toBe('default');
    expect(classifyEndpoint(undefined)).toBe('default');
    expect(classifyEndpoint('')).toBe('default');
    expect(classifyEndpoint('whatever')).toBe('default');
  });
});

// ── parseD ──────────────────────────────────────────────────────────────────

describe('parseD', () => {
  it('parses a single absolute M+C sequence', () => {
    const cmds = parseD('M10,20C30,40,50,60,70,80');
    expect(cmds).toEqual([
      { type: 'M', x: 10, y: 20 },
      { type: 'C', x: 70, y: 80, x1: 30, y1: 40, x2: 50, y2: 60 },
    ]);
  });

  it('parses relative commands by accumulating the cursor', () => {
    const cmds = parseD('m10,20c5,5,10,10,15,15');
    // Absolute cursor starts at (10, 20), relative cubic endpoint = (10+15, 20+15) = (25, 35)
    expect(cmds[0]).toEqual({ type: 'M', x: 10, y: 20 });
    expect(cmds[1]).toEqual({ type: 'C', x: 25, y: 35, x1: 15, y1: 25, x2: 20, y2: 30 });
  });

  it('reflects the previous cubic control point on smooth S', () => {
    // Prev cubic ends at (70, 80) with C2=(50, 60). Reflected C1 = 2*70-50 = 90, 2*80-60 = 100.
    const cmds = parseD('M10,20C30,40,50,60,70,80S110,120,130,140');
    expect(cmds).toHaveLength(3); // M + C + S-expanded-to-C
    const s = cmds[2]!;
    expect(s.type).toBe('C');
    expect(s.x1).toBe(90);
    expect(s.y1).toBe(100);
    expect(s.x2).toBe(110);
    expect(s.y2).toBe(120);
    expect(s.x).toBe(130);
    expect(s.y).toBe(140);
  });

  it('when S has no preceding cubic, uses the current point as implicit control', () => {
    // After M, no prior cubic → C1 = current point.
    const cmds = parseD('M10,20S50,60,70,80');
    const s = cmds[1]!;
    expect(s.x1).toBe(10); // == cursor x
    expect(s.y1).toBe(20); // == cursor y
  });

  it('handles a relative S following a relative C (KanjiVG is full of this)', () => {
    const cmds = parseD('M0,0c1,1,2,2,3,3s4,4,5,5');
    // cmds: [M, C, S-expanded]
    // After first c: cursor=(3,3), lastC2=(2,2) absolute
    // s reflected C1 = 2*3-2 = 4, 2*3-2 = 4. Endpoint relative to (3,3) → (8, 8).
    const s = cmds[2]!;
    expect(s.x1).toBe(4);
    expect(s.y1).toBe(4);
    expect(s.x2).toBe(7); // 3 + 4
    expect(s.y2).toBe(7);
    expect(s.x).toBe(8); // 3 + 5
    expect(s.y).toBe(8);
  });

  it('parses negative numbers and exponents', () => {
    const cmds = parseD('M-1.5,2e1C-3.25,0.5,1e-1,2,3,4');
    expect(cmds[0]).toEqual({ type: 'M', x: -1.5, y: 20 });
    expect(cmds[1]!.x1).toBe(-3.25);
    expect(cmds[1]!.y2).toBe(2);
    expect(cmds[1]!.x2).toBeCloseTo(0.1, 10);
  });
});

// ── parseKanjiSvg ───────────────────────────────────────────────────────────

describe('parseKanjiSvg — 右 (U+53F3, 5 strokes)', () => {
  const strokes = parseKanjiSvg(SVG_MIGI);

  it('returns 5 strokes in stroke-number order', () => {
    expect(strokes).toHaveLength(5);
    expect(strokes.map((s) => s.strokeNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it('maps endpoint types: ㇒ → harai, ㇐ → tome, ㇑ → tome, ㇕b → default, ㇐b → tome', () => {
    expect(strokes.map((s) => s.endpointType)).toEqual(['harai', 'tome', 'tome', 'default', 'tome']);
  });

  it('every stroke has ≥ 2 points after bezier flattening', () => {
    for (const s of strokes) expect(s.points.length).toBeGreaterThanOrEqual(2);
  });

  it('preserves the raw kvg:type attribute', () => {
    expect(strokes[0]!.kvgType).toBe('㇒');
    expect(strokes[3]!.kvgType).toBe('㇕b');
  });
});

describe('parseKanjiSvg — 田 (U+7530, 5 strokes)', () => {
  const strokes = parseKanjiSvg(SVG_TA);

  it('returns 5 strokes starting with 縦 (㇑) — the Japanese order', () => {
    expect(strokes).toHaveLength(5);
    expect(strokes[0]!.kvgType).toBe('㇑');
    expect(strokes[0]!.endpointType).toBe('tome');
  });

  it('final stroke is the bottom horizontal (㇐)', () => {
    expect(strokes.at(-1)!.kvgType).toBe('㇐a');
    expect(strokes.at(-1)!.endpointType).toBe('tome');
  });
});

describe('parseKanjiSvg — き (U+304D, 4 strokes separated; kana has no kvg:type)', () => {
  const strokes = parseKanjiSvg(SVG_KI);

  it('returns 4 strokes (kana教科書体: separated 3rd/4th画)', () => {
    expect(strokes).toHaveLength(4);
  });

  it('all kana strokes classify as default (no kvg:type upstream)', () => {
    for (const s of strokes) {
      expect(s.kvgType).toBeNull();
      expect(s.endpointType).toBe('default');
    }
  });
});

describe('parseKanjiSvg — ア (U+30A2, 2 strokes)', () => {
  const strokes = parseKanjiSvg(SVG_A);

  it('returns 2 strokes, all default endpoint type', () => {
    expect(strokes).toHaveLength(2);
    for (const s of strokes) {
      expect(s.kvgType).toBeNull();
      expect(s.endpointType).toBe('default');
    }
  });
});

describe('parseKanjiSvg — edge cases', () => {
  it('returns [] for an SVG with no stroke paths', () => {
    const bare = `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 109 109"></svg>`;
    expect(parseKanjiSvg(bare)).toEqual([]);
  });

  it('ignores <text> nodes inside kvg:StrokeNumbers_* (no -sN id suffix)', () => {
    const withNumbers = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="http://kanjivg.tagaini.net" viewBox="0 0 109 109">
  <g id="kvg:StrokePaths_0304d">
    <path id="kvg:0304d-s1" d="M10,10C20,20,30,30,40,40" />
  </g>
  <g id="kvg:StrokeNumbers_0304d">
    <text transform="matrix(1 0 0 1 50 50)">1</text>
  </g>
</svg>`;
    const out = parseKanjiSvg(withNumbers);
    expect(out).toHaveLength(1);
    expect(out[0]!.strokeNumber).toBe(1);
  });

  it('preserves document-order stroke numbering even if the ids arrive non-sequentially', () => {
    const shuffled = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:kvg="http://kanjivg.tagaini.net" viewBox="0 0 109 109">
  <g id="kvg:StrokePaths_0304d">
    <path id="kvg:0304d-s3" d="M30,30C40,40,50,50,60,60" />
    <path id="kvg:0304d-s1" d="M10,10C20,20,30,30,40,40" />
    <path id="kvg:0304d-s2" d="M20,20C30,30,40,40,50,50" />
  </g>
</svg>`;
    const out = parseKanjiSvg(shuffled);
    expect(out.map((s) => s.strokeNumber)).toEqual([1, 2, 3]);
  });
});
