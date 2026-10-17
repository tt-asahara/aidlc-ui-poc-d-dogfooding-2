# 性能・利用環境・使いやすさ・保守性の要件 — U3 月別予算と予算比較

入力:

- 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md`（NFR1、NFR2、NFR6、NFR7、NFR8）
- U1・U5・U2 の NFR 要件（共通の目標と技術。ここでは繰り返さない）
- U3 の機能設計 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/`
- このステージの回答 `nfr-requirements-questions.md`（質問なし、まとめの確認済み）

## 性能（NFR1）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR1.1 | 明細 3,000 件・1か月 100 件で、「予算を保存」を押してから、予算比較の表（予算・残額・超過）が新しい値に変わるまで 1 秒以内 | 計測値が 1 秒以内（Chromium、3回の中央値） | Playwright |
| NFR1.2 | 同じデータで、「前の月の予算をコピー」（確認なし）から、表が写した値に変わるまで 1 秒以内 | 計測値が 1 秒以内（Chromium、3回の中央値） | Playwright |

## 利用環境（NFR6）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR6.1 | 予算の保存、コピー、確認の枠（上書きする・やめる・Escape）が、Chromium・Firefox・WebKit で動く | 3つで同じ結果 | Playwright |

## 使いやすさとアクセシビリティ（NFR2、NFR8）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR2.1 | 予算欄に「食費の予算（円）」のような名前がある。誤りは aria-invalid と aria-describedby で欄と結ぶ。超過は「超過」の文字でも伝える | 名前・結び付き・文字がテストで見つかる | Testing Library |
| NFR2.2 | 確認の枠は、開いたら「上書きする」へ操作位置を移し、「やめる」と Escape で閉じてコピーのボタンへ戻す | 操作位置がテストのとおりに動く | Testing Library と Playwright |
| NFR2.3 | 予算の入力の誤り（STATE-VALIDATION-ERROR）、コピーの確認（STATE-COPY-CONFIRM）、コピー元なし（STATE-COPY-EMPTY）、超過（STATE-OVER-BUDGET）、未設定（STATE-BUDGET-UNSET）で、axe の重大な違反がない | 違反 0 件 | Playwright と axe |

## 保守性とテスト（NFR7）

| ID | 要件 | 合否の基準 | 確かめ方 |
|----|------|------------|----------|
| NFR7.1 | U3 のコードを足しても、`app/src` の行カバレッジ 80% 以上を保つ | 計測値が 80% 以上 | 承認済みの確認コマンド |
| NFR7.2 | U1・U5・U2 のテストが通ったまま、U3 のテストを足す。U1 の「予算は未設定」の表示のテストは、予算の差し込み口を本物に差し替えても、予算のない月で成り立つ | 既存のテストの失敗 0 件 | 確認コマンド |
