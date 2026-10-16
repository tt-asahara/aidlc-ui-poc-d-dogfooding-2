# コード生成の計画 — U2 登録の検証と明細一覧（u2-entry-and-ledger）

## Summary

- Builds: 登録の規則の仕上げ、欄ごとの誤りの表示、二重送信の防止、別の月への切り替え、明細の一覧（U1・U5 のアプリに積む）
- Touches: `app/src/domain/`（textRules を新規、ledger と validateSnapshot を変更）、`app/src/ui/`（LedgerList を新規、EntryFormView・ReviewView・AppShell・styles を変更）、`app/tests/`
- Tests: Vitest の単体テスト 約 36 件（新規 4 ファイル。U1 のメモ欄の maxLength のテスト1件を置き換え）、Playwright のブラウザ操作のテスト 約 12 件（新規 4 ファイル）

## 入力

- 機能設計: `aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/functional-design/`（functional-spec.md の W1〜W5、rules.md の BR1.1〜BR4.1、frontend-components.md）
- NFR 要件・設計: `construction/u2-entry-and-ledger/nfr-requirements/`、`construction/u2-entry-and-ledger/nfr-design/`（NFR1.1〜NFR7.2、textRules、送信の鍵、大きな貼り付け、日本語入力の手での確認）
- インフラ設計: `construction/u2-entry-and-ledger/infrastructure-design/`（U1 のまま。テストは `tests/e2e/u2-entry-and-ledger/`）
- 約束ごと: `inception/contract-design/contract-summary.md`（C1 の VALIDATION と fieldErrors、C3 の Ledger）
- 画面の証跡: `inception/refined-mockups/ui-poc-refined-contract.md`、`assets/refined-mockup.html`（register-validation-error、register-other-month、register-default の一覧、ledger-empty）、`interaction-spec.md`
- 実装済み: `app/src/domain/ledger.ts`、`app/src/domain/validateSnapshot.ts`、`app/src/ui/EntryFormView.tsx`、`app/src/ui/ReviewView.tsx`、`app/src/ui/AppShell.tsx`
- ストーリー: US1.1（AC1.1.4〜AC1.1.6）、US1.2、US1.3、US2.1（AC2.1.2 は U4）

前の工程から持ち越した軽微な点（この計画で反映する）:

- **機能設計レビュー R-05、NFR 設計レビュー R-04:** 切り詰めは、前後の空白を除いた値に対して行う。テストの例は「先頭の空白 + 空白を除いて 101 文字」で、期待は「100 文字に切り詰め、欄の下に『メモは 100 文字までです』」（Step 5・6）。
- **NFR 設計レビュー R-01:** Intl.Segmenter は、textRules で初めて必要になったときに作る（遅延生成）。長さ（UTF-16 の単位）が 100 以下なら作らない（Step 1）。
- **NFR 設計レビュー R-02:** 時計を進めるテストは fireEvent・act・vi.advanceTimersByTime を使い、waitFor と既定の遅延つきの userEvent は使わない。タイマーはアンマウントで解除する（Step 6）。
- **NFR 設計レビュー R-03:** U1 の `tests/unit/ui/EntryFormView.test.tsx` のメモ欄の maxLength のテストを、新しい制限（値の切り詰め）のテストに置き換え、理由をコードのまとめに書く（Step 6）。
- **インフラ設計レビュー R-01:** 日本語入力の手での確認結果を code-summary.md に記録することを、U2 の完了の条件にする（Step 8）。

## 作るものと変えるものの置き場所

