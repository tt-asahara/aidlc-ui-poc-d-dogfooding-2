# UI 証跡の受け渡し — コード生成（U5 保存の異常・別タブ対応・サンプル）

この資料は、中心の成果物を補うもので、置き換えるものではありません。中心の成果物は `code-generation-plan.md`、`unit-test-instructions.md`、`code-summary.md`、`traceability.json`、`source-manifest.json` です。

## Artifact References

| 種類 | パス | 役割 |
|------|------|------|
| 上流の UI 契約（写し） | `upstream/refined-mockups/ui-poc-refined-contract.md` | 詳細モックアップの UI 契約の、バイト単位で同じ写し（sha256 48cc94db…b7557） |
| 上流の見本（写し） | `upstream/refined-mockups/assets/refined-mockup.html` | 詳細モックアップの見本の HTML の写し（sha256 bd4d3c3d…4589f） |
| 上流の正本 | `aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/` | interaction-spec.md の「全体のお知らせ枠」ほか |
| 機能設計 | `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/` | functional-spec.md（画面の証跡との対応表）、frontend-components.md |
| 実装 | `app/src/ui/NoticeBannerView.tsx`、`app/src/ui/AppShell.tsx`、`app/src/ui/styles/app.css` | U5 の画面部品 |
| ブラウザ操作のテスト | `app/tests/e2e/u5-storage-resilience/` | 下の対応表の状態を確かめるテスト |
| テストの約束 | `code-generation-plan.md` の Testing Contract（contract_sha256 sha256:e8e33eceb24ef59fd7d5dd84b7be934ecd74699ccbf99c456729515ac72c2d32） | 変えずに引き継ぐ |

詳細モックアップからの差分:

- 「保存できない」の知らせを足しました。詳細モックアップにない状態で、機能設計 Q3 で決めたものです。文言はレビューに合わせて直し、依頼者が確認しました。
- 知らせの役割（role）は知らせの要素に付け、空の領域は aria-live の要素として置きました（`code-summary.md` の「計画との違い」1）。

未決定の事項: なし。

## Screen State Acceptance Mapping

| 画面 | 状態 | 受け入れ条件 | 確かめ方（U5 の実装） |
|------|------|--------------|----------------------|
| SCREEN-APP | STATE-STORAGE-CORRUPT | AC7.3.3 | corrupt.spec.ts で、全体のお知らせ枠の role=alert と、登録・集計・CSV 保存の停止を確かめる |
| SCREEN-APP | STATE-OTHER-TAB-CHANGED | AC7.4.1 | cross-tab.spec.ts で、もう片方のページに role=status の知らせが出て、集計が更新されることを確かめる |

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
    {"screen": "SCREEN-APP", "state": "STATE-STORAGE-CORRUPT", "ac": "AC-7-3-3", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u5-storage-resilience/corrupt.spec.ts: role=alert banner; register, summary and CSV save are stopped; stored text unchanged"},
    {"screen": "SCREEN-APP", "state": "STATE-OTHER-TAB-CHANGED", "ac": "AC-7-4-1", "asset": "upstream/refined-mockups/assets/refined-mockup.html", "check": "app/tests/e2e/u5-storage-resilience/cross-tab.spec.ts: role=status banner says another tab changed data and the summary is refreshed"}
  ],
  "requiredMappings": [
    "SCREEN-APP/STATE-STORAGE-CORRUPT/AC-7-3-3",
    "SCREEN-APP/STATE-OTHER-TAB-CHANGED/AC-7-4-1"
  ]
}
```

## Approval Evidence

上流の詳細モックアップは、AI-DLC の通常の承認ゲートで依頼者が承認しています（2026-10-16）。UI の証跡の検査が求める別の承認台帳（`UI_POC_APPROVAL_LEDGER`）は、このプロジェクトにはありません。依頼者が管理するもので、作業側では作りません。

## Testing Brief

- 引き継ぐテストの約束: `code-generation-plan.md` の Testing Contract（変更なし）。
- 開発担当が実行して通ったもの: `npm --prefix app run verify` です。
  - 単体テスト 132 件
  - Playwright 83 件
  - 行カバレッジ 97.55%
  - check:dist 合格
