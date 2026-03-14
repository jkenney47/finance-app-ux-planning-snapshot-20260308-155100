#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'HELP'
Usage:
  npm run plan:finalize -- <plan-file> [codex-approval-summary]

What this does:
1) Runs Gemini review on the plan (plan:review)
2) Writes a Codex approval artifact to artifacts/codex-approvals/
3) Updates plan metadata with Codex final approval
4) Updates active plan pointer at .agents/plan/current-plan.txt
HELP
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || $# -lt 1 ]]; then
  usage
  exit 0
fi

PLAN_INPUT="$1"
shift || true
CODEX_SUMMARY="${*:-Codex reviewed Gemini feedback, finalized tradeoffs, and approved this plan for implementation.}"

PLAN_PATH="$PLAN_INPUT"
if [[ "$PLAN_PATH" != /* ]]; then
  PLAN_PATH="$ROOT_DIR/$PLAN_PATH"
fi

if [[ ! -f "$PLAN_PATH" ]]; then
  echo "[plan:finalize] Plan file not found: $PLAN_PATH" >&2
  exit 1
fi

PLAN_ABS="$(cd "$(dirname "$PLAN_PATH")" && pwd)/$(basename "$PLAN_PATH")"
PLAN_REL="${PLAN_ABS#"$ROOT_DIR"/}"
if [[ "$PLAN_REL" == "$PLAN_ABS" ]]; then
  echo "[plan:finalize] Plan file must be inside repo: $PLAN_PATH" >&2
  exit 1
fi

echo "[plan:finalize] Running Gemini review..."
bash "$ROOT_DIR/scripts/plan-review.sh" "$PLAN_REL"

TIMESTAMP_FILE="$(date +%Y%m%d-%H%M%S)"
TIMESTAMP_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
PLAN_SLUG="$(printf "%s" "$(basename "$PLAN_REL")" | tr '[:upper:]' '[:lower:]' | sed 's/\.[^.]*$//' | tr -cs 'a-z0-9' '-')"

mkdir -p "$ROOT_DIR/artifacts/codex-approvals" "$ROOT_DIR/.agents/plan"

CODEX_ARTIFACT_REL="artifacts/codex-approvals/${TIMESTAMP_FILE}-${PLAN_SLUG}-codex-approval.md"
CODEX_ARTIFACT_PATH="$ROOT_DIR/$CODEX_ARTIFACT_REL"

{
  echo "# Codex Final Plan Approval"
  echo
  echo "- Plan: \`$PLAN_REL\`"
  echo "- Approved-At-UTC: $TIMESTAMP_ISO"
  echo "- Reviewer: Codex"
  echo
  echo "## Decision Summary"
  echo
  echo "$CODEX_SUMMARY"
  echo
  echo "## Gemini Feedback Resolution"
  echo
  echo "- Adopted: Documented in plan updates and implementation sequencing."
  echo "- Deferred: Any deferred feedback is tracked in plan notes/backlog."
  echo "- Rejected: Any rejected feedback is excluded due to scope/risk mismatch."
} >"$CODEX_ARTIFACT_PATH"

TMP_PLAN="$(mktemp -t plan-codex-approval.XXXXXX.md)"
trap 'rm -f "$TMP_PLAN"' EXIT

sed \
  -e '/^## Codex Final Approval Metadata$/d' \
  -e '/^Codex-Plan-Approval:[[:space:]]/d' \
  -e '/^Codex-Approval-Timestamp:[[:space:]]/d' \
  -e '/^Codex-Approval-Artifact:[[:space:]]/d' \
  -e '/^Codex-Approval-By:[[:space:]]/d' \
  "$PLAN_PATH" >"$TMP_PLAN"

{
  echo
  echo "## Codex Final Approval Metadata"
  echo "Codex-Plan-Approval: APPROVED"
  echo "Codex-Approval-Timestamp: $TIMESTAMP_ISO"
  echo "Codex-Approval-Artifact: $CODEX_ARTIFACT_REL"
  echo "Codex-Approval-By: Codex"
} >>"$TMP_PLAN"

mv "$TMP_PLAN" "$PLAN_PATH"

printf "%s\n" "$PLAN_REL" >"$ROOT_DIR/.agents/plan/current-plan.txt"

echo "[plan:finalize] Updated plan: $PLAN_REL"
echo "[plan:finalize] Wrote Codex artifact: $CODEX_ARTIFACT_REL"
echo "[plan:finalize] Set active plan pointer: .agents/plan/current-plan.txt"
echo "[plan:finalize] Next step: git add \"$PLAN_REL\" \"$CODEX_ARTIFACT_REL\" \".agents/plan/current-plan.txt\""
