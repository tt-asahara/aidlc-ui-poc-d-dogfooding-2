---
name: pr-lens-review
description: Produce a local PR Lens diagram and evidence-backed review after application implementation and tests exist.
user-invocable: false
---

# PR Lens assisted application review

Use only after application code and test evidence exist. This comprehension aid never replaces AI-DLC reviewers, sensors, approval gates, or test verdicts.

1. Resolve the approved comparison base from the active Intent. Run `bun .claude/tools/pr-lens-review.ts prepare --base <sha>`. If no application diff exists, record review unavailable; never diagram setup or AI-DLC state.
2. Read the pinned `.vendor/pr-lens/packages/agent-skill/manual.md`, `references/graph-document.md`, and `references/example.graph.json`. Author `.pr-lens/graph.json` from the prepared context and affected source. Binary inputs are hash/metadata-only and require separate safe inspection. Do not use `analyze`, API keys, canvas, or publication.
3. Run `bun .claude/tools/pr-lens-review.ts validate-render`. Treat any failure or diagram/source disagreement as an explicit limitation.
4. Write `<record>/construction/build-and-test/pr-lens-review.md` with `## Scope and provenance`, `## Findings`, `## Diagram cross-check`, and `## Tests and limits`. Findings require severity, source path/line, evidence, fix, and fact/inference labeling.
5. Write adjacent `pr-lens-review.json` with schema 1; pinned SHA; context path/hash and prepared worktree hash; exact reviewed paths; graph path/hash; render manifest path/hash; at least one existing test-evidence path/hash; and `semanticCrossCheck: {"performedBy":"ai-reviewer","disclaimer":"semantic source/requirements/test comparison is an AI judgment, not a machine guarantee"}`.
6. Cross-check graph elements against source/requirements and claims against executed tests. Mechanical checks prove schema/provenance/file integrity only, not semantic review quality.
7. Run `bun .claude/tools/pr-lens-review.ts verify-report --context .pr-lens/review-context.json --report <record>/construction/build-and-test/pr-lens-review.md --metadata <record>/construction/build-and-test/pr-lens-review.json`.

Pinned dependency: `coldteadotai/pr-lens@7a9115c8202da4db030be5954ada8862e6135dce`, MIT. Local validate/render only.
