import type { TegakiBundle } from '../types.ts';
import { graphemes } from './utils.ts';

const GLYPH_GAP = 0.1;

export { GLYPH_GAP };

export interface TimelineEntry {
  char: string;
  offset: number;
  duration: number;
  hasSvg: boolean;
}

export interface Timeline {
  entries: TimelineEntry[];
  totalDuration: number;
}

export function computeTimeline(text: string, font: TegakiBundle): Timeline {
  const chars = graphemes(text);
  const entries: TimelineEntry[] = [];
  let offset = 0;
  for (const char of chars) {
    const hasSvg = char in font.glyphs;
    const duration = hasSvg ? (font.glyphTimings[char] ?? 1) : GLYPH_GAP;
    entries.push({ char, offset, duration, hasSvg });
    offset += duration;
    offset += GLYPH_GAP;
  }
  // Remove trailing gap
  if (entries.length > 0) {
    offset -= GLYPH_GAP;
  }
  return { entries, totalDuration: Math.max(0, offset) };
}
