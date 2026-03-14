#!/usr/bin/env bash

maestro_start_metro_if_needed() {
  local metro_port="${1:-8081}"
  local metro_log="${2:-}"
  local __result_var="${3:-}"
  local metro_pid=""

  if lsof -nP -iTCP:"$metro_port" -sTCP:LISTEN >/dev/null 2>&1; then
    if [[ -n "$__result_var" ]]; then
      printf -v "$__result_var" '%s' ""
    fi
    return 0
  fi

  if [[ -z "$metro_log" ]]; then
    metro_log="$(mktemp -t financepal-metro.XXXXXX.log)"
  fi

  mkdir -p "$(dirname "$metro_log")"

  npx expo start --dev-client --non-interactive --port "$metro_port" >"$metro_log" 2>&1 &
  metro_pid="$!"

  local max_checks=30
  local check=0
  while [[ "$check" -lt "$max_checks" ]]; do
    if lsof -nP -iTCP:"$metro_port" -sTCP:LISTEN >/dev/null 2>&1; then
      if [[ -n "$__result_var" ]]; then
        printf -v "$__result_var" '%s' "$metro_pid"
      fi
      return 0
    fi
    check=$((check + 1))
    sleep 2
  done

  kill "$metro_pid" >/dev/null 2>&1 || true
  echo "[maestro:dev-client] Metro failed to start on port ${metro_port}. Check log: ${metro_log}" >&2
  return 1
}

maestro_cleanup_metro() {
  local metro_pid="${1:-}"

  if [[ -n "$metro_pid" ]]; then
    kill "$metro_pid" >/dev/null 2>&1 || true
  fi
}

maestro_open_dev_client_url() {
  local metro_port="${1:-8081}"
  local udid="${2:-booted}"
  local encoded_url="financepal://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A${metro_port}"

  if ! command -v xcrun >/dev/null 2>&1; then
    return 0
  fi

  xcrun simctl openurl "$udid" "$encoded_url" >/dev/null 2>&1 || true
}

maestro_prepare_dev_client() {
  local metro_port="${1:-8081}"
  local udid="${2:-booted}"
  local settle_seconds="${3:-5}"

  open -a Simulator >/dev/null 2>&1 || true
  maestro_open_dev_client_url "$metro_port" "$udid"
  sleep "$settle_seconds"
}