| 場所 | 中身 |
|------|------|
| `app/src/domain/textRules.ts`（新規） | isRealDate、countGraphemes、truncateGraphemes。Intl.Segmenter は遅延生成 |
| `app/src/domain/validateSnapshot.ts`（変更） | textRules を使う形にする（動きは同じ） |
| `app/src/domain/ledger.ts`（変更） | validate の仕上げ（BR1.1〜BR1.4 の理由の文、日付の実在、見える1文字、空の金額の文） |
| `app/src/ui/EntryFormView.tsx`（変更） | 欄ごとの誤り（BR1.5・BR1.6）、送信の鍵（BR1.7）、メモ欄の制限（BR1.4、W4）、別の月（BR2.1） |
| `app/src/ui/LedgerList.tsx`（新規） | 明細の一覧と案内文（BR3.1〜BR3.5） |
| `app/src/ui/ReviewView.tsx`（変更） | ledger を受け取り、LedgerList を置く |
| `app/src/ui/AppShell.tsx`（変更） | selectedMonth と onSelectMonth を EntryFormView に、ledger を ReviewView に渡す |
| `app/src/ui/styles/app.css`（変更） | 欄の下の誤りの文、太い枠、一覧の表、メモの折り返し |
| `app/tests/unit/` | 新規の単体テストと、U1 のメモ欄のテスト1件の置き換え |
| `app/tests/e2e/u2-entry-and-ledger/` | 新規のブラウザ操作のテスト |

## 手順

### Step 1: 規則の共有部品 — 実装

- [x] `textRules.ts`:<br>・isRealDate（validateSnapshot から移す。0000〜0099 年の補正を含む）<br>・countGraphemes（100 文字目に達したら数えるのをやめる。長さ 100 以下なら Segmenter を作らない）<br>・truncateGraphemes（先頭から N 文字）<br>・Intl.Segmenter は初めて必要になったときに作る
- [x] `validateSnapshot.ts` を textRules を使う形にする（動きは変えない）
- ストーリー: US1.2（AC1.2.3、AC1.2.4）

### Step 2: 規則の共有部品 — テスト

- [x] `tests/unit/domain/textRules.test.ts`（8 件）:<br>・2026-02-28 と 2026-02-29 と 2024-02-29<br>・0050-01-01<br>・形の違う日付<br>・絵文字（結合した家族、肌の色）を含む 100 文字と 101 文字<br>・長さ 100 以下で Segmenter を作らないこと<br>・切り詰めの結果<br>・1 万文字の数えで早く終わること
- [x] U5 の `tests/unit/domain/validateSnapshot.test.ts` が変更なしで通ることを確かめる
- [x] テストを実行して通す

### Step 3: 規則の仕上げ（Ledger.validate） — 実装

- [x] BR1.1〜BR1.4 の理由の文（`frontend-components.md` の表のとおり）。空の金額も「金額は 1〜9,999,999 の整数で入力してください。例: 1280」
- [x] 日付の空と実在（isRealDate）、メモの見える1文字と改行
- [x] fieldErrors の順は、区分・日付・金額・カテゴリ・メモ
- ストーリー: US1.2（AC1.2.1〜AC1.2.4）

### Step 4: 規則の仕上げ（Ledger.validate） — テスト

- [x] `tests/unit/domain/ledgerRules.test.ts`（9 件）:<br>・金額 0・-500・12.5・10000000・「1,28o」・空<br>・金額 1 と 9999999<br>・日付の空と 2026-02-30<br>・2000-01-01 と 2030-12-31<br>・メモ 100 文字（絵文字を含む）と 101 文字<br>・改行を含むメモ<br>・fieldErrors の順<br>・U5 のサンプルの全件が通ること（BR4.1、契約レビュー R-11）<br>・Ledger.validate を通った境界の明細が validateSnapshot も通ること（NFR5.1）
- [x] U1 の `tests/unit/domain/ledger.test.ts` を確かめる。空の金額の文の期待を変えた場合は、理由をコードのまとめに書く
- [x] テストを実行して通す

### Step 5: 画面 — 実装

- [x] `EntryFormView.tsx`:<br>・欄ごとの誤りの文（id `<欄>-error`、aria-describedby、aria-invalid）とまとめ（BR1.5）<br>・成功で表示を消す（BR1.6）<br>・送信の鍵（ref と 300 ミリ秒の setTimeout。鍵がある間の操作は何もしない。アンマウントでタイマーを解除。BR1.7）<br>・メモ欄（maxLength を外す。onChange・onCompositionStart・onCompositionEnd・onPaste。前後の空白を除いた値で数えて切り詰め、改行の貼り付けは取り消す。W4）<br>・別の月（onSelectMonth と、年が違うときは年を付けた知らせ。BR2.1）
- [x] `LedgerList.tsx`: table と caption、th scope、日付（MM/DD）・区分・カテゴリ・金額（符号・¥・3桁区切り・右揃え）・メモ（文字のまま、折り返し）。操作は置かない。0件なら案内文。unreadable なら理由（BR3.1〜BR3.5）。data-testid（ledger-table、ledger-row、ledger-empty）
- [x] `ReviewView.tsx`: ledger を受け取り、集計の下に LedgerList を置く
- [x] `AppShell.tsx`: selectedMonth・onSelectMonth を EntryFormView に、ledger を ReviewView に渡す
- [x] `styles/app.css`: 誤りの文と太い枠、一覧の表、メモの折り返し（style 属性は使わない）
- ストーリー: US1.1、US1.2、US1.3、US2.1

