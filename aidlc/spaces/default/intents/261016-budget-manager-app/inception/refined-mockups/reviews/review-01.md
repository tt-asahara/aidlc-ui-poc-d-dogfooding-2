## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-10-16T14:08:37Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/mockups.md > 画面の状態とストーリー、および interaction-spec.md 全体、ui-poc-refined-contract.md > Screen State Acceptance Mapping | US7.1（サンプルデータで試し始める。AC7.1.1〜AC7.1.4）を表す画面状態も仕様も契約の対応もない。初回表示で何が入っているか（直近3か月分の明細と予算、3か月のどこかに超過と未設定が見られる構成、実在名を含まないメモ）が、どの成果物にも書かれていない。見本の HTML も 10月の7件だけで、9月・8月の内容がない | 初回起動の状態（例: app-first-run）を状態表・仕様・契約に追加し、サンプルの構成（3か月分、超過と未設定を各1つ以上含む）を AC7.1.1〜AC7.1.4 に対応させて書く。または、サンプルの中身は実装段階で決めると明記し、受け入れ条件との対応を残す | New |
| R-02 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/interaction-spec.md > 月次集計の表と予算入力の状態、CSV の出力・取り込みの状態 | AC7.3.2（予算の保存と CSV の取り込みで保存に失敗したときも、AC7.3.1 と同じ失敗表示で成功表示を出さない）と AC6.1.6（取り込み途中の保存失敗で件数が変わらない）に対応する状態がない。保存失敗の表示は登録フォーム（register-storage-error）だけにある。予算保存の成功の知らせ（AC4.1.1）とコピー成功の知らせ（AC4.2.1）も定義がない | 予算の保存失敗と取り込みの保存失敗の状態（失敗の文言、入力が残ること、再試行の方法、role=alert）を仕様と状態表に追加する。予算の保存成功とコピー成功で何を出すかも1行で決める | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/assets/refined-mockup.html > app-storage-corrupt の表示、interaction-spec.md > 全体のお知らせ枠 | 保存データが壊れている状態でも、見本は10月の7件と集計を表示している。読み込めないデータの集計が出るのは矛盾する。また、この状態で「明細を CSV に保存」と月の切り替えが使えるのか仕様に書かれていない（AC7.3.3 が止めるのは登録・予算保存・取り込みだけ） | この状態での一覧・集計の見え方（空か、案内のみか）と、CSV 保存の可否を仕様に決めて書き、見本を合わせる | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/interaction-spec.md > 登録フォーム > 入力項目、assets/refined-mockup.html > f-memo | AC1.2.4 は、101文字目を入力しようとしたときに「メモは 100 文字までです」と表示し、絵文字は1文字と数える。仕様はこの文言を示さず、見本は常時表示のヒント「100 文字まで」と maxlength=100 だけである。maxlength は絵文字を2文字と数えるため、AC1.2.4 と食い違う。日付欄の誤り（AC1.2.3）も、契約の対応表には AC1.2.1 しか挙がっていない（mockups.md の表には AC1.2.3 がある） | メモの上限超過時の表示文言と、見える1文字で数える実装方針を仕様に明記する。契約の STATE-VALIDATION-ERROR に AC1.2.3 を足して mockups.md と揃える | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/accessibility-checklist.md > 確認項目 12、6、assets/refined-mockup.html > 本文へ移動、ui-poc-refined-contract.md > Screen State Acceptance Mapping | (1) 項目12は「768px 以上で1列に切り替え」と書くが、見本は 1023px 以下で1列に切り替える（Q5 と HTML は一致、この記述だけ誤り）。(2) US8.1（AC8.1.1 の「本文へ移動」から登録フォーム先頭へ移る動き）は見本では実装されている（リンク先 h2 に tabindex=-1）が、契約の対応表にも状態表にも AC8.1.x の行がない。(3) 見本の「未設定」を示す span に aria-label があり、役割のない span への aria-label は axe で指摘される可能性がある | 項目12を「1023px 以下で1列」に直す。契約か状態表に AC8.1.1 の確認行を足す。span の aria-label をやめ、「未設定」の文字を画面外向けの文字で示すか、役割を付ける | New |
| R-06 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/inception/refined-mockups/mockups.md > このステージで決めた細部 | Q2（改行を含むメモの行は取り込まない）と Q3（メモの前後の空白を登録時も取り込み時も除く）は、ストーリーの「要件との差分」表にない新しい決定で、ストーリー側の AC（AC1.2.4、AC6.2.x）にも書かれていない。ストーリーは「後の段階はこちらを正とする」としているため、実装側で食い違う恐れがある | mockups.md に、ストーリーの受け入れ条件を補う差分として Q2・Q3 を明示し、どの AC を補うか（AC1.2.4、AC6.2.3、AC5.1.3）を書く | New |

### Summary

全ストーリーのうち US1.1〜US6.3、US7.3、US7.4、US8.1 は画面または仕様で表されており、Q1〜Q5 の回答は仕様と HTML に反映され、色・文字・余白は見本の値と一致し、契約の形式と資産のハッシュも検査を通っている。残る大きな抜けは、US7.1 の初回表示（サンプルデータ）と、予算保存・取り込みでの保存失敗の状態の2点で、どちらも実装者が推測せずに作るには足りないため、承認前に人が重みを見て判断してほしい。
