#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MEMORY_CLI_SCRIPT="$ROOT/.agents/skills/napkin/scripts/memory_cli.mjs"
MEMORY_CLI=(node "$MEMORY_CLI_SCRIPT")
MEMORY_DIR_REPO="${CODEX_AUTOPILOT_MEMORY_REPO_DIR:-$ROOT/.agents/memory}"
MEMORY_DIR="$MEMORY_DIR_REPO"
ACTIVE_CONTEXT="$MEMORY_DIR/active_context.md"
EVENTS_PATH="$MEMORY_DIR/events.ndjson"
MEMORY_MODE="repo"

set_memory_dir() {
  local dir="$1"
  MEMORY_DIR="$dir"
  ACTIVE_CONTEXT="$MEMORY_DIR/active_context.md"
  EVENTS_PATH="$MEMORY_DIR/events.ndjson"
}

usage() {
  cat <<'USAGE'
Usage:
  .agents/hooks/codex-autopilot.sh start [query text]
  .agents/hooks/codex-autopilot.sh run [query text] -- <command> [args...]
  .agents/hooks/codex-autopilot.sh checkpoint
  .agents/hooks/codex-autopilot.sh add --source <self|user|system|tool> --trigger <text> --mistake <text> --correction <text> [--tags a,b] [--confidence 0..1] [--severity 0..3]
USAGE
}

compress_line() {
  tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' | cut -c1-260
}

path_owner() {
  local path="$1"

  if [[ ! -e "$path" ]]; then
    return 0
  fi

  if stat -f '%Su' "$path" >/dev/null 2>&1; then
    stat -f '%Su' "$path" 2>/dev/null || true
    return 0
  fi

  stat -c '%U' "$path" 2>/dev/null || true
}

path_metadata() {
  local path="$1"

  if [[ ! -e "$path" ]]; then
    printf 'missing (%s)' "$path"
    return 0
  fi

  local owner="unknown"
  local perms="unknown"

  if owner="$(stat -f '%Su' "$path" 2>/dev/null)"; then
    perms="$(stat -f '%Sp' "$path" 2>/dev/null || printf 'unknown')"
  elif owner="$(stat -c '%U' "$path" 2>/dev/null)"; then
    perms="$(stat -c '%A' "$path" 2>/dev/null || printf 'unknown')"
  fi

  printf 'owner=%s perms=%s path=%s' "$owner" "$perms" "$path"
}

warn_context_issue() {
  local reason="$1"
  local target="${2:-$ACTIVE_CONTEXT}"
  local target_dir
  target_dir="$(dirname "$target")"
  local target_metadata
  target_metadata="$(path_metadata "$target")"
  local target_dir_metadata
  target_dir_metadata="$(path_metadata "$target_dir")"

  cat >&2 <<WARN
[codex-autopilot] Warning: unable to refresh autopilot memory context.
[codex-autopilot] Reason: ${reason}
[codex-autopilot] Target: ${target}
[codex-autopilot] Target metadata: ${target_metadata}
[codex-autopilot] Target directory metadata: ${target_dir_metadata}
[codex-autopilot] Suggested checks:
  ls -la "${target}"
  ls -ld "${target_dir}"
  chmod u+w "${target}"
  chown "\$(whoami)" "${target}"
WARN
}

fingerprint_mode_key() {
  local mode="$1"

  case "$mode" in
    start)
      printf 'autopilot_start'
      ;;
    run)
      printf 'autopilot_run_wrapper'
      ;;
    *)
      printf 'autopilot_maintenance'
      ;;
  esac
}

emit_permission_fingerprint() {
  local mode="$1"
  local name="$2"
  local path="$3"
  local reason="$4"
  local fingerprint
  fingerprint="control-plane::$(fingerprint_mode_key "$mode")::${name}"
  echo "[codex-autopilot] fingerprint=${fingerprint} path=${path} reason=${reason}" >&2
}

self_heal_file_path() {
  local path="$1"
  local dir
  dir="$(dirname "$path")"

  mkdir -p "$dir" >/dev/null 2>&1 || return 1

  if [[ -d "$path" ]]; then
    return 1
  fi

  if [[ ! -e "$path" ]]; then
    touch "$path" >/dev/null 2>&1 || return 1
  fi

  chmod u+w "$dir" >/dev/null 2>&1 || true
  chmod u+w "$path" >/dev/null 2>&1 || true

  [[ -r "$path" && -w "$path" && -w "$dir" ]]
}

tmp_memory_dir() {
  local repo_slug
  repo_slug="$(basename "$ROOT" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-')"
  printf '%s/codex-autopilot-memory-%s' "${TMPDIR:-/tmp}" "${repo_slug:-repo}"
}

activate_fallback_memory() {
  local fallback_dir
  fallback_dir="$(tmp_memory_dir)"

  if ! mkdir -p "$fallback_dir" >/dev/null 2>&1; then
    return 1
  fi

  export CODEX_AUTOPILOT_MEMORY_DIR="$fallback_dir"
  set_memory_dir "$fallback_dir"
  MEMORY_MODE="fallback"

  self_heal_file_path "$ACTIVE_CONTEXT" || return 1
  self_heal_file_path "$EVENTS_PATH" || return 1
}

