#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

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

PLAN_FILES=()
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if is_plan_file "$file"; then
    PLAN_FILES+=("$file")
  fi
done < <(git diff --cached --name-only --diff-filter=ACMRTUXB)

if [[ "${#PLAN_FILES[@]}" -eq 0 ]]; then
  exit 0
fi

FAIL=0

for plan_file in "${PLAN_FILES[@]}"; do
  staged_content="$(git show ":$plan_file" 2>/dev/null || true)"

  artifact_rel="$(
    printf "%s" "$staged_content" |
      sed -n 's/^Gemini-Review-Artifact:[[:space:]]*//p' |
      tail -n 1
  )"

  if [[ -z "$artifact_rel" ]]; then
    echo "[plan:guard] Missing Gemini review metadata in staged plan: $plan_file" >&2
    echo "[plan:guard] Run: npm run plan:review -- \"$plan_file\"" >&2
    FAIL=1
    continue
  fi

  if ! git ls-files --error-unmatch "$artifact_rel" >/dev/null 2>&1; then
    echo "[plan:guard] Referenced artifact is not tracked/staged: $artifact_rel (from $plan_file)" >&2
    echo "[plan:guard] Run: npm run plan:review -- \"$plan_file\" && git add \"$plan_file\" \"$artifact_rel\"" >&2
    FAIL=1
  fi
done

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi

echo "[plan:guard] Gemini review metadata check passed for ${#PLAN_FILES[@]} staged plan file(s)."
