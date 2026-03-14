#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "scripts/maestro-flow-matrix.sh"
source "scripts/maestro-java-env.sh"

TASK_SUMMARY="Implement AI-only automated UI workflow with Maestro screenshots and CI"

BUNDLE_ID="${IOS_BUNDLE_ID:-com.financepal.app}"
METRO_PORT="${UI_REVIEW_METRO_PORT:-8081}"
RUN_VALIDATE="${UI_REVIEW_RUN_VALIDATE:-false}"
RUN_UX_LOOP="${UI_REVIEW_RUN_UX_LOOP:-true}"
START_METRO="${UI_REVIEW_START_METRO:-true}"
BOOT_APP="${UI_REVIEW_BOOT_APP:-true}"

DEFAULT_FLAGS=(
  "EXPO_PUBLIC_BYPASS_AUTH=true"
  "EXPO_PUBLIC_USE_MOCK_DATA=true"
  "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false"
  "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false"
)

FLOWS_INPUT="${UI_REVIEW_FLOWS:-critical-loop dashboard-tab-states ops-surfaces-smoke}"
DEVICE_KEYS_INPUT="${UI_REVIEW_DEVICE_KEYS:-small large tablet}"
APPEARANCES_INPUT="${UI_REVIEW_APPEARANCES:-light dark}"
TEXT_MODES_INPUT="${UI_REVIEW_TEXT_MODES:-default a11y-max}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUTPUT_DIR="artifacts/ui-review/${TIMESTAMP}"
LOG_DIR="${OUTPUT_DIR}/logs"
SCREENSHOT_DIR="${OUTPUT_DIR}/screenshots"
REPORT_MD="${OUTPUT_DIR}/report.md"
SUMMARY_JSON="${OUTPUT_DIR}/summary.json"
METRO_LOG="${LOG_DIR}/metro.log"

mkdir -p "$LOG_DIR" "$SCREENSHOT_DIR"

METRO_PID=""

cleanup() {
  if [[ -n "$METRO_PID" ]]; then
    kill "$METRO_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

log() {
  echo "[ui:review] $*"
}

run_with_memory() {
  bash .agents/hooks/codex-autopilot.sh run "$TASK_SUMMARY" -- "$@"
}

require_command() {
  local command_name="$1"
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "[ui:review] Missing required command: $command_name" >&2
    exit 1
  fi
}

split_words() {
  local input="$1"
  read -r -a SPLIT_RESULT <<<"$input"
}

resolve_runtime_version() {
  local runtime
  runtime="$(xcodebuild -showsdks | awk '/Simulator - iOS/{print $4}' | tail -n 1)"
  if [[ -z "$runtime" ]]; then
    echo "[ui:review] Unable to resolve iOS simulator runtime. Try: xcodebuild -downloadPlatform iOS" >&2
    exit 1
  fi
  printf '%s' "$runtime"
}

resolve_udid_for_runtime() {
  local runtime="$1"
  local preferred_name="$2"
  local kind_filter="$3"

  local udid=""

  if [[ -n "$preferred_name" ]]; then
    udid="$(xcrun simctl list devices available | awk -v sdk="$runtime" -v preferred="$preferred_name" '
      $0 ~ ("-- iOS " sdk " --") { in_sdk = 1; next }
      /^-- / { in_sdk = 0 }
      in_sdk && index($0, preferred " (") {
        split($0, parts, "(")
        value = parts[2]
        sub(/\).*/, "", value)
        print value
        exit
      }
    ')"
  fi

  if [[ -n "$udid" ]]; then
    printf '%s' "$udid"
    return
  fi

  udid="$(xcrun simctl list devices available | awk -v sdk="$runtime" -v kind="$kind_filter" '
    $0 ~ ("-- iOS " sdk " --") { in_sdk = 1; next }
    /^-- / { in_sdk = 0 }
    in_sdk {
      if (kind == "iphone" && index($0, "iPhone") == 0) next
      if (kind == "ipad" && index($0, "iPad") == 0) next
      split($0, parts, "(")
      value = parts[2]
      sub(/\).*/, "", value)
      print value
      exit
    }
  ')"

  printf '%s' "$udid"
}

