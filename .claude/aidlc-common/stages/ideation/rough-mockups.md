---
slug: rough-mockups
phase: ideation
execution: CONDITIONAL
condition: Execute when user-facing UI is part of the initiative; for API/backend, produce system interaction diagrams. Skip for non-UI, API-only, or infrastructure-only initiatives.
lead_agent: aidlc-design-agent
support_agents:
  - aidlc-product-agent
mode: inline
summary_confirmation: required
reviewer: aidlc-product-lead-agent
review_artifact: wireframes
reviewer_max_iterations: 2
review_class: advisory
produces:
  - wireframes
  - user-flow
  - rough-mockups-questions
  - ui-poc-rough-contract
consumes:
  - artifact: intent-statement
    required: true
  - artifact: scope-document
    required: true
  - artifact: intent-backlog
    required: true
requires_stage:
  - scope-definition
  - team-formation
sensors:
  - required-sections
  - upstream-coverage
  - ui-poc-evidence
scopes:
  - enterprise
  - feature
  - mvp
  - ui-poc-comparison
  - ui-poc-application
inputs: Intent statement, scope definition, intent backlog
outputs: wireframes.md, user-flow.md, rough-mockups-questions.md (under this stage's record dir, engine-resolved)
---

# Rough Mockups & Concept Visualization

## Steps

### Step 1: Load Prior Context

- Read intent statement from `<record>/ideation/intent-capture/`
- Read scope definition and intent backlog from `<record>/ideation/scope-definition/`

### Step 2: Generate Clarifying Questions

Create `<record>/ideation/rough-mockups/rough-mockups-questions.md` with questions:
- What are the primary user entry points and key screens/views?
- What is the core user flow (happy path)?
- What does the information hierarchy look like?
- Are there existing brand guidelines, design systems, or UI patterns to follow?
- What device/form factors must be supported?
- Are there known accessibility requirements (WCAG level, screen reader support, keyboard-only navigation)?
- For non-UI initiatives: what are the key system interactions and data flows?

Follow stage-protocol.md question flow.

### Step 3: Collect and Analyze Answers

Run contradiction analysis between UX expectations and scope constraints.


<!-- plugin:ui-poc:before-step:4:100:ea432144 -->
### UI PoC evidence handoff

Run the C routing plan with explicit `design_context_missing` and `state_model_uncertainty` facts. Use the same creator-confirmed common brief as A/B; if context is incomplete, bounded teach-impeccable may organize only the existing AI-DLC questions and must not edit AGENTS.md or create another approval round. Apply Matt exploration plus the historical Impeccable component to self-contained low-fidelity HTML; read all seven references and apply the declared WCAG large-text correction without editing pinned source. Preserve core artifacts, mark provisional discoveries, and record context/facts, pinned reads, bounded inputs, hashed outputs, and correction report in the three routing evidence files. Missing context, pins, evidence, or attempted prototype branch/no-tests behavior blocks completion.

The plugin contract must have H2 sections Artifact References, Screen State Acceptance Mapping, Approval Evidence, and Testing Brief; exactly one fenced ui-poc-contract JSON object with schema=1, stage, arm A/B/C, assets [{path,sha256}], mappings [{screen,state,ac,asset,check}], and requiredMappings ["SCREEN-…/STATE-…/AC-…"]. Paths must remain inside this stage directory; hash every referenced local asset. For consuming code/test contracts include upstream {path,sha256,stage}, naming a byte-identical local copy of the prior contract, and require its real approval in the independently managed UI_POC_APPROVAL_LEDGER. Never fabricate that ledger. Rough/refined draft gates require no extra approval.

Read the installed runtime contract at .claude/tools/ui-poc/contract.md and the current arm’s .claude/tools/ui-poc/treatments/<arm>.json (lowercase a, b or c). Its source_lock resolves beside that JSON. Verify the selected commit and installed skill entrypoints before applying the treatment. These files are projected through the supported tools subtree; do not depend on uninstalled source docs or treatment directories.
<!-- /plugin:ui-poc:before-step:4:100:ea432144 -->
### Step 4: Generate Artifacts

For UI initiatives: Create low-fidelity wireframes (ASCII art or structured descriptions), core user flow diagram, information architecture outline. Include a one-line accessibility note per screen: heading level (h1–h3), primary landmark regions (header/main/nav/footer), keyboard entry point.

For non-UI initiatives: Create system context diagram, key interaction flow sketches.

All diagrams follow ASCII diagram standards from stage-protocol.md.

### Step 5: Completion Handoff

Hand completion to `stage-protocol.md` via
`bun .claude/tools/aidlc.ts engine orchestrate report --stage rough-mockups --result <outcome>`.
That `report` call owns every lifecycle transition and advancement; never perform one in prose, and never narrate this bookkeeping to the user.

### Step 6: Present Completion & Request Approval

Completion emoji: :pencil2:
Review path: `<record>/ideation/rough-mockups/`
Standard approval gate (Approve / Request Changes).

## Sensors

This stage's outputs are markdown artefacts under `<record>/ideation/rough-mockups/`.

Imports: `required-sections`, `upstream-coverage`.

Upstream targets: `intent-statement`, `scope-document`, `intent-backlog`.

## Learn

When `directive.protocol_modules` lists `learnings`, follow
`stage-protocol-learnings.md`: keep the diary at `directive.memory_path` while
working and run the ritual before the approval gate, applying its bootstrap,
`single: true`, per-unit, and gate-revision exemptions. When the module is absent,
skip both the diary and the ritual.
