<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-10-16T13:35:00Z — 依頼者が会話で述べた Git・GitHub の運用ルールは、面談で聞き直さず確認済みの事実として反映した; 同じことを二度答えさせないため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-10-16T13:35:00Z — 書式チェックを「普段はローカル、main 取り込み前は GitHub Actions」とした; 依頼者のローカル実行の希望と、org.md の「CI で実行し失敗で取り込みを止める」を両立させるため、追加の質問（Q8）で確認した。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-10-16T13:35:00Z — main への最終取り込みのマージ方式（squash か）、テストとカバレッジを GitHub Actions でも実行するか、PR Lens を取り込み前の確認に使うかは未確認; CI の段階で確認する。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
