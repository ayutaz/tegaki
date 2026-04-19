# Phase 6 検証用 URL セット

[phase-6-validation.md](./tickets/phase-6-validation.md) §3-2 に基づく MOS 評価と視覚回帰テスト (VRT) の入力 URL 一覧。

## 使い方

1. `bun dev`（リポジトリルート）で website を起動。`http://localhost:4321/tegaki/` がリッスンされる。
2. 下表の各 URL をナビゲートし、`ct` パラメータで停止時刻が指定された状態で**デターミニスティックなフレーム**が描画されることを確認。
3. 評価者（3–5 名の日本語ネイティブ）に 5 段階で採点依頼:
   - **5**: 本物の手書きと区別がつかない
   - **4**: 自然、違和感なし
   - **3**: 機械的だが筆順は正しい
   - **2**: 筆順は正しいが不自然な速度・リズム
   - **1**: 筆順や形に明確な誤りがある
4. 集計は `summariseMOS()` ([rhythm-metrics.ts](../packages/renderer/src/lib/rhythm-metrics.ts)) で mean/stdDev/95% CI を計算。AC-3 の閾値は **mean ≥ 4.0**。

評価者は事前に以下の観点で採点するよう依頼:

- **筆順**: 画の順序が日本 MEXT 基準と一致するか
- **方向**: 各画の開始→終了方向が正しいか
- **速度**: 等速機械的になっていないか
- **とめ/はね/はらい**: 終端処理が区別できるか
- **画間ポーズ**: 不自然な停止・ラグがないか

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

導入コスト **2–3 日**（[phase-6-validation.md §8-1](./tickets/phase-6-validation.md)）。GitHub Actions で PR 毎に自動実行するステージを追加する想定。

---

## 5. 対照群（rhythm=constant）

リズムの効果を切り出すため、同じ 20 字を `rhythm=constant` でも生成し、視覚的に「人間味の有無」を比較してもらう。

| 設定 | 字例 | URL クエリ差分 |
|---|---|---|
| rhythm=constant | 右 | `rhythm=constant` |
| rhythm=lognormal | 右 | `rhythm=lognormal` |

評価者には同じ字の 2 バリアントを横並びで提示し、「どちらが自然か」の二択で答えてもらう形式も併用すると、主観スコアの粒度が上がる。

---

## 6. 既知の KanjiVG 誤り字（目視必須）

以下 3 字は [KanjiVG issue #25/#99/#155](https://github.com/KanjiVG/kanjivg/issues) で報告されている誤りを常用漢字内で拾った候補。Phase 6 で目視確認し、誤っていれば [fix-overrides.json](../packages/dataset-cjk-kanjivg/fix-overrides.json) で正しい SVG に上書きする。

| 字 | U+ | 報告 issue |
|---|---|---|
| 娩 | 5A69 | #155 |
| 庫 | 5EAB | #25 |
| 炭 | 70AD | #25 |

---

## 7. 評価結果の保存先

`docs/validation-results/<YYYY-MM-DD>-round<N>.md` に round 毎のレポートを追記。各ラウンドで mean / 95% CI / pass フラグと低評価字のリスト、次ラウンドに向けた σ/μ 調整案を記録する。2 ラウンド以内で mean ≥ 4.0 に収束させる ([phase-6-validation.md §3-6](./tickets/phase-6-validation.md))。
