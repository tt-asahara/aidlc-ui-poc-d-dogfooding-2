# UI 証跡の受け渡し — 詳細モックアップ

このファイルは中心の成果物（`mockups.md`、`interaction-spec.md`、`design-system-mapping.md`、`accessibility-checklist.md`）を補うもので、置き換えるものではありません。実装の段階では、この契約と中心の成果物の両方を受け取ります。

## Artifact References

| 種類 | パス | 役割 |
|------|------|------|
| 上流の UI 契約 | `aidlc/spaces/default/intents/261016-budget-manager-app/ideation/rough-mockups/ui-poc-rough-contract.md` | ラフ案3つと仮の受け入れ条件 AC-R01〜R11 |
| 上流の成果物 | `aidlc/spaces/default/intents/261016-budget-manager-app/inception/requirements-analysis/requirements.md` | 要件（FR1〜FR9、NFR1〜NFR8） |
| 上流の成果物 | `aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md` | ストーリーと受け入れ条件（AC1.1.1 など）、要件との差分 |
| デザイン文脈 | `aidlc/spaces/default/intents/261016-budget-manager-app/ideation/rough-mockups/design-context.json` | 依頼者が確認した利用者・用途・印象（このステージでも同じものを使う） |
| このステージの成果物 | `mockups.md`、`interaction-spec.md`、`design-system-mapping.md`、`accessibility-checklist.md` | 画面、部品の動き、デザインの決まりごと、アクセシビリティの確認表 |
| 見本 | `assets/refined-mockup.html` | 案A を土台にした詳細の見本。19 の画面状態を切り替えられる。外部通信なし |
| アクセシビリティ補正 | `wcag-correction-report.json` | 大きい文字の基準を WCAG の値にした記録 |

ラフからの差分:

- 3案から案A に絞った（承認と引き継ぎ Q1）。
- 仮の受け入れ条件（AC-R01〜R11）を、ストーリーの正式な受け入れ条件に置き換えた。対応: AC-R01→AC1.1.1、AC-R02→AC1.2.1、AC-R03→AC1.1.1、AC-R04→AC7.3.1、AC-R05→AC2.1.1、AC-R06→AC2.1.4、AC-R07→AC3.1.1、AC-R08→AC3.2.3、AC-R09→AC3.2.2、AC-R10→AC6.1.1、AC-R11→AC6.2.1。
- 予算の入力、予算のコピー、重複の確認、別の月の登録、保存データの異常、別タブの変更、の状態を追加した。

未決定の事項: なし（このステージの Q1〜Q5 で確定）。

下の対応表では、受け入れ条件の ID を JSON の形式に合わせて表記しています（例: AC1.1.1 は AC-1-1-1）。

## Screen State Acceptance Mapping

