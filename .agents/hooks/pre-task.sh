#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
QUERY="${*:-session-start}"

node "$ROOT/.agents/skills/napkin/scripts/memory_cli.mjs" rank --query "$QUERY" --limit 5 --format markdown