set_appearance() {
  local udid="$1"
  local appearance="$2"
  xcrun simctl ui "$udid" appearance "$appearance" >/dev/null 2>&1 || true
}

set_text_size() {
  local udid="$1"
  local mode="$2"

  if [[ "$mode" == "default" ]]; then
    xcrun simctl ui "$udid" content_size large >/dev/null 2>&1 || true
    return
  fi

  if [[ "$mode" == "a11y-max" ]]; then
    xcrun simctl ui "$udid" content_size accessibilityExtraExtraExtraLarge >/dev/null 2>&1 ||
      xcrun simctl ui "$udid" content_size accessibilityXXXL >/dev/null 2>&1 ||
      xcrun simctl ui "$udid" content_size accessibilityExtraExtraLarge >/dev/null 2>&1 ||
      true
  fi
}

start_metro_if_needed() {
  if [[ "$START_METRO" != "true" ]]; then
    return
  fi

  if lsof -nP -iTCP:"$METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Metro already listening on port $METRO_PORT"
    return
  fi

  log "Starting Metro on port $METRO_PORT"
  npx expo start --dev-client --non-interactive --port "$METRO_PORT" >"$METRO_LOG" 2>&1 &
  METRO_PID="$!"

  local max_checks=30
  local check=0
  while [[ "$check" -lt "$max_checks" ]]; do
    if lsof -nP -iTCP:"$METRO_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      log "Metro is ready"
      return
    fi
    check=$((check + 1))
    sleep 2
  done

  echo "[ui:review] Metro failed to start. Check log: $METRO_LOG" >&2
  exit 1
}

ensure_app_installed() {
  local udid="$1"

  if xcrun simctl get_app_container "$udid" "$BUNDLE_ID" app >/dev/null 2>&1; then
    log "App already installed on simulator $udid"
    return
  fi

  if [[ "$BOOT_APP" != "true" ]]; then
    echo "[ui:review] App is not installed and UI_REVIEW_BOOT_APP=false." >&2
    exit 1
  fi

  log "Installing app on simulator $udid via Expo"
  EXPO_IOS_SIMULATOR_UDID="$udid" npx expo run:ios --no-bundler >"${LOG_DIR}/expo-run-ios-${udid}.log" 2>&1
}

open_dev_client_url() {
  local udid="$1"
  local encoded_url="financepal://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A${METRO_PORT}"
  xcrun simctl openurl "$udid" "$encoded_url" >/dev/null 2>&1 || true
}

validate_flow_names() {
  local flow_name
  for flow_name in "${FLOWS[@]}"; do
    if ! get_maestro_flow_config "$flow_name" >/dev/null; then
      echo "[ui:review] Unknown flow in UI_REVIEW_FLOWS: $flow_name" >&2
      exit 1
    fi
  done
}

boot_device() {
  local udid="$1"
  xcrun simctl shutdown all >/dev/null 2>&1 || true
  xcrun simctl boot "$udid" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "$udid" -b >/dev/null
  open -a Simulator >/dev/null 2>&1 || true
}

append_summary_json_header() {
  cat >"$SUMMARY_JSON" <<JSON
{
  "timestamp": "${TIMESTAMP}",
  "outputDir": "${OUTPUT_DIR}",
  "results": [
JSON
}

append_summary_json_footer() {
  cat >>"$SUMMARY_JSON" <<JSON
  ]
}
JSON
}

