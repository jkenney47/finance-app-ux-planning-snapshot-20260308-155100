#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PATTERN='AWS Lambda|Terraform|Tamagui|Tailwind|Windsurf'
TARGETS=(
  ".github"
  "README.md"
  "CODEX.md"
  "docs"
  "AI_RULES.md"
  "DEVELOPMENT.md"
  ".agents/memory/rules.md"
)

if command -v rg >/dev/null 2>&1; then
  if rg -n -e "$PATTERN" "${TARGETS[@]}" --glob '!docs/archive/**'; then
    echo "[check:instruction-drift] Legacy instruction terms detected in active docs/config."
    exit 1
  fi
else
  echo "[check:instruction-drift] 'rg' not found; using grep fallback."
  if grep -R -n -E "$PATTERN" "${TARGETS[@]}" \
    --exclude-dir=.git \
    --exclude-dir=node_modules \
    --exclude-dir=archive; then
    echo "[check:instruction-drift] Legacy instruction terms detected in active docs/config."
    exit 1
  fi
fi

echo "[check:instruction-drift] No legacy instruction drift detected."
