#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BUNDLE_ID="${IOS_BUNDLE_ID:-com.financepal.app}"
SIM_DEVICE_NAME="${IOS_SIMULATOR_DEVICE_NAME:-iPhone 17 Pro Max}"

ENV_FILE=""
if [[ -f ".env.local" ]]; then
  ENV_FILE=".env.local"
elif [[ -f ".env" ]]; then
  ENV_FILE=".env"
fi

if [[ -n "$ENV_FILE" ]]; then
  if ! grep -Eq '^EXPO_PUBLIC_USE_MOCK_DATA=true$' "$ENV_FILE"; then
    echo "[smoke:ios] Warning: EXPO_PUBLIC_USE_MOCK_DATA=true is not set in $ENV_FILE."
    echo "[smoke:ios] The Plaid mock flow may not run as expected."
  fi
else
  echo "[smoke:ios] No .env.local or .env file found."
  echo "[smoke:ios] validate:env may fail if required keys are missing."
fi

if [[ ! -f "ios/Pods/Manifest.lock" ]] || ! cmp -s "ios/Podfile.lock" "ios/Pods/Manifest.lock"; then
  echo "[smoke:ios] CocoaPods lockfiles are out of sync. Running pod install..."
  (cd ios && pod install)
fi

SIM_SDK_VERSION="$(xcodebuild -showsdks | awk '/Simulator - iOS/{print $4}' | tail -n 1)"
if [[ -n "$SIM_SDK_VERSION" ]]; then
  TARGET_UDID="$(
    xcrun simctl list devices available | awk -v sdk="$SIM_SDK_VERSION" -v preferred="$SIM_DEVICE_NAME" '
      $0 ~ ("-- iOS " sdk " --") { in_sdk = 1; next }
      /^-- / { in_sdk = 0 }
      in_sdk && index($0, preferred " (") {
        if (index($0, "(") && index($0, ")")) {
          split($0, parts, "(")
          line = parts[2]
          sub(/\).*/, "", line)
          print line
          exit
        }
      }
    '
  )"

  if [[ -z "$TARGET_UDID" ]]; then
    TARGET_UDID="$(
      xcrun simctl list devices available | awk -v sdk="$SIM_SDK_VERSION" '
        $0 ~ ("-- iOS " sdk " --") { in_sdk = 1; next }
        /^-- / { in_sdk = 0 }
        in_sdk && index($0, "iPhone") {
          if (index($0, "(") && index($0, ")")) {
            split($0, parts, "(")
            line = parts[2]
            sub(/\).*/, "", line)
            print line
            exit
          }
        }
      '
    )"
  fi

  if [[ -n "$TARGET_UDID" ]]; then
    echo "[smoke:ios] Booting iOS $SIM_SDK_VERSION simulator ($TARGET_UDID)..."
    xcrun simctl shutdown all >/dev/null 2>&1 || true
    xcrun simctl boot "$TARGET_UDID" >/dev/null 2>&1 || true
    open -a Simulator >/dev/null 2>&1 || true
    export EXPO_IOS_SIMULATOR_UDID="$TARGET_UDID"
  else
    echo "[smoke:ios] Warning: No available iOS $SIM_SDK_VERSION simulator found."
    echo "[smoke:ios] Try: xcodebuild -downloadPlatform iOS"
  fi
fi

echo "[smoke:ios] Uninstalling $BUNDLE_ID from the booted simulator (if present)..."
xcrun simctl uninstall booted "$BUNDLE_ID" >/dev/null 2>&1 || true

echo "[smoke:ios] Running full validation..."
npm run validate

echo "[smoke:ios] Launching app in iOS Simulator..."
npm run ios
