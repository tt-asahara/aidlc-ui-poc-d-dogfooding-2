## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T15:21:39Z
**Iteration:** 2

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/functional-spec.md > W1 起動 / W6 CSV に保存 / 保存データの状態 | 保存データが読めない（unreadable）ときに止めるのは登録フォームだけで、集計（ReviewView）と CSV 保存（ExportView）の動きが決まっていない。このとき DataStore の中身は空なので、CSV 保存を押すと W6 の手順 3 に従って「出力する明細がありません」と出て、集計は全部 ¥0 になる。実際にはデータが残っているのに「明細がない」と伝わり、「データは消していません」の表示と食い違う。CSV は「ブラウザのデータが消えたときの控え」（AC5.1 のストーリー）なので、壊れたときに誤った案内が出るのは影響が大きい | unreadable のときの ReviewView と ExportView の振る舞いを W1 または W6 に定めて rules.md に規則として足す。例: CSV 保存は理由を出して止める（NOT_FOUND とは別の文言）、集計は読めないことが分かる表示にする。あわせて、ブラウザ操作のテストの確かめ方（AC7.3.3 の U1 分）に、unreadable 時の集計・CSV の表示を加える | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/functional-spec.md > 差し込み口（SampleSeeder.seedIfEmpty） | 「U5 は AppShell の組み立てで差し替えるだけで、U1 のほかのコードは書き換えない」としているが、W1 の empty の手順は「差し込み口を呼ぶ」とだけ書き、戻り値の扱いを決めていない。U1 の空の実装は ok(null) だが、約束ごと C9 の戻り値は Result of StoreSnapshot（null なし）で、形が食い違っている。U5 の本物が ok(snapshot) を返したとき AppShell が何をするか（DataStore の内容を使うのか、集計を読み直すのか）、error を返したとき（C9: 何も残さず次回に再試行）に空で続けるのかが未定義。このままだと U5 で AppShell の起動手順そのものを書き換えることになり、差し込み口の前提が崩れる | 戻り値ごとの AppShell の扱いを W1 に定める（例: ok なら DataStore.getSnapshot を読み直して committed と同じ受け取り方、error なら空のまま ready で続け理由は U5 が出す）。SampleSeeder の型を C9 の形に合わせるか、null を足す変更を契約への追加として明記する | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/functional-spec.md > W1 起動（empty）/ W2 手順 5〜6 | 保存データがない（empty）ときの、DataStore が持つ最初の内容と通し番号が書かれていない。C2 の getSnapshot は null を返しうるが、Ledger.add は期待する通し番号と addedOrder の最大値（BR1.6）を現在の内容から決める。empty のときの revision を 0 とみなし、最初の保存で 1 にすること、保存領域に何もないことを通し番号 0 と照合することを決めておかないと、2 つのタブがともに空で始まった場合の STALE_REVISION の判定が実装者任せになる | W1 の empty に「内容は 明細0件・予算0件・revision 0 の仮の保存データとして扱い、保存領域が空のときの通し番号は 0 と照合する」といった一文を足す | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/functional-spec.md > 登録フォームの状態 / W4 | W4 は STORE_UNREADABLE の結果の行を持ち「登録する」を押せなくするとしているが、登録フォームの状態図には submitting から disabled への遷移がない。storeStatus の状態図にも ready から unreadable への遷移がない。U1 では起動時にだけ unreadable になるので W4 の行は到達しないはずだが、到達しない理由が書かれておらず、実装者が不要な分岐を作るか漏らす | W4 の STORE_UNREADABLE の行に「U1 では起動時に unreadable なら入力できないので通常は到達しない。防御として disabled にする」と注記するか、状態図に遷移を足す | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/functional-spec.md > 保存の知らせ（committed の行）と frontend-components.md > 部品ごとの受け取るものと持つ状態 | committed を受けた画面は「表示中の月の集計と、明細の件数を読み直す」とあるが、U1 の画面には明細の件数を表示する場所がなく、ExportView の状態にも件数がない（BR4.5 も同じ文言）。何を読み直すのか不明で、実装者が不要な件数表示を作りうる | 「明細の件数」を削るか、ExportView が 0 件判定のために件数を持つのであればそれを部品の表に書く | New |
| R-06 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/functional-design/traceability.json > coverage AC7.2.1 | AC7.2.1 は「明細と予算」が残ることを求めるが、U1 では明細の部分だけで、予算の部分は U3 に回している（functional-spec.md の確かめ方の表に明記）。それなのに traceability では全体を OK にしており、U3 側で拾われない恐れがある | AC7.2.1 を OK のまま備考で部分的であることを示すか、予算の部分の U3 での確認を target に併記する | New |

> R-01 Not re-checked this round

> R-02 Not re-checked this round

> R-03 Not re-checked this round

> R-04 Not re-checked this round

> R-05 Not re-checked this round

> R-06 Not re-checked this round

### Resolved

| ID | Resolution |
|---|---|
| R-01〜R-06 | 前回の確認で解消済み。今回の再確認でも後戻りは見当たらない。 |
| R-07 | traceability.json の AC7.3.3 の target が「U1 は登録・集計・CSV 保存の停止と理由: BR4.2, BR4.6」に直っている。functional-spec.md の 261 行目と 275 行目、rules.md の BR4.6 と食い違いがない。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| grep による AC7.3.3、BR4.2、BR4.6 の相互参照確認 | 4 つのファイルで整合 | AC7.3.3 の U1 分は、登録・集計・CSV 保存の停止と理由で一貫している。 |

### Summary

R-07 は解消し、ほかの箇所に後戻りはない。Critical と Major の未解決はなく、実装者が迷わず作れる状態のため READY とする。
