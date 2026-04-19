---
'tegaki': minor
'tegaki-generator': minor
---

Add Japanese language support.

- **New pre-built bundle** `tegaki/fonts/ja-kana` covering all 180 hiragana and katakana codepoints (97 KB subsetted Noto Sans JP + 120 KB stroke data = 217 KB total).
- **Generator**: new `--dataset kanjivg` and `--rhythm lognormal` flags. When set, CJK characters use KanjiVG's MEXT-standard stroke order instead of the heuristic skeletonizer, and each stroke's velocity profile is shaped by a Plamondon Sigma-Lognormal model with per-endpoint modulation (止め / 跳ね / 払い / 点).
- **Renderer**: new exports under `tegaki/core` — `remapTime`, `strokeParams`, `lognormalCDF`, `erf`, `erfinv`, `sampleLognormalPause`, plus evaluation helpers (`velocitySNR`, `peakSpeedRatio`, `empiricalSkewness`, `ksDistance`, `summariseMOS`).
- **New workspace package** `@tegaki/dataset-cjk-kanjivg` (CC-BY-SA 3.0) ships the KanjiVG stroke data isolated from the MIT core. `getKanjiSvg`, `hasKanji`, `listCodepoints` form the lookup API. A `fix-overrides.json` escape hatch lets contributors correct upstream KanjiVG errors without patching the pinned tarball.
- **Back-compat**: the defaults are unchanged (`rhythm=constant`, no dataset). Existing Caveat / Italianno / Tangerine / Parisienne bundles are bit-for-bit identical to the previous release.

Docs: [Japanese guide](https://ayutaz.github.io/tegaki/guides/japanese/). Examples: `examples/react-ja`, `examples/astro-ja`.
