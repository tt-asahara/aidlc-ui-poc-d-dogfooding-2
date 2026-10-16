## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-16T15:39:56Z
**Iteration:** 2

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/cicd-pipeline.md > GitHub Actions の流れ（順番 7・8、止める条件の表） | ビルドの段階の「止める条件」は「ビルドが失敗する」だけで、手順 8 の「CSP の meta 要素が入ったページができること」を確かめる手段がありません。NFR3.2（ビルド出力 app/dist/ の読み込み先を調べるビルド後のテスト）も、GitHub Actions の順番（単体テスト → ビルド）にも手元の確認の順番（単体テスト → ビルド → Playwright）にも置き場所がありません。Playwright は手元だけなので、CSP 入りのビルドと外部読み込みなしの検査は、CI では一度も確かめられず、手元でも Playwright 次第になります。単体テスト（ビルド前）にこの検査を置くと、dist がなくて失敗するか、検査が飛ばされます。 | ビルドの直後に、dist を調べる検査の段階を CI と手元の両方に追加する（meta 要素の有無と NFR3.2 の読み込み先の検査）。その実行方法（Vitest の別の設定か node のスクリプトか）と、止める条件、対応する NFR（NFR3.1・NFR3.2）を表に書く。 | New |
| R-02 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/cicd-pipeline.md > GitHub Actions の流れ（Node.js・キャッシュ） | package-lock.json は app/ の中にあるのに、キャッシュの依存ファイルの場所（cache-dependency-path）の指定が書かれていません。actions/setup-node の一般的な挙動では、リポジトリ直下に lock ファイルがないと cache: npm の設定がエラーで止まります。また、Node の版は「app/.nvmrc か package.json の engines」と二択のままで、node-version-file でどちらを読むか決まっていません。 | cache-dependency-path を app/package-lock.json にすること、Node の版の出どころを1つに決める（例: app/.nvmrc を node-version-file で読む）ことを書く。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/infrastructure-specification.md > Infrastructure Services（Vite の preview）と cicd-pipeline.md > 手元の確認の流れ | 利用（4173）とテスト（4174）の 2 つのポートを、どの設定で切り替えるか書かれていません（vite.config.ts は 1 つの preview 設定、Playwright の webServer が 4174 を起動するのか）。コード生成で、テストが 4173 の依頼者の配信元に触れる、または strictPort で衝突して止まる実装になりえます。 | npm run serve は 4173、Playwright の webServer は 4174 を --port で渡して起動する（4173 と共有しない）ことを、起動の担当と合わせて 1 行で定める。 | New |
| R-04 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/cicd-pipeline.md > GitHub Actions の流れ（動くとき）と 取り込みと戻し方 | 動くときが「feat/budget-manager-app への push」と「main 向けの Pull Request」だけです。並行作業の担当ブランチ（feat/budget-manager-app から作る）は feat/budget-manager-app 向けのため、統合前には CI が動かず、統合後の push で初めて動きます。また、同じブランチの連続 push の取り消し（concurrency）、timeout-minutes、aidlc/ だけの変更を除く paths の指定がなく、記録コミットのたびに全段が動きます。 | 統合後の push で再実行されることを明記する（または feat/** を対象に加える）。concurrency と timeout-minutes を決める。 | New |
| R-05 | Minor | aidlc/spaces/default/intents/261016-budget-manager-app/construction/u1-walking-skeleton/infrastructure-design/infrastructure-specification.md > 戻し方とデータの控え（アプリの不具合） | 「前のコミットに戻し」と書かれていますが、cicd-pipeline.md は「打ち消すコミット（revert）を足す」「履歴の書き換えはしない」としています。前のコミットを checkout して作業する意味なのか、revert なのかが読み取れず、強制 push 禁止の規則との整合も明示されていません。 | cicd-pipeline.md の revert の方法に合わせて表現を揃える。 | New |

> R-01 Not re-checked this round

> R-02 Not re-checked this round

> R-03 Not re-checked this round

> R-04 Not re-checked this round

> R-05 Not re-checked this round

### Resolved

| ID | Resolution |
|---|---|
| R-01 | cicd-pipeline.md に手順 9「ビルドの出力の検査」（`npm run check:dist`）が CI と手元の verify の両方に入った。CSP の meta 要素の一致と、NFR3.2 の3つの対象（index.html の src と href、CSS の url() と @import、JS の import()）を調べ、止める条件も表にある。security-design.md の CSP と NFR3.2 の範囲（JS の文字列全体は対象外）と一致する。traceability.json の NFR3.2 も更新されている。 |
| R-02 | cache-dependency-path を `app/package-lock.json` に指定し、Node の版の出どころを `app/.nvmrc` の1つにした。 |
| R-03 | ポートの分け方の表がある。4173 は `npm run serve` の `--port 4173 --strictPort`、4174 は Playwright の webServer が渡し、`vite.config.ts` にはポートを書かない。infrastructure-specification.md の記述とも矛盾しない。 |
| R-04 | feat/** への push、paths の絞り込み、concurrency の取り消し、15 分の上限、統合後の再実行が記載された。 |
| R-05 | infrastructure-specification.md と cicd-pipeline.md の両方で、戻し方が git revert で、履歴の書き換えと強制 push をしないと揃った。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| 目視での相互参照の確認（cicd-pipeline.md、infrastructure-specification.md、traceability.json、security-design.md） | 不整合なし | check:dist の対象、ポート、戻し方が各ファイルで一致している。 |

### Summary

前回の5件はすべて解消した。改訂で入った新しい欠陥は見つからなかった。check-dist.mjs と playwright.config.ts は後続の Code Generation で作る成果物であり、設計としては実装に十分な内容である。
