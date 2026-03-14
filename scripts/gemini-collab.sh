#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REQUESTED_MODEL="${GEMINI_MODEL:-}"
DEFAULT_APPROVAL_MODE="${GEMINI_APPROVAL_MODE:-plan}"
GEMINI_TRANSIENT_RETRIES="${GEMINI_TRANSIENT_RETRIES:-3}"
GEMINI_CAPS_CHECKED="false"
GEMINI_SUPPORTS_APPROVAL_MODE="false"
GEMINI_SELECTED_MODEL=""
MODEL_CANDIDATES_INITIALIZED="false"
MODEL_RECORD_FILE="${GEMINI_MODEL_RECORD_FILE:-}"
MODEL_CANDIDATES=()
STATIC_PRO_FALLBACK_CHAIN=(
  "gemini-3.1-pro-preview"
  "gemini-3-pro-preview"
  "pro"
  "gemini-2.5-pro"
)

read_env_file_value() {
  local file_path="$1"
  local key="$2"

  if [[ ! -f "$file_path" ]]; then
    return
  fi

  local raw_line
  raw_line="$(rg -m 1 "^${key}=" "$file_path" 2>/dev/null || true)"
  if [[ -z "$raw_line" ]]; then
    return
  fi

  local value="${raw_line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"

  if [[ -n "$value" ]]; then
    printf "%s" "$value"
  fi
}

ensure_gemini_auth_env() {
  if [[ -n "${GEMINI_API_KEY:-}" ]]; then
    return
  fi

  local candidate=""
  local env_file
  for env_file in "$ROOT_DIR/.env.local" "$ROOT_DIR/.env"; do
    candidate="$(read_env_file_value "$env_file" "GEMINI_API_KEY")"
    if [[ -n "$candidate" ]]; then
      export GEMINI_API_KEY="$candidate"
      return
    fi

    candidate="$(read_env_file_value "$env_file" "GOOGLE_GENAI_API_KEY")"
    if [[ -n "$candidate" ]]; then
      export GEMINI_API_KEY="$candidate"
      return
    fi

    candidate="$(read_env_file_value "$env_file" "GOOGLE_API_KEY")"
    if [[ -n "$candidate" ]]; then
      export GEMINI_API_KEY="$candidate"
      return
    fi
  done
}

print_help() {
  cat <<'HELP'
Usage:
  npm run gemini:collab:help
  npm run gemini:collab:plan -- "<plan text>"
  cat plan.md | npm run gemini:collab:plan
  npm run gemini:collab:diff
  npm run gemini:collab:diff-gate
  npm run gemini:collab:diff -- app components
  npm run gemini:collab:screenshot -- /absolute/path/to/screen.png "optional context"
  npm run gemini:collab:screenshot-gate -- --dir artifacts/ui-review/20260101-000000/screenshots --limit 12
  npm run gemini:collab:triage -- npm run validate

Modes:
  help         Show this help.
  plan         Critique an implementation plan.
  diff         Review unstaged git diff for regressions and missing tests.
  diff-gate    Return strict JSON verdict for diff gate checks.
  screenshot   Review a frontend screenshot for UI/UX quality.
  screenshot-gate Return strict JSON verdict for screenshot gate checks.
  triage       Run a command and ask Gemini to triage the output.

Environment variables:
  GEMINI_MODEL           Override model. Values `pro`, `auto`, `latest`,
                         and `latest-pro` all use the latest-Pro priority chain:
                         gemini-3.1-pro-preview -> gemini-3-pro-preview -> pro -> gemini-2.5-pro
  GEMINI_APPROVAL_MODE   Override approval mode (default: plan)
  GEMINI_TRIAGE_TAIL     Log lines to send in triage mode (default: 250)
  GEMINI_TRIAGE_STRICT   If set to true, triage exits with command status
  GEMINI_MODEL_RECORD_FILE  Internal: write selected model to this file path
HELP
}

append_unique_model() {
  local model="$1"
  local existing
  for existing in "${MODEL_CANDIDATES[@]-}"; do
    if [[ -z "$existing" ]]; then
      continue
    fi
    if [[ "$existing" == "$model" ]]; then
      return
    fi
  done
  MODEL_CANDIDATES+=("$model")
}

is_latest_pro_request() {
  local requested_model_normalized="$1"
  if [[ -z "$requested_model_normalized" ]]; then
    return 0
  fi

  case "$requested_model_normalized" in
    pro|auto|latest|latest-pro)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

