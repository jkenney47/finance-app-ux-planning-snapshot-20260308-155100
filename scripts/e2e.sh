#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "scripts/maestro-flow-matrix.sh"
source "scripts/maestro-java-env.sh"
source "scripts/maestro-dev-client.sh"

FLOW_NAME="${1:-critical-loop}"
EXPECTED_BYPASS_AUTH="true"
EXPECTED_USE_MOCK_DATA="true"
EXPECTED_ENABLE_PLAID_SANDBOX_LINK="false"
EXPECTED_ENABLE_REAL_ACCOUNT_DATA="false"
FLOW_PATH=""
EXPECTED_SCENARIO=""
METRO_PORT="${E2E_METRO_PORT:-8081}"
METRO_LOG="${E2E_METRO_LOG:-$(mktemp -t financepal-e2e-metro.XXXXXX.log)}"
METRO_PID=""

check_flag_match() {
  local flag_name="$1"
  local expected_value="$2"
  local current_value="${!flag_name-}"

  if [[ -z "$current_value" ]]; then
    echo "[e2e] Warning: ${flag_name} is not set in this shell."
    return 0
  fi

  if [[ "$current_value" != "$expected_value" ]]; then
    echo "[e2e] Flag mismatch: ${flag_name}=${current_value}"
    echo "[e2e] Expected: ${flag_name}=${expected_value}"
    exit 1
  fi
}

print_supported_flows() {
  local formatted=""

  while IFS='|' read -r flow_name _flow_path _flow_scenario; do
    if [[ -n "$formatted" ]]; then
      formatted+=", "
    fi
    formatted+="$flow_name"
  done < <(print_maestro_flow_matrix)

  echo "[e2e] Supported flows: $formatted"
}

print_help() {
  echo "Usage: npm run e2e -- <flow>"
  echo "       npm run e2e -- --list"
  print_supported_flows
}

resolve_flow() {
  local resolved=""

  if ! resolved="$(get_maestro_flow_config "$FLOW_NAME")"; then
    echo "[e2e] Unknown flow: $FLOW_NAME"
    print_supported_flows
    exit 1
  fi

  IFS='|' read -r _flow FLOW_PATH EXPECTED_SCENARIO <<<"$resolved"
}

cleanup() {
  maestro_cleanup_metro "$METRO_PID"
}
trap cleanup EXIT

if [[ "$FLOW_NAME" == "--list" || "$FLOW_NAME" == "list" ]]; then
  print_supported_flows
  exit 0
fi

if [[ "$FLOW_NAME" == "--help" || "$FLOW_NAME" == "-h" || "$FLOW_NAME" == "help" ]]; then
  print_help
  exit 0
fi

resolve_flow

if [[ -f "scripts/validate-maestro-flows.mjs" ]]; then
  node scripts/validate-maestro-flows.mjs
fi

if ! command -v maestro >/dev/null 2>&1; then
  echo "[e2e] Maestro CLI is required but not installed."
  echo "[e2e] Install on macOS: brew install maestro"
  echo "[e2e] Docs: https://maestro.mobile.dev/getting-started/installing-maestro"
  exit 1
fi

if ! configure_java_runtime_for_maestro; then
  echo "[e2e] Java runtime is required for Maestro but is not available."
  echo "[e2e] Install on macOS: brew install openjdk@21"
  echo "[e2e] If installed, add Java to PATH (or set JAVA_HOME) and retry."
  exit 1
fi

if [[ ! -f "$FLOW_PATH" ]]; then
  echo "[e2e] Missing flow file: $FLOW_PATH"
  exit 1
fi

echo "[e2e] Running Maestro flow: $FLOW_PATH"
echo "[e2e] Expected app flags for this flow:"
echo "  EXPO_PUBLIC_BYPASS_AUTH=${EXPECTED_BYPASS_AUTH}"
echo "  EXPO_PUBLIC_USE_MOCK_DATA=${EXPECTED_USE_MOCK_DATA}"
echo "  EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=${EXPECTED_ENABLE_PLAID_SANDBOX_LINK}"
echo "  EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=${EXPECTED_ENABLE_REAL_ACCOUNT_DATA}"
echo "  EXPO_PUBLIC_MOCK_SCENARIO=$EXPECTED_SCENARIO"
echo "  Metro port=$METRO_PORT"

check_flag_match "EXPO_PUBLIC_BYPASS_AUTH" "$EXPECTED_BYPASS_AUTH"
check_flag_match "EXPO_PUBLIC_USE_MOCK_DATA" "$EXPECTED_USE_MOCK_DATA"
check_flag_match "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK" "$EXPECTED_ENABLE_PLAID_SANDBOX_LINK"
check_flag_match "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA" "$EXPECTED_ENABLE_REAL_ACCOUNT_DATA"
check_flag_match "EXPO_PUBLIC_MOCK_SCENARIO" "$EXPECTED_SCENARIO"

maestro_start_metro_if_needed "$METRO_PORT" "$METRO_LOG" METRO_PID
maestro_prepare_dev_client "$METRO_PORT"
bash scripts/maestro-test-with-retry.sh "$FLOW_PATH"
