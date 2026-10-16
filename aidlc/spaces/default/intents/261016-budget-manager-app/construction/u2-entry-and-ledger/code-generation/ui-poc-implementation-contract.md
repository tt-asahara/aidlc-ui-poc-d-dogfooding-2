# UI 証跡の受け渡し — コード生成（U2 登録の検証と明細一覧）

この資料は、中心の成果物を補うもので、置き換えるものではありません。中心の成果物は `code-generation-plan.md`、`unit-test-instructions.md`、`code-summary.md`、`traceability.json`、`source-manifest.json` です。

## Artifact References

| 種類 | パス | 役割 |
|------|------|------|
| 上流の UI 契約（写し） | `upstream/refined-mockups/ui-poc-refined-contract.md` | 詳細モックアップの UI 契約の、バイト単位で同じ写し（sha256 48cc94db…b7557） |
| 上流の見本（写し） | `upstream/refined-mockups/assets/refined-mockup.html` | 詳細モックアップの見本の HTML の写し（sha256 bd4d3c3d…4589f） |
| 上流の正本 | `aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/` | interaction-spec.md の登録フォームと明細の一覧 |
| 機能設計 | `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/functional-design/` | functional-spec.md、frontend-components.md |
| 実装 | `app/src/ui/EntryFormView.tsx`、`app/src/ui/LedgerList.tsx`、`app/src/ui/ReviewView.tsx` | U2 の画面部品 |
| ブラウザ操作のテスト | `app/tests/e2e/u2-entry-and-ledger/` | 下の対応表の状態を確かめるテスト |
| テストの約束 | `code-generation-plan.md` の Testing Contract（contract_sha256 sha256:e8e33eceb24ef59fd7d5dd84b7be934ecd74699ccbf99c456729515ac72c2d32） | 変えずに引き継ぐ |

詳細モックアップからの差分:

- 別の月の知らせは、rules.md の文にそろえました。モックアップの「表示を…に切り替えました。」の1文は付けていません。
- 一覧の上に小見出しを置きました（`code-summary.md` の「計画・設計と違う点」2・3）。

未決定の事項: なし。

## Screen State Acceptance Mapping

| 画面 | 状態 | 受け入れ条件 | 確かめ方（U2 の実装） |
|------|------|--------------|----------------------|
| SCREEN-REGISTER | STATE-VALIDATION-ERROR | AC1.2.1 | validation.spec.ts で、金額欄の aria-invalid と欄の下の直し方、入力が残ることを確かめる |
| SCREEN-REGISTER | STATE-OTHER-MONTH | AC1.3.1 | other-month.spec.ts で、表示月の切り替えと、日付・カテゴリ・金額を含む知らせを確かめる |
| SCREEN-LEDGER | STATE-POPULATED | AC2.1.1 | ledger.spec.ts で、新しい順と、符号・¥・3桁区切りの金額を確かめる |
| SCREEN-LEDGER | STATE-EMPTY | AC2.1.4 | ledger.spec.ts で、表の代わりの案内文を確かめる |

```ui-poc-contract
{
  "schema": 1,
  "stage": "code-generation",
  "arm": "C",
  "upstream": {
    "path": "upstream/refined-mockups/ui-poc-refined-contract.md",
    "sha256": "48cc94dbde6b26dc1cafd8eab75f419a9f2e5fef2410f7067275a2ccc56b7557",
    "stage": "refined-mockups"
  },
  "assets": [
    {"path": "upstream/refined-mockups/assets/refined-mockup.html", "sha256": "bd4d3c3dbf0e78392818a531f8eb7c6af967df96cfdff67a3938babf71f4589f"}
  ],
  "mappings": [
    {"screen": "SCREEN-REGISTER", "state": "STATE-VALIDATION-ERROR", "ac": "AC-1-2-1", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u2-entry-and-ledger/validation.spec.ts: amount field aria-invalid with a correction message via aria-describedby; typed value kept"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-OTHER-MONTH", "ac": "AC-1-3-1", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u2-entry-and-ledger/other-month.spec.ts: month switches and the notice includes month, date, category and amount"},
    {"screen": "SCREEN-LEDGER", "state": "STATE-POPULATED", "ac": "AC-2-1-1", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u2-entry-and-ledger/ledger.spec.ts: entries newest first with sign, yen symbol and thousands separators"},
    {"screen": "SCREEN-LEDGER", "state": "STATE-EMPTY", "ac": "AC-2-1-4", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u2-entry-and-ledger/ledger.spec.ts: guidance text instead of an empty table"}
  ],
  "requiredMappings": [
    "SCREEN-REGISTER/STATE-VALIDATION-ERROR/AC-1-2-1",
    "SCREEN-REGISTER/STATE-OTHER-MONTH/AC-1-3-1",
    "SCREEN-LEDGER/STATE-POPULATED/AC-2-1-1",
    "SCREEN-LEDGER/STATE-EMPTY/AC-2-1-4"
  ]
}
```

## Approval Evidence

上流の詳細モックアップは、AI-DLC の通常の承認ゲートで依頼者が承認しています（2026-10-16）。UI の証跡の検査が求める別の承認台帳（`UI_POC_APPROVAL_LEDGER`）は、このプロジェクトにはありません。依頼者が管理するもので、作業側では作りません。

## Testing Brief

- 引き継ぐテストの約束: `code-generation-plan.md` の Testing Contract（変更なし）。
- 開発担当が実行して通ったもの: `npm --prefix app run verify` です。
  - 単体テスト 171 件
  - Playwright 128 件
  - 行カバレッジ 98.15%
- 手での確認: 日本語入力（`code-summary.md` の手順）。U2 の確認のときに行う。
