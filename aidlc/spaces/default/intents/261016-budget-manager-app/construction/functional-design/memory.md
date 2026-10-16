<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-17T01:10:00Z — U1 は ui の Unit だが、受け入れ条件とのつながりを規則の ID で記録する必要があるため rules.md も作った; 規則（集計・CSV・保存）は U1 の中核で、あとの Unit が足す規則と番号が衝突しないよう BR1〜BR4 の群に分けた。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-17T01:10:00Z — CsvExchange.exportAll に「今日」を渡す形にした（約束ごと C7 は引数なし）; 契約レビュー R-09 の指摘どおり、ファイル名の日付を AppShell の「今日」とそろえるため。引数を足すだけの変更。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-17T01:10:00Z — U1 の「読めない」の判定は JSON として読めない・版が 1 でない、の2つだけにした; 詳しい検出は U5 の受け持ちで、U1 を小さく保つ代わりに、項目の欠けた保存データは U5 まで検出されない。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
