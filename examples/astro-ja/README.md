# @tegaki/example-astro-ja

Minimal Astro SSR demo of Japanese handwriting animation powered by `tegaki/fonts/ja-kana` and the `tegaki/astro` adapter.

```bash
bun install                      # from the monorepo root
bun --filter @tegaki/example-astro-ja dev
```

What it shows:

- `tegaki/astro` adapter rendering multiple Japanese phrases
- Pre-built kana bundle with KanjiVG stroke order + Plamondon Sigma-Lognormal rhythm
- Works out-of-the-box on Astro 6 with no additional configuration beyond the `tegaki@dev` import condition for workspace sources.

Edit `src/pages/index.astro` to change the phrases or styling.
