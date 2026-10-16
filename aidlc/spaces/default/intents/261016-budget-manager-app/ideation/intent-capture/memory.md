<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-10-16T11:45:58Z — Q1 の「個人の家計管理」と Q4 の「UI PoC・技術検証」は矛盾しないと判断した; 個人の家計を題材にした画面・操作性の試作として両立するため、追加の質問はしなかった。
- 2026-10-16T11:45:58Z — 成功基準「迷わず完了」の確認方法を「手順書なしで3操作を通して完了」と言い換えた; 回答の意味を変えずに確認可能な形にした。具体的な数値基準は要件分析で詰める。

## Deviations
- 2026-10-16T11:45:58Z — 選択肢が5つ以上ある質問は、選択画面の上限（4つ）に合わせて2つに分けて表示した; 質問ファイルには全選択肢を残している。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
