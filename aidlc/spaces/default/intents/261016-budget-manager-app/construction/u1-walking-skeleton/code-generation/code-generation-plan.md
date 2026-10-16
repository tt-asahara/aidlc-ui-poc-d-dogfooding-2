# コード生成の計画 — U1 薄い版（u1-walking-skeleton）

## Summary

- Builds: 登録 → 月次集計 → CSV 出力 → 再読み込みが端から端まで動く React + Vite + TypeScript のアプリの最初の版（walking skeleton）
- Touches: `app/`（新規。src・tests・設定）、`.github/workflows/app-ci.yml`（新規）、リポジトリ直下の `.gitignore`（追記）
- Tests: Vitest の単体テスト 約 55 件（9 部品、各 5〜8 件）、Playwright のブラウザ操作のテスト 約 12 件（流れ・保存失敗・壊れた保存データ・外部通信・axe・キーボード・画面幅・性能）、ビルド出力の検査 1 本

## 入力

- 機能設計: `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/`（functional-spec.md、rules.md BR1.1〜BR4.6、frontend-components.md）
- NFR 要件・設計: `construction/u1-walking-skeleton/nfr-requirements/`、`construction/u1-walking-skeleton/nfr-design/`（NFR1.1〜NFR8.1）
- インフラ設計: `construction/u1-walking-skeleton/infrastructure-design/`（起動、ポート 4173・4174、CI、check:dist）
- 約束ごと: `inception/contract-design/contract-summary.md`（C1〜C8。`committed` の知らせと exportAll の today を足す）
- 画面の証跡: `inception/refined-mockups/ui-poc-refined-contract.md`、`assets/refined-mockup.html`、`interaction-spec.md`、`accessibility-checklist.md`
- ストーリー: US1.1、US3.1、US5.1、US7.2、US7.3（登録の保存失敗）

前の工程から持ち越した軽微な点（この計画で反映する）:

- NFR 設計のレビュー R-06: 起動時と保存時の「保存領域へのアクセス失敗」は「保存データなし」として扱い、STORE_UNREADABLE は保存されている文字が壊れているときだけにする（Step 5・6）。

## 作るものの置き場所

| 場所 | 中身 |
|------|------|
| `app/package.json`、`app/package-lock.json`、`app/.nvmrc`（24） | 部品とコマンド（dev、build、serve、test、test:unit、coverage、lint、format:check、typecheck、check:dist、e2e、verify） |
| `app/index.html`、`app/vite.config.ts`、`app/tsconfig*.json` | ページと設定。ビルドのときだけ CSP の meta 要素を足す設定、assetsInlineLimit 0 |
| `app/src/domain/` | `result.ts`（C1）、`types.ts`（C2 の Entry など）、`categoryCatalog.ts`、`ledger.ts`、`monthlySummary.ts`、`csvExchange.ts`、`format.ts`（金額・日付の表示）、`month.ts`（月の計算） |
| `app/src/store/` | `dataStore.ts`（load・getSnapshot・commit・subscribe） |
| `app/src/ui/` | `AppShell.tsx`、`EntryFormView.tsx`、`ReviewView.tsx`、`ExportView.tsx`、`SectionBoundary.tsx`、`composition.ts`（差し込み口と組み立て）、`main.tsx`、`styles/app.css` |
| `app/tests/unit/` | Vitest の単体テスト（部品ごとに1ファイル） |
| `app/tests/e2e/u1-walking-skeleton/` | Playwright のテスト |
| `app/scripts/check-dist.mjs` | ビルド出力の検査 |
| `app/playwright.config.ts`、`app/vitest.config.ts`、`app/eslint.config.js`、`app/.prettierrc` | テストと品質の設定 |
| `.github/workflows/app-ci.yml` | GitHub Actions |

## 手順

### Step 1: 構成と本番の設定の骨組み

- [x] `app/` に Vite + React + TypeScript の構成を作る（`package.json`、`.nvmrc`、`index.html`、`tsconfig`、`src/ui/main.tsx` の最小の画面）。部品は React と React DOM だけを実行時の依存にする（NFR4.4）
- [x] `vite.config.ts` に、ビルドのときだけ `index.html` に CSP の meta 要素（security-design.md の指定のとおり）を足す設定と、`build.assetsInlineLimit: 0` を入れる。preview の設定にポートは書かない（NFR3.1、R-04、インフラ設計 R-03）
- [x] `package.json` の `serve` を `vite preview --host 127.0.0.1 --port 4173 --strictPort` にする（インフラ設計 Q1）
- [x] リポジトリ直下の `.gitignore` に `app/dist/`、`app/test-results/`、`app/playwright-report/`、`app/coverage/` を足す
- [x] `npm install` で部品を取得し、`npm audit` で critical・high がないことを確かめる（NFR4.4）
- ストーリー: すべての土台（US1.1、US3.1、US5.1、US7.2）

