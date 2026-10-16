# 作業単位の分割 — 質問

部品の一覧（`aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md`）とストーリー（`aidlc/spaces/default/intents/261016-budget-manager-app/inception/user-stories/stories.md`）を、実装する単位（Unit）にまとめます。ここで決めるのは「どの Unit がどの Unit に依存するか」までです。どの順番で作るかは、次の「デリバリー計画」で決めます。

前提（決定済み）:

- 最初の Unit は、端から端まで通る薄い版（収支を1件登録 → 月次集計に反映 → CSV に出力。開き直しても残る）にする（team-practices.md）。
- アプリは自分のパソコンで動かす1つの Web アプリで、Unit ごとに別々に配ることはしない（team-practices.md の Deployment）。

A がおすすめです。

---

## Q1. Unit の細かさはどうしますか？

A. 6つに分ける: U1 薄い版／U2 登録の検証と一覧／U3 予算と予算比較／U4 CSV の数式対策と取り込み／U5 サンプルデータと保存の異常・別タブ対応／U6 キーボード操作とアクセシビリティの仕上げ（おすすめ。1つの Unit が小さく、確認しやすい）
B. 3つに分ける: U1 薄い版／U2 登録・一覧・予算／U3 CSV の取り込み・サンプル・保存の異常・アクセシビリティ
C. 2つに分ける: U1 薄い版／U2 残りすべて
D. 特に希望はない（おすすめでよい）
X. Other (please specify)

[Answer]: A

## Q2. 薄い版のあと、互いに依存しない Unit を並行して作ってよいですか？

並行して作る場合は、ご指示どおり担当ごとに別のブランチと worktree を使い、`feat/budget-manager-app` へ戻したあとにテストを再実行します。

A. 依存のない Unit は並行して作ってよい（実際に並行するかは、デリバリー計画で決める）（おすすめ）
B. 並行はせず、1つずつ順に作る
C. 特に希望はない（おすすめでよい）
X. Other (please specify)

[Answer]: A

## 分割の計画（Plan Approval）

| Unit | ディレクトリ | 内容 | 種類 | 依存 |
|------|-------------|------|------|------|
| U1 | u1-walking-skeleton | 薄い版: 1件登録 → 月次集計（収入・支出・差額）→ 明細の CSV 出力。保存して開き直しても残る | ui | なし |
| U2 | u2-entry-and-ledger | 登録の検証（誤りの表示）、別の月で登録したときの切り替え、明細一覧 | ui | U1 |
| U3 | u3-budget | 月別予算の入力・前月コピー、集計での予算・実績・残額・超過 | ui | U1 |
| U4 | u4-csv-import | CSV の数式対策、取り込み（検証・重複の確認・結果の表示） | ui | U1 |
| U5 | u5-storage-resilience | 初回のサンプルデータ、保存失敗・壊れたデータ・別タブの変更への対応 | ui | U1 |
| U6 | u6-accessibility | キーボード操作・本文へ移動・axe の検査など、アクセシビリティの仕上げ | ui | U2, U3, U4, U5 |

- U2〜U5 は互いに依存しないため、並行して作れる（Q2）。
- アプリは1つの Web アプリとしてまとめて動かす（Unit ごとに別々には配らない）。

この計画で進めますか？

- Approve Plan
- Revise Plan

[Answer]: Approve Plan

## Q3. （デリバリー計画からの見直し）U5 を U2・U3・U4 より先に作るため、依存関係を直しますか？

デリバリー計画で、作る順番を U1 → U5 → U2 → U3 → U4 → U6 にすると決めました（保存の仕組みを先に固める）。依存のない Unit どうしは名前の順に作られるため、この順番を確実に守るには、U2・U3・U4 が U5 に依存する形に直す必要があります。U2〜U4 は、どれも U5 が決める保存の状態の上に自分の失敗表示を作るので、依存として筋が通ります。

A. 直す。U2・U3・U4 は U5 に依存し、U5 は U1 に依存する（おすすめ。U2〜U4 は互いに依存しないまま）
B. 直さない（U2〜U5 は名前の順に作られる）
C. 特に希望はない（おすすめでよい）
X. Other (please specify)

[Answer]: A

見直し後の依存:

| Unit | ディレクトリ | 依存 |
|------|-------------|------|
| U1 | u1-walking-skeleton | なし |
| U5 | u5-storage-resilience | U1 |
| U2 | u2-entry-and-ledger | U5 |
| U3 | u3-budget | U5 |
| U4 | u4-csv-import | U5 |
| U6 | u6-accessibility | U2, U3, U4 |

## Consolidated Summary Confirmation

- Unit は6つ: U1 薄い版／U2 登録の検証と一覧／U3 予算と予算比較／U4 CSV の数式対策と取り込み／U5 サンプルデータと保存の異常・別タブ対応／U6 アクセシビリティの仕上げ（Q1）
- 依存（Q3 で見直し）: U5 は U1 に依存する。U2・U3・U4 は U5 に依存し、互いには依存しない。U6 は U2・U3・U4 に依存する（U5 へは U2〜U4 を通して間接に依存する）
- 作る順番: U1 → U5 → U2 → U3 → U4 → U6
- 並行: U2・U3・U4 は互いに依存しないため並行して作れるが、デリバリー計画では1つずつ順に作ると決めた（Q2）
- 種類はすべて ui。アプリは1つの Web アプリとしてまとめて動かす
- 分割の計画は承認済み（Approve Plan）。依存の見直しは Q3 の回答による

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
