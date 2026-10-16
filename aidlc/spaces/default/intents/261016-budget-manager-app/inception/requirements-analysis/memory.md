<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-10-16T13:50:00Z — 予算は支出カテゴリだけに設定すると解釈した（仮定 A3）; ラフモックアップの予算表が支出のみで、残額・超過は支出にしか意味がないため。依頼者の確認待ちとして仮定に記録した。
- 2026-10-16T13:50:00Z — CSV 出力は全明細を対象とした（仮定 A4）; 承認と引き継ぎで確認したリスク対策「CSV 出力を控えとして案内する」に合わせた。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-10-16T13:50:00Z — 質問は9問に絞り、メモの文字数上限・時刻の基準・対応ブラウザなど依頼者の環境に依存しにくい細部は仮定として要件に書いた; 細かな確認で依頼者の負担を増やさず、承認時に見直せるようにした。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
