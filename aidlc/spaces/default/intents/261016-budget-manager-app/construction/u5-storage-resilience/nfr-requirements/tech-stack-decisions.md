# 使う技術の決定 — U5 保存の異常・別タブ対応・サンプル

U1 で決めた技術（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-requirements/tech-stack-decisions.md`）をそのまま使います。U5 で新しく足す部品（npm のパッケージ）はありません。

| 分類 | 使うもの | 理由 |
|------|---------|------|
| 別のタブの変更の検知 | ブラウザの storage イベント（window の 'storage'） | localStorage の変更を、同じ配信元の別のタブに知らせる標準の仕組み。部品を足さずに済み、外部と通信しない |
| 保存データの検査 | TypeScript の関数（`app/src/domain` の下。部品は足さない） | 検査の項目は約束ごと C2 の形だけで、検査用の部品（スキーマの検査の部品集）を足すほどではない。実行時の依存を React と React DOM だけに保つ（U1 の NFR4.4） |
| 見える1文字の数え方 | ブラウザの Intl.Segmenter | メモの 100 文字の検査に使う。最新の4つのブラウザで使える |
| 同時保存の排他 | 使わない（Web Locks API は採らない） | 保存の呼び出しが非同期になるため。依頼者の回答（機能設計 Q1） |

## 検討して選ばなかったもの

| 選ばなかったもの | 理由 |
|-----------------|------|
| スキーマの検査の部品集（zod など） | 実行時の依存が増える。検査の項目が少なく、関数で足りる |
| BroadcastChannel による別のタブへの知らせ | storage イベントで足りる。保存と知らせを別にすると、食い違う可能性が増える |
| Web Locks API | 機能設計 Q1 のとおり |
