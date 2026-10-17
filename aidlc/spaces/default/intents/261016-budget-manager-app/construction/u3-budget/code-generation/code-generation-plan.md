# コード生成の計画 — U3 月別予算と予算比較（u3-budget）

## Summary

- Builds: 予算の部品（Budget）、予算の入力と保存、前の月の予算のコピーと上書きの確認、予算比較（予算・実績・残額・超過・未設定）、予算の保存の失敗の表示（U1・U5・U2 のアプリに積む）
- Touches: `app/src/domain/`（budget を新規、types の AppState を変更）、`app/src/ui/`（BudgetTable を新規、ReviewView・AppShell・composition・styles を変更）、`app/tests/`
- Tests: Vitest の単体テスト 約 30 件（新規 3 ファイル）、Playwright のブラウザ操作のテスト 約 10 件（新規 4 ファイル）

## 入力

- 機能設計: `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/`（functional-spec.md の W1〜W6 と「欄の入力値を作り直すきっかけ」、rules.md の BR1.1〜BR5.3、frontend-components.md）
- NFR 要件・設計: `construction/u3-budget/nfr-requirements/`、`construction/u3-budget/nfr-design/`（externalChangeSeq と「1回だけ無視する印」、読めない状態、予算の保存の範囲）
- インフラ設計: `construction/u3-budget/infrastructure-design/`（U1 のまま。テストは `tests/e2e/u3-budget/`）
- 約束ごと: `inception/contract-design/contract-summary.md`（C2 の budgetsToReplace、C4、C5、C6）
- 画面の証跡: `inception/refined-mockups/ui-poc-refined-contract.md`、`assets/refined-mockup.html`（summary-over-budget、summary-budget-unset、budget-validation-error、budget-copy-confirm、budget-copy-empty）、`interaction-spec.md`
- 実装済み: `app/src/domain/monthlySummary.ts`（BudgetSource）、`app/src/store/dataStore.ts`、`app/src/ui/ReviewView.tsx`、`app/src/ui/AppShell.tsx`、`app/src/ui/composition.ts`、`app/src/domain/types.ts`、`app/src/domain/sampleDataSeeder.ts`
- ストーリー: US3.2、US4.1、US4.2、AC7.3.2（予算の部分）、持ち越しの AC7.2.1（予算の部分）と AC7.1.2

前の工程から持ち越した軽微な点（この計画で反映する）:

- **機能設計レビュー R-06・R-07、NFR 設計の決定:**
  - AppState に externalChangeSeq（externalChange ごとに1増える）を足す。
  - externalChangeSeq を AppShell → ReviewView → BudgetTable と渡す。
  - 「1回だけ無視する印」は、この番号で判断する（Step 1・5）。
- **NFR 設計レビュー R-01:** BudgetTable は、既存のテストが頼る形を残す（Step 5）。
  - 表の名前「支出カテゴリ別の予算と実績」
  - 列の順と見出し（カテゴリ・予算（円）・実績・残額）
  - data-testid の review-category-table
  - 予算欄のセルの「未設定」の文字（プレースホルダーに加え、予算のない行では見える文字としても出す）

  ReviewView の新しい受け取るもの（budget、externalChangeSeq）は省略できる形にする。省略時は予算の編集を出さず、U1 の表示のままにする。AppShell は必ず渡す。
- **NFR 設計レビュー R-02:** domain/types.ts の AppState に externalChangeSeq を足し、AppShell の初期化で 0 を与える（Step 1）。
- **NFR 設計レビュー R-03:** 「無視する番号」は、commit を呼ぶ前の描画済みの externalChangeSeq + 1 とする（Step 5）。本物の DataStore と AppShell を使い、別のタブが先に保存して STALE_REVISION を起こす単体テストを置く（Step 6）。
- **インフラ設計レビュー R-01:** NFR1.1・NFR1.2 の計測は、`app/tests/e2e/support/largeData.ts` の 3,000 件の保存データで行う（Step 7）。
- **インフラ設計レビュー R-02:** 超過と未設定のブラウザ操作のテストは、U5 の sample.spec.ts と同じくサンプルの保存データから始め、前の月は今日の日付から計算する（Step 7）。

## 作るものと変えるものの置き場所

| 場所 | 中身 |
|------|------|
| `app/src/domain/budget.ts`（新規） | C4 の getMonth、saveMonth、previewCopy、copyFromPrevious（BR1.1〜BR1.3、BR3.1〜BR3.4） |
| `app/src/domain/types.ts`（変更） | AppState.externalChangeSeq |
| `app/src/ui/BudgetTable.tsx`（新規） | 予算の表、予算欄、保存、コピー、確認の枠、知らせ、欄の作り直し（BR2.x、BR3.3、BR4.x、BR5.x） |
| `app/src/ui/ReviewView.tsx`（変更） | U1 の支出カテゴリ別の表を BudgetTable に置き換える（budget があるとき） |
| `app/src/ui/AppShell.tsx`（変更） | externalChangeSeq、budget と externalChangeSeq を ReviewView に渡す |
| `app/src/ui/composition.ts`（変更） | Budget を作り、予算の差し込み口を Budget.getMonth に差し替え、AppServices に budget を足す（createAppServices と createBrowserAppServices の両方） |
| `app/src/ui/styles/app.css`（変更） | 予算欄、超過の色、確認の枠、注意書き |
| `app/tests/unit/` | 新規の単体テスト |
| `app/tests/e2e/u3-budget/` | 新規のブラウザ操作のテスト |

