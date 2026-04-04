import type { LineCap, TegakiGlyphData } from '../types.ts';

interface GlyphPosition {
  /** X offset in CSS pixels */
  x: number;
  /** Y offset in CSS pixels (top of em square) */
  y: number;
  /** Font size in CSS pixels */
  fontSize: number;
  /** Units per em from the font */
  unitsPerEm: number;
  /** Font ascender in font units */
  ascender: number;
  /** Font descender in font units (negative) */
  descender: number;
}

/**
 * Draw a single glyph's strokes onto a canvas context, animated up to `localTime`.
 * `localTime` is seconds relative to this glyph's start (0 = glyph begins).
 */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: TegakiGlyphData,
  pos: GlyphPosition,
  localTime: number,
  lineCap: LineCap,
  color: string,
) {
  const scale = pos.fontSize / pos.unitsPerEm;
  // In the SVG viewBox the origin is (0, -ascender), so font-unit y maps to
  // pixel y as: py = pos.y + (fontY + ascender) * scale
  const ox = pos.x;
  const oy = pos.y;

  ctx.lineCap = lineCap;
  ctx.lineJoin = 'round';

  for (const stroke of glyph.strokes) {
    if (localTime < stroke.delay) continue;
    const elapsed = localTime - stroke.delay;
    const progress = Math.min(elapsed / stroke.animationDuration, 1);

    const pts = stroke.points;
    if (pts.length === 0) continue;

    const avgWidth = pts.reduce((s, p) => s + p.width, 0) / pts.length;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(avgWidth, 0.5) * scale;

    if (pts.length === 1) {
      // Single-point dot
      if (progress <= 0) continue;
      const p = pts[0]!;
      const px = ox + p.x * scale;
      const py = oy + (p.y + pos.ascender) * scale;
      ctx.beginPath();
      if (lineCap === 'round') {
        ctx.arc(px, py, (Math.max(avgWidth, 0.5) * scale) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const half = (Math.max(avgWidth, 0.5) * scale) / 2;
        ctx.fillRect(px - half, py - half, half * 2, half * 2);
      }
      continue;
    }

    // Compute total path length
    let totalLen = 0;
    for (let j = 1; j < pts.length; j++) {
      const dx = pts[j]!.x - pts[j - 1]!.x;
      const dy = pts[j]!.y - pts[j - 1]!.y;
      totalLen += Math.sqrt(dx * dx + dy * dy);
    }

    const drawLen = totalLen * progress;
    if (drawLen <= 0) continue;

    // Draw path up to drawLen
    ctx.beginPath();
    let accumulated = 0;
    const p0 = pts[0]!;
    ctx.moveTo(ox + p0.x * scale, oy + (p0.y + pos.ascender) * scale);

    for (let j = 1; j < pts.length; j++) {
      const prev = pts[j - 1]!;
      const cur = pts[j]!;
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (accumulated + segLen <= drawLen) {
        ctx.lineTo(ox + cur.x * scale, oy + (cur.y + pos.ascender) * scale);
        accumulated += segLen;
      } else {
        // Partial segment
        const remaining = drawLen - accumulated;
        const frac = segLen > 0 ? remaining / segLen : 0;
        const ix = prev.x + dx * frac;
        const iy = prev.y + dy * frac;
        ctx.lineTo(ox + ix * scale, oy + (iy + pos.ascender) * scale);
        break;
      }
    }

    ctx.stroke();
  }
}