discover_cli_pro_models() {
  local npm_global_root
  npm_global_root="$(npm root -g 2>/dev/null || true)"
  if [[ -z "$npm_global_root" ]]; then
    return 0
  fi

  local -a model_files=(
    "$npm_global_root/@google/gemini-cli/node_modules/@google/gemini-cli-core/dist/src/config/models.js"
    "$npm_global_root/@google/gemini-cli-core/dist/src/config/models.js"
  )

  local model_file
  for model_file in "${model_files[@]}"; do
    if [[ -f "$model_file" ]]; then
      rg -oN "gemini-[0-9]+(\\.[0-9]+)?-pro(-[a-z0-9.]+)?" "$model_file" 2>/dev/null || true
    fi
  done | sort -u | sort -Vr
}

init_model_candidates() {
  if [[ "$MODEL_CANDIDATES_INITIALIZED" == "true" ]]; then
    return
  fi

  local requested_model_normalized=""
  requested_model_normalized="$(printf "%s" "${REQUESTED_MODEL:-}" | tr '[:upper:]' '[:lower:]')"
  local discovered_model
  local static_model

  if is_latest_pro_request "$requested_model_normalized"; then
    while IFS= read -r discovered_model; do
      if [[ -n "${discovered_model:-}" ]]; then
        append_unique_model "$discovered_model"
      fi
    done < <(discover_cli_pro_models)

    for static_model in "${STATIC_PRO_FALLBACK_CHAIN[@]}"; do
      append_unique_model "$static_model"
    done
  else
    MODEL_CANDIDATES=("$REQUESTED_MODEL")
  fi

  MODEL_CANDIDATES_INITIALIZED="true"
}

record_selected_model() {
  local model="$1"
  if [[ -n "${MODEL_RECORD_FILE:-}" ]]; then
    printf "%s\n" "$model" >"$MODEL_RECORD_FILE"
  fi
}

is_retryable_model_failure() {
  local stderr_content="$1"
  if printf "%s" "$stderr_content" | rg -qi "ModelNotFoundError|Requested entity was not found|exhausted your capacity on this model|doesn't have a free quota tier"; then
    return 0
  fi
  return 1
}

is_auth_failure() {
  local stderr_content="$1"
  if printf "%s" "$stderr_content" | rg -qi "Please set an Auth method|specify GEMINI_API_KEY"; then
    return 0
  fi
  return 1
}

is_retryable_transport_failure() {
  local stderr_content="$1"
  if printf "%s" "$stderr_content" | rg -qi "AbortError: The operation was aborted|socket hang up|ECONNRESET|ETIMEDOUT|EAI_AGAIN|network error"; then
    return 0
  fi
  return 1
}

require_gemini() {
  if ! command -v gemini >/dev/null 2>&1; then
    echo "[gemini-collab] Gemini CLI is not installed or not in PATH." >&2
    echo "[gemini-collab] Install with: npm install -g @google/gemini-cli" >&2
    exit 1
  fi

  ensure_gemini_auth_env

  if [[ "$GEMINI_CAPS_CHECKED" != "true" ]]; then
    if gemini --help 2>&1 | rg -q -- "--approval-mode"; then
      GEMINI_SUPPORTS_APPROVAL_MODE="true"
    fi
    GEMINI_CAPS_CHECKED="true"
  fi

  init_model_candidates
}

invoke_gemini() {
  local -a gemini_args=("$@")
  bash -lc 'gemini "$@"' _ "${gemini_args[@]}"
}

