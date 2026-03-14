#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "scripts/maestro-flow-matrix.sh"
source "scripts/maestro-java-env.sh"
source "scripts/maestro-dev-client.sh"

DEFAULT_FLAGS=(
  "EXPO_PUBLIC_BYPASS_AUTH=true"
  "EXPO_PUBLIC_USE_MOCK_DATA=true"
  "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false"
  "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false"
)

print_help() {
  cat <<'HELP'
Usage: npm run ux:loop -- [--all | <flow> [<flow> ...]]
       npm run ux:loop -- --list

Runs one or more Maestro UI flows, captures logs per flow, and generates:
- artifacts/ux-loop/<timestamp>/report.md
- artifacts/ux-loop/<timestamp>/summary.json
HELP
}

print_supported_flows() {
  echo "[ux-loop] Supported flows:"
  while IFS='|' read -r flow_name flow_path flow_scenario; do
    echo "  - ${flow_name} (${flow_path}, scenario=${flow_scenario})"
  done < <(print_maestro_flow_matrix)
}

MAESTRO_SKIP_REASON=""

ensure_maestro_ready() {
  if ! command -v maestro >/dev/null 2>&1; then
    MAESTRO_SKIP_REASON="Maestro CLI is not installed."
    return 1
  fi

  if ! configure_java_runtime_for_maestro; then
    MAESTRO_SKIP_REASON="Maestro requires a Java runtime. Install openjdk@21 or set JAVA_HOME."
    return 1
  fi

  if ! maestro --version >/dev/null 2>&1; then
    MAESTRO_SKIP_REASON="Maestro CLI is installed but cannot start. Install a Java runtime and set JAVA_HOME."
    return 1
  fi

  return 0
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" || "${1:-}" == "help" ]]; then
  print_help
  exit 0
fi

if [[ "${1:-}" == "--list" || "${1:-}" == "list" ]]; then
  print_supported_flows
  exit 0
fi

if [[ -f "scripts/validate-maestro-flows.mjs" ]]; then
  node scripts/validate-maestro-flows.mjs
fi

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_DIR="artifacts/ux-loop/${TIMESTAMP}"
LOG_DIR="${OUTPUT_DIR}/logs"
mkdir -p "$LOG_DIR"
METRO_PORT="${UX_LOOP_METRO_PORT:-8081}"
METRO_LOG="${LOG_DIR}/metro.log"
METRO_PID=""

cleanup() {
  maestro_cleanup_metro "$METRO_PID"
}
trap cleanup EXIT

SELECTED_FLOWS=()

if [[ $# -eq 0 || "${1:-}" == "--all" || "${1:-}" == "all" ]]; then
  while IFS='|' read -r flow_name _flow_path _flow_scenario; do
    SELECTED_FLOWS+=("$flow_name")
  done < <(print_maestro_flow_matrix)
else
  for flow in "$@"; do
    if ! get_maestro_flow_config "$flow" >/dev/null; then
      echo "[ux-loop] Unknown flow: $flow"
      print_supported_flows
      exit 1
    fi
    SELECTED_FLOWS+=("$flow")
  done
fi

STATUS=0
REPORT_MD="${OUTPUT_DIR}/report.md"
SUMMARY_JSON="${OUTPUT_DIR}/summary.json"

{
  echo "# UX Loop Report"
  echo
  echo "- Run timestamp: ${TIMESTAMP}"
  echo "- Total flows: ${#SELECTED_FLOWS[@]}"
  echo
  echo "## Results"
} > "$REPORT_MD"

echo "{" > "$SUMMARY_JSON"
echo "  \"timestamp\": \"${TIMESTAMP}\"," >> "$SUMMARY_JSON"
echo "  \"output_dir\": \"${OUTPUT_DIR}\"," >> "$SUMMARY_JSON"
echo "  \"results\": [" >> "$SUMMARY_JSON"

if ! ensure_maestro_ready; then
  echo "[ux-loop] ${MAESTRO_SKIP_REASON}"
  echo "[ux-loop] Install on macOS: brew install maestro"
  echo "[ux-loop] Docs: https://maestro.mobile.dev/getting-started/installing-maestro"
fi

if [[ -z "$MAESTRO_SKIP_REASON" ]]; then
  maestro_start_metro_if_needed "$METRO_PORT" "$METRO_LOG" METRO_PID || exit 1
fi

for index in "${!SELECTED_FLOWS[@]}"; do
  flow_name="${SELECTED_FLOWS[$index]}"
  resolved="$(get_maestro_flow_config "$flow_name")"
  IFS='|' read -r _resolved_name flow_path flow_scenario <<<"$resolved"

  log_path="${LOG_DIR}/${flow_name}.log"
  flow_status="pass"
  skip_reason=""

  if [[ -n "$MAESTRO_SKIP_REASON" ]]; then
    flow_status="skipped"
    skip_reason="$MAESTRO_SKIP_REASON"
    echo "[ux-loop] Skipping ${flow_name} (${flow_path}) with scenario=${flow_scenario}"
    {
      echo "[ux-loop] Flow skipped."
      echo "[ux-loop] Reason: ${skip_reason}"
    } >"$log_path"
  else
    echo "[ux-loop] Running ${flow_name} (${flow_path}) with scenario=${flow_scenario}"
    maestro_prepare_dev_client "$METRO_PORT"

    env "${DEFAULT_FLAGS[@]}" \
      EXPO_PUBLIC_MOCK_SCENARIO="$flow_scenario" \
      bash scripts/maestro-test-with-retry.sh "$flow_path" "$log_path" || {
        flow_status="fail"
        STATUS=1
      }
  fi

  {
    echo "- ${flow_name}: ${flow_status}"
    echo "  - Flow: ${flow_path}"
    echo "  - Scenario: ${flow_scenario}"
    echo "  - Log: ${log_path}"
    if [[ -n "$skip_reason" ]]; then
      echo "  - Reason: ${skip_reason}"
    fi
  } >> "$REPORT_MD"

  comma=","
  if [[ "$index" -eq $((${#SELECTED_FLOWS[@]} - 1)) ]]; then
    comma=""
  fi

  if [[ -n "$skip_reason" ]]; then
    cat >> "$SUMMARY_JSON" <<JSON
    {
      "flow": "${flow_name}",
      "path": "${flow_path}",
      "scenario": "${flow_scenario}",
      "status": "${flow_status}",
      "log": "${log_path}",
      "reason": "${skip_reason}"
    }${comma}
JSON
  else
    cat >> "$SUMMARY_JSON" <<JSON
    {
      "flow": "${flow_name}",
      "path": "${flow_path}",
      "scenario": "${flow_scenario}",
      "status": "${flow_status}",
      "log": "${log_path}"
    }${comma}
JSON
  fi

done

echo "  ]" >> "$SUMMARY_JSON"
echo "}" >> "$SUMMARY_JSON"

if [[ -n "$MAESTRO_SKIP_REASON" ]]; then
  printf '\nFlows skipped because Maestro is unavailable.\n' >> "$REPORT_MD"
elif [[ "$STATUS" -eq 0 ]]; then
  printf '\nAll flows passed.\n' >> "$REPORT_MD"
else
  printf '\nOne or more flows failed.\n' >> "$REPORT_MD"
fi

echo "[ux-loop] Report: ${REPORT_MD}"
echo "[ux-loop] Summary: ${SUMMARY_JSON}"

if [[ -n "$MAESTRO_SKIP_REASON" ]]; then
  exit 0
fi

exit "$STATUS"
