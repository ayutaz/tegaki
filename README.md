# Tegaki

**Handwriting animation for any font**

Tegaki (手書き) turns any font into animated handwriting.
No manual path authoring. No native dependencies. Just pick a font.

[![npm](https://img.shields.io/npm/v/tegaki)](https://www.npmjs.com/package/tegaki)
[![license](https://img.shields.io/npm/l/tegaki)](https://github.com/KurtGokhan/tegaki/blob/main/LICENSE)

<br clear="both" />

<p align="center">
  <img src="media/hello-world.svg" alt="Hello World handwriting animation" width="500" />
</p>

---

## Quick Start

**1. Install**

```bash
npm install tegaki
```

**2. Use** (React example)

```tsx
import { TegakiRenderer } from 'tegaki';
import kana from 'tegaki/fonts/ja-kana';

function App() {
  return (
    <TegakiRenderer font={kana} style={{ fontSize: '48px' }}>
      ありがとう
    </TegakiRenderer>
  );
}
```

That's it. The text draws itself stroke by stroke with natural timing.

> This fork is **Japanese-first**: the defaults across the generator CLI,
> the interactive preview app, and the live demos assume hiragana / katakana
> / kanji workloads. Latin cursive fonts (Caveat, Italianno, Tangerine,
> Parisienne) stay available under their own `tegaki/fonts/<name>` subpaths.

## Framework Support

Tegaki works with all major frameworks:

```tsx
import { TegakiRenderer } from 'tegaki/react';   // React
import { TegakiRenderer } from 'tegaki/svelte';  // Svelte
import { TegakiRenderer } from 'tegaki/vue';     // Vue
import { TegakiRenderer } from 'tegaki/solid';   // SolidJS
```

```astro
---
import TegakiRenderer from 'tegaki/astro';       // Astro
---
```

```ts
import { TegakiEngine } from 'tegaki/core';      // Vanilla JS
import { registerTegakiElement } from 'tegaki/wc'; // Web Components
```

## Built-in Fonts

Five handwriting bundles are shipped:

- **Noto Sans JP — ja-kana** — `tegaki/fonts/ja-kana` ★ Japanese-first default, 180 hiragana + katakana with KanjiVG stroke order + Sigma-Lognormal rhythm
- **Caveat** — `tegaki/fonts/caveat`
- **Italianno** — `tegaki/fonts/italianno`
- **Tangerine** — `tegaki/fonts/tangerine`
- **Parisienne** — `tegaki/fonts/parisienne`

For kanji or other fonts, use the [interactive generator](https://gkurt.com/tegaki/generator/) to create a custom bundle (pass `--dataset kanjivg --rhythm lognormal` for authoritative Japanese output).

## Japanese (日本語)

Tegaki ships a pre-built bundle for all 180 hiragana and katakana with **correct MEXT stroke order** (via [KanjiVG](https://kanjivg.tagaini.net/)) and **natural non-uniform pen speed** (via the Plamondon Sigma-Lognormal rhythm):

```tsx
import { TegakiRenderer } from 'tegaki';
import kana from 'tegaki/fonts/ja-kana';

<TegakiRenderer font={kana} style={{ fontSize: '96px' }}>
  ありがとう
</TegakiRenderer>
```

The bundle is 217 KB (97 KB subsetted Noto Sans JP + 120 KB stroke data). Kanji support is opt-in at generate time via `--dataset kanjivg` — see the [Japanese guide](https://gkurt.com/tegaki/guides/japanese/) for coverage, license (CC-BY-SA 3.0 on the stroke data), and known limitations.

## Documentation

Visit **[gkurt.com/tegaki](https://gkurt.com/tegaki)** for full documentation:

- [Getting Started](https://gkurt.com/tegaki/getting-started/)
- [Framework Guides](https://gkurt.com/tegaki/frameworks/react/) (React, Svelte, Vue, SolidJS, Astro, Web Components, Vanilla)
- [Generating Fonts](https://gkurt.com/tegaki/guides/generating/)
- [API Reference](https://gkurt.com/tegaki/api/renderer/)

## License

[MIT](LICENSE)