### Step 2: テストの実行環境の用意

- [x] Vitest（jsdom、Testing Library、カバレッジ v8、`app/src` の行カバレッジ 80% を下限。`src/ui/main.tsx` だけを計測から外し、理由を設定に書く）を設定する（NFR7.2）
- [x] ESLint（TypeScript・React の規則、`react/no-danger`、`no-eval`、`no-new-func`）と Prettier を設定する（NFR4.1、NFR7.4）
- [x] 最初の単体テストを1件置き、`unit-test-instructions.md` の U1 用のコマンドで動くことを確かめる
- ストーリー: なし（テストの準備）

### Step 3: データの形と固定の一覧 — 実装

- [x] `result.ts`: C1 の Result と AppError（code: VALIDATION・STORAGE_WRITE・STALE_REVISION・STORE_UNREADABLE・NOT_FOUND・FILE_REJECTED、fieldErrors）
- [x] `types.ts`: C2 の StoreSnapshot（schemaVersion 1、revision、savedAt、entries、budgets）、Entry、MonthlyBudget、EntryInput、MonthSummary、AppState
- [x] `categoryCatalog.ts`: 収入3つ・支出8つの固定の一覧と並び順、区分ごとの取り出し、区分とカテゴリの一致の判定（BR1.3、FR3.1）
- [x] `format.ts`: 金額の表示（¥・3桁区切り・負の「−」）、月名（2026年10月）、登録の知らせの日付（10月14日）（BR2.4、BR2.6、BR1.5）
- [x] `month.ts`: 今日を含む月、前後の月（年またぎ）（BR2.1、BR2.2）
- ストーリー: US1.1（AC1.1.2）、US3.1（AC3.1.2〜AC3.1.4）

### Step 4: データの形と固定の一覧 — テスト

- [x] `categoryCatalog.test.ts`（5 件以上）: 収入3つ・支出8つ、並び順、区分の一致、合わないカテゴリ、存在しないカテゴリ
- [x] `format.test.ts`（6 件以上）: ¥12,800、¥2,999,999,700、負の差額、0、月名、知らせの日付
- [x] `month.test.ts`（5 件以上）: 今日を含む月、2026-01 の前は 2025-12、2025-12 の次は 2026-01、月の途中、不正な入力の扱い
- [x] テストを実行して通す

### Step 5: 保存（DataStore） — 実装

- [x] `dataStore.ts`: localStorage の1つのキー（内部の値）を使う（NFR5.1）
- [x] load: 何もない → empty（明細0件・予算0件・通し番号 0 の空の保存データを書かずに持つ）。アクセス自体の失敗（例外） → empty と同じ扱い。JSON として読めない・schemaVersion が 1 でない → unreadable（保存データに触れない）（BR4.2、NFR4.3、NFR 設計 R-06）
- [x] commit: security-design.md の手順 1〜6（unreadable なら STORE_UNREADABLE、手元で組み立て、読み直して照合、違えば STALE_REVISION と externalChange、全体を1回で書く、書き込みの失敗は STORAGE_WRITE で手元を変えない、成功で committed）。アクセス失敗は「何もない」として手順 5 へ進む（BR4.1、BR4.4、BR4.5、NFR5.1〜NFR5.4、R-06）
- [x] getSnapshot、subscribe（committed・externalChange・unreadable）
- ストーリー: US7.2（AC7.2.1）、US7.3（AC7.3.1 の土台）

### Step 6: 保存（DataStore） — テスト

- [x] `dataStore.test.ts`（8 件）: 初回 empty、読み込み ready、壊れた JSON → unreadable で中身を変えない、版 2 → unreadable、アクセス失敗 → empty、commit 成功で revision 1 と committed、別の書き込みがあると STALE_REVISION と externalChange、書き込み失敗（QuotaExceededError）で STORAGE_WRITE と手元が変わらない、unreadable で commit → STORE_UNREADABLE
- [x] テストを実行して通す

### Step 7: 明細・集計・CSV の規則 — 実装

