#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'HELP'
Usage:
  npm run plan:review -- <plan-file>

Runs Gemini plan critique against the plan file, writes an artifact under:
  artifacts/plan-reviews/

Then updates the plan file with:
  Gemini-Review-Timestamp
  Gemini-Review-Artifact
  Gemini-Review-Model
HELP
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || $# -lt 1 ]]; then
  usage
  exit 0
fi

PLAN_INPUT="$1"
PLAN_PATH="$PLAN_INPUT"
if [[ "$PLAN_PATH" != /* ]]; then
  PLAN_PATH="$ROOT_DIR/$PLAN_PATH"
fi

if [[ ! -f "$PLAN_PATH" ]]; then
  echo "[plan:review] Plan file not found: $PLAN_PATH" >&2
  exit 1
fi

PLAN_ABS="$(cd "$(dirname "$PLAN_PATH")" && pwd)/$(basename "$PLAN_PATH")"
PLAN_REL="${PLAN_ABS#"$ROOT_DIR"/}"
if [[ "$PLAN_REL" == "$PLAN_ABS" ]]; then
  echo "[plan:review] Plan file must be inside repo: $PLAN_PATH" >&2
  exit 1
fi
PLAN_BASENAME="$(basename "$PLAN_REL")"
PLAN_SLUG="$(printf "%s" "$PLAN_BASENAME" | tr '[:upper:]' '[:lower:]' | sed 's/\.[^.]*$//' | tr -cs 'a-z0-9' '-')"

TIMESTAMP_FILE="$(date +%Y%m%d-%H%M%S)"
TIMESTAMP_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "$ROOT_DIR/artifacts/plan-reviews"

ARTIFACT_REL="artifacts/plan-reviews/${TIMESTAMP_FILE}-${PLAN_SLUG}.md"
ARTIFACT_PATH="$ROOT_DIR/$ARTIFACT_REL"

TMP_CRITIQUE="$(mktemp -t gemini-plan-review.XXXXXX.md)"
TMP_MODEL="$(mktemp -t gemini-plan-model.XXXXXX.txt)"
trap 'rm -f "$TMP_CRITIQUE" "$TMP_MODEL"' EXIT

if ! cat "$PLAN_PATH" | GEMINI_MODEL_RECORD_FILE="$TMP_MODEL" bash "$ROOT_DIR/scripts/gemini-collab.sh" plan >"$TMP_CRITIQUE"; then
  echo "[plan:review] Gemini critique failed." >&2
  echo "[plan:review] Ensure Gemini CLI is authenticated (Google login) and rerun." >&2
  exit 1
fi

MODEL_NAME="$(awk 'NF {print; exit}' "$TMP_MODEL" 2>/dev/null || true)"
if [[ -z "${MODEL_NAME:-}" ]]; then
  case "${GEMINI_MODEL:-}" in
    ""|"pro"|"PRO"|"auto"|"AUTO"|"latest"|"LATEST"|"latest-pro"|"LATEST-PRO")
      MODEL_NAME="gemini-3.1-pro-preview"
      ;;
    *)
      MODEL_NAME="${GEMINI_MODEL}"
      ;;
  esac
fi

{
  echo "# Gemini Plan Review"
  echo
  echo "- Plan: \`$PLAN_REL\`"
  echo "- Generated-At-UTC: $TIMESTAMP_ISO"
  echo "- Model: $MODEL_NAME"
  echo
  cat "$TMP_CRITIQUE"
} >"$ARTIFACT_PATH"

TMP_PLAN="$(mktemp -t plan-metadata.XXXXXX.md)"
trap 'rm -f "$TMP_CRITIQUE" "$TMP_PLAN"' EXIT

sed \
  -e '/^## Gemini Review Metadata$/d' \
  -e '/^Gemini-Review-Timestamp:[[:space:]]/d' \
  -e '/^Gemini-Review-Artifact:[[:space:]]/d' \
  -e '/^Gemini-Review-Model:[[:space:]]/d' \
  "$PLAN_PATH" >"$TMP_PLAN"

{
  echo
  echo "## Gemini Review Metadata"
  echo "Gemini-Review-Timestamp: $TIMESTAMP_ISO"
  echo "Gemini-Review-Artifact: $ARTIFACT_REL"
  echo "Gemini-Review-Model: $MODEL_NAME"
} >>"$TMP_PLAN"

mv "$TMP_PLAN" "$PLAN_PATH"

echo "[plan:review] Updated plan: $PLAN_REL"
echo "[plan:review] Wrote artifact: $ARTIFACT_REL"
echo "[plan:review] Next step: git add \"$PLAN_REL\" \"$ARTIFACT_REL\""
