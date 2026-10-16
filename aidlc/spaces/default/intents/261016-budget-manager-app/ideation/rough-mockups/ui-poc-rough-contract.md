# UI 証跡の受け渡し — ラフモックアップ

このファイルは、ラフモックアップの中心となる成果物（`wireframes.md`、`user-flow.md`）を補うものです。置き換えるものではありません。HTML の試作は比較用で、この段階の承認対象は中心の成果物です。

## Artifact References

| 種類 | パス | 役割 |
|------|------|------|
| 上流の成果物 | `aidlc/spaces/default/intents/261016-budget-manager-app/ideation/intent-capture/intent-statement.md` | 目的・利用者・成功基準 |
| 上流の成果物 | `aidlc/spaces/default/intents/261016-budget-manager-app/ideation/scope-definition/scope-document.md` | 範囲（含める・含めない）。デザイン文脈の共通ブリーフとして使用 |
| 上流の成果物 | `aidlc/spaces/default/intents/261016-budget-manager-app/ideation/scope-definition/intent-backlog.md` | 作業のまとまりと順番 |
| このステージの成果物 | `wireframes.md` | 3案のワイヤーフレーム、見た目の方向、画面の状態、各画面のアクセシビリティ注記 |
| このステージの成果物 | `user-flow.md` | 主な流れ・補助の流れ・情報構成 |
| このステージの質問 | `rough-mockups-questions.md` | 依頼者が確認したデザイン文脈（Q1〜Q6、まとめの確認済み） |
| 試作 | `assets/rough-variants.html` | 3案と9つの状態を切り替えて見られる、外部通信のない使い捨ての HTML |
| デザイン文脈 | `design-context.json` | 依頼者が確認した利用者・用途・印象の記録 |
| アクセシビリティ補正 | `wcag-correction-report.json` | 大きい文字の基準を WCAG の値（24px、太字 18.6667px）に補正した記録 |

上流の UI 契約はありません（この契約が最初です）。この段階での差分は「3案の比較材料を用意したこと」で、どの案を採るかは未決定です。

未決定の事項:

- 3案のうちどれを採用するか、または組み合わせるか（要件分析以降で決める）
- CSV の重複取り込み、用意していないカテゴリ、予算未設定の扱い（範囲定義書で要件分析に回した点）
- 明細が多いときの一覧の見せ方

## Screen State Acceptance Mapping

受け入れ条件（AC）はまだ要件分析で作られていないため、ここでは仮の ID（`AC-R01` など）を使います。要件分析・ユーザーストーリーで正式な ID ができた時点で、詳細モックアップの契約で対応づけ直します。

読み込み中の状態は対象外です。データはこの端末のブラウザ内にだけあり、通信を伴わないためです。

| 画面 | 状態 | 仮の AC | 確認方法 |
|------|------|---------|----------|
| SCREEN-REGISTER | STATE-DEFAULT | AC-R01 | `?state=default` で、3案とも最初の表示範囲に登録フォームがあり、区分・日付・金額・カテゴリ・メモ・「登録する」が見える |
| SCREEN-REGISTER | STATE-VALIDATION-ERROR | AC-R02 | `?state=form-error` で、金額欄が `aria-invalid` になり、欄の下に直し方の文が出て、入力値が残っている |
| SCREEN-REGISTER | STATE-SAVED | AC-R03 | `?state=saved` で、フォーム上部に追加した内容を含む「登録しました」が `role=status` で出る |
| SCREEN-REGISTER | STATE-STORAGE-ERROR | AC-R04 | `?state=storage-error` で、保存できなかったこと・入力が残っていること・再試行の方法が `role=alert` で出る |
| SCREEN-LEDGER | STATE-POPULATED | AC-R05 | `?state=default` で、10月の架空明細7件が新しい順に表示され、金額が右揃えで「¥」と3桁区切り付き |
| SCREEN-LEDGER | STATE-EMPTY | AC-R06 | `?state=month-empty` で、表の代わりに登録か CSV 取り込みを案内する文が出る |
| SCREEN-SUMMARY | STATE-POPULATED | AC-R07 | `?state=default` で、収入 ¥280,000・支出 ¥119,220・差額 ¥160,780 と、カテゴリ別の予算・実績・残額が出る |
| SCREEN-SUMMARY | STATE-BUDGET-UNSET | AC-R08 | `?state=budget-unset` で、予算欄に「未設定」、残額欄に「—」が出て、予算の設定を案内する |
| SCREEN-SUMMARY | STATE-OVER-BUDGET | AC-R09 | `?state=over-budget` で、食費の残額欄に色に加えて文字で「超過 ¥3,900」が出る |
| SCREEN-CSV | STATE-IMPORT-SUCCESS | AC-R10 | `?state=import-done` で、追加件数と、既存の明細が残っていることが `role=status` で出る |
| SCREEN-CSV | STATE-IMPORT-PARTIAL-ERROR | AC-R11 | `?state=import-error` で、追加件数と、取り込めなかった行番号・理由が `role=alert` で出る |

