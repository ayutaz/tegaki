import { type ComponentProps, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { TegakiBundle } from '../types.ts';
import { drawGlyph } from './drawGlyph.ts';
import { computeTextLayout } from './textLayout.ts';
import type { TimelineEntry } from './timeline.ts';
import { computeTimeline } from './timeline.ts';
import type { Coercible } from './utils.ts';
import { coerceToString, graphemes } from './utils.ts';

// --- Props ---

export interface TegakiRendererProps extends Omit<ComponentProps<'div'>, 'children'> {
  /** TegakiBundle with font data and animated glyph SVGs. */
  font?: TegakiBundle;

  /** Text to animate. Takes precedence over children. */
  text?: string;

  /** Children coerced to string. Strings and numbers are kept; everything else is ignored. */
  children?: Coercible;

  /**
   * Controlled time in seconds. When provided, the component uses this value
   * directly and does not manage its own playback.
   */
  time?: number;

  /** Initial time for uncontrolled mode. Default: `0` */
  defaultTime?: number;

  /** Playback speed multiplier (uncontrolled mode). Default: `1` */
  speed?: number;

  /** Whether animation is playing (uncontrolled mode). Default: `true` */
  playing?: boolean;

  /** Loop animation when it reaches the end (uncontrolled mode). Default: `false` */
  loop?: boolean;

  /** Called on every frame with the current time in uncontrolled mode. */
  onTimeChange?: (time: number) => void;

  /** Called once when the animation reaches the end of the timeline. */
  onComplete?: () => void;

  /** Rendering mode. `'svg'` uses animated SVG elements, `'canvas'` draws strokes
   * on a `<canvas>` (requires `font.glyphData`). Default: `'svg'` */
  mode?: 'svg' | 'canvas';

  /** Show debug text overlay. */
  showOverlay?: boolean;
}

// --- Component ---

export function TegakiRenderer({
  font,
  text,
  children,
  time: controlledTime,
  defaultTime = 0,
  speed = 1,
  playing = true,
  loop = false,
  onTimeChange,
  onComplete,
  mode = 'svg',
  showOverlay,
  ...props
}: TegakiRendererProps) {
  const resolvedText = text ?? coerceToString(children);
  const isControlled = controlledTime !== undefined;

  // --- Internal time (uncontrolled mode) ---
  const [internalTime, setInternalTime] = useState(defaultTime);
  const currentTime = isControlled ? controlledTime : internalTime;

  // Stable callback refs to avoid restarting the rAF loop
  const onTimeChangeRef = useRef(onTimeChange);
  onTimeChangeRef.current = onTimeChange;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // --- Font-derived constants ---
  const fontFamily = font?.family;
  const emHeight = font ? (font.ascender - font.descender) / font.unitsPerEm : 0;
  const baselineOffset = font ? font.descender / font.unitsPerEm : 0;

  // --- Container measurement ---
  const rootRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [fontSize, setFontSize] = useState(0);
  const [lineHeight, setLineHeight] = useState(0);

  // --- Timeline ---
  const timeline = useMemo(
    () => (font && resolvedText ? computeTimeline(resolvedText, font) : { entries: [] as TimelineEntry[], totalDuration: 0 }),
    [resolvedText, font],
  );

  // Duration ref so the rAF loop always sees the latest value without restarting
  const totalDurationRef = useRef(timeline.totalDuration);
  totalDurationRef.current = timeline.totalDuration;

  // --- Completion tracking ---
  const prevCompletedRef = useRef(false);
  const isComplete = timeline.totalDuration > 0 && currentTime >= timeline.totalDuration;

  useEffect(() => {
    if (isComplete && !prevCompletedRef.current) {
      prevCompletedRef.current = true;
      onCompleteRef.current?.();
    } else if (!isComplete) {
      prevCompletedRef.current = false;
    }
  });

  // --- Uncontrolled: time change notification ---
  useEffect(() => {
    if (!isControlled) {
      onTimeChangeRef.current?.(internalTime);
    }
  }, [internalTime, isControlled]);

  // --- Uncontrolled: rAF playback loop ---
  useEffect(() => {
    if (isControlled || !playing || !font) return;

    let lastTs: number | null = null;
    let raf: number;

    const tick = (ts: number) => {
      if (lastTs === null) lastTs = ts;
      const delta = ((ts - lastTs) / 1000) * speed;
      lastTs = ts;

      setInternalTime((prev) => {
        const totalDur = totalDurationRef.current;
        if (totalDur === 0 || (!loop && prev >= totalDur)) return prev;
        let next = prev + delta;
        if (next >= totalDur) {
          next = loop ? next % totalDur : totalDur;
        }
        return next;
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isControlled, playing, speed, loop, font]);

  // --- SVG refs ---
  const svgRefs = useRef(new Map<number, SVGSVGElement>());

  // Stable ref callback factory — only stores/removes the node, no time sync
  const makeSvgRef = useCallback(
    (charIdx: number) => (node: SVGSVGElement | null) => {
      if (node) {
        node.pauseAnimations();
        svgRefs.current.set(charIdx, node);
      } else {
        svgRefs.current.delete(charIdx);
      }
    },
    [],
  );

  // Cache ref callbacks so React doesn't see a new function each render
  const svgRefCallbacks = useRef(new Map<number, (node: SVGSVGElement | null) => void>());
  const getSvgRef = useCallback(
    (charIdx: number) => {
      let cb = svgRefCallbacks.current.get(charIdx);
      if (!cb) {
        cb = makeSvgRef(charIdx);
        svgRefCallbacks.current.set(charIdx, cb);
      }
      return cb;
    },
    [makeSvgRef],
  );

  // Clear stale SVG refs when font changes so useLayoutEffect doesn't set time on old elements
  const prevFontRef = useRef(font);
  if (prevFontRef.current !== font) {
    prevFontRef.current = font;
    svgRefs.current.clear();
    svgRefCallbacks.current.clear();
  }

  // --- Container size observation ---
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerWidth(entry.contentRect.width);
        const styles = getComputedStyle(el);
        setFontSize(Number.parseFloat(styles.fontSize));
        setLineHeight(Number.parseFloat(styles.lineHeight));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sentinel element ref — a hidden child with `font-size: inherit` and a near-zero
  // CSS transition. When any ancestor changes font-size, the transition fires an event
  // so we can read the new value without polling getComputedStyle every render.
  const sentinelRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const onTransition = (e: TransitionEvent) => {
      if (e.propertyName === 'font-size' || e.propertyName === 'line-height') {
        const styles = getComputedStyle(el);
        setFontSize(Number.parseFloat(styles.fontSize));
        setLineHeight(Number.parseFloat(styles.lineHeight));
      }
    };
    el.addEventListener('transitionend', onTransition);
    return () => el.removeEventListener('transitionend', onTransition);
  }, []);

  // --- Text layout ---
  const layout = useMemo(() => {
    if (!fontFamily || !fontSize || !lineHeight || !containerWidth || !resolvedText) return null;
    return computeTextLayout(resolvedText, fontFamily, fontSize, lineHeight, containerWidth);
  }, [resolvedText, fontFamily, fontSize, lineHeight, containerWidth]);

  // --- Sync SVG glyph times before paint ---
  // Runs every render so SVGs stay correct even when currentTime hasn't changed
  // (e.g. after pausing, or when ref callbacks re-fire due to re-renders).
  useLayoutEffect(() => {
    if (mode !== 'svg') return;
    const entries = timeline.entries;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      if (!entry.hasSvg) continue;
      const svg = svgRefs.current.get(i);
      if (!svg) continue;
      const localTime = Math.max(0, Math.min(currentTime - entry.offset, entry.duration));
      svg.setCurrentTime(localTime);
    }
  });

  // --- Canvas rendering ---
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (mode !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas || !font?.glyphData || !layout || !fontSize) return;

    const dpr = window.devicePixelRatio || 1;
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    // Resize canvas backing store if needed
    const needsResize = canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr);
    if (needsResize) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Read currentColor from the container
    const color = getComputedStyle(el).color;

    const emHeightPx = emHeight * fontSize;
    const halfLeading = (lineHeight - emHeightPx) / 2;
    const characters = graphemes(resolvedText);

    let y = 0;
    for (const lineIndices of layout.lines) {
      let x = 0;
      for (const charIdx of lineIndices) {
        const char = characters[charIdx]!;
        if (char === '\n') continue;
        const entry = timeline.entries[charIdx]!;
        const charWidth = layout.charWidths[charIdx] ?? 0;
        const kerning = layout.kernings[charIdx] ?? 0;
        const glyph = font.glyphData[char];

        if (glyph && entry.hasSvg) {
          const localTime = Math.max(0, Math.min(currentTime - entry.offset, entry.duration));
          const glyphY = y + halfLeading;
          drawGlyph(
            ctx,
            glyph,
            {
              x,
              y: glyphY,
              fontSize,
              unitsPerEm: font.unitsPerEm,
              ascender: font.ascender,
              descender: font.descender,
            },
            localTime,
            font.lineCap,
            color,
          );
        } else if (!entry.hasSvg && currentTime >= entry.offset + entry.duration) {
          ctx.save();
          ctx.font = `${fontSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          ctx.textBaseline = 'alphabetic';
          const baseline = y + halfLeading + (font.ascender / font.unitsPerEm) * fontSize;
          ctx.fillText(char, x, baseline);
          ctx.restore();
        }

        x += (charWidth + kerning) * fontSize;
      }
      y += lineHeight;
    }
  }, [mode, currentTime, timeline, layout, font, fontFamily, fontSize, lineHeight, resolvedText, emHeight]);

  // --- Rendering ---

  if (!font || !resolvedText) {
    return <div ref={rootRef} {...props} />;
  }

  const characters = graphemes(resolvedText);

  const renderGlyph = (charIdx: number) => {
    const char = characters[charIdx]!;
    const entry = timeline.entries[charIdx]!;
    const GlyphSvg = font.glyphs[char] as any;
    const width = layout?.charWidths[charIdx] ?? 1;
    const kerning = layout?.kernings[charIdx];

    if (char === '\n') return null; // newlines handled by line structure

    if (GlyphSvg) {
      return (
        <GlyphSvg
          key={charIdx}
          ref={getSvgRef(charIdx)}
          style={{
            display: 'inline-block',
            verticalAlign: `${baselineOffset}em`,
            width: `${width}em`,
            marginRight: kerning ? `${kerning}em` : undefined,
            height: `${emHeight}em`,
            overflow: 'visible',
          }}
        />
      );
    }

    const isVisible = currentTime >= entry.offset + entry.duration;
    return (
      <span style={{ fontFamily, visibility: isVisible ? 'visible' : 'hidden' }} key={charIdx}>
        {char}
      </span>
    );
  };

  const lineElements = layout
    ? layout.lines.map((lineIndices, lineIdx) => {
        const isEmpty = lineIndices.every((i) => characters[i] === '\n');
        return (
          <div style={{ whiteSpace: 'nowrap', height: isEmpty ? '1lh' : undefined, lineHeight: `${lineHeight}px` }} key={lineIdx}>
            {lineIndices.map(renderGlyph)}
          </div>
        );
      })
    : // Fallback before layout is ready: single line
      characters.length > 0 && <div style={{ whiteSpace: 'nowrap' }}>{characters.map((_, i) => renderGlyph(i))}</div>;

  return (
    <div
      ref={rootRef}
      {...props}
      style={{
        ...props.style,
        position: 'relative',
        maxWidth: '100%',
        width: 'auto',
        height: 'auto',
      }}
    >
      {/* Sentinel: inherits font-size & line-height; its height changes when either changes */}
      <span
        ref={sentinelRef}
        aria-hidden
        style={{
          position: 'absolute',
          width: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          visibility: 'hidden',
          transition: 'font-size 0.001s, line-height 0.001s',
        }}
      >
        {'\u00A0'}
      </span>
      {mode === 'canvas' ? (
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            fontFamily,
          }}
        >
          {lineElements}
        </div>
      )}

      <div
        style={{
          userSelect: 'auto',
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          paddingRight: 1,
          WebkitTextFillColor: showOverlay ? undefined : 'transparent',
          fontFamily,
          color: showOverlay ? 'rgba(255, 0, 0, 0.4)' : undefined,
          fontFeatureSettings: "'calt' 0, 'liga' 0",
        }}
      >
        {resolvedText}
      </div>
    </div>
  );
}
