#!/usr/bin/env bash
set -euo pipefail

out_dir="${1:-.codex_snapshot}"
mkdir -p "$out_dir"

{
  echo "== basic =="
  date
  echo
} >"$out_dir/summary.txt"

if command -v tree >/dev/null 2>&1; then
  tree -a -L 4 -I ".git|node_modules|dist|build|.next|.venv|.cache" >"$out_dir/tree.txt" || true
else
  find . -maxdepth 4 -print | sed "s|^\./||" >"$out_dir/tree.txt"
fi

git status --porcelain=v1 >"$out_dir/git_status.txt" 2>/dev/null || true
git log -n 30 --oneline >"$out_dir/git_log.txt" 2>/dev/null || true

ls -1 \
  package.json pnpm-lock.yaml yarn.lock package-lock.json \
  requirements.txt poetry.lock pyproject.toml \
  go.mod go.sum \
  pom.xml build.gradle build.gradle.kts \
  Cargo.toml Cargo.lock \
  2>/dev/null >"$out_dir/manifests_present.txt" || true

if command -v rg >/dev/null 2>&1; then
  rg -n --hidden --no-ignore-vcs \
    "main\\(|createServer\\(|app\\.listen\\(|FastAPI\\(|Flask\\(|express\\(|router\\.|routes\\b|Handler\\b" \
    . >"$out_dir/entrypoints_grep.txt" || true
else
  grep -R -n -E \
    "main\\(|createServer\\(|app\\.listen\\(|FastAPI\\(|Flask\\(|express\\(|router\\.|routes\\b|Handler\\b" \
    . >"$out_dir/entrypoints_grep.txt" 2>/dev/null || true
fi

echo "Snapshot written to $out_dir/"
