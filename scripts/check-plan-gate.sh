#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CURRENT_PLAN_POINTER=".agents/plan/current-plan.txt"

usage() {
  cat <<'HELP'
Usage:
  npm run plan:implementation:guard
  bash scripts/check-plan-gate.sh --staged
  bash scripts/check-plan-gate.sh --files-from-stdin
  bash scripts/check-plan-gate.sh --all

Purpose:
  Block implementation-path commits unless there is an active plan with:
  - Gemini review metadata + tracked artifact
  - Codex final approval metadata + tracked artifact
  Also enforce the active plan in Codex Plan mode even when implementation paths are unchanged.

Options:
  --staged            Check staged files (default)
  --files-from-stdin Read changed files (one per line) from stdin
  --all               Check unstaged/working-tree diff
HELP
}

MODE="staged"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staged)
      MODE="staged"
      shift
      ;;
    --files-from-stdin)
      MODE="stdin"
      shift
      ;;
    --all)
      MODE="all"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "[plan:implementation:guard] Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

is_guarded_code_path() {
  local path="$1"
  case "$path" in
    app/*|components/*|utils/*|stores/*|hooks/*|theme/*|supabase/*|__tests__/*|package.json|tsconfig.json)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
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

read_repo_file_preferring_index() {
  local path="$1"

  if [[ "$MODE" == "all" && -f "$path" ]]; then
    cat "$path"
    return 0
  fi

  if git rev-parse --verify --quiet ":$path" >/dev/null 2>&1; then
    git show ":$path"
    return 0
  fi

  if [[ -f "$path" ]]; then
    cat "$path"
    return 0
  fi

  return 1
}

artifact_exists_in_repo_or_index() {
  local artifact_path="$1"

  if [[ "$MODE" == "all" && -f "$artifact_path" ]]; then
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

extract_metadata_value() {
  local content="$1"
  local key="$2"
  printf "%s" "$content" | sed -n "s/^${key}:[[:space:]]*//p" | tail -n 1
}

validate_plan_metadata() {
  local plan_path="$1"
  local context="$2"
  local content

  if ! content="$(read_repo_file_preferring_index "$plan_path")"; then
    echo "[plan:implementation:guard] ${context}: plan file not found: $plan_path" >&2
    return 1
  fi

  local gemini_ts gemini_artifact gemini_model
  local codex_approval codex_ts codex_artifact codex_by

  gemini_ts="$(extract_metadata_value "$content" "Gemini-Review-Timestamp")"
  gemini_artifact="$(extract_metadata_value "$content" "Gemini-Review-Artifact")"
  gemini_model="$(extract_metadata_value "$content" "Gemini-Review-Model")"
  codex_approval="$(extract_metadata_value "$content" "Codex-Plan-Approval")"
  codex_ts="$(extract_metadata_value "$content" "Codex-Approval-Timestamp")"
  codex_artifact="$(extract_metadata_value "$content" "Codex-Approval-Artifact")"
  codex_by="$(extract_metadata_value "$content" "Codex-Approval-By")"

  if [[ -z "$gemini_ts" || -z "$gemini_artifact" || -z "$gemini_model" ]]; then
    echo "[plan:implementation:guard] ${context}: missing Gemini review metadata in $plan_path" >&2
    echo "[plan:implementation:guard] Run: npm run plan:finalize -- \"$plan_path\"" >&2
    return 1
  fi

  if [[ "$codex_approval" != "APPROVED" || -z "$codex_ts" || -z "$codex_artifact" || -z "$codex_by" ]]; then
    echo "[plan:implementation:guard] ${context}: missing Codex final approval metadata in $plan_path" >&2
    echo "[plan:implementation:guard] Run: npm run plan:finalize -- \"$plan_path\"" >&2
    return 1
  fi

  if ! artifact_exists_in_repo_or_index "$gemini_artifact"; then
    echo "[plan:implementation:guard] ${context}: missing Gemini artifact: $gemini_artifact" >&2
    return 1
  fi

  if ! artifact_exists_in_repo_or_index "$codex_artifact"; then
    echo "[plan:implementation:guard] ${context}: missing Codex approval artifact: $codex_artifact" >&2
    return 1
  fi

  if [[ "$codex_ts" < "$gemini_ts" ]]; then
    echo "[plan:implementation:guard] ${context}: Codex approval timestamp ($codex_ts) is earlier than Gemini review timestamp ($gemini_ts) in $plan_path" >&2
    return 1
  fi

  return 0
}

