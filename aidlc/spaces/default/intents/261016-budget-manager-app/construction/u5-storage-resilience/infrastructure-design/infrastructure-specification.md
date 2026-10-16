# 構成の仕様 — U5 保存の異常・別タブ対応・サンプル

U1 の構成の仕様（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/infrastructure-specification.md`）をそのまま使います。U5 で変わる構成はありません。このステージの回答は `infrastructure-design-questions.md`（まとめの確認済み）です。

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| 動かす場所（compute model） | U1 のまま。依頼者のパソコンのブラウザ。ビルドしたファイルを Vite の preview で手元から配信する | 変更なし |
| ネットワーク | U1 のまま。`127.0.0.1` だけで待ち受け、外への通信はしない。別のタブの変更の知らせは、ブラウザの中の storage イベントで、通信は発生しない | NFR3.2（U5） |
| 依頼者とテストのアドレス | U1 のまま（4173 と 4174、strictPort） | 別のタブの変更のテストは 4174 の中で2つのページを開くため、依頼者の保存データに触れない |
| データの置き場所（storage strategy） | U1 のまま。localStorage の1つのキー | 変更なし |
| 環境 | U1 のまま（開発と利用の2つ） | 変更なし |
| 構成の記述（IaC） | なし | 用意するクラウドの資源がない |
| 大きさの目安（sizing） | 明細 3,000 件で約 400 KB。ブラウザの保存領域の上限（約 5 MB。多くのブラウザで文字数の基準で、ブラウザごとに違う場合がある）を、保存データの大きさの上限とみなす | U5 の NFR 設計（performance-design.md） |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| ブラウザの localStorage | database | U1 のまま。U5 は読み込みのたびに保存データの形を検査する | 壊れた保存データは書き換えない |
| ブラウザの storage イベント | 別のタブの変更の知らせ（queue の代わり） | DataStore.load で受け取り手を1つ付け、dispose で外す | 同じ配信元の別のページの書き込みだけが届く |
| Vite の preview | 手元の配信 | U1 のまま | 変更なし |

## 戻し方とデータの控え

U1 のまま（git revert でコードを戻す。保存データの控えは CSV）。U5 では、壊れた保存データを見つけても消さないため、ブラウザの開発者の道具で中身を確かめられます。