### Step 6: 画面 — テスト

- [x] `tests/unit/ui/EntryFormView.u2.test.tsx`（10 件）:<br>・欄ごとの誤りとまとめ、最初の誤りの欄への操作位置<br>・直して登録すると消える<br>・送信の鍵の境目（vi.useFakeTimers と fireEvent・act・vi.advanceTimersByTime で 299 ミリ秒は捨て、300 ミリ秒をすぎたら受け付ける。waitFor と遅延つきの userEvent は使わない）<br>・鍵がある間は表示が変わらない<br>・メモの切り詰め（先頭の空白 + 空白を除いて 101 文字 → 100 文字と知らせ）<br>・変換中は切り詰めず確定で切り詰め<br>・改行の貼り付けの取り消しと知らせ<br>・別の月（年が同じ・違う）<br>・同じ月
- [x] `tests/unit/ui/LedgerList.test.tsx`（6 件）: 並び順、金額の表示、`<b>太字</b>` が文字のまま、操作がない、0件の案内文、表の構造（caption、th）
- [x] U1 の `tests/unit/ui/EntryFormView.test.tsx` のメモ欄の maxLength のテストを、値の切り詰めのテストに置き換える（理由をコードのまとめに書く）。ほかの U1・U5 の UI のテストは変更なしで通ることを確かめる
- [x] テストを実行して通す

### Step 7: ブラウザ操作のテスト

- [x] `tests/e2e/u2-entry-and-ledger/`:<br>・`validation.spec.ts`（AC1.2.1〜AC1.2.5、axe）<br>・`other-month.spec.ts`（AC1.3.1、AC1.3.2、axe）<br>・`ledger.spec.ts`（AC2.1.1、AC2.1.3、AC2.1.4、AC1.1.5、AC1.1.6、axe の一覧と空の月、NFR1.1・NFR1.2 を Chromium で計測）<br>・`double-submit-and-memo.spec.ts`（AC1.1.4 は dblclick で1件だけ増え、成功の知らせが残る。絵文字の 100 文字と 101 文字。改行の貼り付け。1 万文字の貼り付けが 1 秒以内）
- [x] U1・U5 のブラウザ操作のテストが通り続けることを確かめる

### Step 8: 仕上げ

- [x] 承認済みの確認コマンド `npm --prefix app run verify` を通す（行カバレッジ 80% 以上、型の検査、Prettier、ESLint、ビルド、check:dist、Playwright）
- [x] `app/README.md` に、入力の規則と一覧を1段落ずつ足す
- [x] 日本語入力の手での確認の手順を、オーケストレーターがコードのまとめに書けるよう、報告に含める（結果の記録は U2 の確認のときに行い、記録が U2 の完了の条件。インフラ設計レビュー R-01）

## ストーリーと手順の対応

| ストーリー | 受け入れ条件 | 手順 |
|-----------|--------------|------|
| US1.1 | AC1.1.4〜AC1.1.6 | Step 5〜7 |
| US1.2 | AC1.2.1〜AC1.2.5 | Step 1〜7 |
| US1.3 | AC1.3.1、AC1.3.2 | Step 5〜7 |
| US2.1 | AC2.1.1、AC2.1.3、AC2.1.4（AC2.1.2 は U4） | Step 5〜7 |

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

テストの実行環境（Vitest・Playwright）は U1 で用意済みのため、構成とテストの実行環境の用意の手順は U1 のものをそのまま使います。U2 では保存の層は変えません（U1・U5 のまま）。API / endpoint の層は、サーバーを持たないため対象外です。