collect_changed_files() {
  case "$MODE" in
    staged)
      git diff --cached --name-only --diff-filter=ACDMRTUXB
      ;;
    stdin)
      cat
      ;;
    all)
      git diff --name-only --diff-filter=ACDMRTUXB
      ;;
    *)
      echo "[plan:implementation:guard] Invalid mode: $MODE" >&2
      exit 1
      ;;
  esac
}

CHANGED_FILES=()
HAS_CHANGED_FILES="false"
while IFS= read -r changed_file; do
  [[ -z "$changed_file" ]] && continue
  CHANGED_FILES+=("$changed_file")
  HAS_CHANGED_FILES="true"
done < <(collect_changed_files | awk 'NF' | sort -u)

if [[ "$HAS_CHANGED_FILES" != "true" ]]; then
  exit 0
fi

HAS_GUARDED_CODE_CHANGES="false"
PLAN_MODE_ACTIVE="false"
PLAN_FILES_TOUCHED=()
HAS_PLAN_FILES_TOUCHED="false"

if is_plan_mode_active; then
  PLAN_MODE_ACTIVE="true"
fi

for file in "${CHANGED_FILES[@]:-}"; do
  [[ -z "$file" ]] && continue
  if is_guarded_code_path "$file"; then
    HAS_GUARDED_CODE_CHANGES="true"
  fi
  if is_plan_file "$file"; then
    PLAN_FILES_TOUCHED+=("$file")
    HAS_PLAN_FILES_TOUCHED="true"
  fi
done

if [[ "$HAS_GUARDED_CODE_CHANGES" != "true" && "$HAS_PLAN_FILES_TOUCHED" != "true" && "$PLAN_MODE_ACTIVE" != "true" ]]; then
  exit 0
fi

FAIL=0

for plan_file in "${PLAN_FILES_TOUCHED[@]:-}"; do
  [[ -z "$plan_file" ]] && continue
  if ! validate_plan_metadata "$plan_file" "touched-plan"; then
    FAIL=1
  fi
done

if [[ "$HAS_GUARDED_CODE_CHANGES" == "true" || "$PLAN_MODE_ACTIVE" == "true" ]]; then
  if [[ ! -f "$CURRENT_PLAN_POINTER" ]]; then
    echo "[plan:implementation:guard] Missing active plan pointer: $CURRENT_PLAN_POINTER" >&2
    echo "[plan:implementation:guard] Run: npm run plan:finalize -- \"docs/PRODUCT_PLAN.md\"" >&2
    FAIL=1
  else
    active_plan_path="$(read_repo_file_preferring_index "$CURRENT_PLAN_POINTER" | sed '/^[[:space:]]*#/d' | awk 'NF {print; exit}')"
    if [[ -z "${active_plan_path:-}" ]]; then
      echo "[plan:implementation:guard] Active plan pointer is empty: $CURRENT_PLAN_POINTER" >&2
      FAIL=1
    elif ! validate_plan_metadata "$active_plan_path" "active-plan"; then
      FAIL=1
    fi
  fi
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi

if [[ "$HAS_GUARDED_CODE_CHANGES" == "true" ]]; then
  echo "[plan:implementation:guard] Active plan gate passed for implementation changes."
elif [[ "$PLAN_MODE_ACTIVE" == "true" ]]; then
  echo "[plan:implementation:guard] Active plan gate passed in Codex Plan mode."
else
  echo "[plan:implementation:guard] Plan metadata gate passed."
fi
