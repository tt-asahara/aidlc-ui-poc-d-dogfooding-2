# 使う技術の決定 — U2 登録の検証と明細一覧

U1 の決定（`aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-requirements/tech-stack-decisions.md`）と U5 の決定（`construction/u5-storage-resilience/nfr-requirements/tech-stack-decisions.md`）をそのまま使います。U2 で新しく足す部品（npm のパッケージ）はありません。

| 分類 | 使うもの | 理由 |
|------|---------|------|
| 見える1文字の数え方 | Intl.Segmenter（U5 で採用） | メモの 100 文字の判定。U5 の保存データの検査と同じ関数を共有する |
| 日本語の変換中の判定 | ブラウザの composition の事象（compositionstart・compositionend） | 変換中に切り詰めて入力を壊さないため。部品を足さずに済む |
| 改行の貼り付けの検出 | ブラウザの paste の事象 | 1行の input は貼り付けた改行を取り除いてから値を渡すため、貼り付けの時点で確かめる |
| 二重送信の防止 | React の ref と時計（setTimeout） | 保存が同期で終わるため、画面の状態ではなく ref で 300 ミリ秒の鍵を持つ |

## 検討して選ばなかったもの

| 選ばなかったもの | 理由 |
|-----------------|------|
| メモ欄を複数行（textarea）にする | メモは1行と決まっている（AC1.2.4）。Enter を登録の操作にしたい |
| 入力欄の maxLength | UTF-16 の単位で数えるため、絵文字を含むと 100 文字より前で止まる |
| 入力の検証の部品集 | 規則が少なく、Ledger.validate の1か所で足りる |