## 手順

### Step 1: 予算の部品と状態の型 — 実装

- [x] `types.ts`: AppState に externalChangeSeq: number を足す
- [x] `budget.ts`: <br>・getMonth（表示中の月の予算だけ）<br>・saveMonth（8つの支出カテゴリの値だけを読み、欠けは空。前後の空白を除き、半角数字だけの 0〜9,999,999。空は未設定。1つでも誤りなら VALIDATION と fieldErrors の budget:<カテゴリ名>。誤りがなければ budgetsToReplace の commit を1回。expectedRevision は commit 直前の store.getSnapshot().revision）<br>・previewCopy（前の月 = 表示中の月の1か月前。前の月に予算がなければ NOT_FOUND。targetHasBudgets）<br>・copyFromPrevious（呼んだ時点の保存データから前の月の予算を取り、month と budgetKey を付け替えて、表示中の月をまるごと置き換える commit を1回）
- [x] `composition.ts`: Budget を作って services.budget に入れ、予算の差し込み口を Budget.getMonth にする
- ストーリー: US3.2、US4.1、US4.2

### Step 2: 予算の部品 — テスト

- [x] `tests/unit/domain/budget.test.ts`（12 件）:<br>・AC4.1.1（40000 で保存、ほかの月は変わらない）<br>・境界（-1、1.5、10000000、全角数字は誤り、0 は保存できる）<br>・空欄で未設定（AC4.1.3）<br>・1つの誤りで何も保存しない<br>・支出カテゴリ以外は読まない<br>・明細の数が変わらない（NFR5.1）<br>・保存後の保存データが validateSnapshot を通る（NFR5.3）<br>・コピー元なしで NOT_FOUND（AC4.2.3）<br>・targetHasBudgets の真偽<br>・まるごと置き換え（前の月で未設定のカテゴリは未設定になる）<br>・1月の前の月は前の年の12月<br>・STORAGE_WRITE と STALE_REVISION の結果
- [x] U1 の MonthlySummary のテストが変更なしで通ることを確かめる
- [x] テストを実行して通す

### Step 3: 予算の表 — 実装（画面）

- [x] `BudgetTable.tsx`:<br>・表（caption「YYYY年M月の支出カテゴリ別の予算と実績」、表の名前「支出カテゴリ別の予算と実績」、列見出しはカテゴリ・予算（円）・実績・残額、data-testid は review-category-table）<br>・予算欄（label「<カテゴリ名>の予算（円）」、inputmode="numeric"、プレースホルダー「未設定」）<br>・残額（予算 − 実績、「超過 ¥N」と超過の色、未設定は「—」）<br>・注意書き「「予算を保存」を押すまで、予算は保存されません」<br>・「予算を保存」「前の月の予算をコピー」<br>・確認の枠（role="group"、見出し、文、未保存の入力があるときの添え書き、「上書きする」「やめる」、Escape は枠の中の keydown）<br>・お知らせ枠（成功は status、失敗とまとめは alert。文は rules.md のとおり）<br>・欄の誤り（budget-<カテゴリ名>-error、aria-invalid、aria-describedby）と最初の誤りの欄への操作位置
- [x] 欄の作り直し（BR4.3）: month の変化、自分の保存・コピーの成功、externalChangeSeq の変化（無視する番号と一致すれば作り直さず印を消す）でだけ作り直す。dataVersion では作り直さない。dirty は欄の値と保存済みの予算を比べて決める
- [x] 別のタブの変更（BR4.2）: 確認の枠が開いていれば閉じて取り消しの知らせ。開いておらず dirty なら置き換えの知らせ
- [x] 保存とコピーの失敗（BR5.1）: 文言、入力を残す、コピーの失敗では枠を閉じてコピーのボタンへ。STALE_REVISION なら、commit を呼ぶ前の描画済みの externalChangeSeq + 1 を「無視する番号」として覚える
- [x] 読めない状態（BR5.2）: 表、欄、ボタンを出さない
- ストーリー: US3.2、US4.1、US4.2、AC7.3.2

### Step 4: 予算の表の組み込み — 実装

- [x] `ReviewView.tsx`: budget と externalChangeSeq を省略できる形で受け取り、budget があれば U1 の支出カテゴリ別の表の代わりに BudgetTable を置く。省略時は U1 の表示のまま
- [x] `AppShell.tsx`: externalChangeSeq（初期値 0、externalChange ごとに1増やす）、services.budget と externalChangeSeq を ReviewView に渡す
- [x] `styles/app.css`: 予算欄、超過の色（コントラスト 4.5:1 以上）、確認の枠、注意書き（style 属性は使わない）

