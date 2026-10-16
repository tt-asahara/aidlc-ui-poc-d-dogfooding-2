# コード生成の計画 — U5 保存の異常・別タブ対応・サンプル（u5-storage-resilience）

## Summary

- Builds: 保存データの詳しい検査、別のタブの変更の検知、保存できない環境と壊れた保存データの全体のお知らせ枠、初回のサンプルデータ（U1 のアプリに積む）
- Touches: `app/src/domain/`（validateSnapshot・sampleDataSeeder を新規、ledger に assignIdentities）、`app/src/store/dataStore.ts`、`app/src/ui/`（NoticeBannerView を新規、AppShell・composition・styles）、`app/tests/`
- Tests: Vitest の単体テスト 約 41 件（新規 6 ファイル）、Playwright のブラウザ操作のテスト 約 10 件（新規 5 ファイル。サンプル・壊れた保存データ・保存できない環境・2つのページ・axe）

## 入力

- 機能設計: `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/`（functional-spec.md の W1〜W6、rules.md の BR1.1〜BR5.4、frontend-components.md）
- NFR 要件・設計: `construction/u5-storage-resilience/nfr-requirements/`、`construction/u5-storage-resilience/nfr-design/`（NFR1.1〜NFR8.1）
- インフラ設計: `construction/u5-storage-resilience/infrastructure-design/`（U1 のまま。テストは `tests/e2e/u5-storage-resilience/`）
- 約束ごと: `inception/contract-design/contract-summary.md`（C2・C3・C6・C9。U5 で足すのは getAvailability、dispose、validateSnapshot、Ledger.assignIdentities、AppState.storageAvailable）
- 画面の証跡: `inception/refined-mockups/ui-poc-refined-contract.md`、`assets/refined-mockup.html`（app-storage-corrupt、app-other-tab-changed）、`interaction-spec.md`（全体のお知らせ枠）
- U1 の実装: `app/src/store/dataStore.ts`、`app/src/ui/AppShell.tsx`、`app/src/ui/composition.ts`、`app/src/domain/ledger.ts`
- ストーリー: US7.1（AC7.1.1〜AC7.1.4）、US7.3（AC7.3.3、AC7.3.4）、US7.4（AC7.4.1、AC7.4.2）

前の工程から持ち越した軽微な点（この計画で反映する）:

- **機能設計レビュー R-07:** 読み取りだけが失敗する環境の commit の動きを、単体テストで確かめる（Step 4）。
- **NFR 設計レビュー R-01:** 文字数を数える Intl.Segmenter は、検査の関数の中で1つだけ作って使い回す。memo.length が 100 以下なら Segmenter を使わず通す（Step 1）。
- **NFR 設計レビュー R-02:** storage イベントの受け取り手の中の例外は、状態を変えずに理由だけをコンソールへ出す。受け取り手は「付いていないとき」だけ付ける（Step 3）。

## 作るものと変えるものの置き場所

| 場所 | 中身 |
|------|------|
| `app/src/domain/validateSnapshot.ts`（新規） | BR1.1 の検査。CategoryCatalog だけを使う純粋な関数 |
| `app/src/domain/sampleDataSeeder.ts`（新規） | BR4.1〜BR4.5 のサンプルの組み立てと投入 |
| `app/src/domain/ledger.ts`（変更） | assignIdentities（複数件の採番）を足す |
| `app/src/domain/types.ts`（変更） | AppState.storageAvailable、DataStore の可用性の型 |
| `app/src/store/dataStore.ts`（変更） | validateSnapshot での検査、storage イベント（load で付け、dispose で外す）、getAvailability、使っている途中の unreadable |
| `app/src/ui/NoticeBannerView.tsx`（新規） | 全体のお知らせ枠（BR5.1〜BR5.4） |
| `app/src/ui/AppShell.tsx`（変更） | 投入後の状態の読み直し、購読開始後の再確認、別のタブの変更の知らせの表示の有無、NoticeBannerView の配置 |
| `app/src/ui/composition.ts`（変更） | サンプル投入の差し込み口を SampleDataSeeder に差し替え、dispose を渡す |
| `app/src/ui/styles/app.css`（変更） | 全体のお知らせ枠の見た目（style 属性は使わない） |
| `app/tests/unit/` | 新規の単体テスト（下の Step） |
| `app/tests/e2e/u5-storage-resilience/` | 新規のブラウザ操作のテスト |

## 手順

### Step 1: 保存データの検査と採番 — 実装

