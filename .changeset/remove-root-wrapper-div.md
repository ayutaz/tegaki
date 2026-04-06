---
'tegaki': minor
---

Remove extra wrapper div from TegakiRenderer DOM output. The engine now uses the adapter's container element directly as its root (`data-tegaki="root"`), eliminating a redundant nested div. This fixes CSS-controlled animations where styles applied to the `<TegakiRenderer>` component (like `animation-timeline`) weren't reaching the engine's root element. `renderElements` now returns `{ rootProps, content }` instead of a single element tree.
