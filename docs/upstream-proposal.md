# Upstream proposal template

Use this as the body of a GitHub Discussion at
[KurtGokhan/tegaki](https://github.com/KurtGokhan/tegaki/discussions) (or an
issue, if Discussions are not enabled) to gauge interest in merging the
Japanese-support work upstream. The text is intentionally phrased to make it
easy for the maintainer to say "yes / no / not in this shape" without having
to re-read the entire fork.

---

**Title**: Proposal — add Japanese (kana + KanjiVG kanji) support as an opt-in

Hi @KurtGokhan, thanks for Tegaki — the framework-agnostic renderer + the in-browser generator make it very easy to slot handwriting animation into real products. I've been maintaining a fork at [ayutaz/tegaki](https://github.com/ayutaz/tegaki) that adds Japanese language support, and I'd love to know whether you'd be open to upstreaming the changes (in whole or in part).

### What the fork adds

- A new pre-built bundle `tegaki/fonts/ja-kana` covering all 180 hiragana and katakana codepoints (97 KB subsetted Noto Sans JP + 120 KB stroke data = 217 KB total).
- Generator flags `--dataset kanjivg` and `--rhythm {constant|lognormal}`. When set, CJK characters are dispatched to a [KanjiVG](https://kanjivg.tagaini.net/)-backed Stage 4 that preserves the MEXT stroke order. A Plamondon Sigma-Lognormal rhythm model shapes each stroke's speed profile with per-endpoint modulation (tome / hane / harai / dot).
- A separate workspace package `@tegaki/dataset-cjk-kanjivg` that isolates the **CC-BY-SA 3.0** KanjiVG data from the MIT core. Installing it is an explicit opt-in.
- Five evaluation metrics under `tegaki/core` (`velocitySNR`, `peakSpeedRatio`, `empiricalSkewness`, `ksDistance`, `summariseMOS`) for measuring rhythm naturalness — handy for anyone tuning a non-Latin extension in the future.
- Fresh docs + `examples/react-ja`, `examples/astro-ja`.

### Scope of design docs

All design/requirements/validation docs live in [`docs/`](https://github.com/ayutaz/tegaki/tree/main/docs) — the ones most relevant for review are:

- `docs/japanese-support.md` — design rationale (why KanjiVG + Sigma-Lognormal, why the dataset is isolated)
- `docs/requirements.md` — functional + non-functional requirements
- `docs/technical-validation.md` — numerical checks on the KanjiVG parse, coord mapping, and Plamondon equations
- `docs/tickets/phase-{1..8}-*.md` — per-phase tickets with acceptance criteria and ground-up redesign alternatives

### Compatibility / impact

- Back-compat: `rhythm` defaults to `'constant'` and no dataset is read unless opted in. The four bundled fonts (Caveat / Italianno / Tangerine / Parisienne) are bit-identical to the previous release.
- Package licences: `tegaki`, `tegaki-generator`, `@tegaki/website` stay MIT. Only `@tegaki/dataset-cjk-kanjivg` is CC-BY-SA 3.0.
- Runtime dependencies added to the generator: `@xmldom/xmldom` (MIT, ~50 KB) for KanjiVG SVG parsing. The renderer gains no new runtime deps.

### Possible paths forward

1. **Merge as-is**: five small sequenced PRs (Phase 1–2 scaffolding, Phase 3 integration, Phase 4 kana bundle, Phase 5 rhythm, Phase 7 docs). Phase 6's evaluation tooling can land alongside Phase 5 or separately.
2. **Merge a subset**: e.g. ship only the Sigma-Lognormal rhythm engine (Phase 5), which is generically useful for Latin handwriting too, and leave KanjiVG integration for a downstream package.
3. **Stay downstream**: I'd publish the fork as `@ayutaz/tegaki-ja` on npm (still MIT) + keep `@tegaki/dataset-cjk-kanjivg` (CC-BY-SA) as an explicit dependency. I'll happily mention your repo as the upstream.
4. **Somewhere in between** — happy to rework any of the above based on your preference.

### Specific questions

- Are you comfortable with a workspace-isolated CC-BY-SA 3.0 package living inside this monorepo, assuming the main `tegaki` package stays MIT?
- Is a new `--rhythm lognormal` flag in scope for `tegaki-generator`, or would you prefer the rhythm model to live behind a different extension point?
- If you'd like to see a proof-of-concept PR before deciding, which phase would you want to see first?

Happy to open any of the PRs at your convenience. Thanks again for the lovely library.

---

**Attachments** (optional, paste into the Discussion body or link):

- Screen recording of `ありがとう` rendered with `rhythm=lognormal` vs `rhythm=constant`
- A curated screenshot set from `docs/validation-urls.md` showing 筆順 correctness for 右 / 田 / 必
- Bundle-size table before and after (pre-built fonts, dataset package, examples)
