# プラクティス把握の根拠

## 実施形態

- プロジェクト種別: 新規開発（Greenfield）。予算管理アプリは新しいプロジェクトであると依頼者が確認済み。リポジトリには AI-DLC フレームワークと PR Lens プラグインの設定だけがあり、アプリのコードはまだない。
- 実施方法: リード（aidlc-pipeline-deploy-agent）だけで実施。スコープ `ui-poc-application` は `collaborators: off` のため、支援エージェントによるレビューは行っていない（貢献ファイルなし）。
- 新規開発のため、リバースエンジニアリングの成果物（コード構造、技術スタック、依存関係など）は存在せず、参照していない。
- 流れ: リードが初稿を作成 → 依頼者への面談（Q1〜Q8）→ 要約確認（「Looks correct」）→ リードが最終統合。

## 調べたもの

| 対象 | 確認した内容 |
|------|--------------|
| `aidlc/spaces/default/memory/org.md` | `## Way of Working`、`## Walking Skeleton`、`## Testing Posture`、`## Deployment`、`## Code Style` の 5 節。面談の提案の既定値として使用。 |
| `aidlc/spaces/default/memory/team.md`、`project.md` | 5 節とも空。確認済みの既存プラクティスはない（再実行ではない）。 |
| `.claude/scopes/ui-poc-application.md` | `skeleton: on`、`collaborators: off`、`guard_policy: strict`。 |
| `ideation/scope-definition/scope-document.md` | 最小限の価値ある範囲（登録 → 月次集計 → CSV 出力）、範囲外（実口座連携・外部送信など）。walking skeleton の範囲の根拠。 |
| `.gitignore` | `node_modules/`、`coverage/`、`.env`、`.env.*`、`*.pem`、`*.key` などがすでに除外されている（コミット `1ba9537`）。秘密情報と `node_modules` をコミットしないという依頼者のルールと整合する。 |
| `git branch --show-current` | 現在のブランチは `feat/budget-manager-app`。 |
| `git remote -v` | `origin` は `https://github.com/tt-asahara/aidlc-ui-poc-d-dogfooding-2.git`（fetch／push）。 |
| `git log --oneline -15` | 承認済みステージごとに `docs(aidlc): ...` 形式のコミットがある（例: `bb63025`、`78149df`、`18fbf67`）。ステージ承認ごとにコミットする運用がすでに実践されている。 |
| リポジトリ直下の一覧 | `package.json`、`tsconfig.json`、`.prettierrc`、ESLint 設定、CI 設定（`.github/workflows/`）はいずれも存在しない。 |
| `practices-discovery-questions.md` | 面談の質問 Q1〜Q8 と回答、要約確認の回答（「Looks correct」）。 |

## 出典の区別

### 依頼者の発言（面談前から述べられていたもの）

- 製品: TypeScript の予算管理 Web アプリ。架空データのみ。収支登録、カテゴリ別の月次予算、月次集計、CSV の取り込み・出力。実口座連携と外部送信はなし。PC ブラウザ優先、1 人で利用、データはブラウザ内に保持。
- Git／GitHub の運用ルール: 作業前のブランチ・リモート確認、`main` を直接変更しない、`feat/budget-manager-app`（`origin`）で作業、ステージ承認・Unit 完了・バグ修正ごとのコミットとプッシュ、担当ごとのブランチと worktree による並行作業と統合後のテスト再実行、秘密情報・個人データ・`node_modules` をコミットしない、退避コミットは WIP と明示、強制プッシュ禁止、明示的な指示なしのマージ禁止、チェックポイントごとの SHA・プッシュ結果・未完了項目の報告。
- これらは依頼者が述べたとおりに `discovered-rules.md` と `team-practices.md` の `## Way of Working` に反映した。

### 面談での決定

