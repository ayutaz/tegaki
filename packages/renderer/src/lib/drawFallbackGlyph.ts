import { findEffect, findEffects, type ResolvedEffect } from './effects.ts';
import { resolveCSSLength } from './utils.ts';

/**
 * Draw a fallback glyph (plain text) with applicable effects (glow, rainbow, wobble).
 */
export function drawFallbackGlyph(
  ctx: CanvasRenderingContext2D,
  char: string,
  x: number,
  baseline: number,
  fontSize: number,
  fontFamily: string,
  color: string,
  effects: ResolvedEffect[] = [],
  seed = 0,
) {
  const glowEffects = findEffects(effects, 'glow');
  const wobbleEffect = findEffect(effects, 'wobble');
  const rainbowEffects = findEffects(effects, 'rainbow');

  // Wobble offsets
  let dx = 0;
  let dy = 0;
  if (wobbleEffect) {
    const amplitude = (wobbleEffect.config.amplitude ?? 1.5) * (fontSize / 100);
    const frequency = wobbleEffect.config.frequency ?? 8;
    dx = amplitude * Math.sin(frequency * (baseline * 0.01) + seed);
    dy = amplitude * Math.cos(frequency * (x * 0.01) + seed * 1.3);
  }

  const drawX = x + dx;
  const drawY = baseline + dy;

  // Rainbow color
  const fillColor =
    rainbowEffects.length > 0
      ? (() => {
          const effect = rainbowEffects[0]!;
          const saturation = effect.config.saturation ?? 80;
          const lightness = effect.config.lightness ?? 55;
          const hue = (seed * 137.5) % 360;
          return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        })()
      : color;

  ctx.save();
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textBaseline = 'alphabetic';

  // Glow passes
  for (const glow of glowEffects) {
    ctx.save();
    ctx.shadowBlur = resolveCSSLength(glow.config.radius ?? 8, fontSize);
    ctx.shadowColor = glow.config.color ?? color;
    ctx.fillStyle = glow.config.color ?? color;
    ctx.fillText(char, drawX, drawY);
    ctx.restore();
  }

  // Main text
  ctx.fillStyle = fillColor;
  ctx.fillText(char, drawX, drawY);

  ctx.restore();
}
