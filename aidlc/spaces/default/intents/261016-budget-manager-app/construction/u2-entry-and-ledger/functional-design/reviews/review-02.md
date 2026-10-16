## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T22:58:29Z
**Iteration:** 2

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/functional-design/functional-spec.md > W1/W2 手順 2・5、状態の移り変わり（submitting）、rules.md > BR1.7 | 二重送信の防止の仕組みが、実装済みの同期処理（app/src/ui/EntryFormView.tsx の submit は ledger.add を同期で呼び、成功時に金額とメモを空にする）では働かない。処理中の状態は同じ処理の中で立てて解くため、2回目のクリックの時点ではすでに解けている。結果として、2回目は金額が空のまま Ledger.validate に渡り、成功の知らせが VALIDATION の alert に置き換わる。AC1.1.4（300 ミリ秒以内に2回押す）の件数は偶然合うが、画面は誤った状態になる。「処理が終わるまで処理中のまま」と書かれているが、いつ終わりとみなすかが定義されていない。 | 二重送信の防止の方式を決めて書く。たとえば、ref による同期の鍵を 300 ミリ秒以上保持するか、次の描画後まで保持する。無視した2回目の操作は、誤りの表示も知らせの置き換えも起こさないことを明記する。ブラウザ操作のテストで、素早く2回押しても成功の知らせが残ることまで確かめる条件に足す。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/functional-design/functional-spec.md > W4 メモの入力、rules.md > BR1.4、frontend-components.md > 部品ごとの受け取るものと持つ状態 | メモ欄の入力制限の方式が未定で、現状のコードのままでは AC1.2.4 を満たせない。(1) 現状の入力欄は maxLength=100（UTF-16 の数え方）で、絵文字や結合文字を含むメモが 100 文字（見える1文字）未満で止まる。maxLength を外す指示がない。(2) 「100 文字を超える部分を受け付けない」を onChange での切り詰めで作ると、IME の変換中（日本語入力）に変換が壊れる。変換中の扱い（compositionend での確定時に判定するか）が決まっていない。(3) メモ欄は1行の input type=text で、貼り付けた改行はブラウザが onChange の前に取り除く。W4 の「空白に置き換えずに受け付けない、欄の下に「メモに改行は使えません」」は、onPaste での検出か textarea への変更なしには作れない。(4) 入力時の数え方が前後の空白を含むのか、BR1.4 の検証（前後の空白を除いてから数える）と同じなのかも未定。 | W4 に、欄の種類（input のままか）、maxLength の撤去、IME 変換中の扱い、貼り付けの改行の検出方法（onPaste）、入力時と検証時で数え方をそろえる方法（前後の空白）を決めて書く。memoNotice を出す・消す条件を、これらに合わせて定める。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/functional-design/rules.md > BR1.1、BR1.2 | 金額が空のときの理由が BR1.1・frontend-components.md の表では「金額は 1〜9,999,999 の整数で入力してください。例: 1280」の1つだが、app/src/domain/ledger.ts は「金額を入力してください」を返しており、どちらに統一するかが書かれていない。また BR1.2 の「年・月・日から作った日付が元の値と一致しない」は、app/src/domain/validateSnapshot.ts の isRealDate（Date.UTC と setUTCFullYear で 0000〜0099 年を補正）と同じ関数を使うとは書かれていない。素朴に new Date(y, m-1, d) を使うと 0050-01-01 などの判定が U5 の検査とずれる。 | 金額が空のときの文を1つに決める。日付の実在判定を validateSnapshot と共有する（メモの数え方と同様に1か所に置く）と書く。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/functional-design/frontend-components.md > 部品ごとの受け取るものと持つ状態（ReviewView）、functional-spec.md > W2 手順 3 | (a) ReviewView は Ledger.listByMonth を呼ぶとあるが、現状の props には ledger がなく、AppShell から何を渡すかが書かれていない。(b) 別の月の知らせ「N月の明細として登録しました」は年を含まず、年をまたいだ登録（例: 表示が2026年10月で日付が2025-09）で何の月か分からない。AC1.3.1 の文言は守っているので、補う場合は年の扱いを決める。 | ReviewView の props に ledger（または listByMonth）を足すことを書く。年をまたぐ登録の知らせの扱いを一言決める。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u2-entry-and-ledger/functional-design/functional-spec.md > W4 手順3、rules.md > BR1.4 | 文字数は前後の空白を除いた値で数えるが、切り詰めは「値」を先頭から 100 文字にすると書いてあり、空白を含む元の値か除いた値かが決まっていない。先頭に空白がある貼り付けで、切り詰め後の中身が 99 文字になる、または切り詰めても Ledger.validate の結果と食い違うおそれがある。 | 切り詰めの対象を、前後の空白を除いた値と明記する（または先頭の空白は入力時に除く）。単体テストに先頭空白付き 101 文字の例を足す。 | New |

> R-01 Not re-checked this round

> R-02 Not re-checked this round

> R-03 Not re-checked this round

> R-04 Not re-checked this round

### Resolved

| ID | Resolution |
|---|---|
| R-01 | 解決。BR1.7 と W1、W2 で、同期の ref の鍵を最初の操作で立て、300 ミリ秒の予約で外すと定めた。鍵がある間の操作は検証も表示変更もせず捨てるため、同期で終わる add の直後の2回目が空の金額で検証され、成功の知らせが誤りに置き換わる経路はなくなった。AC1.1.4 の確かめ方にも、知らせが残り誤りが出ないことが入っている。 |
| R-02 | 解決。maxLength を外し、書記素数で数える change と compositionend、変換中は数えない、CR か LF を含む paste は取り消し、Enter は登録、と定めた。実装の EntryFormView.tsx 263 行目は maxLength を使っているので、この設計どおりの変更が必要になる。UTF-16 単位で絵文字入りメモが 100 文字前に止まる問題は、設計上は塞がれた。 |
| R-03 | 解決。空の金額も同じ文言にそろえ、日付の実在判定（isRealDate）と書記素の数え方を app/src/domain の1か所に置いて共有すると BR1.2 と BR1.4 に書いた。validateSnapshot.ts の isRealDate と Segmenter はいまは同ファイル内にあり、共有の場所へ移す作業は実装に残るが、設計としては完結している。 |
| R-04 | 解決。frontend-components.md の表で ReviewView が ledger（services.ledger）を受け取ると明記された。AppShell は services.ledger を持っており整合する。別の年の明細の通知にも年を付ける規則が BR2.1 と W2 手順3に入った。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| なし（このステージに検証ツールの指定なし） | 該当なし | 手作業で規則・手順・画面部品・traceability.json の対応と、実装済みコードとの整合を確認した |

### Summary

前回の Major 2件（R-01、R-02）と Minor 2件（R-03、R-04）は、すべて設計の上で解決している。新たに見つけたのは、メモの切り詰めの対象（空白を含むか除くか）が曖昧という Minor 1件だけで、実装の妨げにはならない。Critical と Major は 0 件のため READY とする。
