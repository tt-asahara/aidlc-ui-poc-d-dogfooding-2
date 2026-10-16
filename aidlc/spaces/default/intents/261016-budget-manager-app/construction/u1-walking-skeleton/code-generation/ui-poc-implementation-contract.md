# UI 証跡の受け渡し — コード生成（U1 薄い版）

この資料は、中心の成果物を補うもので、置き換えるものではありません。中心の成果物は `code-generation-plan.md`、`unit-test-instructions.md`、`code-summary.md`、`traceability.json`、`source-manifest.json` です。

## Artifact References

| 種類 | パス | 役割 |
|------|------|------|
| 上流の UI 契約（写し） | `upstream/refined-mockups/ui-poc-refined-contract.md` | 詳細モックアップの UI 契約の、バイト単位で同じ写し（sha256 48cc94db…b7557） |
| 上流の見本（写し） | `upstream/refined-mockups/assets/refined-mockup.html` | 詳細モックアップの見本の HTML の写し（sha256 bd4d3c3d…4589f） |
| 上流の正本 | `aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/` | mockups.md、interaction-spec.md、design-system-mapping.md、accessibility-checklist.md（エンジンが扱う正本。写しはその証跡） |
| 機能設計 | `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/` | functional-spec.md（画面の証跡との対応表）、frontend-components.md |
| 実装 | `app/src/ui/`、`app/src/ui/styles/app.css` | U1 の画面部品 |
| ブラウザ操作のテスト | `app/tests/e2e/u1-walking-skeleton/` | 下の対応表の状態を確かめるテスト |
| テストの約束 | `code-generation-plan.md` の Testing Contract（contract_sha256 sha256:e8e33eceb24ef59fd7d5dd84b7be934ecd74699ccbf99c456729515ac72c2d32） | 変えずに引き継ぐ |

詳細モックアップからの差分:

- U1 で実装した状態は7つです（下の表）。ほかの状態は U2〜U5 で実装します。
- 文言の違いは3つです。0件の CSV の知らせを短くしました。集計の表の説明から予算の入力の案内を外しました。カテゴリの選択欄に「選んでください」を足しました（`code-summary.md` の「計画との違い」4）。

未決定の事項: なし。

## Screen State Acceptance Mapping

| 画面 | 状態 | 受け入れ条件 | 確かめ方（U1 の実装） |
|------|------|--------------|----------------------|
| SCREEN-REGISTER | STATE-DEFAULT | AC1.1.1 | flow.spec.ts で、登録フォームの5項目と「登録する」が最初の表示範囲にあることを確かめる |
| SCREEN-REGISTER | STATE-SAVED | AC1.1.1 | flow.spec.ts で、「登録しました 10月14日 食費 ¥1,280」が role=status で出ることを確かめる |
| SCREEN-REGISTER | STATE-STORAGE-ERROR | AC7.3.1 | storage-failures.spec.ts で、書き込みの失敗のとき role=alert の文言が出て、入力が残ることを確かめる |
| SCREEN-SUMMARY | STATE-POPULATED | AC3.1.1 | flow.spec.ts で、収入・支出・差額と支出カテゴリ別の実績を確かめる |
| SCREEN-SUMMARY | STATE-NEGATIVE | AC3.1.2 | ReviewView の単体テストと format の単体テストで「−」の表示を確かめる |
| SCREEN-CSV | STATE-DEFAULT | AC5.1.5 | flow.spec.ts で、「CSV には明細だけが含まれ、予算は含まれません」の表示を確かめる |
| SCREEN-CSV | STATE-EXPORT-EMPTY | AC5.1.4 | flow.spec.ts で、0件のとき「出力する明細がありません」が出て、ファイルができないことを確かめる |

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
    {"screen": "SCREEN-REGISTER", "state": "STATE-DEFAULT", "ac": "AC-1-1-1", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u1-walking-skeleton/flow.spec.ts: entry form with kind, date, amount, category, memo and submit is visible in the first viewport"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-SAVED", "ac": "AC-1-1-1", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u1-walking-skeleton/flow.spec.ts: role=status notice names date, category and amount of the added entry"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-STORAGE-ERROR", "ac": "AC-7-3-1", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u1-walking-skeleton/storage-failures.spec.ts: role=alert says saving failed, input is kept, and how to retry"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-POPULATED", "ac": "AC-3-1-1", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u1-walking-skeleton/flow.spec.ts: income, expense and difference reflect the registered entry"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-NEGATIVE", "ac": "AC-3-1-2", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/unit/ui/ReviewView.test.tsx: difference shown with a minus sign"},
    {"screen": "SCREEN-CSV", "state": "STATE-DEFAULT", "ac": "AC-5-1-5", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u1-walking-skeleton/flow.spec.ts: CSV text states that budgets are not included"},
    {"screen": "SCREEN-CSV", "state": "STATE-EXPORT-EMPTY", "ac": "AC-5-1-4", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u1-walking-skeleton/flow.spec.ts: notice that there are no entries to export and no download"}
  ],
  "requiredMappings": [
    "SCREEN-REGISTER/STATE-DEFAULT/AC-1-1-1",
    "SCREEN-REGISTER/STATE-SAVED/AC-1-1-1",
    "SCREEN-REGISTER/STATE-STORAGE-ERROR/AC-7-3-1",
    "SCREEN-SUMMARY/STATE-POPULATED/AC-3-1-1",
    "SCREEN-SUMMARY/STATE-NEGATIVE/AC-3-1-2",
    "SCREEN-CSV/STATE-DEFAULT/AC-5-1-5",
    "SCREEN-CSV/STATE-EXPORT-EMPTY/AC-5-1-4"
  ]
}
```

## Approval Evidence

上流の詳細モックアップは、AI-DLC の通常の承認ゲートで依頼者が承認しています（2026-10-16、refined-mockups の承認）。

UI の証跡の検査が求める別の承認台帳（`UI_POC_APPROVAL_LEDGER`）は、このプロジェクトにはありません。依頼者が管理するもので、作業側では作りません。そのため、UI の証跡の検査（ui-poc-evidence）は、この点で失敗する見込みです。失敗した場合は、内容を示して依頼者の判断を受けます。

## Testing Brief

- 引き継ぐテストの約束: `code-generation-plan.md` の Testing Contract（変更なし。contract_sha256 sha256:e8e33eceb24ef59fd7d5dd84b7be934ecd74699ccbf99c456729515ac72c2d32）。
- 開発担当が実行して通ったもの: `npm run verify`（単体 89 件、Playwright 54 件、行カバレッジ 95.02%、check:dist 合格）。
- ビルドとテストの工程で行うこと: 承認された確認コマンドの実行結果、3種類のブラウザでの結果、キーボード操作、画面幅を記録します。macOS でのカテゴリの選択欄のキーボード操作は、人の手で確かめます。