- [x] `ledger.ts`: validate（BR1.1 必須、BR1.2 金額、BR1.3 区分とカテゴリ、BR1.4 メモの前後の空白と 100 文字）、add（BR1.6 の ID と addedOrder、commit を呼ぶ）、listByMonth（日付の新しい順、同じ日付は addedOrder の大きい順）、listAll（古い順、同じ日付は addedOrder の小さい順）
- [x] `monthlySummary.ts`: summarize（BR2.3 収入・支出・差額、BR2.5 支出カテゴリ8つの実績、BR2.7 予算の差し込み口から null → 未設定）。予算の差し込み口（BudgetSource）を受け取る形にする（Q1）
- [x] `csvExchange.ts`: exportAll(today)（BR3.1〜BR3.5。UTF-8 BOM、CRLF、見出し、囲み、ファイル名、0件で NOT_FOUND）
- ストーリー: US1.1（AC1.1.1〜AC1.1.3）、US3.1（AC3.1.1、AC3.1.5、AC3.1.6）、US5.1（AC5.1.1、AC5.1.2、AC5.1.4）

### Step 8: 明細・集計・CSV の規則 — テスト

- [x] `ledger.test.ts`（8 件）: 正しい登録、必須の欠け、金額 0・小数・10,000,000・数字以外、区分とカテゴリの不一致、メモの前後の空白、ID と addedOrder、月ごとの並び順、保存失敗の結果を返す
- [x] `monthlySummary.test.ts`（7 件）: AC3.1.1 の例（差額 ¥160,780）、負の差額、カテゴリ別の合計 = 支出合計、実績0のカテゴリも出る、300 件 × 9,999,999、予算なしで null、3,000 件で 100 ミリ秒以内（NFR1.5）
- [x] `csvExchange.test.ts`（8 件）: 0件で NOT_FOUND、BOM と CRLF、見出し、古い順と同じ日付の順、カンマとダブルクォートの囲み、ファイル名の日付、`<b>` を含むメモがそのまま出る、3,000 件で 1 秒以内（NFR1.4）
- [x] テストを実行して通す

### Step 9: 画面 — 実装

- [x] `composition.ts`: 差し込み口（BudgetSource は空の一覧、SampleSeeder は何もせず今の保存データを ok で返す）と組み立て（Q1）
- [x] `AppShell.tsx`: 今日、AppState、起動（W1。サンプル投入の戻り値の扱い）、DataStore の知らせを画面へ伝える、最も外側の Error Boundary（NFR 設計 R-03）
- [x] `SectionBoundary.tsx`: 区切りごとの Error Boundary（「問題が起きました。ページを再読み込みしてください。保存済みのデータは消えていません」、詳しくは console.error）
- [x] `EntryFormView.tsx`: 区分（fieldset・legend・ラジオ）、日付（初期値は今日）、金額、カテゴリ（区分に合うものだけ・切り替えで解除）、メモ（maxLength 100、改行不可）、登録、お知らせ枠（成功は role=status、失敗は role=alert）、誤りのまとめ表示と最初の誤りの欄への移動、STORAGE_WRITE・STALE_REVISION・STORE_UNREADABLE の文言、unreadable で無効（W2〜W4、BR1.5、BR4.3、BR4.4、BR4.6）。ボタンの処理の予想外の例外は try/catch で捕まえて Error Boundary に渡す
- [x] `ReviewView.tsx`: 月の切り替え（aria-live）、収入・支出・差額、支出カテゴリ別の表（caption、th scope、予算「未設定」、残額「—」）、unreadable のときは集計の代わりに理由（W5、BR2.x、BR4.6）
- [x] `ExportView.tsx`: 説明文（予算は含まれない）、「明細を CSV に保存」、0件の知らせ、unreadable で無効と理由、Blob の一時的な URL でダウンロード（W6、BR3.5、BR3.6、BR4.6）
- [x] `styles/app.css`: 案A の縦並び、見出し「1 登録」「2 確認」「3 書き出し」、本文へ移動、3px の操作位置の枠線、コントラスト 4.5:1 以上、rem 単位、1024px 以上は2列・768〜1023px は1列。style 属性は使わない（CSP）
- [x] 操作する要素に data-testid を付ける
- ストーリー: US1.1、US3.1、US5.1、US7.2、US7.3（AC7.3.1）

### Step 10: 画面 — テスト

