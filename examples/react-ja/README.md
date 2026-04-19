# @tegaki/example-react-ja

Minimal React + Vite demo of Japanese handwriting animation powered by `tegaki/fonts/ja-kana`.

```bash
bun install                    # from the monorepo root
bun --filter @tegaki/example-react-ja dev
```

What it shows:

- Pre-built kana bundle with KanjiVG stroke order + Plamondon Sigma-Lognormal rhythm
- Phrase switcher, speed slider, loop toggle
- Works out-of-the-box with any Tegaki renderer option (`time`, `style`, effects)

Edit `src/App.tsx` to change the defaults.
