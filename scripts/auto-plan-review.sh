#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CURRENT_PLAN_POINTER=".agents/plan/current-plan.txt"

usage() {
  cat <<'HELP'
Usage:
  bash scripts/auto-plan-review.sh

Behavior:
  - Finds staged plan files.
  - If Codex Plan mode is active, also includes a changed active-plan file.
  - Runs Gemini plan review for each selected plan file.
  - Stages updated plan metadata + generated review artifact.

Plan mode signals:
  - CODEX_COLLABORATION_MODE=plan
  - COLLABORATION_MODE=plan
  - CODEX_MODE=plan
  - CODEX_PLAN_MODE=1 (or true/yes/plan)
HELP
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

is_plan_file() {
  local path="$1"
  local lower
  local base
  lower="$(printf "%s" "$path" | tr '[:upper:]' '[:lower:]')"
  base="$(basename "$lower")"

  if [[ "$lower" == "docs/product_plan.md" ]]; then
    return 0
  fi
  if [[ "$lower" == docs/plans/* && "$lower" == *.md ]]; then
    return 0
  fi
  if [[ "$lower" == docs/* && "$lower" == *.md && "$base" == *plan* ]]; then
    return 0
  fi

  return 1
}

is_plan_mode_active() {
  local raw lower
  for raw in \
    "${CODEX_COLLABORATION_MODE:-}" \
    "${COLLABORATION_MODE:-}" \
    "${CODEX_MODE:-}" \
    "${CODEX_PLAN_MODE:-}"; do
    lower="$(printf "%s" "$raw" | tr '[:upper:]' '[:lower:]')"
    case "$lower" in
      plan|planning|plan_mode|true|yes|1)
        return 0
        ;;
    esac
  done
  return 1
}

append_unique_plan_file() {
  local candidate="$1"
  local existing
  for existing in "${PLAN_FILES[@]:-}"; do
    [[ -z "$existing" ]] && continue
    if [[ "$existing" == "$candidate" ]]; then
      return 0
    fi
  done
  PLAN_FILES+=("$candidate")
  PLAN_FILE_COUNT=$((PLAN_FILE_COUNT + 1))
}

read_active_plan_pointer() {
  if [[ ! -f "$CURRENT_PLAN_POINTER" ]]; then
    return 0
  fi

  sed '/^[[:space:]]*#/d' "$CURRENT_PLAN_POINTER" | awk 'NF {print; exit}'
}

plan_artifact_exists() {
  local artifact_path="$1"

  if [[ -z "$artifact_path" ]]; then
    return 1
  fi

  if [[ -f "$artifact_path" ]]; then
    return 0
  fi
  if git rev-parse --verify --quiet ":$artifact_path" >/dev/null 2>&1; then
    return 0
  fi
  if git ls-files --error-unmatch "$artifact_path" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

plan_has_existing_review_metadata() {
  local plan_file="$1"
  local gemini_ts gemini_artifact gemini_model

  gemini_ts="$(sed -n 's/^Gemini-Review-Timestamp:[[:space:]]*//p' "$plan_file" | tail -n 1)"
  gemini_artifact="$(sed -n 's/^Gemini-Review-Artifact:[[:space:]]*//p' "$plan_file" | tail -n 1)"
  gemini_model="$(sed -n 's/^Gemini-Review-Model:[[:space:]]*//p' "$plan_file" | tail -n 1)"

  if [[ -z "$gemini_ts" || -z "$gemini_artifact" || -z "$gemini_model" ]]; then
    return 1
  fi

  if ! plan_artifact_exists "$gemini_artifact"; then
    return 1
  fi

  return 0
}

file_is_changed_in_worktree_or_index() {
  local file="$1"

  if [[ -n "$(git diff --name-only -- "$file")" ]]; then
    return 0
  fi

  if [[ -n "$(git diff --cached --name-only -- "$file")" ]]; then
    return 0
  fi

  return 1
}

PLAN_FILES=()
PLAN_FILE_COUNT=0
PLAN_MODE_ACTIVE="false"

while IFS= read -r staged_file; do
  [[ -z "$staged_file" ]] && continue
  if is_plan_file "$staged_file"; then
    append_unique_plan_file "$staged_file"
  fi
done < <(git diff --cached --name-only --diff-filter=ACMRTUXB | awk 'NF' | sort -u)

if is_plan_mode_active; then
  PLAN_MODE_ACTIVE="true"
  ACTIVE_PLAN_REL="$(read_active_plan_pointer)"
  if [[ -n "${ACTIVE_PLAN_REL:-}" ]] && is_plan_file "$ACTIVE_PLAN_REL" && file_is_changed_in_worktree_or_index "$ACTIVE_PLAN_REL"; then
    append_unique_plan_file "$ACTIVE_PLAN_REL"
  fi
fi

if [[ "$PLAN_FILE_COUNT" -eq 0 ]]; then
  exit 0
fi

for plan_file in "${PLAN_FILES[@]:-}"; do
  [[ -z "$plan_file" ]] && continue
  if [[ ! -f "$plan_file" ]]; then
    echo "[plan:auto-review] Plan file not found (skipping): $plan_file" >&2
    continue
  fi

  if [[ "$PLAN_MODE_ACTIVE" != "true" ]] && plan_has_existing_review_metadata "$plan_file"; then
    echo "[plan:auto-review] Existing Gemini review metadata found for $plan_file; skipping."
    continue
  fi

  echo "[plan:auto-review] Running Gemini review for $plan_file"
  if ! review_output="$(bash "$ROOT_DIR/scripts/plan-review.sh" "$plan_file" 2>&1)"; then
    echo "$review_output" >&2
    echo "[plan:auto-review] Gemini plan review failed for $plan_file" >&2
    exit 1
  fi

  echo "$review_output"

  artifact_rel="$(
    printf "%s\n" "$review_output" |
      sed -n 's/^\[plan:review\] Wrote artifact:[[:space:]]*//p' |
      tail -n 1
  )"

  if [[ -z "$artifact_rel" ]]; then
    echo "[plan:auto-review] Could not parse artifact path from plan-review output for $plan_file" >&2
    exit 1
  fi

  git add "$plan_file" "$artifact_rel"
done

echo "[plan:auto-review] Gemini plan auto-review complete for ${PLAN_FILE_COUNT} plan file(s)."
