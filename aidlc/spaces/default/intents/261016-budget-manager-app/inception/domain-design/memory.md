<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-16T14:50:00Z — StoreSnapshot は DataStore の持ち物とし、中の明細と予算の持ち主は Ledger と Budget のままにした; 「全部か無か」の保存単位と、データの意味上の持ち主を分けて考えたため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-16T14:50:00Z — 明細の規則を CsvExchange と Ledger の両方で確かめる構成を受け入れた; CSV は信用しない入力として入口で検証しつつ、規則の定義は Ledger の判定を使って二重定義を避ける。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