configure_memory_backend() {
  local mode="$1"
  local needs_fallback=0

  unset CODEX_AUTOPILOT_MEMORY_DIR || true
  set_memory_dir "$MEMORY_DIR_REPO"
  MEMORY_MODE="repo"

  if ! self_heal_file_path "$ACTIVE_CONTEXT"; then
    emit_permission_fingerprint "$mode" "active_context_eperm" "$ACTIVE_CONTEXT" "operation_not_permitted"
    warn_context_issue "active context file is not writable in repository memory directory" "$ACTIVE_CONTEXT"
    needs_fallback=1
  fi

  if ! self_heal_file_path "$EVENTS_PATH"; then
    emit_permission_fingerprint "$mode" "events_ndjson_eperm" "$EVENTS_PATH" "operation_not_permitted"
    warn_context_issue "events log is not writable in repository memory directory" "$EVENTS_PATH"
    needs_fallback=1
  fi

  if [[ "$needs_fallback" -eq 0 ]]; then
    return 0
  fi

  if ! activate_fallback_memory; then
    warn_context_issue "failed to activate writable fallback memory directory" "$MEMORY_DIR_REPO"
    return 1
  fi

  echo "[codex-autopilot] Using fallback memory directory: ${MEMORY_DIR}" >&2
}

ensure_memory_cli_ready() {
  if ! command -v node >/dev/null 2>&1; then
    warn_context_issue "node runtime not found"
    return 1
  fi

  if [[ ! -r "$MEMORY_CLI_SCRIPT" ]]; then
    warn_context_issue "memory cli script missing or unreadable"
    return 1
  fi
}

ensure_active_context_target() {
  if ! self_heal_file_path "$ACTIVE_CONTEXT"; then
    warn_context_issue "active context is not writable" "$ACTIVE_CONTEXT"
    return 1
  fi

  local current_user
  current_user="$(id -un 2>/dev/null || whoami 2>/dev/null || printf '')"
  local context_owner
  context_owner="$(path_owner "$ACTIVE_CONTEXT")"
  if [[ -n "$context_owner" && -n "$current_user" && "$context_owner" != "$current_user" ]]; then
    echo "[codex-autopilot] Warning: active context owner '${context_owner}' differs from current user '${current_user}'." >&2
  fi
}

run_memory_cli() {
  ensure_memory_cli_ready || return 1
  "${MEMORY_CLI[@]}" "$@"
}

run_memory_cli_soft() {
  local operation="$1"
  shift || true

  if ! run_memory_cli "$@"; then
    warn_context_issue "memory ${operation} command failed"
    return 1
  fi

  return 0
}

write_context() {
  local query="$1"

  if ! ensure_active_context_target; then
    return 1
  fi

  local ranked_context
  if ! ranked_context="$(mktemp)"; then
    warn_context_issue "failed to allocate temp file for ranked context"
    return 1
  fi

  if ! run_memory_cli rank --query "$query" --limit 5 --format markdown >"$ranked_context"; then
    warn_context_issue "memory rank command failed"
    rm -f "$ranked_context"
    return 1
  fi

  if ! tee "$ACTIVE_CONTEXT" <"$ranked_context"; then
    warn_context_issue "failed writing ranked context output"
    rm -f "$ranked_context"
    return 1
  fi

  rm -f "$ranked_context"
}

log_failure() {
  local query="$1"
  local cmd_text="$2"
  local error_snippet="$3"

  local trigger="command-run:${query}"
  local mistake="Command failed: ${cmd_text}. Error: ${error_snippet}"
  local correction="Read the error output, apply a concrete fix, and rerun through codex-autopilot."
  local base_cmd
  base_cmd="$(printf '%s' "$cmd_text" | awk '{print $1}')"
  local tags="auto,command-failure,${base_cmd:-command}"

  run_memory_cli add \
    --source self \
    --trigger "$trigger" \
    --mistake "$mistake" \
    --correction "$correction" \
    --tags "$tags" \
    --confidence 0.8 \
    --severity 2 >/dev/null || true
}

mode="${1:-}"
if [[ -z "$mode" ]]; then
  usage
  exit 1
fi
shift || true

if ! configure_memory_backend "$mode"; then
  echo "[codex-autopilot] Continuing in degraded mode without writable memory backend." >&2
fi

case "$mode" in
  start)
    query="${*:-session-start}"
    if ! write_context "$query"; then
      echo "[codex-autopilot] Continuing without refreshed active context." >&2
    fi
    ;;

  run)
    query="${1:-task-run}"
    if [[ "$#" -gt 0 ]]; then
      shift
    fi

    if [[ "${1:-}" != "--" ]]; then
      usage
      exit 1
    fi
    shift

    if [[ "$#" -eq 0 ]]; then
      usage
      exit 1
    fi

    if ! write_context "$query" >/dev/null; then
      echo "[codex-autopilot] Continuing command execution with stale/missing active context." >&2
    fi

    cmd_text="$*"
    if ! tmp="$(mktemp)"; then
      echo "[codex-autopilot] Warning: failed to allocate command output temp file; running command without failure capture." >&2
      exec "$@"
    fi

    cleanup_tmp() {
      rm -f "$tmp"
    }
    trap cleanup_tmp EXIT

    set +e
    "$@" > >(tee "$tmp") 2> >(tee -a "$tmp" >&2)
    status=$?
    set -e

    if [[ "$status" -ne 0 ]]; then
      snippet="$(tail -n 12 "$tmp" | compress_line)"
      log_failure "$query" "$cmd_text" "$snippet"
    fi

    trap - EXIT
    cleanup_tmp
    exit "$status"
    ;;

  checkpoint)
    run_memory_cli_soft "promote" promote --threshold 2 >/dev/null || true
    run_memory_cli_soft "rebuild-index" rebuild-index >/dev/null || true
    ;;

  add)
    if [[ "$#" -eq 0 ]]; then
      usage
      exit 1
    fi
    run_memory_cli_soft "add" add "$@" >/dev/null || true
    ;;

  *)
    usage
    exit 1
    ;;
esac
