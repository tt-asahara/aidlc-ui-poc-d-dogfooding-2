# 確認済みの必須ルールと禁止ルール

> ここには、依頼者が明示的に述べた、または面談（Q2、Q7、Q8）で選んだ厳格な制約だけを記載しています。org.md の既定値や推測にもとづくルールは含めていません。

## Mandated

- ALWAYS 作業を始める前に、作業ブランチとリモートを確認する。
- ALWAYS 作業はリモート `origin`（GitHub）上の作業ブランチ `feat/budget-manager-app` で行う。
- ALWAYS AI-DLC の各ステージが承認されたとき、各 Unit の実装とテストが完了したとき、各バグ修正のときに、内容がわかるメッセージでコミットし、作業ブランチへプッシュする。
- ALWAYS 各チェックポイントで、コミット SHA、プッシュ結果、未完了の項目を報告する。
- ALWAYS 並行作業では担当ごとに別のブランチと worktree を使い、統合したあとにテストを再実行する。
- ALWAYS 並行作業用のブランチと worktree は `feat/budget-manager-app` から作成し、`feat/budget-manager-app` へ戻す。`main` への取り込みは最後に依頼者の明示的な承認を得てから行う。
- ALWAYS `main` へ取り込む前に GitHub Actions で Prettier と ESLint を実行し、失敗した場合は取り込まない。
- ALWAYS 行カバレッジを 80% 以上に保つ。
- ALWAYS 未完成の内容を退避のためにコミットするときは、WIP であることを明示する。
- ALWAYS アプリで扱うデータは架空のデータだけにする。

## Forbidden

- NEVER `main` を直接変更する。
- NEVER 強制プッシュ（force push）をする。
- NEVER 依頼者の明示的な指示なしにマージする。
- NEVER 秘密情報、個人データ、`node_modules` などをコミットする。
- NEVER 実際の銀行口座と連携したり、データを外部へ送信したりする。
