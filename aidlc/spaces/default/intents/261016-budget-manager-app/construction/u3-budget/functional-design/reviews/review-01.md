## Review

**Verdict:** NOT-READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T23:40:35Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/frontend-components.md > 部品ごとの受け取るものと持つ状態（欄の入力値の作り直し） | 欄の入力値は「month・dataVersion・lastExternalChangeAt が変わったら作り直す」と書かれている。AppShell.tsx では、dataVersion は committed を含むすべての保存の知らせで増える。「1 登録」と「2 確認」は同じ画面にあるため、予算欄を編集中に明細を1件登録すると committed で dataVersion が増え、未保存の予算入力が黙って消える。登録で別の月へ切り替わる場合も同様。BR4.1 は「月の切り替え」でだけ入力を捨てると定めており、食い違う。 | 欄を作り直す条件を限定する。自分の予算の保存・コピーの成功、表示月の変更、externalChange だけで作り直し、他部品由来の committed では未保存の入力を保つ。frontend-components.md、functional-spec.md の W1〜W5、BR4.1 に同じ条件を書く。 | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/rules.md > BR5.1、BR4.2、functional-spec.md > W2 手順7、W5 手順3 | BR5.1 と W2 手順7 は、STALE_REVISION の失敗でも「入力は残す」とする。しかし dataStore.ts の commit は、照合に失敗すると adoptLatest のあと externalChange を発行してから fail を返す。W5 手順3 と frontend-components.md の規則に従うと、この externalChange で欄が最新の予算に作り直され、入力は残らない。さらに BR4.2 の取り消しの知らせと BR5.1 の STALE_REVISION の文言、AppShell の別タブの知らせが同時に出る可能性があり、どれを予算の区切りに出すか決まっていない。 | STALE_REVISION のときの欄の扱いを1つに決める。入力を残すなら externalChange では保存操作中の欄を作り直さないと明記し、残さないなら BR5.1 の「入力は残す」と文言（「最新の内容を読み込みました」）を揃える。併せて、予算の区切りに出す知らせの優先順位を決める。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/functional-spec.md > W3 手順4〜6、W5 手順2〜3 | コピーの確認は保存済みの予算（targetHasBudgets）だけで決まる。保存済みの予算がなく未保存の入力だけがある月でコピーすると、確認なしで入力が捨てられる（手順6）。別タブの変更（W5）も、確認の枠が開いていなければ知らせなしに未保存の入力を作り直す。Q2 で決めた「月の切り替えで捨てる＋1行の注意書き」の範囲を超えて入力が失われる。 | 入力が捨てられる操作（コピー、externalChange）で、未保存の入力があるときに知らせる、または確認に含めるかを決めて W3・W5 に書く。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/rules.md > BR5.1、BR3.3、functional-spec.md > W3 手順7 | BR5.1 の STORAGE_WRITE の文言は「もう一度「予算を保存」を押してください」だが、コピーの失敗にも同じ表示を使うとある。コピーの失敗では再試行の操作が違い、誤った案内になる。また、コピーの失敗時に確認の枠を閉じるか残すか、操作位置をどこへ置くかが未定義。さらに BR5.1 は commit の STORE_UNREADABLE（commit の手順3で保存データの破損が見つかった場合）を扱っていない。 | コピー用の失敗の文言を別に定める。失敗時の確認の枠と操作位置の扱い、STORE_UNREADABLE のときの表示（予算の区切りの表示が消える点を含む）を決めて書く。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u3-budget/functional-design/functional-spec.md > 約束ごと C4 の使い方、W3 > 確認の枠 | Budget の内部処理の前提が書かれていない。commit に渡す expectedRevision の取り出し元（store.getSnapshot の revision）、saveMonth の values にカテゴリ名が欠けている、または支出カテゴリ以外のキーがある場合の扱い（BR1.3）、確認の枠が非モーダルで Escape がフォーカスの外では効かない場合の扱い、確認が開いたあとに previewCopy と copyFromPrevious の間で保存が変わった場合の扱いが未定義。 | 上記の前提を functional-spec.md の C4 の節と W3 に短く書く。 | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| bun .claude/tools/aidlc.ts engine now | エラー（プロジェクトの場所を認識できず） | 日時は date -u の UTC 値で代用した |
| 依頼で伝えられたトレーサビリティの検査 | 合格（依頼側の報告。再実行していない） | ID の対応は確認済みとして扱った。内容面の指摘は上の表のとおり |

### Summary

ストーリーと契約（C4、C5）の対応と、超過の等号（実績=予算は超過にならない）、前月コピーの置き換えの意味は整合している。一方、dataVersion を条件にした欄の作り直しが、同じ画面の明細登録や STALE_REVISION の失敗時の「入力は残す」と衝突しており、未保存入力の扱いが実装者の推測に委ねられる。Major が2件あるため NOT-READY とする。