```ui-poc-contract
{
  "schema": 1,
  "stage": "rough-mockups",
  "arm": "C",
  "assets": [
    {"path": "assets/rough-variants.html", "sha256": "229f4b85154c88e601f6b8ce4ef4a908e424d6663195ae55d6721c3257f9a286"}
  ],
  "mappings": [
    {"screen": "SCREEN-REGISTER", "state": "STATE-DEFAULT", "ac": "AC-R01", "asset": "assets/rough-variants.html", "check": "?state=default: in all three variants the registration form (kind, date, amount, category, memo, submit) is within the first viewport"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-VALIDATION-ERROR", "ac": "AC-R02", "asset": "assets/rough-variants.html", "check": "?state=form-error: amount field has aria-invalid=true, a correction message below it via aria-describedby, and the typed value is kept"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-SAVED", "ac": "AC-R03", "asset": "assets/rough-variants.html", "check": "?state=saved: a role=status notice names the added entry above the form"},
    {"screen": "SCREEN-REGISTER", "state": "STATE-STORAGE-ERROR", "ac": "AC-R04", "asset": "assets/rough-variants.html", "check": "?state=storage-error: a role=alert notice says saving failed, input is kept, and how to retry"},
    {"screen": "SCREEN-LEDGER", "state": "STATE-POPULATED", "ac": "AC-R05", "asset": "assets/rough-variants.html", "check": "?state=default: seven fictional October entries listed newest first with right-aligned yen amounts and thousands separators"},
    {"screen": "SCREEN-LEDGER", "state": "STATE-EMPTY", "ac": "AC-R06", "asset": "assets/rough-variants.html", "check": "?state=month-empty: the table is replaced by guidance to register or import CSV"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-POPULATED", "ac": "AC-R07", "asset": "assets/rough-variants.html", "check": "?state=default: income 280,000, expense 119,220, difference 160,780 and per-category budget, actual, remaining are shown"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-BUDGET-UNSET", "ac": "AC-R08", "asset": "assets/rough-variants.html", "check": "?state=budget-unset: budget cells read 未設定, remaining cells read a dash, and guidance to set the budget appears"},
    {"screen": "SCREEN-SUMMARY", "state": "STATE-OVER-BUDGET", "ac": "AC-R09", "asset": "assets/rough-variants.html", "check": "?state=over-budget: food remaining shows the text 超過 ¥3,900 in addition to color"},
    {"screen": "SCREEN-CSV", "state": "STATE-IMPORT-SUCCESS", "ac": "AC-R10", "asset": "assets/rough-variants.html", "check": "?state=import-done: a role=status notice gives the added count and says existing entries remain"},
    {"screen": "SCREEN-CSV", "state": "STATE-IMPORT-PARTIAL-ERROR", "ac": "AC-R11", "asset": "assets/rough-variants.html", "check": "?state=import-error: a role=alert notice gives the added count and the rejected row numbers with reasons"}
  ],
  "requiredMappings": [
    "SCREEN-REGISTER/STATE-DEFAULT/AC-R01",
    "SCREEN-REGISTER/STATE-VALIDATION-ERROR/AC-R02",
    "SCREEN-REGISTER/STATE-SAVED/AC-R03",
    "SCREEN-REGISTER/STATE-STORAGE-ERROR/AC-R04",
    "SCREEN-LEDGER/STATE-POPULATED/AC-R05",
    "SCREEN-LEDGER/STATE-EMPTY/AC-R06",
    "SCREEN-SUMMARY/STATE-POPULATED/AC-R07",
    "SCREEN-SUMMARY/STATE-BUDGET-UNSET/AC-R08",
    "SCREEN-SUMMARY/STATE-OVER-BUDGET/AC-R09",
    "SCREEN-CSV/STATE-IMPORT-SUCCESS/AC-R10",
    "SCREEN-CSV/STATE-IMPORT-PARTIAL-ERROR/AC-R11"
  ]
}
```

## Approval Evidence

この段階では、追加の承認は必要ありません。ラフモックアップの承認は、AI-DLC の通常の承認ゲートで依頼者が行います。この契約自体は承認の記録を作りません。

## Testing Brief

まだ引き継ぐテスト契約はありません（テスト契約は後続の段階で作られます）。この試作に自動テストはありません。比較用の使い捨てのためです。

確認済み:

- HTML 内のスクリプトの構文チェック（`node --check`）
- 外部への通信がないこと（`http://`、`https://` を含まない）

未実施:

- ブラウザでの表示確認、キーボード操作、200% 拡大時の表示（作成時にブラウザの自動操作が使えなかったため）。詳細モックアップの段階で、画面の状態ごとに確認します。
