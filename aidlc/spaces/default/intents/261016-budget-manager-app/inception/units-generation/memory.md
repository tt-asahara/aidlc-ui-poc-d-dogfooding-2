<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-16T15:10:00Z — ドメイン設計レビューで残った Major（古いタブの書き込み、状態の伝達、サンプルの一括投入）を U5 の受け持ちとして明記した; 承認時に了承された指摘を、実装する Unit に結び付けて取りこぼさないため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-16T15:10:00Z — U2〜U5 は依存がない一方、ReviewView・Ledger・AppShell を共有して触る; 並行は許されたが、同じファイルの衝突箇所を依存関係の資料に書き、デリバリー計画で並行の可否を判断できるようにした。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
