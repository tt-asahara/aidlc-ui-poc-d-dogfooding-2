# 画面部品の設計 — U3 月別予算と予算比較

動きの手順は `functional-spec.md`、規則は `rules.md` にあります。見た目は詳細モックアップ（`aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/assets/refined-mockup.html` の summary-over-budget、summary-budget-unset、budget-validation-error、budget-copy-confirm、budget-copy-empty）に合わせます。

## 部品の階層（U1・U2・U5 からの変化）

```
ReviewView「2 確認」
├─ 月の切り替え、収入・支出・差額（U1 のまま）
├─ BudgetTable（新規。U1 の支出カテゴリ別の表を置き換える）
│   ├─ 注意書き「「予算を保存」を押すまで、予算は保存されません」
│   ├─ お知らせ枠（成功は status、失敗とまとめは alert）
│   ├─ 表: カテゴリ・予算欄・実績・残額（8行）
│   ├─ 「予算を保存」「前の月の予算をコピー」
│   └─ 確認の枠（上書きする・やめる）
└─ LedgerList（U2 のまま）
```

<!-- Text fallback: 確認の区切りの中で、U1 の支出カテゴリ別の表を新しい BudgetTable に置き換える。BudgetTable は注意書き、お知らせ枠、8行の表（カテゴリ・予算欄・実績・残額）、保存とコピーのボタン、上書きの確認の枠を持つ。月の切り替え・集計・一覧はそのまま。 -->

## 部品ごとの受け取るものと持つ状態

| 部品 | 受け取るもの | 自分で持つ状態 | 呼ぶもの |
|------|--------------|----------------|----------|
| BudgetTable（新規） | month、summary（MonthSummary）、budget（Budget）、storeStatus、lastExternalChangeAt | 欄の入力値（カテゴリ名 → 文字）、fieldErrors、お知らせ、確認の枠の開閉、ignoreNextExternalChange（ref。自分の STALE_REVISION の結果として届く lastExternalChangeAt の変化を1回だけ無視する印） | Budget.saveMonth、Budget.previewCopy、Budget.copyFromPrevious |
| ReviewView | U1・U2 のもの + budget | なし | U1・U2 のもの |
| AppShell | U1・U2・U5 のもの | U1・U2・U5 のもの | services.budget を ReviewView に渡す |

欄の入力値は、次のときにだけ、保存済みの予算で作り直します（BR4.3）。

- month が変わったとき
- 自分の保存・コピーが成功したとき
- lastExternalChangeAt が変わったとき（ignoreNextExternalChange の印があれば、その1回は作り直さずに印を下ろす）

dataVersion（明細の登録などほかの部品の保存でも増える）では作り直しません。集計（実績・残額）は、U1 のとおり dataVersion で読み直します。

## 表示の決まり

| 表示 | 決まり |
|------|--------|
| 予算欄 | input（inputmode="numeric"）。名前は「食費の予算（円）」のように付ける。未設定はプレースホルダー「未設定」 |
| 実績 | ¥ と3桁区切り、右揃え |
| 残額 | 予算ありは ¥ と3桁区切り。超過は「超過 ¥3,900」と超過の色。未設定は「—」 |
| 欄の誤り | 欄の下に「予算は 0〜9,999,999 の整数で入力してください」。aria-invalid と aria-describedby |
| 確認の枠 | role="group"、見出し「上書きの確認」、文「10月の予算を前の月の内容で上書きします」、「上書きする」「やめる」。開いたら「上書きする」へ操作位置を移す。Escape と「やめる」で閉じて、コピーのボタンへ戻す |

data-testid: `budget-table`、`budget-input-<カテゴリ名>`、`budget-save`、`budget-copy`、`budget-copy-confirm`、`budget-copy-overwrite`、`budget-copy-cancel`、`budget-notice`。

## アクセシビリティ

- 表は table と caption（「2026年10月の支出カテゴリ別の予算と実績」）、th scope="col"、カテゴリ名は th scope="row"。
- 超過は色だけでなく「超過」の文字を出す。
- 確認の枠を開いている間も、ページのほかの部分は操作できる（画面中央のダイアログは使わない。詳細モックアップ Q1）。
