#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENDOR="$ROOT/.vendor/pr-lens"
EXPECTED="7a9115c8202da4db030be5954ada8862e6135dce"
[[ -f "$VENDOR/LICENSE" ]] || { echo "PR Lens submodule is missing; run: git submodule update --init .vendor/pr-lens" >&2; exit 1; }
[[ "$(git -C "$VENDOR" rev-parse HEAD)" == "$EXPECTED" ]] || { echo "PR Lens source is not pinned to $EXPECTED" >&2; exit 1; }
corepack pnpm --dir "$VENDOR" install --frozen-lockfile
corepack pnpm --dir "$VENDOR" verify
bun "$ROOT/.claude/tools/aidlc-plugin-build.ts" "$ROOT/product-plugins/pr-lens-review" claude --json
bun "$ROOT/product-plugins/pr-lens-review/scripts/finalize-build.ts"
claude plugin install aidlc-pr-lens-review \
  --marketplace "$ROOT/product-plugins/pr-lens-review/dist/claude" --scope project --json
AIDLC_HARNESS_DIR=.claude AIDLC_HARNESS_NAME=claude CLAUDE_PROJECT_DIR="$ROOT" \
  bun "$ROOT/product-plugins/pr-lens-review/dist/claude/hooks/compose.ts"
bun "$ROOT/.claude/tools/aidlc.ts" engine plugin sync
