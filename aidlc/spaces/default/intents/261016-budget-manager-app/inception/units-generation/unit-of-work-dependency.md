# Unit の依存関係

Unit の定義は `unit-of-work.md` にあります。部品の関係は `aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md` にあり、それをもとにしています。ここでは「どの Unit がどの Unit に依存するか」を示します。

デリバリー計画で、作る順番を U1 → U5 → U2 → U3 → U4 → U6 と決めました（保存の仕組みを先に固める）。依存のない Unit どうしは名前の順に作られるため、この順番を依存関係として表すよう、U2・U3・U4 が U5 に依存する形に見直しました（`units-generation-questions.md` の Q3）。

## 依存関係（DAG）

```mermaid
graph TD
  U5["U5 保存の異常・サンプル"] --> U1["U1 薄い版"]
  U2["U2 登録の検証と一覧"] --> U5
  U3["U3 予算"] --> U5
  U4["U4 CSV 取り込み"] --> U5
  U6["U6 アクセシビリティ"] --> U2
  U6 --> U3
  U6 --> U4
```

<!-- Text fallback: U5 は U1 に依存する。U2、U3、U4 はそれぞれ U5 に依存する。U6 は U2、U3、U4 に依存する。循環はない。 -->

| Unit | 依存する Unit | 理由 |
|------|---------------|------|
| U1 | なし | アプリの土台と、すべての部品の最初の形を作る |
| U5 | U1 | U1 の DataStore・AppShell の上に、版・照合・異常検出・サンプルを足す |
| U2 | U5（U1 は U5 を通して） | U1 の Ledger・EntryFormView・ReviewView に、規則と一覧を足す。U5 で固めた保存の結果と状態の上に、欄ごとの誤り表示を足す |
| U3 | U5（U1 は U5 を通して） | U1 の ReviewView・MonthlySummary・DataStore の上に、予算を足す。予算保存の失敗表示は、U5 で固めた保存の結果と状態の上に作る |
| U4 | U5（U1 は U5 を通して） | U1 の CsvExchange（出力）・ExportView・Ledger の上に、取り込みを足す。取り込みの失敗表示は、U5 で固めた保存の結果と状態の上に作る |
| U6 | U2, U3, U4（U5・U1 はそれらを通して） | すべての画面がそろってから、通しで確かめる |

```yaml
units:
  - name: u1-walking-skeleton
    kind: ui
    depends_on: []
  - name: u5-storage-resilience
    kind: ui
    depends_on: [u1-walking-skeleton]
  - name: u2-entry-and-ledger
    kind: ui
    depends_on: [u5-storage-resilience]
  - name: u3-budget
    kind: ui
    depends_on: [u5-storage-resilience]
  - name: u4-csv-import
    kind: ui
    depends_on: [u5-storage-resilience]
  - name: u6-accessibility
    kind: ui
    depends_on: [u2-entry-and-ledger, u3-budget, u4-csv-import]
```

## 最初の Unit（薄い版）

U1 は依存を持たない唯一の Unit で、どの並べ方でも最初に来ます。U1 だけで次の流れがブラウザ上で動きます。後の Unit を待つ必要はありません。

1. 収支を1件登録する
2. 月次集計に反映される
3. CSV に出力する
4. 開き直しても残っている

## 部品の受け渡し（Unit の間のつながり）

Unit はすべて1つの Web アプリの中で動きます。Unit の間は、部品の公開された呼び出しでつながります。共有するデータは、DataStore が保存する1つのまとまりだけです。

| つながり | 内容 |
|----------|------|
| U2・U4 → U1 の Ledger | 規則の判定（保存なし）、一括追加、一致の判定。規則の定義は Ledger の1か所に置く |
| U3 → U1 の MonthlySummary・ReviewView | 予算比較の列を足す |
| U5 → U1 の DataStore・AppShell | 版・通し番号・照合・状態の通知を足す。保存の形（全体をまとめて保存）は U1 で決めたものを保つ |
| U2・U3・U4 → U5 の保存の結果と状態 | 確定した保存の結果（失敗の理由）と、画面に伝える状態（読み込めない、別のタブで変更あり）を受け取る。U3・U4 はそれぞれの画面の失敗表示を作る（登録の画面は U1 が作る。契約設計の Q4） |
| U2〜U5 → U1 の AppShell | 表示中の月と、保存データの状態を受け取る |

## 並行して作れる組み合わせ

U2・U3・U4 は互いに依存しないので、U5 のあとに並行して作ることもできます（依頼者の回答 Q2）。ただし、デリバリー計画では1つずつ順に作ると決めました。同じファイルを触る箇所があるためです。並行して作る場合の決まりは次のとおりです（team-practices.md）。

- 担当ごとに別のブランチと worktree を使う。
- ブランチは `feat/budget-manager-app` から作り、`feat/budget-manager-app` へ戻す。
- 戻したあとにテストを再実行する。

同じファイルを触りやすい場所:

- ReviewView: U2 は一覧、U3 は予算を受け持つ。
- Ledger: U2 は規則、U4 は一括追加を受け持つ。
- AppShell: U2 は表示月の切り替え、U5 は状態の伝達を受け持つ（U5 が先に終わるので、U2 は U5 の変更の上に足す）。