append_summary_result() {
  local first="$1"
  local device_key="$2"
  local appearance="$3"
  local text_mode="$4"
  local flow_name="$5"
  local scenario="$6"
  local status="$7"
  local log_path="$8"
  local screenshot_path="$9"

  if [[ "$first" != "true" ]]; then
    echo "," >>"$SUMMARY_JSON"
  fi

  cat >>"$SUMMARY_JSON" <<JSON
    {
      "device": "${device_key}",
      "appearance": "${appearance}",
      "textMode": "${text_mode}",
      "flow": "${flow_name}",
      "scenario": "${scenario}",
      "status": "${status}",
      "log": "${log_path}",
      "screenshot": "${screenshot_path}"
    }
JSON
}

split_words "$FLOWS_INPUT"
FLOWS=("${SPLIT_RESULT[@]}")

split_words "$DEVICE_KEYS_INPUT"
DEVICE_KEYS=("${SPLIT_RESULT[@]}")

split_words "$APPEARANCES_INPUT"
APPEARANCES=("${SPLIT_RESULT[@]}")

split_words "$TEXT_MODES_INPUT"
TEXT_MODES=("${SPLIT_RESULT[@]}")

validate_flow_names

if [[ "$RUN_VALIDATE" == "true" ]]; then
  log "Running validate gate"
  run_with_memory npm run validate
fi

if [[ "$RUN_UX_LOOP" != "true" ]]; then
  cat >"$SUMMARY_JSON" <<JSON
{
  "timestamp": "${TIMESTAMP}",
  "outputDir": "${OUTPUT_DIR}",
  "results": [],
  "uxLoop": "skipped",
  "reason": "UI_REVIEW_RUN_UX_LOOP=false"
}
JSON

  cat >"$REPORT_MD" <<REPORT
# UI Review Packet

- Timestamp: ${TIMESTAMP}
- Output directory: ${OUTPUT_DIR}
- Flows: ${FLOWS[*]}
- Devices: ${DEVICE_KEYS[*]}
- Appearances: ${APPEARANCES[*]}
- Text modes: ${TEXT_MODES[*]}

## Summary

- Passed: 0
- Failed: 0
- UX loop: skipped (UI_REVIEW_RUN_UX_LOOP=false)
- Report JSON: ${SUMMARY_JSON}
REPORT

  log "UI review UX loop skipped via UI_REVIEW_RUN_UX_LOOP=false"
  log "Report: ${REPORT_MD}"
  log "Summary JSON: ${SUMMARY_JSON}"
  exit 0
fi

require_command xcrun
require_command xcodebuild

if ! command -v maestro >/dev/null 2>&1; then
  echo "[ui:review] Maestro CLI is required. Install with: brew install maestro" >&2
  exit 1
fi

if ! configure_java_runtime_for_maestro; then
  echo "[ui:review] Java runtime is required for Maestro. Install openjdk@21 and set JAVA_HOME." >&2
  exit 1
fi

if ! maestro --version >/dev/null 2>&1; then
  echo "[ui:review] Maestro CLI could not start. Check Java runtime setup." >&2
  exit 1
fi

if [[ "$RUN_UX_LOOP" == "true" ]]; then
  log "Running UX loop gate"
  run_with_memory npm run ux:loop -- "${FLOWS[@]}"
fi

RUNTIME_VERSION="$(resolve_runtime_version)"
log "Using iOS simulator runtime: $RUNTIME_VERSION"

if [[ "$START_METRO" == "true" ]]; then
  start_metro_if_needed
fi

cat >"$REPORT_MD" <<REPORT
# UI Review Packet

- Timestamp: ${TIMESTAMP}
- Runtime: iOS ${RUNTIME_VERSION}
- Output directory: ${OUTPUT_DIR}
- Flows: ${FLOWS[*]}
- Devices: ${DEVICE_KEYS[*]}
- Appearances: ${APPEARANCES[*]}
- Text modes: ${TEXT_MODES[*]}

## Matrix Results

REPORT

append_summary_json_header

PASS_COUNT=0
FAIL_COUNT=0
FIRST_RESULT="true"

