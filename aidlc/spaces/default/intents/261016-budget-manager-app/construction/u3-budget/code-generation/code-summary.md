# コードのまとめ — U3 月別予算と予算比較（u3-budget）

## 結果の要点

- 承認済みの確認コマンド `npm --prefix app run verify` は、リポジトリ直下から実行して最後まで成功しました（開発担当の実行結果、終了コード 0）。
- 単体テストは 24 ファイル・201 件がすべて成功しました（U3 の新規は 30 件）。
- 行カバレッジは 98.13%（913 行のうち 896 行）です（下限 80%）。budget.ts は 100%、BudgetTable.tsx は 96.57% です。
- Playwright は 3 つのブラウザで 166 件が成功し、失敗は 0 件でした。20 件は、時間の判定を Chromium だけで行うためのスキップです。
- 目標値は1つも下げていません。npm の部品は足していません。CSP（`csp-policy.json`）、`package.json`、`package-lock.json` も変えていません。
- 計画の Step 1〜8 はすべて終わり、前の工程から持ち越した軽微な点 R-01・R-02・R-03・R-06・R-07 も反映しました。

## 作ったファイル・変えたファイル

| 場所 | 中身 |
|------|------|
| `app/src/domain/budget.ts`（新規） | getMonth、saveMonth、previewCopy、copyFromPrevious。保存は commit の1回だけ |
| `app/src/ui/BudgetTable.tsx`（新規） | 支出カテゴリ別の予算と実績の表、予算の保存、前の月のコピーと確認の枠 |
| `app/src/domain/types.ts` | AppState に externalChangeSeq を追加 |
| `app/src/ui/composition.ts` | Budget を作り、予算の差し込み口を Budget.getMonth にした（createAppServices と createBrowserAppServices の両方） |
| `app/src/ui/AppShell.tsx` | externalChangeSeq（初期値 0、別のタブの変更ごとに 1 増える）と budget を ReviewView へ渡す |
| `app/src/ui/ReviewView.tsx` | budget があれば BudgetTable を出す。省略時は U1 の表のまま |
| `app/src/ui/styles/app.css`、`app/README.md` | 見た目と、予算の使い方の説明 |
| `app/tests/unit/` | domain/budget（12）、ui/BudgetTable（14）、ui/AppShell.u3（4） |
| `app/tests/e2e/u3-budget/` | save、compare、copy、failure-and-a11y |
| `app/tests/e2e/support/u3.ts` | テストの補助 |

## 測った値（Chromium、3回の中央値、3,000 件の保存データ）

| ID | 内容 | 結果 | 目標 |
|----|------|------|------|
| NFR1.1 | 「予算を保存」から残額の表示が変わるまで | 29.0 ms（29.0 / 27.0 / 31.0） | 1 秒以内 |
| NFR1.2 | 「前の月の予算をコピー」から表が変わるまで | 29.0 ms（29.0 / 26.0 / 29.0） | 1 秒以内 |

ほかの確認結果:

- 5つの状態（入力の誤り・コピーの確認・コピー元なし・超過・未設定）で、axe の重大な違反は 0 件でした。
- 予算の保存とコピーの操作中も、外部への通信は 0 件でした。
- ESLint は `--max-warnings 0` で指摘 0 件です。style 属性は使っていません。
- 「1回だけ無視する印」のテストは、わざと壊した BudgetTable で一度流して失敗することを確かめ、元に戻しました。

## U1・U5・U2 のテストで変えたところ（確かめる内容は変えていない）

単体テストは変更なしで通りました。変えたのはブラウザ操作のテストの「要素の選び方」だけです。Playwright の名前による探し方は既定で部分一致のため、U3 で増えた要素とぶつかって、複数の要素に当たる誤り（strict mode violation）で落ちていました。

1. **「前の月」ボタンに `exact: true`:** 新しいボタン「前の月の予算をコピー」にも一致するためです。対象は u1 の flow・security・accessibility と、u5 の sample です。
2. **`getByLabel('カテゴリ')` に `exact: true`（全 10 か所）:** 表の名前「支出カテゴリ別の予算と実績」にも一致するためです。対象は support/app.ts の register、u1 の flow・accessibility・performance・storage-failures（2か所）、u2 の ledger・validation・double-submit-and-memo、u5 の cross-tab です。
   - 1回目の verify は、この原因だけで 69 件が失敗しました。直したあとの再実行で全件成功しています。

## 計画・設計と違う点、判断した点

1. **予算のない月の案内文:** 予算が1件もない月に、案内文「この月の予算はまだ設定されていません…」を出しています。rules.md の文の一覧にはありませんが、詳細モックアップの summary-budget-unset と interaction-spec の「案内文」に合わせました。読み上げで割り込まないよう、role は付けていません。
2. **知らせの文言:** rules.md の文のとおりにしました。モックアップにある補足文（コピーの確認の「9月に予算のあるカテゴリ…」や、コピー元なしの本文）は入れていません。
3. **1回だけ無視する印:** ref ではなく state で持たせています。React Hooks のリントの規則が描画中の ref の読み出しを禁じているためです。動きは設計どおりです。
4. **知らせの role:** 「前の月の予算がありません」と、別のタブの変更による取り消し・置き換えの知らせは role="status" で出しています。rules.md では status か alert かが決まっていなかったためです。
5. **テストの「今日」:** 超過と未設定のブラウザ操作のテストは、U5 と同じく「今日」を 2026-10-16 に固定し、前の月をそこから計算しました。

## 持ち越し

- U2 のコードレビュー R-01（保存の失敗のあとのフォーカス）は U6 で扱います。
- U5 の R-07 の残り（読み出し専用で失敗する環境）は引き続き記録のみです。
