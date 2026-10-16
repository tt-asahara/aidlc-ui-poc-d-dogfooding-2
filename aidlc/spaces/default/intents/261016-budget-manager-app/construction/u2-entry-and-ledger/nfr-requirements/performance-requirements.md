# 性能・利用環境・使いやすさ・保守性の要件 — U2 登録の検証と明細一覧

入力:

- 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`（NFR1、NFR2、NFR6、NFR7、NFR8）
- U1・U5 の NFR 要件（共通の目標と技術。ここでは繰り返さない）
- U2 の機能設計 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/functional-design/`
- このステージの回答 `nfr-requirements-questions.md`（質問なし、まとめの確認済み）

## 性能（NFR1）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR1.1 | 明細 3,000 件・1か月 100 件で、登録のあと、集計と明細の一覧が新しい内容に変わるまで 1 秒以内 | 計測値が 1 秒以内（Chromium、3回の中央値） | Playwright で、登録から一覧の行数の変化までを測る |
| NFR1.2 | 同じデータで、月の切り替えのあと、一覧が新しい月に変わるまで 1 秒以内 | 計測値が 1 秒以内（Chromium、3回の中央値） | Playwright |
| NFR1.3 | 二重送信の防止: 300 ミリ秒以内の2回目の操作で明細が増えない | 明細の数が1件だけ増える | 画面部品の単体テスト（時計を進める）と Playwright |

## 利用環境（NFR6）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR6.1 | 絵文字や結合文字を含むメモが、見える1文字で 100 文字まで入り、101 文字目で止まる | 3種類のブラウザで同じ結果 | Playwright（Chromium・Firefox・WebKit） |
| NFR6.2 | 日本語の変換中は文字数で切り詰めず、確定のときに判定する | 変換中の入力が壊れない | 画面部品の単体テストで composition の事象を送って確かめる。実際の日本語入力の確認は、手で行う（自動の操作では変換を再現できない） |

## 使いやすさとアクセシビリティ（NFR2、NFR8）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR2.1 | 欄ごとの誤りを、aria-invalid と aria-describedby で欄と結ぶ。まとめは role="alert" | 役割と結び付きがテストで見つかる | Testing Library |
| NFR2.2 | 入力の誤り（STATE-VALIDATION-ERROR）、別の月の登録（STATE-OTHER-MONTH）、一覧のある月（STATE-POPULATED）、空の月（STATE-EMPTY）で、axe の重大な違反がない | 違反 0 件 | Playwright と axe |
| NFR2.3 | 一覧の表は、caption と列見出し・行見出しを持つ | 表の構造がテストで見つかる | Testing Library |

## 保守性とテスト（NFR7）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR7.1 | U2 のコードを足しても、`app/src` の行カバレッジ 80% 以上を保つ | 計測値が 80% 以上 | 承認済みの確認コマンド |
| NFR7.2 | U1・U5 のテストが通ったまま、U2 のテストを足す。U1 の誤りのまとめのテストは、欄ごとの表示を足しても成り立つ | 既存のテストの失敗 0 件 | 確認コマンド |
