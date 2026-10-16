<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-17T01:40:00Z — ui の Unit の成果物は性能・安全・技術の3つだけなので、利用環境・使いやすさ・保守性は性能の資料に、信頼性は安全の資料にまとめた; 後の NFR 設計が NFR の枝番を読み取る資料に、すべての枝番を入れておくため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-17T01:40:00Z — Content-Security-Policy はビルドしたページにだけ入れ、開発中の起動には入れない; 開発中の即時反映が手元の通信を使うため。外部通信がないことはビルドしたページで確かめる。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
