#!/usr/bin/env bash
set -euo pipefail
# List largest pending regular files
git status --porcelain |
awk '
  /^R[0-9]+/ { 
    # Handle rename: "R100 old -> new"
    gsub(/^R[0-9]+\s+/, "")
    gsub(/\s+->\s+.*$/, "")
    print
    next
  }
  /^[ MADU\?]{1,2}\s+/ {
    # Handle other statuses: " M path", "A  path", etc.
    gsub(/^[ MADU\?]{1,2}\s+/, "")
    print
  }
' | sort -u | while read -r f; do
  [[ -f "$f" ]] && du -h "$f" || true
done | sort -h | tail -n 50
