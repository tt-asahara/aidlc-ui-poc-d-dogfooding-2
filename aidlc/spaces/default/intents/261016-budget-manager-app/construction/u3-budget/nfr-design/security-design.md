# 安全と信頼性の設計 — U3 月別予算と予算比較

入力:

- U3 の NFR 要件 `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/nfr-requirements/security-requirements.md`（NFR3.1、NFR4.1、NFR5.1〜NFR5.4）
- U1・U5・U2 の NFR 設計（CSP、保存の手順、保存データの検査。そのまま使う）

## 外部への通信をしない（NFR3）

| ID | 設計 |
|----|------|
| NFR3.1 | U3 は外部の資源を読み込まない。U1 の CSP（`app/csp-policy.json`）と check:dist、外部通信 0 件のテストを変えずに通す |

## 入力の扱い（NFR4）

| ID | 設計 |
|----|------|
| NFR4.1 | 予算の規則は `app/src/domain/budget.ts` の Budget に置く。BudgetTable は Budget の結果（C1 の VALIDATION と fieldErrors の budget:<カテゴリ名>）を表示するだけで、独自に検証しない。予算の値の文字は、前後の空白を除いてから、半角数字だけかを確かめる |

## 信頼性（NFR5）

| ID | 設計 |
|----|------|
| NFR5.1 | Budget.saveMonth と copyFromPrevious は、`commit({ expectedRevision: store.getSnapshot().revision, budgetsToReplace: { month, budgets } })` を1回だけ呼ぶ。DataStore（U1）は budgetsToReplace の月の予算だけを置き換え、明細とほかの月は変えない。単体テストで、保存の前後で明細の数とほかの月の予算が同じことを確かめる |
| NFR5.2 | 保存の失敗では、BudgetTable は欄の値を変えない。STALE_REVISION の直後の externalChangeSeq の変化では作り直さない（`performance-design.md` の「1回だけ無視する印」）。単体テストで、偽の保存領域で STORAGE_WRITE と STALE_REVISION を起こし、入力が残ることを確かめる |
| NFR5.3 | Budget が作る予算は、budgetKey =「月:カテゴリ名」、支出カテゴリだけ、0〜9,999,999 の整数にする。単体テストで、保存後の保存データが U5 の validateSnapshot を通ることを確かめる |
| NFR5.4 | Playwright で、予算を保存してから再読み込みし、予算が残っていることを確かめる（AC7.2.1 の予算の部分） |

### 読めない状態（NFR 要件レビュー R-02）

storeStatus が unreadable のとき、BudgetTable の表示は次のとおりです。

- 予算の表、予算欄、「予算を保存」、「前の月の予算をコピー」を表示しない（U1 の集計の停止と同じ理由の表示の中に入る）。
- そのため、Budget の saveMonth と copyFromPrevious は呼ばれず、commit も呼ばれない。
- 予算の保存の途中で commit が STORE_UNREADABLE を返したときも、storeStatus が unreadable になって、同じ表示に変わる。

単体テストで、unreadable のとき欄とボタンがなく、偽の Budget の保存の関数が呼ばれないことを確かめます。