- [x] `EntryFormView.test.tsx`（8 件）: 初期表示、区分ごとの選択肢、切り替えで解除、成功の知らせ（role=status）、誤りのまとめと入力が残る、STORAGE_WRITE の alert と入力が残る、STALE_REVISION の文言、unreadable で無効と理由、`<b>太字</b>` が文字のまま
- [x] `ReviewView.test.tsx`（6 件）: 集計の表示、負の差額、前後の月、未設定と「—」、committed の知らせで再表示、unreadable で理由
- [x] `ExportView.test.tsx`（5 件）: 説明文、0件の知らせ、ダウンロードの呼び出しとファイル名、unreadable で無効、committed で知らせを消す
- [x] `AppShell.test.tsx`（5 件）: 起動時の月、empty・ready・unreadable、サンプルの差し込み口の ok・error の扱い、区切りの Error Boundary
- [x] テストを実行して通し、`npm run coverage` で行カバレッジ 80% 以上を確かめる

### Step 11: 本番の環境とビルドの設定

- [x] `scripts/check-dist.mjs` と `npm run check:dist`: CSP の meta 要素が指定どおり、index.html の src・href、CSS の url()・@import、JS の import() の行き先に外部と data: がない（NFR3.1、NFR3.2）
- [x] `playwright.config.ts`: Chromium・Firefox・WebKit、webServer で `vite preview --host 127.0.0.1 --port 4174 --strictPort` を起動（ビルド済みのページ）
- [x] Playwright のテスト（`tests/e2e/u1-walking-skeleton/`）:
  - 流れ（登録 → 集計 → CSV 出力 → 再読み込み。AC1.1.1、AC3.1.1、AC5.1.1、AC5.1.5、AC7.2.1）
  - 区分の切り替え（AC1.1.2、AC1.1.3）
  - 前後の月（AC3.1.3、AC3.1.4）
  - 0件の CSV（AC5.1.4）
  - 保存失敗（localStorage の書き込みを失敗させる。AC7.3.1）
  - 壊れた保存データ（AC7.3.3 の U1 分。登録・集計・CSV が止まり、中身が変わらない）
  - 外部通信 0 件と CSP が外部の読み込みを止める（NFR3.1、NFR3.3）
  - axe（5つの状態、NFR2.2）
  - キーボードだけの流れ（NFR2.3）
  - 画面幅 1280px・800px と 200% 相当（NFR6.2、NFR6.3）
  - 見出しの順番（NFR8.1）
  - 性能（Chromium だけ。3,000 件で登録・月の切り替え・起動が 1 秒以内、3回の中央値。NFR1.1〜NFR1.3）
- [x] `npm run verify`（format:check → lint → typecheck → coverage → build → check:dist → e2e）を用意し、通す（NFR7.5）
- [x] `.github/workflows/app-ci.yml`: インフラ設計の cicd-pipeline.md のとおり（feat/budget-manager-app と feat/** への push、main 向けの Pull Request、paths、concurrency、timeout 15 分、node-version-file app/.nvmrc、cache-dependency-path app/package-lock.json、contents: read、npm ci → format:check → lint → typecheck → coverage → build → check:dist）
- ストーリー: US1.1、US3.1、US5.1、US7.2、US7.3

### Step 12: 説明と記録

- [x] `app/README.md`: 起動の手順（npm ci → build → serve → http://127.0.0.1:4173/）、テストの実行、データの控え（CSV）
- [ ] すべての手順の完了を確かめ、`code-summary.md`、`source-manifest.json`、`traceability.json`、`ui-poc-implementation-contract.md` を作る（オーケストレーターが Step 5 で作る）

## ストーリーと手順の対応

| ストーリー | 受け入れ条件 | 手順 |
|-----------|--------------|------|
| US1.1 | AC1.1.1〜AC1.1.3（AC1.1.4〜AC1.1.6 は U2） | Step 3、7、9、10、11 |
| US3.1 | AC3.1.1〜AC3.1.6 | Step 3、4、7、8、9、10、11 |
| US5.1 | AC5.1.1、AC5.1.2、AC5.1.4、AC5.1.5（AC5.1.3 は U4） | Step 7、8、9、10、11 |
| US7.2 | AC7.2.1（明細の部分） | Step 5、6、11 |
| US7.3 | AC7.3.1（AC7.3.3 は U1 分のみ） | Step 5、6、9、10、11 |

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

API / endpoint の層は、サーバーを持たないため対象外です（部品どうしの呼び出しは、明細・集計・CSV の規則の層で確かめます）。
