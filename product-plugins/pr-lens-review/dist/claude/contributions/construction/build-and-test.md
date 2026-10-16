---
target: build-and-test
plugin: pr-lens-review
fragments:
  - anchor: before-step:11
    order: 900
---

## fragment: before-step:11

### PR Lens evidence review

Run the installed `{{HARNESS_DIR}}/tools/pr-lens-review/SKILL.md` workflow when application implementation exists. Its diagram and report supplement this stage's source, requirement, and test review; they never change sensor results, reviewer decisions, target verdicts, or approval state. A missing application diff is an explicit skipped/unavailable result, not a reason to diagram AI-DLC setup files. PR Lens validation/render failure or diagram/source disagreement must be recorded as a limitation and must not be presented as review success.
