<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-16T15:30:00Z — 全 Unit が1つの Web アプリ内で動くため、約束ごとは REST や非同期メッセージではなく、アプリ内の型と関数呼び出し（共有スキーマ）として書いた; 外部とのやり取りは CSV ファイルだけなので、それを外部の約束ごと C8 とした。
- 2026-10-17T00:20:00Z — Unit の依存関係の見直し（U2・U3・U4 が U5 に依存）に合わせ、作る順番を前提に足し、登録の失敗表示の担当を U1、U2 は欄ごとの誤りと二重送信の防止だけと明記した; 作業単位の分割のレビュー R-07 の表記ずれを解消するため。約束ごとの形は変えていない。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-16T15:30:00Z — サンプル投入は Budget の関数を使わず、保存データの形（C2）で直接組み立てて1回で保存する形にした; U5 が U3・U4 に依存せずに済み（作業単位の分割のレビュー R-01）、全部か無かも守れる。代わりに予算の規則の判定を U5 側で重複しないよう、サンプルは規則内の固定値に限る。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-16T15:30:00Z — 保存領域が使えない環境での起動時の知らせ方と、容量不足の目安は未決; 機能設計と NFR 要件で決める。