run_gemini_with_fallbacks() {
  local prompt="$1"
  local payload="${2:-}"
  local use_stdin="${3:-false}"
  local allow_partial_output="${4:-false}"

  local model
  for model in "${MODEL_CANDIDATES[@]}"; do
    local attempt=1
    local max_attempts="$GEMINI_TRANSIENT_RETRIES"
    if ! [[ "$max_attempts" =~ ^[0-9]+$ ]] || [[ "$max_attempts" -lt 1 ]]; then
      max_attempts=1
    fi

    while [[ "$attempt" -le "$max_attempts" ]]; do
      local -a gemini_args=("-m" "$model")
      if [[ "$GEMINI_SUPPORTS_APPROVAL_MODE" == "true" ]]; then
        gemini_args+=("--approval-mode" "$DEFAULT_APPROVAL_MODE")
      fi

      local temp_out temp_err status stderr_content
      temp_out="$(mktemp -t gemini-collab.out.XXXXXX.log)"
      temp_err="$(mktemp -t gemini-collab.err.XXXXXX.log)"

      set +e
      if [[ "$use_stdin" == "true" ]]; then
        printf "%s" "$payload" | invoke_gemini "${gemini_args[@]}" -p "$prompt" >"$temp_out" 2>"$temp_err"
      else
        invoke_gemini "${gemini_args[@]}" -p "$prompt" >"$temp_out" 2>"$temp_err"
      fi
      status=$?
      set -e

      if [[ "$status" -eq 0 ]]; then
        GEMINI_SELECTED_MODEL="$model"
        echo "[gemini-collab] Using model: $model" >&2
        record_selected_model "$model"
        if [[ -s "$temp_err" ]]; then
          cat "$temp_err" >&2
        fi
        cat "$temp_out"
        rm -f "$temp_out" "$temp_err"
        return 0
      fi

      stderr_content="$(cat "$temp_err" || true)"

      if [[ "$use_stdin" == "true" ]] && is_auth_failure "$stderr_content"; then
        local inline_prompt
        inline_prompt="$(printf "%s\n\nInput:\n%s\n" "$prompt" "$payload")"

        set +e
        invoke_gemini "${gemini_args[@]}" -p "$inline_prompt" >"$temp_out" 2>"$temp_err"
        status=$?
        set -e

        if [[ "$status" -eq 0 ]]; then
          GEMINI_SELECTED_MODEL="$model"
          echo "[gemini-collab] Using model: $model" >&2
          record_selected_model "$model"
          if [[ -s "$temp_err" ]]; then
            cat "$temp_err" >&2
          fi
          cat "$temp_out"
          rm -f "$temp_out" "$temp_err"
          return 0
        fi

        stderr_content="$(cat "$temp_err" || true)"
      fi

      if is_retryable_transport_failure "$stderr_content"; then
        if [[ "$attempt" -lt "$max_attempts" ]]; then
          echo "[gemini-collab] Transient Gemini transport failure for '$model'; retrying ($attempt/$max_attempts)." >&2
          rm -f "$temp_out" "$temp_err"
          attempt=$((attempt + 1))
          sleep 1
          continue
        fi

        if [[ "$allow_partial_output" == "true" ]] && [[ -s "$temp_out" ]]; then
          GEMINI_SELECTED_MODEL="$model"
          echo "[gemini-collab] Using model: $model (partial output recovered after transient failure)." >&2
          record_selected_model "$model"
          cat "$temp_err" >&2
          cat "$temp_out"
          rm -f "$temp_out" "$temp_err"
          return 0
        fi
      fi

      if is_auth_failure "$stderr_content"; then
        echo "[gemini-collab] Gemini auth is not configured for CLI usage." >&2
        echo "[gemini-collab] Set GEMINI_API_KEY (or GOOGLE_GENAI_API_KEY / GOOGLE_API_KEY) in environment or .env.local." >&2
        echo "[gemini-collab] Alternatively configure auth in ~/.gemini/settings.json." >&2
        cat "$temp_err" >&2
        rm -f "$temp_out" "$temp_err"
        return "$status"
      fi

      if is_retryable_model_failure "$stderr_content" && [[ "${#MODEL_CANDIDATES[@]}" -gt 1 ]]; then
        echo "[gemini-collab] Model '$model' unavailable or quota-limited; trying next Pro fallback." >&2
        rm -f "$temp_out" "$temp_err"
        break
      fi

      cat "$temp_err" >&2
      if [[ -s "$temp_out" ]]; then
        cat "$temp_out" >&2
      fi
      rm -f "$temp_out" "$temp_err"
      return "$status"
    done
  done

  echo "[gemini-collab] No usable Gemini Pro model found. Tried: ${MODEL_CANDIDATES[*]}" >&2
  return 1
}

run_gemini_prompt() {
  local prompt="$1"
  local allow_partial_output="${2:-false}"
  run_gemini_with_fallbacks "$prompt" "" "false" "$allow_partial_output"
}

run_gemini_with_stdin() {
  local prompt="$1"
  local stdin_payload
  stdin_payload="$(cat)"
  run_gemini_with_fallbacks "$prompt" "$stdin_payload" "true"
}