- [x] `validateSnapshot.ts`: BR1.1 の項目を検査する。<br>・schemaVersion、revision、savedAt、entries、budgets の型<br>・明細の日付の形と実在、区分、区分に合うカテゴリ、金額、メモ（前後の空白なし・100 文字以下・改行なし）、addedOrder と entryId の重なり<br>・予算の month、支出カテゴリ、金額、budgetKey の一致と重なり<br>理由の文は項目の名前と位置だけで、値を含めない（NFR4.2）。Intl.Segmenter は1つだけ作り、memo.length が 100 以下なら使わない（NFR 設計レビュー R-01）
- [x] `ledger.ts` に `assignIdentities(validated, existing)` を足す。入力の順に addedOrder を振り、ID は既存と重ならない（BR4.5）。U1 の add もこの関数を使う形にそろえる（動きは変えない）
- ストーリー: US7.3（AC7.3.3）、US7.1（AC7.1.1 の土台）

### Step 2: 保存データの検査と採番 — テスト

- [x] `tests/unit/domain/validateSnapshot.test.ts`（8 件）: 正しい保存データ、型の誤り、金額の範囲外、存在しない日付（2026-02-30）、区分とカテゴリの不一致、entryId と addedOrder の重なり、budgetKey の不一致と重なり、理由の文に値が含まれないこと。3,000 件の検査が 100 ミリ秒以内（NFR1.3）
- [x] `tests/unit/domain/ledgerIdentities.test.ts`（5 件）: 入力の順の addedOrder、既存の最大値の続き、既存と重ならない ID、空の入力、U1 の add の結果が変わらないこと
- [x] テストを実行して通す

### Step 3: 保存（DataStore） — 実装

- [x] load と保存直前の読み直しを validateSnapshot で検査する（BR1.1）。読み込みでアクセスが失敗したら、可用性を unavailable として記録する（BR3.1）
- [x] `getAvailability()` を足す
- [x] load の中で、受け取り手が付いていないときだけ、window の 'storage' の受け取り手を付ける。`dispose()` で外し、画面の受け取り手もすべて外す（NFR 設計レビュー R-02）
- [x] storage イベントの扱い（W3、BR2.1）:<br>・storageArea が localStorage で、key がこのアプリのキーか null のときだけ扱う<br>・unreadable なら無視する<br>・新しい値を検査し、読めれば写しを入れ替えて externalChange を出す<br>・読めなければ unreadable にして unreadable を出す<br>・キーが消されていれば空の写し（通し番号 0）にして externalChange を出す<br>・受け取り手の中の例外は、状態を変えずに理由だけ console.warn に出す
- ストーリー: US7.3（AC7.3.3、AC7.3.4）、US7.4（AC7.4.1、AC7.4.2）

### Step 4: 保存（DataStore） — テスト

- [x] `tests/unit/store/dataStore.u5.test.ts`（9 件）:<br>・形の壊れた保存データで unreadable になり、保存領域が変わらない<br>・アクセス失敗で unavailable になり、commit が STORAGE_WRITE になる<br>・読み取りだけが失敗し、書き込みは成功する環境の commit の動き（機能設計レビュー R-07。結果を記録する）<br>・storage イベントで読める値に入れ替わり externalChange が出る<br>・読めない値で unreadable が出る<br>・キーの削除と key が null で空の写しになる<br>・unreadable 中のイベントは無視される<br>・ほかのキーと sessionStorage のイベントは無視される<br>・dispose のあとはイベントを受け取らない
- [x] U1 の `tests/unit/store/dataStore.test.ts` が変更なしで通ることを確かめる
- [x] テストを実行して通す

### Step 5: サンプル — 実装

- [x] `sampleDataSeeder.ts`: seedIfEmpty(today)（W2、BR4.1〜BR4.5）。<br>・今日の月とその前の2か月を決める<br>・決まった並びで、明細を1か月 15〜20 件組み立てる（給与は毎月、M-1 に副収入、支出は8つに散らす、今月は今日までの日だけ）<br>・予算を6つの支出カテゴリに設定し、娯楽とその他支出は未設定にする<br>・M-1 の食費を予算超過にする<br>・メモは固定の一般名詞の一覧から選ぶ<br>・Ledger.validate で確かめ、assignIdentities で採番し、commit({ expectedRevision: 0, initialize }) を1回だけ呼ぶ
- ストーリー: US7.1（AC7.1.1〜AC7.1.4）

### Step 6: サンプル — テスト

- [x] `tests/unit/domain/sampleDataSeeder.test.ts`（7 件）:<br>・3か月分が1回の保存で入る<br>・1か月の件数が 15〜20<br>・未来の日付がない（月の1日・月末・年またぎの今日で確かめる）<br>・6つの予算と2つの未設定、ある月の超過<br>・すべてのメモが一般名詞の一覧の中<br>・保存データがあると何もしない（2回目の投入は断られ件数が増えない。NFR5.4）<br>・書き込みの失敗で何も残らない（NFR5.1）
- [x] テストを実行して通す

