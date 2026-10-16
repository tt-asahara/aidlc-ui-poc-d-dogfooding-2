---
name: pr-lens-review
description: Produce a local PR Lens diagram and evidence-backed review after application implementation and tests exist.
user-invocable: false
---

# PR Lens assisted application review

Use only after application code and test evidence exist. This is a comprehension aid; it never replaces AI-DLC reviewers, sensors, approval gates, or test verdicts.

1. Resolve the approved comparison base from the active Intent's plan or code-generation evidence. Never silently use the setup commit. Run `bun .claude/tools/pr-lens-review.ts prepare --base <sha>`. If it reports no application diff, record that review is unavailable and do not diagram `.claude`, `.vendor`, or AI-DLC session state.
2. Read `.vendor/pr-lens/packages/agent-skill/manual.md`, `references/graph-document.md`, and `references/example.graph.json`. Author `.pr-lens/graph.json` from `.pr-lens/application.diff` and the affected source. Do not use `analyze`, an API key, canvas, or external publication.
3. Run `bun .claude/tools/pr-lens-review.ts validate-render`. Fix every validation failure. Treat render failure or diagram/source disagreement as an explicit limitation, never as a passing review.
4. Write `<record>/construction/build-and-test/pr-lens-review.md` with `## Scope and provenance`, `## Findings`, `## Diagram cross-check`, and `## Tests and limits`. Record base SHA, head SHA, worktree hash, PR Lens SHA, reviewed paths, SVG/manifest paths, and test evidence. Findings use severity, exact source path/line, evidence, and a concrete fix. Separate facts from inference.
5. Cross-check every diagram node/edge against source and requirements, and every behavioral claim against executed test results. A diagram alone proves nothing. Call out omitted or misleading diagram elements.
6. Run `bun .claude/tools/pr-lens-review.ts verify-report --context .pr-lens/review-context.json --report <record>/construction/build-and-test/pr-lens-review.md`.

Pinned dependency: `coldteadotai/pr-lens@7a9115c8202da4db030be5954ada8862e6135dce`, MIT license at `.vendor/pr-lens/LICENSE`. Local execution is validate/render only.
