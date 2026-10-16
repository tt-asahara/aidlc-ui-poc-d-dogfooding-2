## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T23:43:41Z
**Iteration:** 2

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/frontend-components.md > 部品ごとの受け取るものと持つ状態（欄の入力値の作り直し） | 欄の入力値は「month・dataVersion・lastExternalChangeAt が変わったら作り直す」と書かれている。AppShell.tsx では、dataVersion は committed を含むすべての保存の知らせで増える。「1 登録」と「2 確認」は同じ画面にあるため、予算欄を編集中に明細を1件登録すると committed で dataVersion が増え、未保存の予算入力が黙って消える。登録で別の月へ切り替わる場合も同様。BR4.1 は「月の切り替え」でだけ入力を捨てると定めており、食い違う。 | 欄を作り直す条件を限定する。自分の予算の保存・コピーの成功、表示月の変更、externalChange だけで作り直し、他部品由来の committed では未保存の入力を保つ。frontend-components.md、functional-spec.md の W1〜W5、BR4.1 に同じ条件を書く。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/rules.md > BR5.1、BR4.2、functional-spec.md > W2 手順7、W5 手順3 | BR5.1 と W2 手順7 は、STALE_REVISION の失敗でも「入力は残す」とする。しかし dataStore.ts の commit は、照合に失敗すると adoptLatest のあと externalChange を発行してから fail を返す。W5 手順3 と frontend-components.md の規則に従うと、この externalChange で欄が最新の予算に作り直され、入力は残らない。さらに BR4.2 の取り消しの知らせと BR5.1 の STALE_REVISION の文言、AppShell の別タブの知らせが同時に出る可能性があり、どれを予算の区切りに出すか決まっていない。 | STALE_REVISION のときの欄の扱いを1つに決める。入力を残すなら externalChange では保存操作中の欄を作り直さないと明記し、残さないなら BR5.1 の「入力は残す」と文言（「最新の内容を読み込みました」）を揃える。併せて、予算の区切りに出す知らせの優先順位を決める。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/functional-spec.md > W3 手順4〜6、W5 手順2〜3 | コピーの確認は保存済みの予算（targetHasBudgets）だけで決まる。保存済みの予算がなく未保存の入力だけがある月でコピーすると、確認なしで入力が捨てられる（手順6）。別タブの変更（W5）も、確認の枠が開いていなければ知らせなしに未保存の入力を作り直す。Q2 で決めた「月の切り替えで捨てる＋1行の注意書き」の範囲を超えて入力が失われる。 | 入力が捨てられる操作（コピー、externalChange）で、未保存の入力があるときに知らせる、または確認に含めるかを決めて W3・W5 に書く。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/rules.md > BR5.1、BR3.3、functional-spec.md > W3 手順7 | BR5.1 の STORAGE_WRITE の文言は「もう一度「予算を保存」を押してください」だが、コピーの失敗にも同じ表示を使うとある。コピーの失敗では再試行の操作が違い、誤った案内になる。また、コピーの失敗時に確認の枠を閉じるか残すか、操作位置をどこへ置くかが未定義。さらに BR5.1 は commit の STORE_UNREADABLE（commit の手順3で保存データの破損が見つかった場合）を扱っていない。 | コピー用の失敗の文言を別に定める。失敗時の確認の枠と操作位置の扱い、STORE_UNREADABLE のときの表示（予算の区切りの表示が消える点を含む）を決めて書く。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/functional-spec.md > 約束ごと C4 の使い方、W3 > 確認の枠 | Budget の内部処理の前提が書かれていない。commit に渡す expectedRevision の取り出し元（store.getSnapshot の revision）、saveMonth の values にカテゴリ名が欠けている、または支出カテゴリ以外のキーがある場合の扱い（BR1.3）、確認の枠が非モーダルで Escape がフォーカスの外では効かない場合の扱い、確認が開いたあとに previewCopy と copyFromPrevious の間で保存が変わった場合の扱いが未定義。 | 上記の前提を functional-spec.md の C4 の節と W3 に短く書く。 | New |
| R-06 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/frontend-components.md > 部品ごとの受け取るものと持つ状態（ReviewView・AppShell の行） | BudgetTable は lastExternalChangeAt を受け取る設計だが、実装済みの ReviewView は dataVersion だけを受け取り、AppShell も lastExternalChangeAt を ReviewView に渡していない。ReviewView の行は「U1・U2 のもの + budget」、AppShell の行は「services.budget を渡す」だけで、lastExternalChangeAt を AppShell から ReviewView を通して BudgetTable まで渡す変更が書かれていない。 | ReviewView の受け取るものと AppShell の渡すものに lastExternalChangeAt（appState.lastExternalChangeAt）を足す。 | New |
| R-07 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/functional-spec.md > 欄の入力値を作り直すきっかけ（BR4.3） | 「1回だけ無視する」印は、lastExternalChangeAt の値が変わることを前提に下ろされる。AppShell は services.now().toISOString() を入れるため、時計を固定したテストや同じミリ秒の2回の externalChange では値が変わらず、描画の効果が動かない。印が立ったままになり、その後の本物の別タブの変更を無視するおそれがある。 | 印の下ろし方を値の変化に頼らない形にする（例: 次の描画で印を必ず下ろす、または AppShell が externalChange ごとに増える番号を渡す）。あるいは、この前提と、テストでは時計を進める方針を設計に明記する。 | New |