for device_key in "${DEVICE_KEYS[@]}"; do
  preferred_name=""
  kind_filter="iphone"

  case "$device_key" in
    small)
      preferred_name="${UI_REVIEW_DEVICE_SMALL:-iPhone SE (3rd generation)}"
      kind_filter="iphone"
      ;;
    large)
      preferred_name="${UI_REVIEW_DEVICE_LARGE:-iPhone 17 Pro Max}"
      kind_filter="iphone"
      ;;
    tablet)
      preferred_name="${UI_REVIEW_DEVICE_TABLET:-iPad Pro (13-inch) (M4)}"
      kind_filter="ipad"
      ;;
    *)
      echo "[ui:review] Unknown device key: $device_key (use small|large|tablet)" >&2
      exit 1
      ;;
  esac

  udid="$(resolve_udid_for_runtime "$RUNTIME_VERSION" "$preferred_name" "$kind_filter")"
  if [[ -z "$udid" ]]; then
    echo "[ui:review] Could not resolve simulator for device key '$device_key' on iOS $RUNTIME_VERSION." >&2
    exit 1
  fi

  log "Booting $device_key simulator ($udid)"
  boot_device "$udid"
  ensure_app_installed "$udid"
  open_dev_client_url "$udid"
  sleep 5

  for appearance in "${APPEARANCES[@]}"; do
    set_appearance "$udid" "$appearance"

    for text_mode in "${TEXT_MODES[@]}"; do
      set_text_size "$udid" "$text_mode"

      for flow_name in "${FLOWS[@]}"; do
        resolved="$(get_maestro_flow_config "$flow_name")"
        IFS='|' read -r _resolved_name flow_path flow_scenario <<<"$resolved"

        run_log_path="${LOG_DIR}/${device_key}-${appearance}-${text_mode}-${flow_name}.log"
        screenshot_subdir="${SCREENSHOT_DIR}/${device_key}/${appearance}/${text_mode}/${flow_scenario}"
        mkdir -p "$screenshot_subdir"
        screenshot_path="${screenshot_subdir}/${flow_name}.png"

        log "Running flow=$flow_name device=$device_key appearance=$appearance text=$text_mode scenario=$flow_scenario"

        flow_status="pass"
        env "${DEFAULT_FLAGS[@]}" \
          EXPO_PUBLIC_MOCK_SCENARIO="$flow_scenario" \
          bash scripts/maestro-test-with-retry.sh "$flow_path" "$run_log_path" || flow_status="fail"

        xcrun simctl io "$udid" screenshot "$screenshot_path" >/dev/null 2>&1 || true

        if [[ "$flow_status" == "pass" ]]; then
          PASS_COUNT=$((PASS_COUNT + 1))
        else
          FAIL_COUNT=$((FAIL_COUNT + 1))
        fi

        {
          echo "- ${device_key}/${appearance}/${text_mode}/${flow_name}: ${flow_status}"
          echo "  - Scenario: ${flow_scenario}"
          echo "  - Flow: ${flow_path}"
          echo "  - Log: ${run_log_path}"
          echo "  - Screenshot: ${screenshot_path}"
        } >>"$REPORT_MD"

        append_summary_result "$FIRST_RESULT" "$device_key" "$appearance" "$text_mode" "$flow_name" "$flow_scenario" "$flow_status" "$run_log_path" "$screenshot_path"
        FIRST_RESULT="false"
      done
    done
  done

done

append_summary_json_footer

{
  echo
  echo "## Summary"
  echo
  echo "- Passed: ${PASS_COUNT}"
  echo "- Failed: ${FAIL_COUNT}"
  echo "- Report JSON: ${SUMMARY_JSON}"
} >>"$REPORT_MD"

if [[ "$FAIL_COUNT" -gt 0 ]]; then
  echo "[ui:review] Flow failures detected (${FAIL_COUNT}). See report: ${REPORT_MD}" >&2
  exit 1
fi

log "UI review packet generated"
log "Report: ${REPORT_MD}"
log "Summary JSON: ${SUMMARY_JSON}"
