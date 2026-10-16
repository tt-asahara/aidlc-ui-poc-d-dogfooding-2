# PR Lens integration

PR Lens is pinned as a Git submodule at commit `7a9115c8202da4db030be5954ada8862e6135dce` and licensed under MIT (`.vendor/pr-lens/LICENSE`). It is used locally without a model/API key: the AI-DLC agent authors GraphDoc JSON, then the pinned CLI validates and renders SVG. No `analyze`, canvas push, authentication, or publication is part of this integration.

Bootstrap after cloning with `git submodule update --init .vendor/pr-lens` and `.claude/tools/setup-pr-lens.sh`. The setup script verifies the source SHA, performs the lockfile-frozen dependency install, then runs upstream build, typecheck, and tests.

At Build and Test, `.claude/skills/pr-lens-review/SKILL.md` separates application paths from `.claude`, `.vendor`, `.pr-lens`, and AI-DLC engine/session state. It records base/head/worktree hashes, validates/renders the diagram, then requires an evidence-backed report cross-checked against code, requirements, and executed tests. PR Lens is supplemental and cannot approve work or override sensors/reviewers.
