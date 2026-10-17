# UI 証跡の受け渡し — コード生成（U3 月別予算と予算比較）

この資料は、中心の成果物を補うもので、置き換えるものではありません。中心の成果物は `code-generation-plan.md`、`unit-test-instructions.md`、`code-summary.md`、`traceability.json`、`source-manifest.json` です。

## Artifact References

| 種類 | パス | 役割 |
|------|------|------|
| 上流の UI 契約（写し） | `upstream/refined-mockups/ui-poc-refined-contract.md` | 詳細モックアップの UI 契約の、バイト単位で同じ写し（sha256 48cc94db…b7557） |
| 上流の見本（写し） | `upstream/refined-mockups/assets/refined-mockup.html` | 詳細モックアップの見本の HTML の写し（sha256 bd4d3c3d…4589f） |
| 上流の正本 | `aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/` | interaction-spec.md の予算比較と予算の設定 |
| 機能設計 | `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/` | functional-spec.md、frontend-components.md |
| 実装 | `app/src/domain/budget.ts`、`app/src/ui/BudgetTable.tsx`、`app/src/ui/ReviewView.tsx` | U3 の部品 |
| ブラウザ操作のテスト | `app/tests/e2e/u3-budget/` | 下の対応表の状態を確かめるテスト |
| テストの約束 | `code-generation-plan.md` の Testing Contract（contract_sha256 sha256:e8e33eceb24ef59fd7d5dd84b7be934ecd74699ccbf99c456729515ac72c2d32） | 変えずに引き継ぐ |

詳細モックアップからの差分:

- 知らせの文は rules.md の文にそろえました。モックアップの補足文（コピーの確認とコピー元なしの本文）は付けていません（`code-summary.md` の「計画・設計と違う点」2）。
- SCREEN-SUMMARY の STATE-POPULATED と STATE-NEGATIVE は U1 で確かめ済みのため、ここでは対象にしていません。

未決定の事項: なし。

## Screen State Acceptance Mapping

| 画面 | 状態 | 受け入れ条件 | 確かめ方（U3 の実装） |
|------|------|--------------|----------------------|
| SCREEN-SUMMARY | STATE-OVER-BUDGET | AC3.2.2 | compare.spec.ts で、前の月の食費の残額に「超過 ¥3,900」が文字と色で出ることを確かめる |
| SCREEN-SUMMARY | STATE-BUDGET-UNSET | AC3.2.3 | compare.spec.ts で、予算のないカテゴリの予算欄が空、残額が「—」になることを確かめる |
| SCREEN-BUDGET | STATE-VALIDATION-ERROR | AC4.1.2 | save.spec.ts で、-1・1.5・10000000 が保存されず、欄の下に理由が出て値が残ることを確かめる |
| SCREEN-BUDGET | STATE-COPY-CONFIRM | AC4.2.2 | copy.spec.ts で、上書きの確認と「上書きする」「やめる」、Escape で何も変わらないことを確かめる |
| SCREEN-BUDGET | STATE-COPY-EMPTY | AC4.2.3 | copy.spec.ts で、「前の月の予算がありません」が出て予算が変わらないことを確かめる |

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
    {"screen": "SCREEN-SUMMARY", "state": "STATE-OVER-BUDGET", "ac": "AC-3-2-2", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u3-budget/compare.spec.ts: previous month food remaining shows the text 超過 ¥3,900 in addition to color"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-BUDGET-UNSET", "ac": "AC-3-2-3", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u3-budget/compare.spec.ts: categories without a budget show an empty input and a dash for remaining"},
    {"screen": "SCREEN-BUDGET", "state": "STATE-VALIDATION-ERROR", "ac": "AC-4-1-2", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u3-budget/save.spec.ts: invalid budgets are not saved, input aria-invalid with a reason, typed value kept"},
    {"screen": "SCREEN-BUDGET", "state": "STATE-COPY-CONFIRM", "ac": "AC-4-2-2", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u3-budget/copy.spec.ts: inline confirmation with overwrite and cancel; cancel and Escape change nothing"},
    {"screen": "SCREEN-BUDGET", "state": "STATE-COPY-EMPTY", "ac": "AC-4-2-3", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u3-budget/copy.spec.ts: notice that the previous month has no budget; budgets unchanged"}
  ],
  "requiredMappings": [
    "SCREEN-SUMMARY/STATE-OVER-BUDGET/AC-3-2-2",
    "SCREEN-SUMMARY/STATE-BUDGET-UNSET/AC-3-2-3",
    "SCREEN-BUDGET/STATE-VALIDATION-ERROR/AC-4-1-2",
    "SCREEN-BUDGET/STATE-COPY-CONFIRM/AC-4-2-2",
    "SCREEN-BUDGET/STATE-COPY-EMPTY/AC-4-2-3"
  ]
}
```

## Approval Evidence

上流の詳細モックアップは、AI-DLC の通常の承認ゲートで依頼者が承認しています（2026-10-16）。UI の証跡の検査が求める別の承認台帳（`UI_POC_APPROVAL_LEDGER`）は、このプロジェクトにはありません。依頼者が管理するもので、作業側では作りません。

## Testing Brief

- 引き継ぐテストの約束: `code-generation-plan.md` の Testing Contract（変更なし）。
- 開発担当が実行して通ったもの: `npm --prefix app run verify` です。
  - 単体テスト 201 件
  - Playwright 166 件（スキップ 20 件）
  - 行カバレッジ 98.13%
- 手での確認: U3 の確認のときに、ブラウザで予算の保存・超過・コピーを見ていただきます。
