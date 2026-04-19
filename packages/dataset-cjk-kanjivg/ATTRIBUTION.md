# Attribution — KanjiVG

The SVG files under `kanjivg/` in this package are derived from the **KanjiVG
project** and are distributed under the **Creative Commons
Attribution-ShareAlike 3.0 Unported (CC-BY-SA 3.0)** license.

## Source

- Project page: https://kanjivg.tagaini.net/
- Repository:  https://github.com/KanjiVG/kanjivg
- Release:     `r20250816` (git SHA pinned; see [`src/constants.ts`](./src/constants.ts))
- Downloaded via: `bun scripts/fetch-kanjivg.ts`

## License

The KanjiVG SVG data is Copyright (C) 2009–2025 Ulrich Apel and KanjiVG
contributors, and is licensed under CC-BY-SA 3.0.

- License text: https://creativecommons.org/licenses/by-sa/3.0/legalcode
- See also [`./LICENSE`](./LICENSE) in this package.

## ShareAlike notice

Redistributions of this package, modifications to SVG content, or derivative
works containing these SVG files **must be distributed under CC-BY-SA 3.0 or a
compatible license** (see the
[CC Compatible Licenses list](https://creativecommons.org/compatiblelicenses/)).

The Tegaki project isolates this dataset in a dedicated workspace package —
`@tegaki/dataset-cjk-kanjivg` — so that the CC-BY-SA 3.0 share-alike obligation
does **not** propagate to the main `tegaki` (renderer) and `tegaki-generator`
packages, which remain under the **MIT License**.

Users who install `@tegaki/dataset-cjk-kanjivg` thereby opt in to the
CC-BY-SA 3.0 terms for the dataset portion only.

## Modifications to upstream

This package includes the SVG files **as-is** from upstream
`KanjiVG/kanjivg @ r20250816`, filtered to include only the characters listed
in [`scripts/allowlist.json`](./scripts/allowlist.json) (Jōyō kanji, Jinmeiyō
kanji, hiragana, katakana). Variant files (`*-Kaisho.svg`, `*-Jinmei.svg`,
etc.) and JIS levels 3/4 are excluded as out-of-scope for the first Japanese
release of Tegaki.

No edits are made to the SVG content: no `<path d="...">` coordinate, no
`kvg:element`, and no `kvg:type` attribute is modified.

## Citation

When you publish work (academic, commercial, or otherwise) that uses these
stroke-order animations, please cite:

> KanjiVG — Stroke order animations of the kanji.
> https://kanjivg.tagaini.net/  Ulrich Apel and contributors, 2009–2025.
