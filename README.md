<p align="center">
  <img src="media/tegaki-card.png" alt="Tegaki" width="640" />
</p>

<h3 align="center">Handwriting animation for any font</h3>

<p align="center">
  Tegaki (手書き) generates stroke data from fonts and renders animated handwriting in React.<br />
  No manual path authoring. No native dependencies. Just pick a font.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/tegaki"><img src="https://img.shields.io/npm/v/tegaki" alt="npm" /></a>
  <a href="https://github.com/KurtGokhan/tegaki/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/tegaki" alt="license" /></a>
</p>

---

## How it works

**1. Generate** a font bundle from any Google Font (or a local `.ttf`):

```bash
npx tegaki-generator generate "Caveat"
```

Each glyph is run through a processing pipeline — flatten bezier curves, rasterize, skeletonize via Zhang-Suen thinning, trace polylines, compute stroke widths via distance transform, determine stroke order — and the result is a set of animated SVGs with timing data.

**2. Render** the animated text in React:

```tsx
import { TegakiRenderer } from 'tegaki';
import font from './output/caveat/bundle.ts';

await font.registerFontFace();

function App() {
  return (
    <TegakiRenderer font={font} style={{ fontSize: '48px' }}>
      Hello World
    </TegakiRenderer>
  );
}
```

The text draws itself stroke by stroke, with accurate widths and natural timing.

## Install

```bash
npm install tegaki
```

The generator is a separate package, only needed at build time:

```bash
npm install -D tegaki-generator
```

## Built-in fonts

Tegaki ships with pre-generated bundles for four Google Fonts, ready to use without running the generator:

- **Caveat** — `tegaki/fonts/caveat`
- **Italianno** — `tegaki/fonts/italianno`
- **Tangerine** — `tegaki/fonts/tangerine`
- **Parisienne** — `tegaki/fonts/parisienne`

```tsx
import { TegakiRenderer } from 'tegaki';
import caveat from 'tegaki/fonts/caveat';

await caveat.registerFontFace();

function App() {
  return (
    <TegakiRenderer font={caveat} style={{ fontSize: '48px' }}>
      Hello World
    </TegakiRenderer>
  );
}
```

These bundles include all printable ASCII characters (letters, digits, punctuation). For other fonts, use the generator.