extract_json_object() {
  node -e '
const fs = require("fs");
const input = fs.readFileSync(0, "utf8").trim();
if (!input) {
  process.exit(1);
}
const stripFence = (value) =>
  value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
const candidates = [input, stripFence(input)];
const firstBrace = input.indexOf("{");
const lastBrace = input.lastIndexOf("}");
if (firstBrace >= 0 && lastBrace > firstBrace) {
  candidates.push(input.slice(firstBrace, lastBrace + 1).trim());
  candidates.push(stripFence(input.slice(firstBrace, lastBrace + 1).trim()));
}
const lines = input.split(/\r?\n/);
for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i].trim();
  if (line.startsWith("{") && line.endsWith("}")) {
    candidates.push(line);
    break;
  }
}
const bracePositions = [];
for (let i = 0; i < input.length; i++) {
  if (input[i] === "{") bracePositions.push(i);
}
for (let index = bracePositions.length - 1; index >= 0; index--) {
  const candidate = input.slice(bracePositions[index]).trim();
  if (candidate.startsWith("{") && candidate.endsWith("}")) {
    candidates.push(candidate);
  }
}
for (const candidate of candidates) {
  if (!candidate) continue;
  try {
    JSON.parse(candidate);
    process.stdout.write(candidate);
    process.exit(0);
  } catch (_) {}
}
process.exit(1);
'
}

normalize_gate_json() {
  node -e '
const fs = require("fs");
const severityRank = { P0: 3, P1: 2, P2: 1, NONE: 0 };
const input = JSON.parse(fs.readFileSync(0, "utf8"));
const issues = Array.isArray(input.issues) ? input.issues : [];
const normalizedIssues = issues.map((issue) => {
  const rawSeverity = String(issue.severity || "P2").toUpperCase();
  const severity = severityRank[rawSeverity] !== undefined ? rawSeverity : "P2";
  return {
    severity,
    title: String(issue.title || "Untitled issue"),
    location: String(issue.location || issue.file || issue.screenshot || ""),
    reason: String(issue.reason || ""),
    fix: String(issue.fix || ""),
    test: String(issue.test || ""),
  };
});
let highest = "NONE";
for (const issue of normalizedIssues) {
  if (severityRank[issue.severity] > severityRank[highest]) {
    highest = issue.severity;
  }
}
let verdict = String(input.verdict || "").toLowerCase();
if (!["pass", "fail"].includes(verdict)) {
  verdict = severityRank[highest] >= severityRank.P1 ? "fail" : "pass";
}
if (severityRank[highest] >= severityRank.P1) {
  verdict = "fail";
}
const output = {
  verdict,
  highestSeverity: highest,
  summary: String(input.summary || ""),
  reviewedCount: Number(input.reviewedCount || 0),
  issues: normalizedIssues,
};
process.stdout.write(JSON.stringify(output, null, 2));
'
}

run_gate_prompt() {
  local prompt="$1"
  local payload="${2:-}"
  local use_stdin="${3:-false}"
  local allow_partial_output="${4:-false}"

  local raw_output=""
  if [[ "$use_stdin" == "true" ]]; then
    raw_output="$(printf "%s" "$payload" | run_gemini_with_stdin "$prompt")"
  else
    raw_output="$(run_gemini_prompt "$prompt" "$allow_partial_output")"
  fi

  local parsed_json=""
  if ! parsed_json="$(printf "%s" "$raw_output" | extract_json_object)"; then
    echo "[gemini-collab] Gemini gate response did not contain valid JSON." >&2
    echo "$raw_output" >&2
    return 1
  fi

  printf "%s" "$parsed_json" | normalize_gate_json
}

read_plan_text() {
  if [[ $# -gt 0 ]]; then
    printf "%s" "$*"
    return
  fi

  if [[ -t 0 ]]; then
    echo "[gemini-collab] Plan mode requires plan text as an argument or stdin." >&2
    echo "[gemini-collab] Example: cat docs/architecture/plan.md | npm run gemini:collab:plan" >&2
    exit 1
  fi

  cat
}

review_plan() {
  local plan_text
  plan_text="$(read_plan_text "$@")"

  if [[ -z "${plan_text// /}" ]]; then
    echo "[gemini-collab] Plan text is empty." >&2
    exit 1
  fi

  local prompt
  prompt="$(cat <<'PROMPT'
You are a senior reviewer for this repository.
Critique the implementation plan with strict focus on:
1) P0/P1/P2 risks
2) Missing steps or hidden dependencies
3) Frontend state coverage (loading/error/empty/offline) if UI is involved
4) Accessibility risks if UI is involved
5) Concrete tests to add or run
6) Simpler alternatives if complexity is unnecessary