| 質問 | 回答 | 反映先 |
|------|------|--------|
| Q1 テストはいつ書くか | A: 実装してからテストを書く（テスト可能な部分ごとに 実装 → テスト） | `team-practices.md` `## Testing Posture`（`Methodology: test-after`、`Ordering`） |
| Q2 合格とするカバレッジの下限 | A: 行カバレッジ 80% 以上 | `## Testing Posture`、`discovered-rules.md` `## Mandated` |
| Q3 テストツール | A: 単体テストに Vitest、ブラウザ操作のテストに Playwright | `## Testing Posture` |
| Q4 最初に端から端まで通る薄い版を作るか | A: 作る。「収支を 1 件登録 → 月次集計に反映 → CSV に出力」が最小限つながる版を最初に作り、依頼者が確認してから残りを作る | `## Walking Skeleton` |
| Q5 どこで動かすか | A: 当面は依頼者のパソコンで動かすだけ（公開しない） | `## Deployment` |
| Q6 整形とリンター | A: Prettier と ESLint を使い、パソコンで実行する | `## Code Style`（Q8 で補足） |
| Q7 並行作業ブランチの基点と戻し先 | A: `feat/budget-manager-app` から作り `feat/budget-manager-app` へ戻す。`main` への取り込みは最後に承認を得てから | `## Way of Working`、`discovered-rules.md` `## Mandated` |
| Q8 `main` へ取り込む前の書式チェック | A: 普段はパソコンで実行し、`main` へ取り込む前には GitHub Actions でも自動実行して、失敗したら取り込まない（CI の用意は後の段階） | `## Code Style`、`## Way of Working`、`discovered-rules.md` `## Mandated` |

## org.md との整合

### Q6 と Q8（書式チェックの実行場所）の食い違いの解消

- Q6 の回答「Prettier と ESLint をパソコンで実行する」だけでは、org.md `## Code Style` の「リンターはマージ前に CI で実行し、失敗したら取り込みを止める」と食い違っていた。
- 追加質問 Q8 で依頼者は A を選び、「普段はローカルで実行し、`main` へ取り込む前には GitHub Actions でも実行して、失敗したら取り込まない」とした。これにより org.md の規定を満たしたうえで、日々の実行場所（ローカル）を絞り込む形になり、矛盾は解消した。
- GitHub Actions の設定は後の段階で用意する。設定されるまでは、`main` への取り込みの前提条件（GitHub Actions での成功）を満たせないため、`main` への取り込みはそれ以降になる。

### Q7（ブランチの基点と統合先）

- org.md は Construction の worktree を `main` から作り `main` へ戻すと定めている。依頼者は Q7 で、担当ブランチ／worktree を `feat/budget-manager-app` から作り `feat/budget-manager-app` へ戻すことを選んだ。
- これはこのプロジェクトにおける org.md の worktree の基点・統合先を絞り込むものである。最終的な統合先は引き続き `main` であり（作業の最後に依頼者の承認を得て取り込む）、`main` を唯一のトランクとする org.md の方針とは矛盾しないと判断した。

### そのほか

- 依頼者の Git ルール（`main` を直接変更しない、明示的な承認があるときだけマージ）は、org.md の「`main` へ統合する」に条件を加えるもので、矛盾しない。
- テストの進め方（test-after）は org.md の既定と一致する。行カバレッジ 80% は、`ui-poc-application` スコープに org.md 上の下限がないところへ依頼者が追加した下限であり、より厳しい側への追加なので矛盾しない。
- 配置（ローカルのみ）は、org.md の「マージ時にステージングへ配置」を、配置先の環境ができるまで適用しないとするもので、環境が存在しない間の適用範囲の明確化として扱った。

## 未解決の不確実性

- **マージ方式**: 担当ブランチを `feat/budget-manager-app` へ統合する方式と、`feat/budget-manager-app` を `main` へ取り込む方式（squash かマージコミットか）は面談で個別に確認していない。`team-practices.md` では org.md の既定（squash）に従うと記載した。依頼者が別の方式を望む場合は、承認の場で修正できる。
- **`feat/budget-manager-app` の存続期間**: org.md は作業ブランチを 1〜2 日で取り込む短命なものと想定している。`feat/budget-manager-app` はこのワークフロー全体の期間存続する。担当ブランチ自体は短命に保つ想定だが、作業ブランチが長く存続する点は org.md の想定と異なるため、`main` への最終取り込み時にずれが大きくならないよう注意が必要。
- **テストの CI 実行**: GitHub Actions で実行すると決まったのは Prettier と ESLint だけで、Vitest・Playwright のテストやカバレッジ確認を GitHub Actions でも実行するかは決まっていない（`ui-poc-application` スコープは org.md の「CI での実行」対象スコープに含まれない）。CI を用意する段階で確認する。
- **PR Lens**: PR Lens のレビュー手順（コミット `a2e6c2e` など）がリポジトリにあるが、`.pr-lens/` は `.gitignore` で除外されており、内容は確認していない。`main` への取り込み前の品質ゲートとして使うかは未確認。
