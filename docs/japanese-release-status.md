# Japanese support — release status

Summary of the 8-phase implementation laid out in
[`japanese-roadmap.md`](./japanese-roadmap.md), current state, and what to
run or send next. Each row links back to the ticket so reviewers can see the
acceptance criteria that were met.

## Phase status (as of merge of Phase 7)

| Phase | Ticket | State | Merge commit |
|---|---|---|---|
| 1 | [dataset package](./tickets/phase-1-dataset-package.md) | ✅ on `main` | `5a560f6` |
| 2 | [KanjiVG loader](./tickets/phase-2-kanjivg-loader.md) | ✅ on `main` | `3d8d0ed` |
| 3 | [pipeline integration](./tickets/phase-3-pipeline-integration.md) | ✅ on `main` | `0a356aa` |
| 4 | [ja-kana bundle](./tickets/phase-4-kana-bundle.md) | ✅ on `main` | `6b3098a` |
| 5 | [Sigma-Lognormal rhythm](./tickets/phase-5-rhythm-synthesis.md) | ✅ on `main` | `d2a9929` |
| 6 | [validation + tuning](./tickets/phase-6-validation.md) | ✅ on `main` (metrics + URL seed + fix-overrides) — MOS evaluation rounds **not yet run** | `37a46d2` |
| 7 | [docs + samples](./tickets/phase-7-docs-samples.md) | ✅ on `main` | `9058e56` |
| 8 | [release decision](./tickets/phase-8-release.md) | 🚧 in progress (this doc) | — |

## What's on `main` right now

Everything a user needs to render Japanese text is shipped:

- `tegaki/fonts/ja-kana` — 180-char pre-built bundle, 217 KB on disk, imported the same way as Caveat/Italianno/Tangerine/Parisienne.
- `tegaki-generator` `--dataset kanjivg` + `--rhythm lognormal` flags for generating custom bundles against arbitrary fonts.
- `@tegaki/dataset-cjk-kanjivg` (CC-BY-SA 3.0) with a `fix-overrides.json` escape hatch.
- `tegaki/core` exports for the Plamondon model (`erf` / `erfinv` / `lognormalCDF` / `remapTime` / `strokeParams` / `sampleLognormalPause`) and five evaluation metrics.
- Starlight [Japanese guide](../packages/website/src/content/docs/guides/japanese.mdx) and two runnable examples (`examples/react-ja`, `examples/astro-ja`).
- Root [`README.md`](../README.md) advertises the Japanese support with a quick-start snippet.

### Default behaviour is unchanged

- `rhythm` defaults to `'constant'`. No existing output changes unless the user opts in with `--rhythm lognormal`.
- No dataset is read unless `--dataset kanjivg` is set. Existing bundles (Caveat / Italianno / Tangerine / Parisienne) are bit-identical to the previous release.
- `@tegaki/dataset-cjk-kanjivg` is a separate workspace package; installing the main `tegaki` package does not pull it in transitively.

## What is still **not** done

Phase 6 delivered the tooling for evaluation. Evaluation itself is handled by the maintainer as a single-rater self-check — the release does **not** block on panel feedback from external evaluators. The metric functions and the 20-URL test set are there so the maintainer can re-verify quickly after any parameter change.

Remaining follow-ups (none blocking):

- **Self-evaluation pass against the 20-URL seed** — [`validation-urls.md`](./validation-urls.md) walks through the checklist. When the maintainer judges the output "good enough", the release can proceed. No threshold or sample-size requirement.
- **KanjiVG errata fix-overrides** — `fix-overrides.json` is empty. Add entries as the self-evaluation surfaces issues; no round-structure needed.
- **Jōyō + Jinmeiyō allowlist arrays** — currently empty in `packages/dataset-cjk-kanjivg/scripts/allowlist.ts`, so the default dataset refresh ships kana only. Set `TEGAKI_KANJIVG_FULL=1` locally to pull in the full CJK Unified range while the arrays are being populated.
- **Playwright visual-regression harness** — documented as a 2–3 day follow-up in the Phase 6 ticket but not installed yet. Useful for the maintainer's self-check loop; not required.
- **`ja-full` bundle (kanji)** — no pre-built kanji bundle ships; users have to run the generator themselves.

None of these gate shipping — the first release ships on kana completeness and the feature path for kanji, and quality evolves incrementally from there.

## Release options (pick one)

Both options share the same code path — the pick is purely about **where the package is published** and **who reviews it**.

### Option A — upstream proposal first

1. Post [`docs/upstream-proposal.md`](./upstream-proposal.md) as a GitHub Discussion at `KurtGokhan/tegaki` (or the equivalent issue).
2. Wait 1–2 weeks for response.
3. If the answer is "yes / maybe / subset": open one PR per phase in sequence (`feat/ja-phase1-dataset-package` → `feat/ja-phase7-docs-samples`) and let reviewers merge them.
4. If the answer is "no / silence": fall back to Option B.

This keeps the community consolidated around one npm package and shares maintenance, but adds weeks of latency before the Japanese bundle is available on npm.

### Option B — self-publish as `@ayutaz/tegaki-ja`

1. Add the `@ayutaz` scope to `packages/renderer/package.json` `name` (or leave it as `tegaki` and publish to your own scope directly — `npm publish --access public`).
2. Run `bun changeset version` to bump to `v0.14.0` (minor), then `npm publish --workspaces --access public` from CI.
3. Publicize via a short post on Zenn / Qiita / X and offer to track upstream.
4. Optionally open the same PRs as Option A so upstream can cherry-pick at leisure.

This ships immediately, lets Japanese users install today, and leaves the door open for an upstream merge later.

### Recommendation

**Option A with a short deadline** — post the Discussion, wait two weeks, fall back to Option B if there's no response. Most of the design docs are ready to paste into the Discussion as-is.

## Running the release when ready

```bash
# 1. Ensure every ticket README is ✅ and CHANGELOG entry is present
bun changeset status        # should list .changeset/japanese-support.md

# 2. Final smoke run
bun checks                  # lint + typecheck + 108 tests
bun --conditions=tegaki@dev scripts/generate-ja-kana.ts  # regenerate bundle from a clean clone

# 3. Version + publish
bun changeset version       # bumps tegaki + tegaki-generator to 0.14.0
bun run release             # version + sync-versions; then npm publish from CI
```

## Follow-ups worth doing after the release

| # | Task | Effort |
|---|---|---|
| 1 | Run the MOS evaluation rounds described in [`validation-urls.md`](./validation-urls.md) and record results under `docs/validation-results/` | 1–2 days per round |
| 2 | Populate the Jōyō + Jinmeiyō arrays in `allowlist.ts` and rebuild the dataset package | 0.5 day |
| 3 | Install Playwright + add a `.visual-baselines/` flow that runs against the 20-URL seed in CI | 2–3 days |
| 4 | Generate and ship a `ja-full` kanji bundle (common-use kanji subset) | 1–2 days |
| 5 | Expand the example matrix (Svelte / Vue / Solid Japanese demos) if upstream receives positive feedback | 0.5 day each |
| 6 | Revisit KanjiVG to a newer release once upstream fixes 娩 / 庫 / 炭 reports | track in `fix-overrides.json` until then |

## Contact

- Upstream: [KurtGokhan/tegaki](https://github.com/KurtGokhan/tegaki)
- Fork: [ayutaz/tegaki](https://github.com/ayutaz/tegaki)
- KanjiVG tracker: [KanjiVG/kanjivg](https://github.com/KanjiVG/kanjivg)
