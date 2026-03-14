#!/usr/bin/env bash
set -euo pipefail

# Shared Maestro flow matrix.
# Output format for list command: flow_name|flow_path|mock_scenario

print_maestro_flow_matrix() {
  cat <<'MATRIX'
critical-loop|maestro/flows/critical-loop.yaml|default
dashboard-tab-states|maestro/flows/dashboard-tab-states.yaml|default
empty-state|maestro/flows/empty-state.yaml|empty
partial-facts|maestro/flows/partial-facts.yaml|partial_facts
linked-no-transactions|maestro/flows/linked-no-transactions.yaml|linked_no_transactions
policy-stale|maestro/flows/policy-stale.yaml|policy_stale_thresholds
policy-stale-rates|maestro/flows/policy-stale-rates.yaml|policy_stale_rates
crisis-cash-flow|maestro/flows/crisis-cash-flow.yaml|crisis_cash_flow
ops-surfaces-smoke|maestro/flows/ops-surfaces-smoke.yaml|default
MATRIX
}

get_maestro_flow_config() {
  local requested_flow="$1"
  local row=""

  while IFS='|' read -r flow_name flow_path flow_scenario; do
    if [[ "$flow_name" == "$requested_flow" ]]; then
      row="$flow_name|$flow_path|$flow_scenario"
      break
    fi
  done < <(print_maestro_flow_matrix)

  if [[ -z "$row" ]]; then
    return 1
  fi

  echo "$row"
}
