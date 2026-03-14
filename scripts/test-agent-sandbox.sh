#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export EXPO_PUBLIC_BYPASS_AUTH=true
export EXPO_PUBLIC_USE_MOCK_DATA=true
export EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false
export EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false

echo "[agent-sandbox] Running deterministic checks with mock-only flags:"
echo "  EXPO_PUBLIC_BYPASS_AUTH=$EXPO_PUBLIC_BYPASS_AUTH"
echo "  EXPO_PUBLIC_USE_MOCK_DATA=$EXPO_PUBLIC_USE_MOCK_DATA"
echo "  EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=$EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK"
echo "  EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=$EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA"

npm run validate:maestro-flows
npm run typecheck
npm run lint
npm run depgraph:check
npm run test:coverage
npm run ux:loop -- critical-loop empty-state partial-facts policy-stale
