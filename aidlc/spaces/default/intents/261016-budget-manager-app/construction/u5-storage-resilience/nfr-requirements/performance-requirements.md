# 性能・利用環境・使いやすさ・保守性の要件 — U5 保存の異常・別タブ対応・サンプル

入力:

- 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`（NFR1、NFR2、NFR6、NFR7、NFR8）
- U1 の NFR 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/nfr-requirements/`（共通の目標と技術。ここでは繰り返さない）
- U5 の機能設計 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/`
- このステージの回答 `nfr-requirements-questions.md`（Q1、まとめの確認済み）

U5 で増える処理（保存データの検査、別のタブの変更の受け取り、サンプルの投入、全体のお知らせ枠）についての要件だけを載せます。

## 性能（NFR1）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR1.1 | 別のタブで保存してから、もう片方のタブの集計が新しい値に変わるまで 1 秒以内 | 計測値が 1 秒以内（Chromium、3回の中央値） | Playwright で同じページを2つ開き、片方で登録してから、もう片方の集計の変化までを測る |
| NFR1.2 | 保存データがない状態で開いてから、サンプルの入った集計が表示されるまで 1 秒以内 | 計測値が 1 秒以内（Chromium、3回の中央値） | Playwright で空の保存領域から開いて測る |
| NFR1.3 | 3,000 件の保存データの検査（BR1.1）が 100 ミリ秒以内（目安） | 計測値が 100 ミリ秒以内 | 単体テストで検査の関数の時間を測る。U1 の起動 1 秒の目標の内訳 |

## 容量（Q1）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR1.4 | 容量の目安を記録する。明細 3,000 件で約 400 KB（localStorage の上限の約 5 MB の1割未満）。容量が足りなくなったときは、保存の失敗（STORAGE_WRITE）として扱う | 3,000 件の保存データの大きさが 1 MB 未満。書き込みが容量不足で失敗したとき、入力が残り失敗が表示される | 単体テストで 3,000 件の保存データの大きさを測る。容量不足は U1 の保存失敗のテスト（QuotaExceededError）で確かめ済み |

## 利用環境（NFR6）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR6.1 | 別のタブの変更の検知（storage イベント）が、Chromium・Firefox・WebKit で動く | 3つで AC7.4.1 のテストが通る | Playwright で同じブラウザの中に2つのページを開いて確かめる |

## 使いやすさとアクセシビリティ（NFR2、NFR8）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR2.1 | 全体のお知らせ枠の知らせが読み上げ機能に伝わる（読めない・保存できないは role="alert"、別のタブの変更は role="status"）。「閉じる」はキーボードで操作でき、名前がある | 役割と名前がテストで見つかる | Testing Library と Playwright のテスト |
| NFR2.2 | 全体のお知らせ枠の2つの状態（STATE-STORAGE-CORRUPT、STATE-OTHER-TAB-CHANGED）で、axe の重大（critical・serious）な違反がない | 違反 0 件 | Playwright と axe |
| NFR8.1 | 初めて開いたときから、サンプルで集計の表示を試せる | 初回の画面に、今月の集計の値が出る | ブラウザ操作のテスト（AC7.1.1） |

## 保守性とテスト（NFR7）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR7.1 | U5 のコードを足しても、`app/src` の行カバレッジ 80% 以上を保つ | 計測値が 80% 以上 | 承認済みの確認コマンド（`npm --prefix app run verify`） |
| NFR7.2 | U1 のテストがすべて通ったまま、U5 のテストを足す | 既存のテストの失敗 0 件 | 確認コマンド |
