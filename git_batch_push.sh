#!/usr/bin/env bash
set -euo pipefail

BATCH_SIZE=${BATCH_SIZE:-200}

# Ensure LFS hooks installed
git lfs install >/dev/null 2>&1 || true

# Collect pending paths from porcelain, handle renames
FILES=()
while IFS= read -r line; do
  # Handle rename: "R100 old -> new"
  if echo "$line" | grep -q "^R[0-9]"; then
    file=$(echo "$line" | sed 's/^R[0-9]*[[:space:]]*[^[:space:]]*[[:space:]]*->[[:space:]]*//')
    FILES+=("$file")
  # Handle other statuses: " M path", "A  path", etc.
  elif echo "$line" | grep -q "^[[:space:]]*[MADU\?]"; then
    file=$(echo "$line" | sed 's/^[[:space:]]*[MADU\?]*[[:space:]]*//')
    FILES+=("$file")
  fi
done < <(git status --porcelain)

total=${#FILES[@]}
if (( total == 0 )); then
  echo "Nothing to commit."
  exit 0
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Pending files: $total on branch $BRANCH"

# Ensure upstream exists
if ! git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  echo "No upstream set. Attempting to set to origin/$BRANCH"
  git push -u origin "$BRANCH" || true
fi

batch=1
for ((i=0; i<total; i+=BATCH_SIZE)); do
  end=$(( i + BATCH_SIZE ))
  (( end > total )) && end=$total

  echo "Batch $batch: staging $((end-i)) files ($((i+1))..$end / $total)"
  git add -- "${FILES[@]:i:end-i}" || {
    echo "git add failed on batch $batch"
    exit 1
  }

  msg="chore: batch commit $batch (files $((i+1))..$end of $total)"
  if git diff --cached --quiet; then
    echo "No staged changes in this batch."
  else
    git commit -m "$msg"
  fi

  # push with retries
  for attempt in 1 2 3; do
    if git push; then
      break
    fi
    sleep $((2**attempt))
    if [[ $attempt -eq 3 ]]; then
      echo "Push failed after 3 attempts."
      exit 1
    fi
  done
  ((batch++))
done

echo "Done. Processed $total files in $((batch-1)) batches."
