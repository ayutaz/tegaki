import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';
import { type ComponentProps, type CSSProperties, type ReactElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { twJoin } from 'tailwind-merge';
import type { TegakiBundle } from '../types.ts';

const GLYPH_GAP = 0.1;

// --- Children coercion ---

type Coercible = string | number | boolean | null | undefined | readonly Coercible[];

function coerceToString(value: unknown): string {
  if (value == null || typeof value === 'boolean') return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) return value.map(coerceToString).join('');
  return '';
}

// --- Timeline ---

interface TimelineEntry {
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
  const chars = text.split('');
  const entries: TimelineEntry[] = [];
  let offset = 0;
  for (const char of chars) {
    const hasSvg = char in font.glyphs;
    const duration = hasSvg ? (font.glyphTimings[char] ?? 1) : 0;
    entries.push({ char, offset, duration, hasSvg });
    offset += duration;
    if (hasSvg) offset += GLYPH_GAP;
  }
  // Remove trailing gap
  if (entries.length > 0 && entries[entries.length - 1]!.hasSvg) {
    offset -= GLYPH_GAP;
  }
  return { entries, totalDuration: Math.max(0, offset) };
}

// --- Text Layout ---

interface TextLayout {
  /** Character indices per line */
  lines: number[][];
  /** Width in em per character index */
  charWidths: number[];
  /** Kerning adjustment in em between character at index i and i+1 */
  kernings: number[];
  /** Intrinsic (single-line) width in em */
  intrinsicWidth: number;
}

function computeTextLayout(text: string, fontFamily: string, fontSize: number, maxWidth: number): TextLayout {
  const fontStr = `${fontSize}px ${fontFamily}`;
  const lineHeight = fontSize * 1.4;

  // Measure unique character widths
  const widthCache = new Map<string, number>();
  const charWidths: number[] = [];
  for (const char of text) {
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

  // Map line texts back to character indices
  const lines: number[][] = [];
  let charOffset = 0;
  for (const line of result.lines) {
    const indices: number[] = [];
    for (let i = 0; i < line.text.length; i++) {
      indices.push(charOffset + i);
    }
    charOffset += line.text.length;
    // Consume the newline that caused this line break
    if (charOffset < text.length && text[charOffset] === '\n') {
      indices.push(charOffset);
      charOffset++;
    }
    lines.push(indices);
  }

  // Any remaining characters (shouldn't happen, but safety)
  if (charOffset < text.length) {
    const indices: number[] = [];
    for (let i = charOffset; i < text.length; i++) {
      indices.push(i);
    }
    lines.push(indices);
  }

  // Measure kerning between adjacent character pairs
  const kernings: number[] = [];
  const pairCache = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) {
    const a = text[i]!;
    const b = text[i + 1]!;
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

  // Clear stale SVG refs when font changes so useLayoutEffect doesn't set time on old elements
  const prevFontRef = useRef(font);
  if (prevFontRef.current !== font) {
    prevFontRef.current = font;
    svgRefs.current.clear();
  }

  // --- Container size observation ---
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) {
        setContainerWidth(entry.contentRect.width);
        setFontSize(Number.parseFloat(getComputedStyle(el).fontSize));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync fontSize when CSS changes (className/style) without triggering a resize
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const fs = Number.parseFloat(getComputedStyle(el).fontSize);
    if (fs !== fontSize) setFontSize(fs);
  });

  // --- Text layout ---
  const layout = useMemo(() => {
    if (!fontFamily || !fontSize || !containerWidth || !resolvedText) return null;
    return computeTextLayout(resolvedText, fontFamily, fontSize, containerWidth);
  }, [resolvedText, fontFamily, fontSize, containerWidth]);

  // --- Sync SVG current time before paint ---
  useLayoutEffect(() => {
    for (let i = 0; i < timeline.entries.length; i++) {
      const entry = timeline.entries[i]!;
      const svg = svgRefs.current.get(i);
      if (!svg || !entry.hasSvg) continue;
      const localTime = Math.max(0, Math.min(currentTime - entry.offset, entry.duration));
      svg.setCurrentTime(localTime);
    }
  }, [currentTime, timeline]);

  // --- Rendering ---

  if (!font || !resolvedText) {
    return <div ref={rootRef} {...props} />;
  }

  const characters = resolvedText.split('');

  const renderGlyph = (charIdx: number) => {
    const char = characters[charIdx]!;
    const entry = timeline.entries[charIdx]!;
    const GlyphSvg = font.glyphs[char] as any;
    const width = layout?.charWidths[charIdx] ?? 1;
    const kerning = layout?.kernings[charIdx];

    const style: CSSProperties = {
      width: `${width}em`,
      marginRight: kerning ? `${kerning}em` : undefined,
    };

    let content: ReactElement;

    if (char === '\n') {
      return null; // newlines handled by line structure
    }

    if (GlyphSvg) {
      content = (
        <GlyphSvg
          ref={(node: SVGSVGElement | null) => {
            if (node) {
              node.pauseAnimations();
              svgRefs.current.set(charIdx, node);
              const localTime = Math.max(0, Math.min(currentTime - entry.offset, entry.duration));
              node.setCurrentTime(localTime);
            } else {
              svgRefs.current.delete(charIdx);
            }
          }}
          style={{
            display: 'block',
            width: '100%',
            height: `${emHeight}em`,
            overflow: 'visible',
          }}
        />
      );
    } else {
      const isVisible = currentTime >= entry.offset;
      content = <span style={{ fontFamily, visibility: isVisible ? 'visible' : 'hidden' }}>{char}</span>;
    }

    return (
      <span style={{ display: 'inline-block', verticalAlign: `${baselineOffset}em`, ...style }} key={charIdx}>
        {content}
      </span>
    );
  };

  const lineElements = layout
    ? layout.lines.map((lineIndices, lineIdx) => {
        const isEmpty = lineIndices.every((i) => characters[i] === '\n');
        return (
          <div style={{ whiteSpace: 'nowrap', height: isEmpty ? '1lh' : undefined }} key={lineIdx}>
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
      className={twJoin('relative grid', props.className)}
      style={{
        ...props.style,
        maxWidth: '100%',
        width: 'auto',
        height: 'auto',
      }}
    >
      <div className="[grid-area:1/1] absolute inset-0 pointer-events-none" style={{ fontFamily }}>
        {lineElements}
      </div>

      <div
        className={twJoin(
          '[grid-area:1/1] select-auto whitespace-pre-wrap wrap-break-word pr-[1px]',
          !showOverlay && '[-webkit-text-fill-color:transparent]',
        )}
        style={{
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
