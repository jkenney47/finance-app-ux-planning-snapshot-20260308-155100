#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ "$#" -eq 0 ]]; then
  echo "Usage: .agents/hooks/post-error.sh --source <self|user|system|tool> --trigger <text> --mistake <text> --correction <text> [--tags a,b] [--confidence 0..1] [--severity 0..3]" >&2
  exit 1
fi

node "$ROOT/.agents/skills/napkin/scripts/memory_cli.mjs" add "$@"
