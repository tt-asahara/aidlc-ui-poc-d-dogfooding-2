## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T16:29:34Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/rules.md > BR5.3、BR3.1 | BR5.3 の文言「登録した内容は、ページを閉じると消えます」は、実際の動きと食い違う。U1 の `commit` は `setItem` が失敗すると手元の写しを更新せず `STORAGE_WRITE` を返す（app/src/store/dataStore.ts の手順 5）。AC7.3.1 も「登録しました」を出さないと定めている。つまり保存できない環境では、画面上は登録そのものが成立せず、「ページを閉じると消える」状態（メモリ上には残る）は存在しない。BR3.1 の「操作は止めず」も、登録が毎回失敗する意味なのか、メモリ上だけで続ける意味なのかが決まっていない。このままでは、お知らせの文言とコード生成の実装が食い違う。 | 保存できない環境での登録の扱いを1つに決めて書く。(a) U1 のとおり登録は毎回 STORAGE_WRITE で失敗する場合は、BR5.3 の文言を「このブラウザでは保存できません。登録しても保存されません」のように実際の動きに合わせる。(b) メモリ上だけで続ける場合は、`commit` の変更（AC7.3.1 との整合を含む）を U5 の変更点に足す。あわせて `getAvailability` が unavailable のときの `commit` の期待動作を W1 に書く。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/functional-spec.md > W1 起動 手順 3、W3、frontend-components.md > NoticeBannerView | W1 は、サンプル投入が失敗したら「空のまま ready で続ける」と書くが、実際の DataStore の状態はそれと一致しない場合がある。(1) 投入の保存直前の読み直しで読めない値を見つけると、DataStore は unreadable になる（dataStore.ts の手順 3）。しかし AppShell の bootstrap は `loaded` の結果だけで storeStatus を決めるため、AppState は ready のままになり、BR5.1 の知らせも出ない（登録・集計・CSV の停止も効かない）。(2) 別のタブが先に投入した場合は、DataStore が最新を採用して `externalChange` を出す。W1 は「空のまま」と書いているが、実際は相手のデータが入っている。(3) これらの知らせは、subscribe が `useEffect` で後から始まるため（AppShell.tsx）、起動中に出ると誰も受け取らない。そのため、AppState・知らせ枠・DataStore の三者がずれる。 | W1 の手順 3 に「投入の成否にかかわらず、投入後に `DataStore.getStatus()` を読み、storeStatus と BR5.1 を決め直す」ことを書く。投入が STALE_REVISION で断られた場合は、DataStore が採用した最新の内容を使うこと（空ではない）を明記する。起動中に出た `unreadable`・`externalChange` を取りこぼさない方法（getStatus の再確認、または subscribe を load の前に始める）を決める。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/functional-spec.md > W3 手順 2〜3、状態の移り変わり（保存データの状態） | unreadable の状態で、別のタブから読める値の storage イベントが届いたときの扱いが決まっていない。W3 手順 3 の「読める: 入れ替え」をそのまま読むと unreadable から ready に戻るが、状態図は「unreadable から抜ける操作はない」と書き、BR5.1 は「状態が続く間は出し続ける」としている。また、storage イベントの `key` が null になる `localStorage.clear()`（ブラウザの標準の動き）は、手順 2「違うキーなら何もしない」で無視されるのか、キーの削除として扱うのかが読み取れない。 | unreadable 中に読める値が届いた場合の挙動（無視する、または ready に復帰して BR5.1 を消す）を1つに決めて W3 と状態図に書く。`key` が null の場合の扱いと、`storageArea` が localStorage であることの確認も W3 手順 2 に書く。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/rules.md > BR1.1 | BR1.1 の検査項目に抜けと曖昧さがある。(1) 日付は「YYYY-MM-DD」の形だけで、存在しない日付（2026-02-30）を弾くかが書かれていない（U1 の Ledger.validate も形式しか見ない。app/src/domain/ledger.ts）。(2) 「カテゴリが CategoryCatalog にある」は、区分と合うか（収入に支出カテゴリが付いていないか）まで見るかが決まっていない。(3) addedOrder の重複と、budgetKey の重複の扱いが書かれていない。(4) 検査の置き場所が書かれていない。DataStore が Ledger.validate を呼ぶと、Ledger が DataStore に依存する既存の向きと循環する（ledger.ts は store の型を import している）。 | BR1.1 の検査項目を、日付の実在・区分とカテゴリの整合・addedOrder と budgetKey の重複まで決めて書く。検査を DataStore の側の純粋な関数（domain の下位モジュール）として置き、Ledger に依存しないことを frontend-components.md か functional-spec.md に明記する。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u5-storage-resilience/functional-design/functional-spec.md > W1 手順 4、W3 | storage イベントの受け取りを DataStore が「始める」と書かれているが、始める契機（`load` の中か別の関数か）と、止める手段（`DataStore` に dispose がない）が決まっていない。テストや React の開発時の二重実行で、リスナーが重複して `externalChange` が二重に出るおそれがある。 | 受け取りの開始を `load()` の中で1回だけ行う（重複を避ける）か、`start`・`stop` を C2 の追加項目に足すかを決めて書く。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| traceability sensor | PASS（依頼内容による） | 受け入れ条件との対応は取れている。指摘は動作の整合に関するもの |
| 手動の突き合わせ（dataStore.ts、AppShell.tsx、composition.ts、ledger.ts、types.ts） | R-01、R-02 を確認 | U1 の実装と U5 の設計の食い違いを根拠付きで確認した |

### Summary

別のタブの検知、サンプル投入、お知らせ枠の優先順は全体として筋が通っているが、保存できない環境での動き（BR5.3 の文言と commit の実際の動きの食い違い）と、起動時のサンプル投入が失敗したときの状態の食い違いの2点が、コード生成で誤った実装を生むため Major とした。Major が2件のため、依頼の基準（Major なし）では NOT-READY とする。小さな指摘（R-03〜R-05）は、あわせて直すとコード生成の迷いが減る。