| 画面 | 状態 | 受け入れ条件 | 確認方法 |
|------|------|--------------|----------|
| SCREEN-REGISTER | STATE-DEFAULT | AC1.1.1 | `?state=register-default` で登録フォームが最初の表示範囲にあり、5項目と「登録する」が見える |
| SCREEN-REGISTER | STATE-SAVED | AC1.1.1 | `?state=register-saved` で「登録しました 10月14日 食費 ¥1,280」が role=status で出る |
| SCREEN-REGISTER | STATE-VALIDATION-ERROR | AC1.2.1 | `?state=register-validation-error` で金額欄が aria-invalid、欄の下に直し方、入力値が残る |
| SCREEN-REGISTER | STATE-OTHER-MONTH | AC1.3.1 | `?state=register-other-month` で表示が2026年9月、知らせに日付・カテゴリ・金額 |
| SCREEN-REGISTER | STATE-STORAGE-ERROR | AC7.3.1 | `?state=register-storage-error` で保存失敗と再試行の方法が role=alert で出る |
| SCREEN-LEDGER | STATE-POPULATED | AC2.1.1 | `?state=register-default` で7件が新しい順、金額は符号・¥・3桁区切り |
| SCREEN-LEDGER | STATE-EMPTY | AC2.1.4 | `?state=ledger-empty` で表の代わりに案内文 |
| SCREEN-SUMMARY | STATE-POPULATED | AC3.1.1 | `?state=register-default` で収入 ¥280,000、支出 ¥119,220、差額 ¥160,780 |
| SCREEN-SUMMARY | STATE-NEGATIVE | AC3.1.2 | `?state=summary-negative` で差額に「−」 |
| SCREEN-SUMMARY | STATE-OVER-BUDGET | AC3.2.2 | `?state=summary-over-budget` で食費の残額に「超過 ¥3,900」 |
| SCREEN-SUMMARY | STATE-BUDGET-UNSET | AC3.2.3 | `?state=summary-budget-unset` で予算欄が空、残額「—」、案内文 |
| SCREEN-BUDGET | STATE-VALIDATION-ERROR | AC4.1.2 | `?state=budget-validation-error` で食費の予算欄に誤りの説明 |
| SCREEN-BUDGET | STATE-COPY-CONFIRM | AC4.2.2 | `?state=budget-copy-confirm` でボタンの下に上書き確認と「上書きする」「やめる」 |
| SCREEN-BUDGET | STATE-COPY-EMPTY | AC4.2.3 | `?state=budget-copy-empty` で「前の月の予算がありません」 |
| SCREEN-CSV | STATE-DEFAULT | AC5.1.5 | `?state=register-default` で「CSV には明細だけが含まれ、予算は含まれません」 |
| SCREEN-CSV | STATE-EXPORT-EMPTY | AC5.1.4 | `?state=csv-export-empty` で「出力する明細がありません」 |
| SCREEN-CSV | STATE-DUPLICATE-CONFIRM | AC6.3.1 | `?state=csv-duplicate-confirm` で「既存と同じ明細が 12 件あります」と3つの選択肢 |
| SCREEN-CSV | STATE-IMPORT-SUCCESS | AC6.1.1 | `?state=csv-import-success` で追加件数と内訳 |
| SCREEN-CSV | STATE-IMPORT-PARTIAL-ERROR | AC6.2.1 | `?state=csv-import-partial-error` で行番号と理由の一覧 |
| SCREEN-CSV | STATE-IMPORT-FILE-REJECTED | AC6.2.6 | `?state=csv-import-file-rejected` で UTF-8 以外を断る理由 |
| SCREEN-APP | STATE-STORAGE-CORRUPT | AC7.3.3 | `?state=app-storage-corrupt` で警告、登録・予算保存・取り込みが押せない |
| SCREEN-APP | STATE-OTHER-TAB-CHANGED | AC7.4.1 | `?state=app-other-tab-changed` で別タブの変更の知らせ |

読み込み中の状態は対象外です（ブラウザ内のデータだけで、通信を伴わないため）。

