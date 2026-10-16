#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
VENDOR="$ROOT/.vendor/pr-lens"
EXPECTED="7a9115c8202da4db030be5954ada8862e6135dce"
[[ -f "$VENDOR/LICENSE" ]] || { echo "PR Lens submodule is missing; run: git submodule update --init .vendor/pr-lens" >&2; exit 1; }
[[ "$(git -C "$VENDOR" rev-parse HEAD)" == "$EXPECTED" ]] || { echo "PR Lens source is not pinned to $EXPECTED" >&2; exit 1; }
corepack pnpm --dir "$VENDOR" install --frozen-lockfile
corepack pnpm --dir "$VENDOR" verify
