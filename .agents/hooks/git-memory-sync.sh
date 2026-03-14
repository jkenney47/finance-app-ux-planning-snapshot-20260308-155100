#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AUTOPILOT="$ROOT/.agents/hooks/codex-autopilot.sh"

if ! command -v node >/dev/null 2>&1; then
  exit 0
fi

if [[ -x "$AUTOPILOT" ]]; then
  "$AUTOPILOT" checkpoint >/dev/null 2>&1 || true
fi