### Step 7: 画面 — 実装

- [x] `NoticeBannerView.tsx`:<br>・空の alert の領域と status の領域を置き、中身を入れ替える<br>・読めない（BR5.1）、保存できない（BR5.3）、別のタブの変更（BR5.2。「閉じる」付き）を BR5.4 の優先順で出す<br>・文言は機能設計と詳細モックアップのとおり<br>・data-testid（notice-corrupt、notice-unavailable、notice-other-tab、notice-other-tab-close）
- [x] `AppShell.tsx`:<br>・投入のあとに getStatus と getAvailability を読み直し、storeStatus と storageAvailable を決める<br>・購読の開始後にもう一度 getStatus を確かめる<br>・externalChange で別のタブの知らせを出し、「閉じる」と committed で消す<br>・「閉じる」のあとは「1 登録」の見出しへ操作位置を移す<br>・購読は停止の関数で必ず外す<br>・NoticeBannerView を見出しと「1 登録」の間に置き、Error Boundary で囲む
- [x] `composition.ts`: 差し込み口を SampleDataSeeder に差し替え、AppServices に dispose を足す
- [x] `styles/app.css`: 全体のお知らせ枠の見た目（alert は警告の色と左の太い線、status は落ち着いた色、コントラスト 4.5:1 以上）
- ストーリー: US7.3（AC7.3.3）、US7.4（AC7.4.1）

### Step 8: 画面 — テスト

- [x] `tests/unit/ui/NoticeBannerView.test.tsx`（6 件）:<br>・何もないとき<br>・読めない（alert、閉じるなし）<br>・保存できない（alert）<br>・別のタブ（status と閉じる）<br>・重なったときの優先順（BR5.4）<br>・閉じるの名前と押したときの呼び出し
- [x] `tests/unit/ui/AppShell.u5.test.tsx`（6 件）:<br>・サンプル投入で初回に集計が出る<br>・投入の失敗のあとの状態の読み直し（unreadable、STALE_REVISION）<br>・unavailable で知らせが出る<br>・externalChange で知らせが出て閉じると消える<br>・committed で知らせが消える<br>・閉じたあとの操作位置
- [x] U1 の UI のテストが変更なしで通ることを確かめる。U1 のテストは、サンプル投入を使わない（何もしない差し込み口のまま）組み立てでも動くようにする
- [x] テストを実行して通す

### Step 9: ブラウザ操作のテストと仕上げ

- [x] `tests/e2e/u5-storage-resilience/`:<br>・`sample.spec.ts`（AC7.1.1、AC7.1.3、NFR1.2。Chromium で時間を測る）<br>・`corrupt.spec.ts`（AC7.3.3、AC7.3.4。項目の型の誤りを含む）<br>・`unavailable.spec.ts`（BR5.3。localStorage へのアクセスを失敗させる）<br>・`cross-tab.spec.ts`（AC7.4.1、AC7.4.2、NFR1.1、外部通信 0 件。同じコンテキストで2つのページ）<br>・`accessibility.spec.ts`（全体のお知らせ枠の3つの状態の axe）
- [x] U1 のブラウザ操作のテストが、サンプル投入のある状態でも通るようにする。初回のサンプルを前提にしないよう、テストの前に保存領域を決まった状態にする。テストの期待を変えたときは、理由をコードのまとめに書く
- [x] 承認済みの確認コマンド `npm --prefix app run verify` を通す（行カバレッジ 80% 以上、型の検査、Prettier、ESLint、ビルド、check:dist、Playwright）
- [x] `app/README.md` に、初回のサンプル、全体のお知らせ枠、別のタブの動きを1段落ずつ足す

## ストーリーと手順の対応

| ストーリー | 受け入れ条件 | 手順 |
|-----------|--------------|------|
| US7.1 | AC7.1.1〜AC7.1.4 | Step 1、2、5、6、9 |
| US7.3 | AC7.3.3、AC7.3.4（AC7.3.1 は U1、AC7.3.2 は U3・U4） | Step 1〜4、7〜9 |
| US7.4 | AC7.4.1、AC7.4.2 | Step 3、4、7〜9 |

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

テストの実行環境（Vitest・Playwright）は U1 で用意済みのため、最初の手順の「構成」と「テストの実行環境の用意」は、U1 のものをそのまま使います。API / endpoint の層は、サーバーを持たないため対象外です。
