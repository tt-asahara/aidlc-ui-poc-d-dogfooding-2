<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-16T12:03:43Z — デザイン文脈（利用者・用途・印象）は .impeccable.md を作らず、AI-DLC の質問ファイルとまとめの確認で集めた; 手順で AGENTS.md や別ファイルへの書き込みを禁じているため、design-context.json に確認済みの内容だけを記録した。
- 2026-10-16T12:03:43Z — 受け入れ条件がまだないため、画面・状態の対応には仮の AC ID（AC-R01〜R11）を使った; 詳細モックアップで正式な ID に対応づけ直す。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-16T12:03:43Z — 比較実験用の C 方式の経路記録を、実際のスコープ（ui-poc-application）のまま正直に記録した; 検査は ui-poc-comparison のスコープしか受け付けないため「Invalid routing execution context」で失敗するが、スコープを偽って記録することはしない。
- 2026-10-16T12:03:43Z — 試作は使い捨てブランチに分けず、ステージの assets に置いた; 手順でブランチ操作を禁じているため。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-16T12:03:43Z — 3案は「縦積みのステップ順」「タブ切替」「入力を常設した帳簿」とし、構成そのものを変えた; 色違いではなく、登録フォームの置き方と集計への近さで比べられるようにした。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-16T12:03:43Z — 試作をブラウザで表示・キーボード操作する確認は未実施; ブラウザの自動操作が使えなかった。詳細モックアップで状態ごとに確認する。
