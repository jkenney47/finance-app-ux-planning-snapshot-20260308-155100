#!/usr/bin/env bash
set -euo pipefail

force="false"
if [[ "${1:-}" == "--force" ]]; then
  force="true"
  shift
fi

out_dir="${1:-redesign_bundle}"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
skill_dir="$(cd "$script_dir/.." && pwd)"
assets_dir="$skill_dir/assets"
refs_dir="$skill_dir/references"

if [[ -e "$out_dir" && "$force" != "true" ]]; then
  if [[ -n "$(find "$out_dir" -mindepth 1 -maxdepth 1 2>/dev/null || true)" ]]; then
    echo "error: output directory is not empty: $out_dir" >&2
    echo "use --force to reuse this directory." >&2
    exit 1
  fi
fi

mkdir -p "$out_dir/adrs"

cp "$assets_dir/redesign_brief_template.md" "$out_dir/redesign_brief.md"
cp "$assets_dir/migration_plan_template.md" "$out_dir/migration_plan.md"
cp "$assets_dir/risk_register_template.md" "$out_dir/risk_register.md"
cp "$assets_dir/adr_template.md" "$out_dir/adrs/ADR-001.md"
cp "$assets_dir/adr_template.md" "$out_dir/adrs/ADR-002.md"
cp "$assets_dir/adr_template.md" "$out_dir/adrs/ADR-003.md"
cp "$refs_dir/checklist.md" "$out_dir/checklist.md"

cat >"$out_dir/README.txt" <<EOF
Assumption-First Redesign bundle created at: $out_dir

Generated files:
- redesign_brief.md
- migration_plan.md
- risk_register.md
- adrs/ADR-001.md
- adrs/ADR-002.md
- adrs/ADR-003.md
- checklist.md

Next step:
1) Fill redesign_brief.md from assumptions to target design.
2) Fill migration_plan.md with staged rollout and rollback gates.
3) Fill risk_register.md with real owners and signals.
4) Finalize the three ADR files.
EOF

echo "Bundle created: $out_dir"
