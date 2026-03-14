#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FUNCTIONS=(
  "plaidLinkToken"
  "plaidExchangeToken"
  "plaidAccounts"
  "plaidWebhook"
  "processPendingInsights"
  "getNetWorthSlice"
  "logFmeEvaluation"
  "chat-explain"
  "agentGateway"
)

NO_VERIFY_JWT_FUNCTIONS=(
  "plaidLinkToken"
  "plaidExchangeToken"
  "plaidAccounts"
  "logFmeEvaluation"
  "chat-explain"
  "agentGateway"
)

function require_env_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: ${name}" >&2
    return 1
  fi
}

function trim_quotes() {
  local value="$1"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf "%s" "$value"
}

function project_ref_from_env_file() {
  local env_file="$1"
  if [[ ! -f "$env_file" ]]; then
    return 1
  fi

  local raw_url
  raw_url="$(grep -E '^EXPO_PUBLIC_SUPABASE_URL=' "$env_file" | tail -n 1 | cut -d '=' -f2- || true)"
  if [[ -z "$raw_url" ]]; then
    return 1
  fi

  local url host ref
  url="$(trim_quotes "$raw_url")"
  host="${url#https://}"
  host="${host#http://}"
  host="${host%%/*}"
  ref="${host%%.*}"
  if [[ -n "$ref" && "$ref" != "$host" ]]; then
    printf "%s" "$ref"
    return 0
  fi

  return 1
}

function derive_project_ref() {
  if [[ -n "${SUPABASE_PROJECT_REF:-}" ]]; then
    printf "%s" "$SUPABASE_PROJECT_REF"
    return 0
  fi

  local env_file ref
  for env_file in ".env.local" ".env"; do
    ref="$(project_ref_from_env_file "$env_file" || true)"
    if [[ -n "$ref" ]]; then
      printf "%s" "$ref"
      return 0
    fi
  done

  return 1
}

echo "Preparing Supabase release deployment..."

require_env_var "SUPABASE_ACCESS_TOKEN"
require_env_var "SUPABASE_DB_PASSWORD"

PROJECT_REF="$(derive_project_ref || true)"
if [[ -z "$PROJECT_REF" ]]; then
  echo "Unable to resolve project ref. Set SUPABASE_PROJECT_REF and retry." >&2
  exit 1
fi

DB_HOST="${SUPABASE_DB_HOST:-db.${PROJECT_REF}.supabase.co}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
ENCODED_DB_PASSWORD="$(node -e 'console.log(encodeURIComponent(process.argv[1]))' "$SUPABASE_DB_PASSWORD")"
DB_URL="postgresql://${DB_USER}:${ENCODED_DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"

echo "Project ref: ${PROJECT_REF}"
echo "Database host: ${DB_HOST}"

echo "Pushing database migrations..."
npx --yes supabase@latest db push \
  --db-url "$DB_URL" \
  --workdir "$ROOT_DIR" \
  --yes

for function_name in "${FUNCTIONS[@]}"; do
  echo "Deploying function: ${function_name}"
  extra_args=()
  for no_verify_name in "${NO_VERIFY_JWT_FUNCTIONS[@]}"; do
    if [[ "$function_name" == "$no_verify_name" ]]; then
      extra_args+=(--no-verify-jwt)
      break
    fi
  done

  npx --yes supabase@latest functions deploy "$function_name" \
    --project-ref "$PROJECT_REF" \
    --workdir "$ROOT_DIR" \
    --use-api \
    "${extra_args[@]}"
done

echo "Supabase release deployment finished successfully."
