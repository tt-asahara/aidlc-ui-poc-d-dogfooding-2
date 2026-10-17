# 構成の仕様 — U3 月別予算と予算比較

U1 の構成の仕様（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/infrastructure-specification.md`）をそのまま使います。U3 で変わる構成はありません。このステージの回答は `infrastructure-design-questions.md`（まとめの確認済み）です。

## Deployment

| Facet | Choice | Rationale |
|-------|--------|-----------|
| 動かす場所（compute model） | U1 のまま（依頼者のパソコンのブラウザ、Vite の preview） | 変更なし |
| ネットワーク | U1 のまま（127.0.0.1 だけ、外への通信なし） | NFR3.1（U3） |
| 依頼者とテストのアドレス | U1 のまま（4173 と 4174、strictPort） | 変更なし |
| データの置き場所 | U1 のまま（localStorage の1つのキー）。予算は保存データの budgets に入る | 約束ごと C2 |
| 環境 | U1 のまま（開発と利用） | 変更なし |
| 構成の記述（IaC） | なし | 用意するクラウドの資源がない |
| 大きさの目安 | U5 のまま。予算は1か月最大8件で、保存データの大きさへの影響は小さい | 変更なし |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---------|------|---------------|-------|
| ブラウザの localStorage | database | U1・U5 のまま | 予算の保存は budgetsToReplace の1回の書き込み |
| Vite の preview | 手元の配信 | U1 のまま | 変更なし |

## 戻し方とデータの控え

U1 のまま（git revert でコードを戻す）。CSV には予算が含まれないため、予算の控えは CSV では取れません（AC5.1.5。範囲外）。
