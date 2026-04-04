import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';
import { graphemes } from './utils.ts';

export interface TextLayout {
  /** Character indices per line */
  lines: number[][];
  /** Width in em per character index */
  charWidths: number[];
  /** Kerning adjustment in em between character at index i and i+1 */
  kernings: number[];
  /** Intrinsic (single-line) width in em */
  intrinsicWidth: number;
}

export function computeTextLayout(text: string, fontFamily: string, fontSize: number, lineHeight: number, maxWidth: number): TextLayout {
  const fontStr = `${fontSize}px ${fontFamily}`;
  const chars = graphemes(text);

  // Measure unique character widths
  const widthCache = new Map<string, number>();
  const charWidths: number[] = [];
  for (const char of chars) {
    let w = widthCache.get(char);
    if (w === undefined) {
      if (char === '\n') {
        w = 0;
      } else {
        const p = prepareWithSegments(char, fontStr, { whiteSpace: 'pre-wrap' });
        const r = layoutWithLines(p, Infinity, lineHeight);
        w = r.lines.length > 0 ? r.lines[0]!.width / fontSize : 0;
      }
      widthCache.set(char, w);
    }
    charWidths.push(w);
  }

  // Compute intrinsic width (single-line, no wrapping)
  const prepared = prepareWithSegments(text, fontStr, { whiteSpace: 'pre-wrap' });
  const singleLineResult = layoutWithLines(prepared, Infinity, lineHeight);
  const intrinsicWidth = Math.max(0, ...singleLineResult.lines.map((l) => l.width)) / fontSize;

  // Line breaking at actual available width
  const result = layoutWithLines(prepared, maxWidth, lineHeight);

  // Map line texts back to character indices (grapheme-based)
  // Build a mapping from UTF-16 offset to grapheme index
  const utf16ToCodePoint: number[] = [];
  for (let ci = 0; ci < chars.length; ci++) {
    for (let j = 0; j < chars[ci]!.length; j++) {
      utf16ToCodePoint.push(ci);
    }
  }

  const lines: number[][] = [];
  let utf16Offset = 0;
  for (const line of result.lines) {
    const indices: number[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < line.text.length; i++) {
      const cpIdx = utf16ToCodePoint[utf16Offset + i]!;
      if (!seen.has(cpIdx)) {
        seen.add(cpIdx);
        indices.push(cpIdx);
      }
    }
    utf16Offset += line.text.length;
    // Consume the newline that caused this line break
    if (utf16Offset < text.length && text[utf16Offset] === '\n') {
      const cpIdx = utf16ToCodePoint[utf16Offset]!;
      indices.push(cpIdx);
      utf16Offset++;
    }
    lines.push(indices);
  }

  // Any remaining characters (shouldn't happen, but safety)
  if (utf16Offset < text.length) {
    const indices: number[] = [];
    const seen = new Set<number>();
    for (let i = utf16Offset; i < text.length; i++) {
      const cpIdx = utf16ToCodePoint[i]!;
      if (!seen.has(cpIdx)) {
        seen.add(cpIdx);
        indices.push(cpIdx);
      }
    }
    lines.push(indices);
  }

  // Measure kerning between adjacent character pairs
  const kernings: number[] = [];
  const pairCache = new Map<string, number>();
  for (let i = 0; i < chars.length - 1; i++) {
    const a = chars[i]!;
    const b = chars[i + 1]!;
    if (a === '\n' || b === '\n') {
      kernings.push(0);
      continue;
    }
    const pair = `${a}${b}`;
    let k = pairCache.get(pair);
    if (k === undefined) {
      const p = prepareWithSegments(pair, fontStr, { whiteSpace: 'pre-wrap' });
      const r = layoutWithLines(p, Infinity, lineHeight);
      const pairWidth = r.lines.length > 0 ? r.lines[0]!.width / fontSize : 0;
      k = pairWidth - (widthCache.get(a) ?? 0) - (widthCache.get(b) ?? 0);
      if (Math.abs(k) < 0.001) k = 0;
      pairCache.set(pair, k);
    }
    kernings.push(k);
  }

  return { lines, charWidths, kernings, intrinsicWidth };
}
