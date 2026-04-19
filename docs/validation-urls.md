# 自己評価用 URL セット

メンテナが Sigma-Lognormal と KanjiVG 統合の出力を自分で見て回るための 20 字の URL リスト。パネル評価は前提にしない — 「違和感があれば直す、気にならなければ進める」の感覚で使う。

## 使い方

1. `bun dev`（リポジトリルート）で website を起動。`http://localhost:4321/tegaki/` がリッスンされる。
2. 下表の各 URL をナビゲートし、`ct` パラメータで停止時刻が指定された状態で**デターミニスティックなフレーム**が描画されることを確認。
3. 自分の目で以下 5 観点をざっと確認する:
   - **筆順**: 画の順序が日本 MEXT 基準と一致するか
   - **方向**: 各画の開始→終了方向が正しいか
   - **速度**: 等速機械的になっていないか
   - **とめ/はね/はらい**: 終端処理が区別できるか
   - **画間ポーズ**: 不自然な停止・ラグがないか
4. 気になった字だけメモして fix-overrides や σ/μ の再調整でつぶす。パス/フェイルの閾値は設けない — 納得できるまで回すか、「この字は後回し」と決める。

スコアを数値で残したい場合は `summariseMOS()` ([rhythm-metrics.ts](../packages/renderer/src/lib/rhythm-metrics.ts)) に 1 〜 5 を流せば mean と 95% CI を計算できる（単独 rater だと CI は平均に張り付く）。これは任意で、第三者に共有する用途向け。

---

## 1. 筆順テスト（KanjiVG 基準、MEXT 準拠）

| # | 字 | チェック観点 | URL (ct=完了時刻) |
|---|---|---|---|
| 1 | 右 | ノ → 一 → 口 の日本順（中国順との差が最大） | `/tegaki/generator/?m=text&t=右&f=Noto+Sans+JP&tm=controlled&ct=1.5&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 2 | 左 | 一 → ノ → 工 の日本順（右と対称） | `/tegaki/generator/?m=text&t=左&f=Noto+Sans+JP&tm=controlled&ct=1.5&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 3 | 田 | 縦先行の日本順 | `/tegaki/generator/?m=text&t=田&f=Noto+Sans+JP&tm=controlled&ct=2.0&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 4 | 必 | 上点 → 左払い → 心 → 左下点 → 右下点 | `/tegaki/generator/?m=text&t=必&f=Noto+Sans+JP&tm=controlled&ct=2.2&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 5 | 成 | 伝統順（点が早め） | `/tegaki/generator/?m=text&t=成&f=Noto+Sans+JP&tm=controlled&ct=2.5&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 6 | 乃 | 丿が早め | `/tegaki/generator/?m=text&t=乃&f=Noto+Sans+JP&tm=controlled&ct=1.2&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 7 | 草 | 艹（草冠）3 画扱い | `/tegaki/generator/?m=text&t=草&f=Noto+Sans+JP&tm=controlled&ct=3.0&fs=128&dataset=kanjivg&rhythm=lognormal` |

## 2. リズムテスト（Sigma-Lognormal の視認性）

| # | 字 | チェック観点 | URL |
|---|---|---|---|
| 8 | 永 | 8 種の基本画（とめ/はね/はらい含む） | `/tegaki/generator/?m=text&t=永&f=Noto+Sans+JP&tm=controlled&ct=3.5&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 9 | 書 | 横画多数（リズム単調さの検出） | `/tegaki/generator/?m=text&t=書&f=Noto+Sans+JP&tm=controlled&ct=4.0&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 10 | 愛 | 心の終端処理 | `/tegaki/generator/?m=text&t=愛&f=Noto+Sans+JP&tm=controlled&ct=4.5&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 11 | 字 | 点+子 | `/tegaki/generator/?m=text&t=字&f=Noto+Sans+JP&tm=controlled&ct=2.8&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 12 | 人 | はらい二画の対照 | `/tegaki/generator/?m=text&t=人&f=Noto+Sans+JP&tm=controlled&ct=1.0&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 13 | 大 | 長横+交差する払い | `/tegaki/generator/?m=text&t=大&f=Noto+Sans+JP&tm=controlled&ct=1.5&fs=128&dataset=kanjivg&rhythm=lognormal` |
| 14 | 川 | 縦3画の速度差 | `/tegaki/generator/?m=text&t=川&f=Noto+Sans+JP&tm=controlled&ct=1.8&fs=128&dataset=kanjivg&rhythm=lognormal` |

## 3. 仮名テスト（画分離の正しさ）

| # | 字 | チェック観点 | URL |
|---|---|---|---|
| 15 | き | 3 画 or 4 画分離（教科書体=4画） | `/tegaki/generator/?m=text&t=き&f=ja-kana&tm=controlled&ct=1.5&fs=128&rhythm=lognormal` |
| 16 | さ | 3 画分離 | `/tegaki/generator/?m=text&t=さ&f=ja-kana&tm=controlled&ct=1.3&fs=128&rhythm=lognormal` |
| 17 | ふ | 4 画分離 | `/tegaki/generator/?m=text&t=ふ&f=ja-kana&tm=controlled&ct=1.8&fs=128&rhythm=lognormal` |
| 18 | を | 3 画 | `/tegaki/generator/?m=text&t=を&f=ja-kana&tm=controlled&ct=1.4&fs=128&rhythm=lognormal` |
| 19 | ア | 2 画 | `/tegaki/generator/?m=text&t=ア&f=ja-kana&tm=controlled&ct=0.8&fs=128&rhythm=lognormal` |
| 20 | ン | 2 画 | `/tegaki/generator/?m=text&t=ン&f=ja-kana&tm=controlled&ct=0.8&fs=128&rhythm=lognormal` |

## 4. 回帰テスト (VRT)

Playwright で上記 20 URL をナビゲートし、`ct` で停止した状態をフルフレームキャプチャ。`.visual-baselines/` 配下の画像と diff、1 ピクセル差異以上でフェイル。

導入コスト **2–3 日**程度の follow-up。GitHub Actions で PR 毎に自動実行するステージを追加する想定。

---

## 5. 対照群（rhythm=constant）

リズムの効果を切り出したいときは、同じ 20 字を `rhythm=constant` でも生成して自分で見比べる。

| 設定 | 字例 | URL クエリ差分 |
|---|---|---|
| rhythm=constant | 右 | `rhythm=constant` |
| rhythm=lognormal | 右 | `rhythm=lognormal` |

同じ字を 2 タブで並べて切り替えると違いが分かりやすい。必要に応じて σ/μ を `packages/generator/src/constants.ts` で微調整し、再生成して見る。

---

## 6. 既知の KanjiVG 誤り字（目視候補）

以下 3 字は [KanjiVG issue #25/#99/#155](https://github.com/KanjiVG/kanjivg/issues) で誤りが報告されている常用漢字。自己評価中に明らかに違和感があれば [fix-overrides.json](../packages/dataset-cjk-kanjivg/fix-overrides.json) で上書きする。

| 字 | U+ | 報告 issue |
|---|---|---|
| 娩 | 5A69 | #155 |
| 庫 | 5EAB | #25 |
| 炭 | 70AD | #25 |

---

## 7. メモの残し方（任意）

再調整を何度か回す場合は `docs/validation-notes.md`（自由フォーマット）に「この字がまだ不自然」「σ 下げたら改善した」等のメモを追記しておくと、数週間後に見返すときに便利。形式的な round 構造や合否判定は不要。