> R-01 Not re-checked this round

> R-02 Not re-checked this round

> R-03 Not re-checked this round

> R-04 Not re-checked this round

> R-05 Not re-checked this round

### Resolved

| ID | Resolution |
|---|---|
| R-01 | BR4.3 と「欄の入力値を作り直すきっかけ」で、作り直しを月の変更、自分の保存・コピーの成功、自分の操作の結果でない externalChange の3つに限った。frontend-components.md からも dataVersion を作り直しの契機として外し、集計だけ dataVersion で読み直す形に分けた。AppShell は committed でも dataVersion を増やすため、この絞り込みが必要で、設計は実装と合っている。 |
| R-02 | commit は STALE_REVISION の手順 4 で externalChange を同期的に出し、AppShell が lastExternalChangeAt に写すのは描画のあとになる。BudgetTable が失敗の戻り直後に ignoreNextExternalChange の印を立てる設計は、この順序と整合する。BR5.1 は入力を残し、失敗の知らせだけを出すと決めており、BR4.2 の取り消しの知らせとの重なりもなくなった。印の下ろし方の弱点だけを R-07 に残した。 |
| R-03 | コピーの確認は、保存済みの予算がある、または dirty のときに出し、未保存の入力が失われる旨を添える。確認の枠がなく dirty のときの externalChange には置き換えの知らせを出す。無言で入力を捨てる経路はなくなった。 |
| R-04 | BR5.1 でコピーの失敗の文言を保存と分け、コピー失敗では確認の枠を閉じて操作位置をコピーのボタンへ移す。STORE_UNREADABLE は storeStatus の unreadable を通して BR5.2 の表示に移る。実装では becomeUnreadable が unreadable イベントを出すので整合する。 |
| R-05 | expectedRevision を commit 直前の getSnapshot().revision から取ること、saveMonth が支出カテゴリ8つの名前だけを読むこと、copyFromPrevious が呼んだ時点の保存データを使うこと、Escape が確認の枠の中の操作位置でも働くことが明記された。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| 実装との突き合わせ（dataStore.ts、AppShell.tsx、ReviewView.tsx） | 設計の主張は実装の順序と一致。ただし lastExternalChangeAt の受け渡しは ReviewView に未実装 | R-06 と R-07 の根拠。どちらも実装前に直せる軽微な点 |

### Summary

前回の R-01 から R-05 は、実装済みの DataStore と AppShell の通知の順序に照らして、すべて解消されている。新たに見つけたのは、lastExternalChangeAt の受け渡しの記述漏れと、印の下ろし方が値の変化に頼る弱点の2件で、どちらも Minor のため READY とする。
