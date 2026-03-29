import type { LineCap } from '../types.ts';

export function charToFilename(char: string): string {
  const code = char.codePointAt(0)!;
  if (/[a-zA-Z0-9]/.test(char)) {
    return char.charCodeAt(0) >= 65 && char.charCodeAt(0) <= 90 ? `upper_${char}` : char;
  }
  return `U+${code.toString(16).padStart(4, '0')}`;
}

/** Render a single-point dot as a circle (round cap) or rect (butt/square cap). */
function dotElement(x: string, y: string, size: number, fill: string, lineCap: LineCap): string {
  if (lineCap === 'round') {
    return `<circle cx="${x}" cy="${y}" r="${(size / 2).toFixed(1)}" fill="${fill}"`;
  }
  const half = size / 2;
  return `<rect x="${(Number(x) - half).toFixed(1)}" y="${(Number(y) - half).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" fill="${fill}"`;
}

/**
 * Generate a clean animated SVG for a glyph using font-unit coordinates.
 * Strokes are colored with currentColor and animated via stroke-dashoffset.
 * No debug labels, backgrounds, or overlay information.
 */
export function glyphToAnimatedSVG(
  strokes: { points: { x: number; y: number; t: number; width: number }[]; animationDuration: number; delay: number }[],
  advanceWidth: number,
  ascender: number,
  descender: number,
  lineCap: LineCap = 'round',
): string {
  // Uniform viewBox: baseline at y=0, full em-height, glyph's advanceWidth
  // In the pipeline's coordinate system y is negated (screen coords), so
  // ascender maps to negative y and descender to positive y.
  const vx = 0;
  const vy = -ascender;
  const vw = advanceWidth;
  const vh = ascender - descender;

  const elements: string[] = [];

  for (const stroke of strokes) {
    const d = stroke.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    let pathLen = 0;
    for (let j = 1; j < stroke.points.length; j++) {
      const dx = stroke.points[j]!.x - stroke.points[j - 1]!.x;
      const dy = stroke.points[j]!.y - stroke.points[j - 1]!.y;
      pathLen += Math.sqrt(dx * dx + dy * dy);
    }

    const avgWidth = stroke.points.reduce((s, p) => s + p.width, 0) / stroke.points.length;
    const begin = `${stroke.delay.toFixed(3)}s`;

    if (pathLen === 0) {
      // Single-point stroke (dot): render as a shape that fades in
      const p = stroke.points[0]!;
      const size = Math.max(avgWidth, 0.5);
      elements.push(`  ${dotElement(String(p.x), String(p.y), size, 'currentColor', lineCap)} opacity="0">
    <animate attributeName="opacity" from="0" to="1" dur="${stroke.animationDuration.toFixed(3)}s" begin="${begin}" fill="freeze"/>
  </${lineCap === 'round' ? 'circle' : 'rect'}>`);
    } else {
      elements.push(`  <path d="${d}" fill="none" stroke="currentColor" stroke-width="${Math.max(avgWidth, 0.5).toFixed(1)}" stroke-linecap="${lineCap}" stroke-linejoin="round"
    stroke-dasharray="${pathLen.toFixed(1)}" stroke-dashoffset="${pathLen.toFixed(1)}" opacity="0">
    <animate attributeName="opacity" from="0" to="1" dur="0.001s" begin="${begin}" fill="freeze"/>
    <animate attributeName="stroke-dashoffset" from="${pathLen.toFixed(1)}" to="0" dur="${stroke.animationDuration.toFixed(3)}s" begin="${begin}" fill="freeze"/>
  </path>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="${vx} ${vy} ${vw} ${vh}">
${elements.join('\n')}
</svg>`;
}