Output must be concise and actionable.
PROMPT
)"

  printf "\nPlan:\n%s\n" "$plan_text" | run_gemini_with_stdin "$prompt"
}

review_diff() {
  local diff_text
  if [[ $# -gt 0 ]]; then
    diff_text="$(git diff -- "$@")"
  else
    diff_text="$(git diff)"
  fi

  if [[ -z "$diff_text" ]]; then
    echo "[gemini-collab] No unstaged git diff to review." >&2
    echo "[gemini-collab] Stage or edit files first, then rerun this command." >&2
    exit 1
  fi

  local prompt
  prompt="$(cat <<'PROMPT'
Review this git diff for an Expo Router + React Native + TypeScript app.
Prioritize:
1) correctness and regressions
2) missing tests
3) frontend state handling (loading/error/empty/offline)
4) accessibility and UX copy issues
5) performance pitfalls in rendering/state updates

Return findings as P0/P1/P2 with:
- why it matters
- minimal fix suggestion
- test to prove the fix
PROMPT
)"

  printf "%s\n" "$diff_text" | run_gemini_with_stdin "$prompt"
}

diff_gate() {
  local diff_text
  if [[ $# -gt 0 ]]; then
    diff_text="$(git diff -- "$@")"
  else
    diff_text="$(git diff)"
  fi

  if [[ -z "$diff_text" ]]; then
    cat <<'JSON'
{
  "verdict": "pass",
  "highestSeverity": "NONE",
  "summary": "No unstaged diff to review.",
  "reviewedCount": 0,
  "issues": []
}
JSON
    return
  fi

  local prompt
  prompt="$(cat <<'PROMPT'
You are a strict QA gate reviewer for an Expo Router + React Native + TypeScript app.
Analyze the provided git diff and return JSON only (no markdown), exactly with keys:
{
  "verdict": "pass|fail",
  "summary": "short summary",
  "reviewedCount": <number>,
  "issues": [
    {
      "severity": "P0|P1|P2",
      "title": "short title",
      "location": "file path or symbol",
      "reason": "why this matters",
      "fix": "minimal concrete fix",
      "test": "test or verification step"
    }
  ]
}
Rules:
- Mark P0/P1 for correctness, data loss, security, major UX breakage, or accessibility blockers.
- If any P0/P1 exists, verdict must be "fail".
- If only P2 or no issues, verdict may be "pass".
PROMPT
)"

  run_gate_prompt "$prompt" "$diff_text" "true"
}

review_screenshot() {
  if [[ $# -lt 1 ]]; then
    echo "[gemini-collab] Screenshot mode requires an absolute or repo-relative image path." >&2
    exit 1
  fi

  local input_path="$1"
  shift

  local screenshot_path="$input_path"
  if [[ "$screenshot_path" != /* ]]; then
    screenshot_path="$ROOT_DIR/$screenshot_path"
  fi

  if [[ ! -f "$screenshot_path" ]]; then
    echo "[gemini-collab] Screenshot path does not exist: $screenshot_path" >&2
    exit 1
  fi

  local context="${*:-No additional context provided.}"
  local prompt
  prompt="$(cat <<PROMPT
Analyze the screenshot at this path: $screenshot_path

Context:
$context

Review criteria:
1) hierarchy and readability
2) spacing and alignment
3) truncation/overflow and safe-area issues
4) color contrast and accessibility
5) concrete UI fix recommendations aligned with existing design tokens
PROMPT
)"

  run_gemini_prompt "$prompt" "true"
}

resolve_screenshot_inputs() {
  local mode="${1:-path}"
  shift || true

  if [[ "$mode" == "dir" ]]; then
    local dir_path="$1"
    local limit="$2"
    if [[ -z "$dir_path" || ! -d "$dir_path" ]]; then
      echo "[gemini-collab] Screenshot gate directory not found: $dir_path" >&2
      return 1
    fi
    find "$dir_path" -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \) | sort | head -n "$limit"
    return 0
  fi

  local input_path="$1"
  if [[ -z "$input_path" ]]; then
    echo "[gemini-collab] Screenshot gate requires an image path or --dir." >&2
    return 1
  fi

  local screenshot_path="$input_path"
  if [[ "$screenshot_path" != /* ]]; then
    screenshot_path="$ROOT_DIR/$screenshot_path"
  fi

  if [[ ! -f "$screenshot_path" ]]; then
    echo "[gemini-collab] Screenshot path does not exist: $screenshot_path" >&2
    return 1
  fi

  printf "%s\n" "$screenshot_path"
}

screenshot_gate() {
  local mode="path"
  local input_path=""
  local input_dir=""
  local limit="${GEMINI_SCREENSHOT_GATE_LIMIT:-12}"
  local context=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dir)
        mode="dir"
        input_dir="$2"
        shift 2
        ;;
      --limit)
        limit="$2"
        shift 2
        ;;
      *)
        if [[ -z "$input_path" ]]; then
          input_path="$1"
        else
          context="${context}${context:+ }$1"
        fi
        shift
        ;;
    esac
  done

  local -a screenshot_paths=()
  if [[ "$mode" == "dir" ]]; then
    while IFS= read -r path; do
      [[ -z "$path" ]] && continue
      screenshot_paths+=("$path")
    done < <(resolve_screenshot_inputs "dir" "$input_dir" "$limit")
  else
    while IFS= read -r path; do
      [[ -z "$path" ]] && continue
      screenshot_paths+=("$path")
    done < <(resolve_screenshot_inputs "path" "$input_path")
  fi

  if [[ "${#screenshot_paths[@]}" -eq 0 ]]; then
    echo "[gemini-collab] No screenshots found for gate review." >&2
    exit 1
  fi

  local screenshot_list=""
  local path
  for path in "${screenshot_paths[@]}"; do
    screenshot_list="${screenshot_list}- ${path}\n"
  done

  local prompt
  prompt="$(cat <<PROMPT
You are a strict UI quality gate reviewer for a React Native app.
Review the screenshots listed below and return JSON only (no markdown), exactly with keys:
{
  "verdict": "pass|fail",
  "summary": "short summary",
  "reviewedCount": <number>,
  "issues": [
    {
      "severity": "P0|P1|P2",
      "title": "short title",
      "location": "screenshot path",
      "reason": "why this matters",
      "fix": "minimal concrete fix",
      "test": "verification step"
    }
  ]
}
Rules:
- P0/P1 for major readability, accessibility, clipping, severe contrast, broken hierarchy, or unusable interaction affordances.
- If any P0/P1 exists, verdict must be "fail".
- If only minor polish items (P2) or no issues, verdict may be "pass".

Context: ${context:-No additional context provided.}

Screenshot paths:
${screenshot_list}
PROMPT
)"

  run_gate_prompt "$prompt" "" "false" "true"
}

triage_output() {
  local tail_lines="${GEMINI_TRIAGE_TAIL:-250}"
  local strict_mode="${GEMINI_TRIAGE_STRICT:-false}"

  local -a command_args
  if [[ $# -gt 0 ]]; then
    command_args=("$@")
  else
    command_args=("npm" "run" "validate")
  fi

  local temp_log
  temp_log="$(mktemp -t gemini-triage.XXXXXX.log)"

  set +e
  "${command_args[@]}" >"$temp_log" 2>&1
  local command_status=$?
  set -e

  local command_display
  command_display="$(printf "%q " "${command_args[@]}")"

  local prompt
  prompt="$(cat <<PROMPT
The following command was executed and failed or produced output:
$command_display
Exit status: $command_status

Analyze the logs and provide:
1) most likely root cause
2) minimal fix path
3) exact files/symbols to inspect first
4) a short verification checklist
PROMPT
)"

  tail -n "$tail_lines" "$temp_log" | run_gemini_with_stdin "$prompt"
  echo "[gemini-collab] Command status: $command_status"
  echo "[gemini-collab] Full log: $temp_log"

  if [[ "$strict_mode" == "true" ]]; then
    exit "$command_status"
  fi
}

main() {
  local mode="${1:-help}"
  shift || true

  case "$mode" in
    help|--help|-h)
      print_help
      ;;
    plan)
      require_gemini
      review_plan "$@"
      ;;
    diff)
      require_gemini
      review_diff "$@"
      ;;
    diff-gate)
      require_gemini
      diff_gate "$@"
      ;;
    screenshot)
      require_gemini
      review_screenshot "$@"
      ;;
    screenshot-gate)
      require_gemini
      screenshot_gate "$@"
      ;;
    triage)
      require_gemini
      triage_output "$@"
      ;;
    *)
      echo "[gemini-collab] Unknown mode: $mode" >&2
      print_help
      exit 1
      ;;
  esac
}

main "$@"
