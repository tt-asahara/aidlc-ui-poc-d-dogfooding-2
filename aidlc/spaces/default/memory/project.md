# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER `main` を直接変更する。 (affirmed 2026-10-16)

- NEVER 強制プッシュ（force push）をする。 (affirmed 2026-10-16)

- NEVER 依頼者の明示的な指示なしにマージする。 (affirmed 2026-10-16)

- NEVER 秘密情報、個人データ、`node_modules` などをコミットする。 (affirmed 2026-10-16)

- NEVER 実際の銀行口座と連携したり、データを外部へ送信したりする。 (affirmed 2026-10-16)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS 作業を始める前に、作業ブランチとリモートを確認する。 (affirmed 2026-10-16)

- ALWAYS 作業はリモート `origin`（GitHub）上の作業ブランチ `feat/budget-manager-app` で行う。 (affirmed 2026-10-16)

- ALWAYS AI-DLC の各ステージが承認されたとき、各 Unit の実装とテストが完了したとき、各バグ修正のときに、内容がわかるメッセージでコミットし、作業ブランチへプッシュする。 (affirmed 2026-10-16)

- ALWAYS 各チェックポイントで、コミット SHA、プッシュ結果、未完了の項目を報告する。 (affirmed 2026-10-16)

- ALWAYS 並行作業では担当ごとに別のブランチと worktree を使い、統合したあとにテストを再実行する。 (affirmed 2026-10-16)

- ALWAYS 並行作業用のブランチと worktree は `feat/budget-manager-app` から作成し、`feat/budget-manager-app` へ戻す。`main` への取り込みは最後に依頼者の明示的な承認を得てから行う。 (affirmed 2026-10-16)

- ALWAYS `main` へ取り込む前に GitHub Actions で Prettier と ESLint を実行し、失敗した場合は取り込まない。 (affirmed 2026-10-16)

- ALWAYS 行カバレッジを 80% 以上に保つ。 (affirmed 2026-10-16)

- ALWAYS 未完成の内容を退避のためにコミットするときは、WIP であることを明示する。 (affirmed 2026-10-16)

- ALWAYS アプリで扱うデータは架空のデータだけにする。 (affirmed 2026-10-16)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
