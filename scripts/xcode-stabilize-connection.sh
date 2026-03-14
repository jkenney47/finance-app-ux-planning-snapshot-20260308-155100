#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

WORKSPACE="${IOS_WORKSPACE:-ios/FinancePal.xcworkspace}"
SCHEME="${IOS_SCHEME:-FinancePal}"
CONFIGURATION="${IOS_CONFIGURATION:-Debug}"
PREFERRED_DEVICE_NAME="${IOS_SIMULATOR_DEVICE_NAME:-iPhone 17 Pro Max}"
BUILD_SETTINGS_LOG="${IOS_XCODE_BUILD_SETTINGS_LOG:-/tmp/financepal-xcode-build-settings.log}"

if [[ ! -d "$WORKSPACE" ]]; then
  echo "[xcode:stabilize] Missing workspace: $WORKSPACE" >&2
  exit 1
fi

XCODE_DEVELOPER_DIR="$(xcode-select -p 2>/dev/null || true)"
if [[ -z "$XCODE_DEVELOPER_DIR" ]]; then
  echo "[xcode:stabilize] Unable to resolve active Xcode developer directory." >&2
  exit 1
fi

IOS_SIM_RUNTIME_VERSION="$(xcodebuild -showsdks | awk '/Simulator - iOS/{print $4}' | tail -n 1)"
if [[ -z "$IOS_SIM_RUNTIME_VERSION" ]]; then
  echo "[xcode:stabilize] No iOS Simulator SDK found. Try: xcodebuild -downloadPlatform iOS" >&2
  exit 1
fi

resolve_udid_for_runtime() {
  local runtime="$1"
  local preferred_name="$2"

  xcrun simctl list devices available | awk -v sdk="$runtime" -v preferred="$preferred_name" '
    $0 ~ ("-- iOS " sdk " --") { in_sdk = 1; next }
    /^-- / { in_sdk = 0 }
    in_sdk && index($0, preferred " (") {
      split($0, parts, "(")
      value = parts[2]
      sub(/\).*/, "", value)
      print value
      exit
    }
  '
}

resolve_first_iphone_udid_for_runtime() {
  local runtime="$1"

  xcrun simctl list devices available | awk -v sdk="$runtime" '
    $0 ~ ("-- iOS " sdk " --") { in_sdk = 1; next }
    /^-- / { in_sdk = 0 }
    in_sdk && index($0, "iPhone") {
      split($0, parts, "(")
      value = parts[2]
      sub(/\).*/, "", value)
      print value
      exit
    }
  '
}

TARGET_UDID="$(resolve_udid_for_runtime "$IOS_SIM_RUNTIME_VERSION" "$PREFERRED_DEVICE_NAME")"
if [[ -z "$TARGET_UDID" ]]; then
  TARGET_UDID="$(resolve_first_iphone_udid_for_runtime "$IOS_SIM_RUNTIME_VERSION")"
fi

if [[ -z "$TARGET_UDID" ]]; then
  echo "[xcode:stabilize] No available iPhone simulator found for iOS $IOS_SIM_RUNTIME_VERSION." >&2
  echo "[xcode:stabilize] Try: xcodebuild -downloadPlatform iOS" >&2
  exit 1
fi

echo "[xcode:stabilize] Active developer dir: $XCODE_DEVELOPER_DIR"
echo "[xcode:stabilize] Runtime: iOS $IOS_SIM_RUNTIME_VERSION"
echo "[xcode:stabilize] Simulator UDID: $TARGET_UDID"

xcrun simctl boot "$TARGET_UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$TARGET_UDID" -b >/dev/null

if ! xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -sdk iphonesimulator \
  -destination "id=$TARGET_UDID" \
  -showBuildSettings >"$BUILD_SETTINGS_LOG"; then
  echo "[xcode:stabilize] xcodebuild settings handshake failed." >&2
  echo "[xcode:stabilize] Log: $BUILD_SETTINGS_LOG" >&2
  exit 1
fi

if ! grep -q "TARGET_DEVICE_IDENTIFIER = $TARGET_UDID" "$BUILD_SETTINGS_LOG"; then
  echo "[xcode:stabilize] Build settings did not bind to expected simulator UDID." >&2
  echo "[xcode:stabilize] Log: $BUILD_SETTINGS_LOG" >&2
  exit 1
fi

echo "[xcode:stabilize] Xcode connection is stable."
echo "[xcode:stabilize] Build settings log: $BUILD_SETTINGS_LOG"
echo "[xcode:stabilize] Export this before npm run ios when needed:"
echo "export EXPO_IOS_SIMULATOR_UDID=$TARGET_UDID"
