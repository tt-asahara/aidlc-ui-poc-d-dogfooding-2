# 構成の仕様 — U2 登録の検証と明細一覧

U1 の構成の仕様（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/infrastructure-specification.md`）をそのまま使います。U2 で変わる構成はありません。このステージの回答は `infrastructure-design-questions.md`（まとめの確認済み）です。

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| 動かす場所（compute model） | U1 のまま（依頼者のパソコンのブラウザ、Vite の preview） | 変更なし |
| ネットワーク | U1 のまま（127.0.0.1 だけ、外への通信なし） | NFR3.1（U2） |
| 依頼者とテストのアドレス | U1 のまま（4173 と 4174、strictPort） | 変更なし |
| データの置き場所 | U1 のまま（localStorage の1つのキー） | 変更なし |
| 環境 | U1 のまま（開発と利用） | 変更なし |
| 構成の記述（IaC） | なし | 用意するクラウドの資源がない |
| 大きさの目安 | U5 のまま（3,000 件で約 440 KB） | 一覧は表示中の月だけを取り出す |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| ブラウザの localStorage | database | U1・U5 のまま | 変更なし |
| ブラウザの Intl.Segmenter | 見える1文字の数え方 | 初めて必要になったときに作る（遅延生成） | 最新の4つのブラウザで使える |
| Vite の preview | 手元の配信 | U1 のまま | 変更なし |

## 戻し方とデータの控え

U1 のまま（git revert でコードを戻す。保存データの控えは CSV）。
