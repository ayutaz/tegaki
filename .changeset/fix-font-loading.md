---
'tegaki': minor
---

Rework font loading and improve defaults

- **Breaking**: Remove `registerFontFace()` from `TegakiBundle`. Font registration is now handled internally by `TegakiRenderer` via the FontFace API.
- Add `fontFaceCSS` property to `TegakiBundle` for SSR/stylesheet-based font loading.
- Export `ensureFontFace()` utility for manually preloading a bundle's font.
- Fix font layout being calculated with wrong font metrics when switching fonts or when the font isn't loaded yet.
- Enable `pressureWidth` effect by default.
- Handle non-JS environments (SSR) more gracefully.
