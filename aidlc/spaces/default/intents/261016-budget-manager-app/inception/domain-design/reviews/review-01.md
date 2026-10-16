## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T14:32:16Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md > DataStore behaviour / Ledger depends_on / Budget depends_on / ADR-001 | 保存は常に「全体のスナップショット」を書く設計だが、Ledger と Budget がそれぞれ DataStore から読み、自分の分だけ変えて保存する形になっている。DataStore は中身の意味を判断しないとあるため、Ledger の保存が Budget 側の予算を（またはその逆を）消さずにスナップショットを組み立てる責任が、どの部品にあるか決まっていない。また別タブの保存は「検知して読み直す」だけで、古い内容を持ったままのタブが書き込む瞬間の扱い（revision を見て断るのか、上書きするのか）が書かれていない。revision 属性はあるが使い方の規則がなく、別タブで古い画面から登録すると相手のタブの明細・予算が黙って消える（US7.4 の「食い違わない」を満たせない）。 | スナップショット全体の組み立て（明細部分と予算部分の差し替え）を誰が行うかを DataStore の責任として明記する。書き込み時に revision を照合して古ければ断る（読み直しへ誘導する）規則を DataStore の behaviour と ADR-001 の Consequences に追加する。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md > EntryFormView / ReviewView / ExportView の depends_on、NoticeBannerView、DataStore dependents | 「保存データが壊れているときは登録・予算入力・取り込みを止める」と3つの画面部品の behaviour に書かれているが、3部品とも DataStore への依存（または状態を渡す経路）を持たない。別タブで変更があり読み直した場合に、表示中の明細一覧・集計・予算入力欄・確認待ちの状態（上書き確認、重複確認）を更新する主体も不明で、通知の受け手は NoticeBannerView だけである。画面が古いまま残り、壊れた状態を知らずに操作できてしまう隠れた結合がある。 | 壊れた状態と別タブの変更を、どの部品が画面部品群へ伝えるか（AppShell 経由で渡す、または各画面部品が DataStore の通知を購読する）を depends_on と dependents に反映し、読み直し時に確認待ちの途中状態をどう扱うか（破棄する等）を behaviour に記す。 | New |
| R-03 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md > SampleDataSeeder behaviour と depends_on / ADR-006 | サンプル投入は Ledger への一括追加と Budget への予算設定の2回の呼び出しで、各々が別の保存になる。明細だけ保存されて予算の保存が失敗（または中断）すると、次回起動では「データあり」と判定されて再投入されず、予算のない中途半端なサンプルが残る。ADR-006 の「全部か無か」の考え方（ADR-001）と矛盾し、US7.1 の「超過と未設定のカテゴリが見られる」も満たせなくなる。「今月」を決める時計の持ち主も未定義。 | サンプルの明細と予算を1回の保存で入れる経路を DataStore または責任の分担として定めるか、中断時の扱い（再投入の可否の判定条件）を決める。「今日」の日付の取得元（AppShell など）を1か所に定め、Seeder と表示月の初期値で共有する。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md > CsvExchange depends_on / ImportReport / Ledger responsibilities | CsvExchange は行ごとの検証（日付・金額・メモ）で理由付きの拒否を返すが、Ledger の公開責任は「登録」「一括追加（全部か無か）」「一致の判定」で、保存せずに規則だけを判定する入口が挙がっていない。ADR-003 は「規則は Ledger の判定を使い二重に定義しない」とするため、その入口が必要。また重複確認は「確認 → 利用者の選択 → 追加」の2段階で、途中の状態（検証済みの行）を誰が保持するかも不明。 | Ledger の責任に「保存を伴わない規則判定」を加え、CsvExchange が行ごとの拒否理由を得る経路を明記する。取り込みの確認待ちの途中状態の持ち主（CsvExchange か ExportView）を決める。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md > AppShell / EntryFormView / ReviewView の関係 | 表示月の切り替え依頼は EntryFormView と ReviewView から AppShell への呼び戻しになるが、yaml 上は AppShell が各画面を使う一方向の依存しか書かれていない（呼び戻しは未宣言）。また Budget の「前の月」を求める主体（表示月を持つ AppShell か Budget か）も定まっていない。 | 呼び戻し（コールバック）として宣言するか、表示月を持つ部品への依存として depends_on に記し、「前の月」の算出元を1つに決める。 | New |
| R-06 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/domain-design/components.md > 外部の仕組み（Web Storage / storage イベント）、DataStore 属性 / Budget・CsvExchange behaviour | 「このステージでは技術・型・検証の細部を決めない」と冒頭で述べながら、external_dependencies に Web Storage と storage イベントという具体的な技術名を、behaviour に値の範囲（0〜9,999,999）、BOM・CRLF などの形式の細部を書いている。要件の転記で矛盾はないが、後続の NFR・機能設計の選択肢を狭めて見える。 | 技術名は「ブラウザ内の保存領域」「別タブの変更通知」程度の抽象にとどめ、値の範囲や形式の細部は要件への参照に置き換える（または意図的な固定であることを明記する）。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| aidlc-sensor-traceability (domain-design) | PASS: gaps 0, orphans 0, invalid 0 | 全18ストーリーが部品に対応づいている。カタログ上の構造（名前の一意性、depends_on と dependents の対称、循環なし、エンティティの持ち主が1つ、インフラは external_dependencies のみ）は手作業で確認し、問題なし |

### Summary

部品の境目は Q1〜Q4 の回答と一致し、ADR は4項目とセキュリティを備え、構造の規則も満たしている。ただし、全体スナップショット保存と複数部品の組み合わせから生じる実装時の問題（古いタブからの上書き、壊れた状態・別タブの変更が画面部品に伝わらない、サンプル投入が途中で中断する）が3件の Major として残っており、承認前に依頼者が判断することを勧める。