All bundled fonts are licensed under the [SIL Open Font License](https://openfontlicense.org/). See [FONTS-LICENSE.md](packages/renderer/FONTS-LICENSE.md) for full attribution.

## `<TegakiRenderer>` props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `font` | `TegakiBundle` | — | Font bundle with animated glyph SVGs |
| `text` | `string` | — | Text to animate (or pass as `children`) |
| `children` | `string \| number` | — | Text content, coerced to string |
| `time` | `TimeControlProp` | — | Time control mode (see below) |
| `onComplete` | `() => void` | — | Called when animation reaches the end |
| `mode` | `'svg' \| 'canvas'` | `'svg'` | Rendering mode |
| `showOverlay` | `boolean` | `false` | Show debug text overlay |

Plus all standard `<div>` props (`className`, `style`, etc.).

### Time control modes

The `time` prop accepts three modes via a discriminated union:

| Value | Mode | Description |
|-------|------|-------------|
| *omitted* | Uncontrolled | Auto-plays with default settings |
| `number` | Controlled | Shorthand for `{ mode: 'controlled', value: n }` |
| `'css'` | CSS | Shorthand for `{ mode: 'css' }` |
| `{ mode: 'controlled', value }` | Controlled | You drive the time directly |
| `{ mode: 'uncontrolled', ... }` | Uncontrolled | Component manages playback |
| `{ mode: 'css' }` | CSS | Driven by `--tegaki-progress` CSS property |

#### Uncontrolled

The component manages its own playback — auto-plays on mount, responds to `speed`, `playing`, and `loop`.

```tsx
// Default: auto-play at 1x
<TegakiRenderer font={font}>Hello</TegakiRenderer>

// With options
<TegakiRenderer font={font} time={{ mode: 'uncontrolled', speed: 2, loop: true }}>
  Hello
</TegakiRenderer>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `initialTime` | `number` | `0` | Starting time in seconds |
| `speed` | `number` | `1` | Playback speed multiplier |
| `playing` | `boolean` | `true` | Whether animation is playing |
| `loop` | `boolean` | `false` | Restart when animation ends |
| `onTimeChange` | `(time: number) => void` | — | Called each frame with current time |

#### Controlled

You provide the exact time. Useful for syncing with a slider, streaming text, or external state.

```tsx
<TegakiRenderer font={font} time={currentTime}>Hello</TegakiRenderer>
```

#### CSS

Animation progress is driven by the `--tegaki-progress` CSS custom property (0–1). This enables pure-CSS control via animations, transitions, or scroll-timeline — no JS bridge needed.

```tsx
<TegakiRenderer font={font} time="css" style={...}>Hello</TegakiRenderer>
```

```css
/* Example: scroll-driven animation */
.scroll-container {
  overflow-x: scroll;
  scroll-timeline: --tegaki inline;
}

.tegaki-wrapper {
  animation: tegaki-reveal linear both;
  animation-timeline: --tegaki;
}

@keyframes tegaki-reveal {
  from { --tegaki-progress: 0; }
  to   { --tegaki-progress: 1; }
}
```

### CSS custom properties

The component exposes these CSS custom properties on its root element in all modes:

| Property | Direction | Description |
|----------|-----------|-------------|
| `--tegaki-duration` | Output | Total animation length in seconds |
| `--tegaki-time` | Output | Current time in seconds |
| `--tegaki-progress` | Input (CSS mode) / Output | Current progress (0–1) |

All three are registered via `CSS.registerProperty` as `<number>` with `inherits: true`, making them animatable and transitionable.

### `computeTimeline(text, font)`

Returns timing info for a string without rendering anything:

```ts
import { computeTimeline } from 'tegaki';

const { entries, totalDuration } = computeTimeline('Hello', font);
// totalDuration: 2.45 (seconds)
// entries: [{ char: 'H', offset: 0, duration: 0.52, hasSvg: true }, ...]
```

## Generating font bundles

```bash
npx tegaki-generator generate [family] [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `family` | Google Fonts family name | `Caveat` |
| `-o, --output` | Output directory | `output/<family>` |
| `-r, --resolution` | Bitmap resolution for skeletonization | `400` |
| `-c, --chars` | Characters to process | printable ASCII |
| `-f, --force` | Re-download cached font | `false` |
| `-d, --debug` | Write intermediate visualizations | `false` |
| `-l, --lineCap` | Stroke cap style (`auto`/`round`/`butt`/`square`) | `auto` |
| `--skeletonMethod` | Algorithm (`zhang-suen` / `guo-hall` / `lee` / `medial-axis` / `thin` / `voronoi`) | `zhang-suen` |

Output structure:

```
output/caveat/
  font.json        # Full glyph data (coordinates, strokes, timing)
  caveat.ttf       # Original font file
  bundle.ts        # Import this in your app
  svg/
    A.svg          # Animated SVG per glyph
    A.tsx          # React component per glyph
    ...
```

Import `bundle.ts` — it bundles all glyph components and font metadata into a `TegakiBundle`.

## Pipeline

The entire processing pipeline is pure TypeScript — no canvas, no native image libraries, no Python. It runs identically in Node/Bun and in the browser.

```
Font file
  → Flatten bezier curves to polylines
  → Rasterize to binary bitmap (scanline fill, nonzero winding)
  → Skeletonize to 1px-wide skeleton (Zhang-Suen thinning)
  → Trace skeleton into polylines (spur pruning + RDP simplification)
  → Compute stroke width at each point (distance transform)
  → Order strokes top-to-bottom, left-to-right
  → Generate animated SVG with per-stroke timing
```

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`tegaki`](packages/renderer) | [![npm](https://img.shields.io/npm/v/tegaki)](https://www.npmjs.com/package/tegaki) | React component for animated handwriting |
| [`tegaki-generator`](packages/generator) | [![npm](https://img.shields.io/npm/v/tegaki-generator)](https://www.npmjs.com/package/tegaki-generator) | CLI that generates font bundles |
| [`@tegaki/website`](packages/website) | — | Interactive preview app |

## Contributing

```bash
bun install          # Install dependencies
bun dev              # Start dev server (website)
bun start            # Run the CLI (generator)
bun checks           # Lint + typecheck + tests
```

## License

[MIT](LICENSE)
