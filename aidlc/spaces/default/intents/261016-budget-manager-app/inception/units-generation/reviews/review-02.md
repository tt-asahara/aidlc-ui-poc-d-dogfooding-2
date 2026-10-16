## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T15:01:48Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work-dependency.md > yaml 辺ブロック（u5-storage-resilience の depends_on）と「部品の受け渡し」表 | U5 は SampleDataSeeder を持つが、components.md ではこの部品は Budget（U3 が持つ）の予算設定と Ledger の一括追加（U4 の受け持ちとして記述）に依存する。それなのに U5 は depends_on が U1 のみで、U3・U4 への辺がない。U1 には Budget も一括追加もないため、U5 を U2〜U4 と並行に作ると、サンプル投入（R-03 の「明細と予算を1回の保存で入れる」を含む）が土台なしで着手になり、DAG が実際の依存を表していない。 | 次のどちらかを選び、yaml とメインの記述をそろえる。(a) U5 に U3 と U4 への依存辺を足す。(b) Budget の最小の形と Ledger の一括追加を U1 に前倒しする。または SampleDataSeeder を U3・U4 の後の Unit に切り出す。あわせて、依存辺が変わるので、U2〜U5 を並行して作れるという記述も直す。 | Accepted risk |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work-story-map.md > 複数の Unit にまたがるもの（US7.3） | US7.3 は「登録・予算保存・取り込みのそれぞれの画面に保存失敗の表示を U5 でまとめて足す」としているが、予算保存の画面（U3）と取り込みの画面（U4）は U5 が依存する U1 には存在しない。U5 が U3・U4 と並行して進むと、表示を足す対象がまだなく、U3・U4 側も保存失敗の扱いを持たない状態で完了してしまう。U2〜U5 が EntryFormView・ReviewView・ExportView・AppShell を同時に触ることにもなり、統合時の衝突の主因になる。 | 保存失敗の結果（DataStore が返す形）と、各画面部品が受け取る状態の形を U1 の契約として固定し、U2〜U4 は自分の画面の保存失敗の表示を各自で作る。U5 は DataStore 側の版・照合・検知に絞る。または U5 が U2〜U4 の後になる依存辺を足す。 | Accepted risk |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md > U1 の注意点 | U1 の DataStore は「全体をまとめて保存」の形で作るとあるが、StoreSnapshot の形（schemaVersion、revision、budgets を最初から持つか）と保存失敗を呼び出し元へ返す約束が U1 の範囲として明記されていない。U3 が予算を足し、U5 が版を足す形では、保存データの形の後付け変更が全 Unit に及ぶ。 | U1 の範囲に、スナップショットの全項目（予算・版・通し番号の空の形を含む）と、保存失敗の返し方を含めると明記する。 | Accepted risk |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work-dependency.md > 並行するときに同じファイルを触りやすい場所 | 衝突しやすい場所として ReviewView・Ledger・AppShell を挙げているが、DataStore（U1 と U5）と、EntryFormView・ExportView（U2・U4・U5）は挙がっておらず、対策もブランチ分離だけにとどまる。 | 衝突しやすい場所の一覧を補い、U1 で部品の公開の形（Ledger の判定・一括追加の入口、AppShell の状態の入口）をあらかじめ置いておくことを Unit の注意点に書く。 | Accepted risk |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md > U5（規模 L、R-01〜R-03） | U5 はドメイン設計レビューの 3 件（通し番号による照合、状態の画面部品への伝達、サンプルの 1 回保存）と、全画面部品への保存系操作の停止を 1 つの Unit に集めている。上の 2 件の Major を解消すると範囲が変わる。 | 依存辺の見直しのあとで、U5 の規模と範囲（必要なら DataStore の異常系とサンプル投入を分ける）をもう一度確かめる。 | Accepted risk |
| R-06 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md > U1 薄い版 / U5 含む部品 | 登録失敗の表示は U1 が作る（Q4）と書かれているが、U1 の含む部品に失敗表示の記述がなく、共通の通知部品 NoticeBannerView は U5 の含む部品に入っている。U1 の失敗表示が NoticeBannerView を使うのか EntryFormView 内で完結するのかが読み取れない。U5 を U1 の直後に作るため手戻りは小さいが、U1 の実装者が迷う。 | U1 の含む部品か注意点に、登録失敗の表示をどの部品で作るか（NoticeBannerView を使うなら U1 で最小の形を作るか、U5 で差し替えるか）を1行で書く。 | New |
| R-07 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/units-generation/unit-of-work.md > U2 注意点 と contract-design/contract-summary.md 56行目 | 契約設計の要約には「登録は U1・U2」が失敗表示を担当すると書かれている。一方 unit-of-work.md の U2 は「登録の保存失敗の表示は U1 で作る」とし、US7.3 の行も U1 だけを挙げる。U2 が登録失敗の表示に触れる範囲が曖昧。 | 契約設計の要約の表記と合わせて、U2 の受け持ち（欄ごとの誤りと二重送信の防止のみ）を明記するか、要約側を直す。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| 手動の突き合わせ（yaml、mermaid、表、文章） | 一致 | yaml の depends_on、mermaid、依存表、順番の記述（U1 → U5 → U2 → U3 → U4 → U6）がすべて同じ。循環なし（U1 ← U5 ← U2/U3/U4 ← U6）。 |
| ストーリー対応表の確認 | 一致 | US7.3 の行は U5 が主、U1・U3・U4 が表示を作る形で Q4 と整合。18件すべて割り当て済み。traceability.json の U5 の対象（US7.1、US7.3、US7.4）とも一致。 |
| 「U2〜U5 は U1 のあとに並行」という古い記述の探索 | 該当なし | 残っているのは「U2・U3・U4 は互いに依存せず並行も可能（デリバリー計画では順に作る）」という正しい記述のみ。 |

### Summary

依存の見直し（U5 は U1 のみに依存、U2・U3・U4 は U5 に依存、U6 は U2・U3・U4 に依存）は、yaml、図、表、文章、ストーリー対応で食い違いがなく、循環もありません。契約設計の C9 により SampleDataSeeder は保存データの形を直接組み立てるため、U5 は U1 だけで作れ、U1 の最初の Unit としての位置づけ（薄い版・チェックポイント）も変わりません。残るのは失敗表示の担当部品と U1・U2 の境目に関する軽微な曖昧さ2件で、承認を妨げるものではありません。
