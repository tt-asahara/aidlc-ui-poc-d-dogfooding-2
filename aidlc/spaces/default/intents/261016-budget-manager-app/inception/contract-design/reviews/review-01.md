## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T14:47:52Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > 約束ごとの一覧 C4・C5・C9 | C4 は「使う側」に U1 MonthlySummary、C9 は「使う側」に U1 AppShell を挙げている。提供側は U3 と U5 である。つまり U1 の部品が U3・U5 の部品を呼ぶ向きの辺になっており、DAG（U3・U5 は U1 に依存）と逆向きで、Unit 間に循環ができる。components.md でも MonthlySummary は Budget に、AppShell は SampleDataSeeder に依存する。「U1 では budget は常に null」と書かれているだけで、U1 の時点で Budget も SampleDataSeeder も存在しないとき、U1 のコードがどうコンパイル・動作するか（空の既定実装を U1 が持つのか、U3・U5 が U1 の呼び出し箇所を書き換えるのか）が決まっていない。並行作業ではこの箇所が U1 と U3・U5 の衝突点になる。 | C4・C5・C9 に、U1 が置く差し込み口（例: 予算を返す関数の既定実装は空、初回投入の既定実装は何もしない）を書き、U3・U5 がそれを置き換える形にして、依存の向きを DAG に合わせる。または、U1 の呼び出し箇所を U3・U5 が直接編集することと、その担当を明記する。あわせて unit-of-work-dependency.md の「部品の受け渡し」表にこの辺を足す。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > C2 DataStore subscribe / C6 AppState | 画面部品が「自分の保存のあとに」表示を更新する経路が決まっていない。subscribe のイベントは externalChange と unreadable だけで、AppState も selectedMonth・storeStatus・lastExternalChangeAt だけである。EntryFormView が登録しても、ReviewView の一覧と集計が再取得されるきっかけの定義がない。U1 の中核である「登録 → 月次集計に反映」を、実装者が推測で作ることになる。ドメイン設計レビュー R-02 の解消として十分とは言えない。 | 自分の commit 後にも出るイベント（例: committed、または AppState に revision を持たせる）を C2 か C6 に足し、ReviewView・ExportView が何を契機に listByMonth と summarize を呼び直すかを書く。 | New |
| R-03 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > C2 commit の behaviour（Q3 の通し番号の照合） | 「保存直前に revision を読み直して比較し、同じなら書く」は、読み取りと書き込みが別の操作で、2 つのタブが同時に同じ revision を読むと両方が通り、後の書き込みが先の変更を黙って消す余地が残る。Web Storage には、この読み書きをまとめて行う仕組みがない。ドメイン設計レビュー R-01（US7.4）を解消したという主張が、この隙間では成り立たない。 | 排他の手段（例: Web Locks API で commit を囲む）を採るか、残る隙間を許容する残余リスクとして明記する。どちらでも、commit の説明と未解決の点に書く。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > C7 ImportPreview / commitImport / C3 findSame・addMany | skipDuplicates で除く行を commitImport が特定する情報が ImportPreview にない（duplicateCount だけで、行ごとの印がない）。prepare から commit までの間に保存データが変わりうるため、再計算するのか保持するのかも決まっていない。validRows が EntryInput（文字列の金額、先頭の ' 付きなど）か正規化済みかも不明で、findSame の比較がどの形で行われるかが定まらない。要件 A10 とは「既存との一致だけを見る」点で整合するが、「既存に 1 件、ファイルに同じ行が 2 つ」のとき両方を重複として除くことが書かれていない。また addMany が入力順に addedOrder を振ること（ストーリー差分 FR2.1: ファイルの下の行ほど上に表示）も書かれていない。 | ImportPreview に行ごとの重複の印と正規化済みの値を持たせるか、commit 時に再判定すると書く。「既存と一致する行はすべて除く」と addMany の addedOrder の振り方（入力順）を C3・C7 に明記する。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > C8 formulaGuard と columns・trimming | メモの上限は 100 文字だが、出力時に先頭へ ' を足すと最大 101 文字になる。取り込みで「先頭の ' を外す」「前後の空白を除く」「100 文字を数える」のどの順で処理するかが書かれておらず、長さの検査を先に行うと、出力したばかりのファイルが取り込めない（C8 末尾の「出力したファイルを取り込み直せる」と矛盾）。また、要件 FR6.4 は ' に続く文字が数式記号のときだけ外すとしているのに、C8 は無条件に 1 つ外す（ストーリー差分とは合う）。 | 取り込みの処理順（空白の除去 → ' の除去 → 長さの検査）を明記し、100 文字の検査は ' を外したあとの値に対して行うと書く。要件 FR6.4 との差は、ストーリー差分を正とすることを一言添える。 | New |
| R-06 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > C2 SnapshotChange / C9 SampleDataSeeder | SnapshotChange の 3 つの変更（entriesToAdd・budgetsToReplace・initialize）を同時に指定できるか排他かが書かれていない。initialize のときの expectedRevision の値、状態が empty でないときに返す code（STALE_REVISION か別か）、seedIfEmpty が何もしなかったときの戻り値も決まっていない。Seeder が作る Entry の entryId・addedOrder を誰が振るかも不明で（Ledger.validate は ID なしの値を返す）、Seeder が自前で採番すると規則が二重になる。 | SnapshotChange は「いずれか 1 つだけ」と明記し、initialize の照合規則と戻り値を決める。ID と addedOrder を振る関数を Ledger の契約に足し、Seeder もそれを使う形にする。 | New |
| R-07 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > 約束ごとの一覧（CategoryCatalog の欠落） | CategoryCatalog は Ledger・Budget・MonthlySummary・CsvExchange・EntryFormView が U1 から使う共有部品なのに、提供する関数の約束がない（区分ごとの一覧、存在と区分の一致、支出カテゴリの並び順）。U2〜U5 が並行して書くときの食い違いの元になる。 | CategoryCatalog の約束（C10 など）を足し、持ち主を U1 とする。 | New |
| R-08 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > C6 と unit-of-work.md の U5・U4 の記述 | 契約は「取り込みの途中状態は ExportView が持つ」「失敗表示は U1・U3・U4 が作る」としているが、unit-of-work.md は U4 で「CsvExchange が持ち」、U5 で「各画面部品（保存系の操作を止める）」を受け持つとしており、食い違ったままである。unreadable のときに操作を止める実装を各画面の Unit と U5 のどちらが書くかが曖昧になる。 | 契約を正とし、unit-of-work.md の該当記述を直すか、止める操作の担当（各画面の Unit）を C6 に明記する。 | New |
| R-09 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/contract-design/contract-summary.md > 約束ごとの変え方 / C7 exportAll | 「項目を足すだけは互換」としているが、AppError.code など enum への値の追加は、Q1 の狙い（失敗の扱い漏れを型で防ぐ）と衝突し、呼び出し側の網羅的な分岐を壊す。また exportAll は日付を引数に取らず、ファイル名の日付の取得元が C6 の「今日を 1 か所で決める」規則とずれる。C2 の StoreSnapshot も components.md の storageKey を持たない。 | enum の値の追加は呼び出し側の確認が必要な変更として扱うと明記する。exportAll に today を渡すか AppShell から取る形にする。storageKey の扱い（契約外の内部値か）を一言書く。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| (なし) | このステージは検証ツールを宣言していない | 手作業で、DAG の各辺（U2〜U5 → U1、U6 → U2〜U5）と C1〜C9 の対応、Q1〜Q4 の反映、ドメイン設計 R-01〜R-05・Unit 分割 R-01〜R-04 の解消の主張を突き合わせた。Q1〜Q4 は C1・C2・C6 に反映され、破壊的変更の扱いも記載されている。Unit 分割 R-01（U5 が Budget を使わない）と R-02（失敗表示の担当）は契約上は成り立つが、上の指摘（U1 から U3・U5 への逆向きの辺、commit 後の更新経路、通し番号の照合の隙間）が残る |

### Summary

Q1〜Q4 の回答、結果の形、保存データの形、CSV の形式は、要件とストーリーの差分と大きくは矛盾せず、おおむね実装できる。ただし、C4・C5・C9 が U1 から U3・U5 への逆向きの辺になっていること、自分の保存後に画面を更新する経路がないこと、通し番号の照合に隙間が残ることの 3 点の Major は、承認前に直すことを勧める。
