#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FLOW_PATH="${1:-}"
LOG_PATH="${2:-}"
MAX_ATTEMPTS="${MAESTRO_MAX_ATTEMPTS:-2}"

if [[ -z "$FLOW_PATH" ]]; then
  echo "[maestro:retry] Usage: bash scripts/maestro-test-with-retry.sh <flow-path> [log-path]" >&2
  exit 1
fi

COMBINED_LOG="$LOG_PATH"
TEMP_LOG=""

if [[ -z "$COMBINED_LOG" ]]; then
  TEMP_LOG="$(mktemp -t financepal-maestro.XXXXXX.log)"
  COMBINED_LOG="$TEMP_LOG"
fi

mkdir -p "$(dirname "$COMBINED_LOG")"
: >"$COMBINED_LOG"

is_retryable_maestro_failure() {
  local log_file="$1"
  grep -Eqi "Failed to connect to /127\\.0\\.0\\.1:[0-9]+|Connection refused" "$log_file"
}

attempt=1
while (( attempt <= MAX_ATTEMPTS )); do
  {
    echo "[maestro:retry] Attempt ${attempt}/${MAX_ATTEMPTS}"
    echo "[maestro:retry] Flow: ${FLOW_PATH}"
  } >>"$COMBINED_LOG"

  if maestro test "$FLOW_PATH" >>"$COMBINED_LOG" 2>&1; then
    if [[ -n "$TEMP_LOG" ]]; then
      cat "$COMBINED_LOG"
      rm -f "$TEMP_LOG"
    fi
    exit 0
  fi

  if (( attempt >= MAX_ATTEMPTS )) || ! is_retryable_maestro_failure "$COMBINED_LOG"; then
    if [[ -n "$TEMP_LOG" ]]; then
      cat "$COMBINED_LOG"
      rm -f "$TEMP_LOG"
    fi
    exit 1
  fi

  {
    echo "[maestro:retry] Detected transient XCUITest connection issue. Running xcode:stabilize and retrying."
  } >>"$COMBINED_LOG"

  bash scripts/xcode-stabilize-connection.sh >>"$COMBINED_LOG" 2>&1 || true
  sleep 2
  attempt=$((attempt + 1))
done