### Step 5: 画面 — テスト

- [x] `tests/unit/ui/BudgetTable.test.tsx`（14 件）:<br>・表示（AC3.2.1、超過 AC3.2.2、未設定 AC3.2.3、収入なし AC3.2.4）<br>・保存の成功と知らせ<br>・誤りの欄と操作位置<br>・確認の枠（開く、上書きする、やめる、Escape、操作位置）<br>・dirty のときの確認と添え書き<br>・コピー元なし<br>・保存の失敗で入力が残る（STORAGE_WRITE、STALE_REVISION）<br>・コピーの失敗で枠が閉じる<br>・別のタブの変更（枠を閉じる、置き換えの知らせ）<br>・ほかの部品の保存（dataVersion）で入力が残る<br>・月の切り替えで入力を捨てる<br>・読めない状態で欄とボタンがない・保存が呼ばれない
- [x] `tests/unit/ui/AppShell.u3.test.tsx`（4 件）:<br>・本物の DataStore と偽の保存領域で、別のタブが先に書いたあと予算を保存すると、STALE_REVISION の直後の番号の変化では入力が残る<br>・その次の別タブの変更では作り直される（R-03）<br>・externalChangeSeq が知らせごとに1増える<br>・予算の差し込み口が本物になっている
- [x] U1・U5・U2 の UI のテスト（ReviewView・AppShell など）が通ることを確かめる。期待を変える場合は理由をコードのまとめに書く
- [x] テストを実行して通す

### Step 6: 予算の部品の結合の確認

- [x] Step 5 の AppShell.u3 のテストで、Budget → DataStore → AppShell → BudgetTable の結合を確かめる（偽の保存領域を使う）

### Step 7: ブラウザ操作のテスト

- [x] `tests/e2e/u3-budget/`:<br>・`save.spec.ts`（AC4.1.1〜AC4.1.3、AC3.2.1、再読み込みで残る AC7.2.1 の予算の部分、NFR1.1 を largeData.ts の 3,000 件で Chromium 計測）<br>・`compare.spec.ts`（サンプルの保存データから始め、今日から計算した前の月で、食費の超過と娯楽・その他支出の未設定。AC3.2.2〜AC3.2.4、AC7.1.2）<br>・`copy.spec.ts`（AC4.2.1〜AC4.2.3、上書きする・やめる・Escape、NFR1.2 を 3,000 件で計測）<br>・`failure-and-a11y.spec.ts`（AC7.3.2 の予算の部分、5つの状態の axe）
- [x] U1・U5・U2 のブラウザ操作のテストが通り続けることを確かめる

### Step 8: 仕上げ

- [x] 承認済みの確認コマンド `npm --prefix app run verify` を通す（行カバレッジ 80% 以上、型の検査、Prettier、ESLint、ビルド、check:dist、Playwright）
- [x] `app/README.md` に、予算の入力・コピー・予算比較を1段落ずつ足す

## ストーリーと手順の対応

| ストーリー | 受け入れ条件 | 手順 |
|-----------|--------------|------|
| US3.2 | AC3.2.1〜AC3.2.4 | Step 1〜7 |
| US4.1 | AC4.1.1〜AC4.1.3 | Step 1〜7 |
| US4.2 | AC4.2.1〜AC4.2.3 | Step 1〜7 |
| US7.3 | AC7.3.2（予算の部分） | Step 3、5、7 |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "テスト可能な層ごとに、まずその層を実装し、そのあとでその層のテストを書いて実行し、通ってから次の層に進む。",
  "scope": "ui-poc-application",
  "test_strategy": "standard",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "テストは各 Bolt の成果物の一部として扱う。\n\n- **Methodology**: test-after\n- **Methodology evidence**: 依頼者が Q1 で「実装してからテストを書く（テスト可能な部分ごとに、実装 → テストの順）」を選んだ。org.md の既定とも一致する。\n- **Ordering**: テスト可能な層ごとに、まずその層を実装し、そのあとでその層のテストを書いて実行し、通ってから次の層に進む。\n- **カバレッジの下限**: 行カバレッジ 80% 以上を保つ。下限を下げてステップを通すことはしない。\n- **テストツール**: 単体テストに Vitest、ブラウザ操作のテストに Playwright を使う。\n- **統合後の再実行**: 並行作業を `feat/budget-manager-app` へ統合したあとは、テストを再実行して結果を確認する。\n- **既存テストの維持**: 既存のテストが通る状態を保つ。"
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:258530442704ecc5283434ba235b08897f24899bdb7f24244adb52299988433f",
  "contract_sha256": "sha256:e8e33eceb24ef59fd7d5dd84b7be934ecd74699ccbf99c456729515ac72c2d32"
}
```

テストの実行環境（Vitest・Playwright）は U1 で用意済みです。保存の層（DataStore）は変えません。API / endpoint の層は、サーバーを持たないため対象外です。
