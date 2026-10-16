# PR Lens integration

PR Lens is pinned as a Git submodule at commit `7a9115c8202da4db030be5954ada8862e6135dce` and licensed under MIT (`.vendor/pr-lens/LICENSE`). It is used locally without a model/API key: the AI-DLC agent authors GraphDoc JSON, then the pinned CLI validates and renders SVG. No `analyze`, canvas push, authentication, or publication is part of this integration.

Bootstrap after cloning with `git submodule update --init .vendor/pr-lens` and `.claude/tools/setup-pr-lens.sh`. The setup script verifies the source SHA, performs the lockfile-frozen dependency install, then runs upstream build, typecheck, and tests.

The PRODUCT-local formal plugin source is `product-plugins/pr-lens-review`. Its contribution composes the review immediately before Build and Test Step 11, and projects the runtime and instructions under `.claude/tools`. Re-running compose or setup restores the contribution rather than losing a direct edit to a generated stage.

At Build and Test, `.claude/tools/pr-lens-review/SKILL.md` separates application paths from `.claude`, `.vendor`, `.pr-lens`, plugin sources, and AI-DLC engine/session state. It records NUL-safe paths, binary-safe hashes/metadata, base/head/worktree hashes, validates/renders the diagram, then requires structured graph, manifest, context, reviewed-path, and test-evidence bindings. PR Lens is supplemental and cannot approve work or override sensors/reviewers. The semantic comparison remains an AI judgment; mechanical validation does not guarantee its quality.