```ui-poc-contract
{
  "schema": 1,
  "stage": "refined-mockups",
  "arm": "C",
  "assets": [
    {"path": "assets/refined-mockup.html", "sha256": "bd4d3c3dbf0e78392818a531f8eb7c6af967df96cfdff67a3938babf71f4589f"}
  ],
  "mappings": [
    {"screen": "SCREEN-REGISTER", "state": "STATE-DEFAULT", "ac": "AC-1-1-1", "asset": "assets/refined-mockup.html", "check": "?state=register-default: entry form with kind, date, amount, category, memo and submit is in the first viewport"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-SAVED", "ac": "AC-1-1-1", "asset": "assets/refined-mockup.html", "check": "?state=register-saved: role=status notice names date, category and amount of the added entry"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-VALIDATION-ERROR", "ac": "AC-1-2-1", "asset": "assets/refined-mockup.html", "check": "?state=register-validation-error: amount field aria-invalid with a correction message via aria-describedby; typed value kept"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-OTHER-MONTH", "ac": "AC-1-3-1", "asset": "assets/refined-mockup.html", "check": "?state=register-other-month: month switches to 2026-09 and the notice includes date, category and amount"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-STORAGE-ERROR", "ac": "AC-7-3-1", "asset": "assets/refined-mockup.html", "check": "?state=register-storage-error: role=alert says saving failed, input is kept, and how to retry"},
    {"screen": "SCREEN-LEDGER", "state": "STATE-POPULATED", "ac": "AC-2-1-1", "asset": "assets/refined-mockup.html", "check": "?state=register-default: seven entries newest first with sign, yen symbol and thousands separators"},
    {"screen": "SCREEN-LEDGER", "state": "STATE-EMPTY", "ac": "AC-2-1-4", "asset": "assets/refined-mockup.html", "check": "?state=ledger-empty: guidance text instead of an empty table"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-POPULATED", "ac": "AC-3-1-1", "asset": "assets/refined-mockup.html", "check": "?state=register-default: income 280,000, expense 119,220, difference 160,780"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-NEGATIVE", "ac": "AC-3-1-2", "asset": "assets/refined-mockup.html", "check": "?state=summary-negative: difference shown with a minus sign"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-OVER-BUDGET", "ac": "AC-3-2-2", "asset": "assets/refined-mockup.html", "check": "?state=summary-over-budget: food remaining shows the text 超過 ¥3,900 in addition to color"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-BUDGET-UNSET", "ac": "AC-3-2-3", "asset": "assets/refined-mockup.html", "check": "?state=summary-budget-unset: empty budget inputs with 未設定 placeholder, remaining shows a dash, guidance shown"},
    {"screen": "SCREEN-BUDGET", "state": "STATE-VALIDATION-ERROR", "ac": "AC-4-1-2", "asset": "assets/refined-mockup.html", "check": "?state=budget-validation-error: food budget input aria-invalid with a correction message"},
    {"screen": "SCREEN-BUDGET", "state": "STATE-COPY-CONFIRM", "ac": "AC-4-2-2", "asset": "assets/refined-mockup.html", "check": "?state=budget-copy-confirm: inline confirmation below the buttons with overwrite and cancel"},
    {"screen": "SCREEN-BUDGET", "state": "STATE-COPY-EMPTY", "ac": "AC-4-2-3", "asset": "assets/refined-mockup.html", "check": "?state=budget-copy-empty: notice that the previous month has no budget"},
    {"screen": "SCREEN-CSV", "state": "STATE-DEFAULT", "ac": "AC-5-1-5", "asset": "assets/refined-mockup.html", "check": "?state=register-default: CSV text states that budgets are not included"},
    {"screen": "SCREEN-CSV", "state": "STATE-EXPORT-EMPTY", "ac": "AC-5-1-4", "asset": "assets/refined-mockup.html", "check": "?state=csv-export-empty: notice that there are no entries to export"},
    {"screen": "SCREEN-CSV", "state": "STATE-DUPLICATE-CONFIRM", "ac": "AC-6-3-1", "asset": "assets/refined-mockup.html", "check": "?state=csv-duplicate-confirm: inline confirmation with count 12 and three choices"},
    {"screen": "SCREEN-CSV", "state": "STATE-IMPORT-SUCCESS", "ac": "AC-6-1-1", "asset": "assets/refined-mockup.html", "check": "?state=csv-import-success: added, rejected and duplicate counts shown"},
    {"screen": "SCREEN-CSV", "state": "STATE-IMPORT-PARTIAL-ERROR", "ac": "AC-6-2-1", "asset": "assets/refined-mockup.html", "check": "?state=csv-import-partial-error: role=alert lists rejected row numbers with reasons"},
    {"screen": "SCREEN-CSV", "state": "STATE-IMPORT-FILE-REJECTED", "ac": "AC-6-2-6", "asset": "assets/refined-mockup.html", "check": "?state=csv-import-file-rejected: whole file refused with the UTF-8 reason and nothing added"},
    {"screen": "SCREEN-APP", "state": "STATE-STORAGE-CORRUPT", "ac": "AC-7-3-3", "asset": "assets/refined-mockup.html", "check": "?state=app-storage-corrupt: role=alert banner; register, budget save and import are disabled"},
    {"screen": "SCREEN-APP", "state": "STATE-OTHER-TAB-CHANGED", "ac": "AC-7-4-1", "asset": "assets/refined-mockup.html", "check": "?state=app-other-tab-changed: role=status banner says another tab changed data and it was reloaded"}
  ],
  "requiredMappings": [
    "SCREEN-REGISTER/STATE-DEFAULT/AC-1-1-1",
    "SCREEN-REGISTER/STATE-SAVED/AC-1-1-1",
    "SCREEN-REGISTER/STATE-VALIDATION-ERROR/AC-1-2-1",
    "SCREEN-REGISTER/STATE-OTHER-MONTH/AC-1-3-1",
    "SCREEN-REGISTER/STATE-STORAGE-ERROR/AC-7-3-1",
    "SCREEN-LEDGER/STATE-POPULATED/AC-2-1-1",
    "SCREEN-LEDGER/STATE-EMPTY/AC-2-1-4",
    "SCREEN-SUMMARY/STATE-POPULATED/AC-3-1-1",
    "SCREEN-SUMMARY/STATE-NEGATIVE/AC-3-1-2",
    "SCREEN-SUMMARY/STATE-OVER-BUDGET/AC-3-2-2",
    "SCREEN-SUMMARY/STATE-BUDGET-UNSET/AC-3-2-3",
    "SCREEN-BUDGET/STATE-VALIDATION-ERROR/AC-4-1-2",
    "SCREEN-BUDGET/STATE-COPY-CONFIRM/AC-4-2-2",
    "SCREEN-BUDGET/STATE-COPY-EMPTY/AC-4-2-3",
    "SCREEN-CSV/STATE-DEFAULT/AC-5-1-5",
    "SCREEN-CSV/STATE-EXPORT-EMPTY/AC-5-1-4",
    "SCREEN-CSV/STATE-DUPLICATE-CONFIRM/AC-6-3-1",
    "SCREEN-CSV/STATE-IMPORT-SUCCESS/AC-6-1-1",
    "SCREEN-CSV/STATE-IMPORT-PARTIAL-ERROR/AC-6-2-1",
    "SCREEN-CSV/STATE-IMPORT-FILE-REJECTED/AC-6-2-6",
    "SCREEN-APP/STATE-STORAGE-CORRUPT/AC-7-3-3",
    "SCREEN-APP/STATE-OTHER-TAB-CHANGED/AC-7-4-1"
  ]
}
```

## Approval Evidence

この段階では、追加の承認は必要ありません。詳細モックアップの承認は、AI-DLC の通常の承認ゲートで依頼者が行います。この契約自体は承認の記録を作りません。

実装の段階（Code Generation）の UI 契約は、この契約の写しと、依頼者が管理する別の承認台帳（`UI_POC_APPROVAL_LEDGER`）を必要とします。この台帳はまだありません。作業側では作りません。

## Testing Brief

まだ引き継ぐテスト契約はありません（テスト契約は実装の段階で作られます）。

確認済み:

- 見本のスクリプトの構文チェック（`node --check`）。
- 外部への通信がないこと（`http://`、`https://` を含まない）。
- ヘッドレスの Chrome で6つの状態を表示し、想定した文言が出ることを確認した。1280px 幅のスクリーンショットで見た目を確認し、二重の罫線を1件直した。

実装後に行う:

- 上の対応表の全状態について、Playwright で表示と文言を確認する。
- axe の検査（重大な違反 0 件）、キーボードだけの操作、200% 拡大（`accessibility-checklist.md`）。
- 依頼者が初めてでも 5 分以内に成功基準の操作を完了できるかの確認。
