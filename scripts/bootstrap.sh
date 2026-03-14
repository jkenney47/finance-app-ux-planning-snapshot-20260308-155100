#!/usr/bin/env bash

set -euo pipefail

REQUIRED_NODE_MAJOR="20"
CURRENT_NODE="$(node -v 2>/dev/null || true)"

if [[ -z "${CURRENT_NODE}" ]]; then
  echo "[bootstrap] Node.js is required but was not found in PATH."
  exit 1
fi

CURRENT_NODE_MAJOR="${CURRENT_NODE#v}"
CURRENT_NODE_MAJOR="${CURRENT_NODE_MAJOR%%.*}"

if [[ "${CURRENT_NODE_MAJOR}" != "${REQUIRED_NODE_MAJOR}" ]]; then
  echo "[bootstrap] Node ${REQUIRED_NODE_MAJOR}.x is required for this repository."
  echo "[bootstrap] Current version: ${CURRENT_NODE}"
  echo "[bootstrap] Run: nvm use"
  echo "[bootstrap] If needed: nvm install ${REQUIRED_NODE_MAJOR}"
  exit 1
fi

echo "[bootstrap] Node version OK (${CURRENT_NODE})."
echo "[bootstrap] Installing dependencies..."
if ! npm ci; then
  echo "[bootstrap] Install failed."
  echo "[bootstrap] If package dependencies changed intentionally, regenerate and commit package-lock.json before rerunning bootstrap."
  exit 1
fi
echo "[bootstrap] Done. Next: npm run validate"
