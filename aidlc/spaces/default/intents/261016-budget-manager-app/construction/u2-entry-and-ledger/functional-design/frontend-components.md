# 画面部品の設計 — U2 登録の検証と明細一覧

動きの手順は `functional-spec.md`、規則は `rules.md` にあります。見た目は詳細モックアップ（`aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/assets/refined-mockup.html` の register-validation-error、register-other-month、register-default の一覧、ledger-empty）に合わせます。

## 部品の階層（U1・U5 からの変化）

```
AppShell（selectMonth を EntryFormView に渡す）
├─ NoticeBannerView（U5 のまま）
├─ EntryFormView「1 登録」
│   ├─ お知らせ枠（まとめ・成功・別の月・保存の失敗）
│   ├─ 各欄 + 欄の下の誤りの文（U2 で足す）
│   └─ 「登録する」（処理中は押せない。U2 で足す）
├─ ReviewView「2 確認」
│   ├─ 月の切り替え、集計、カテゴリ別の表（U1 のまま）
│   └─ LedgerList（新規。明細の一覧または案内文）
└─ ExportView「3 書き出し」（U1 のまま）
```

<!-- Text fallback: AppShell が selectMonth を登録フォームに渡す。登録フォームに欄ごとの誤りの文と処理中の状態を足す。確認の区切りの集計の下に、新しい LedgerList（一覧か案内文）を置く。ほかは U1・U5 のまま。 -->

## 部品ごとの受け取るものと持つ状態

| 部品 | 受け取るもの | 自分で持つ状態 | 呼ぶもの |
|------|--------------|----------------|----------|
| EntryFormView | U1 のもの + selectedMonth、onSelectMonth | U1 のもの + fieldErrors（欄ごとの理由）、submitting（表示用の処理中）、memoNotice（メモ欄の下の文）、送信の鍵（ref。300 ミリ秒保持）、変換中かどうか（ref） | Ledger.add、onSelectMonth |
| LedgerList（新規） | entries（表示中の月の明細）、month、storeStatus | なし | なし |
| ReviewView | U1 のもの + ledger（AppShell が services.ledger を渡す） | なし | U1 のもの + ledger.listByMonth |

メモ欄は input（type=text）のまま maxLength を外し、onChange・onCompositionStart・onCompositionEnd・onPaste で BR1.4 の制限を行います（`functional-spec.md` の W4）。

## 欄の下の誤りの文（BR1.1〜BR1.5）

| 欄 | 文 |
|----|----|
| 区分 | 区分を選んでください |
| 日付 | 日付を入力してください／存在する日付を入力してください。例: 2026-10-14 |
| 金額（円） | 金額は 1〜9,999,999 の整数で入力してください。例: 1280 |
| カテゴリ | カテゴリを選んでください／カテゴリを選び直してください |
| メモ | メモは 100 文字までです／メモに改行は使えません |

## 明細の一覧（LedgerList）

| 列 | 表示 |
|----|------|
| 日付 | MM/DD（行見出し th scope="row"） |
| 区分 | 収入・支出 |
| カテゴリ | カテゴリ名 |
| 金額 | 支出は「−¥12,800」、収入は「+¥280,000」。右揃え、等幅数字 |
| メモ | 文字のまま。メモの列の中で折り返す |

- table と caption（「2026年10月の明細（新しい順）」）を使い、列見出しは th scope="col"。
- 1か月約 100 件までを想定し、ページ分けはしない。
- data-testid: `ledger-table`、`ledger-row`、`ledger-empty`。

## アクセシビリティ

- 欄ごとの誤り: 欄に aria-invalid="true"、欄の下の文に id を付け、aria-describedby で結ぶ。
- まとめは role="alert"、成功と別の月の知らせは role="status"（U1 のまま）。
- 処理中の「登録する」は disabled にし、押せないことが読み上げで伝わるようにする。
- 色だけで誤りを伝えない。欄の枠を太くし、文を出す。
