#!/usr/bin/env node
import { execFileSync } from "node:child_process";

function listTrackedPaths() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
  });

  return output.split("\0").filter(Boolean);
}

function buildNormalizedPathMap(paths) {
  const byNormalizedPath = new Map();

  for (const trackedPath of paths) {
    const normalized = trackedPath.toLowerCase();
    const existing = byNormalizedPath.get(normalized) ?? new Set();
    existing.add(trackedPath);
    byNormalizedPath.set(normalized, existing);
  }

  return byNormalizedPath;
}

function findExactCaseCollisions(byNormalizedPath) {
  return [...byNormalizedPath.values()]
    .map((entries) => [...entries].sort())
    .filter((entries) => entries.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]));
}

function findPrefixConflicts(paths, byNormalizedPath) {
  const conflicts = [];
  const seen = new Set();

  for (const trackedPath of [...paths].sort()) {
    const normalized = trackedPath.toLowerCase();
    const parts = normalized.split("/");

    for (let i = 1; i < parts.length; i += 1) {
      const parentNormalizedPath = parts.slice(0, i).join("/");
      const parentEntries = byNormalizedPath.get(parentNormalizedPath);

      if (!parentEntries) {
        continue;
      }

      for (const parentPath of parentEntries) {
        const key = `${parentPath}\u0000${trackedPath}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        conflicts.push([parentPath, trackedPath]);
      }
    }
  }

  return conflicts.sort((a, b) =>
    `${a[0]}/${a[1]}`.localeCompare(`${b[0]}/${b[1]}`),
  );
}

const trackedPaths = listTrackedPaths();
const normalizedPathMap = buildNormalizedPathMap(trackedPaths);
const exactCollisions = findExactCaseCollisions(normalizedPathMap);
const prefixConflicts = findPrefixConflicts(trackedPaths, normalizedPathMap);

if (exactCollisions.length > 0 || prefixConflicts.length > 0) {
  console.error(
    "[validate:case-collisions] Found case-insensitive path collisions in tracked files:",
  );

  for (const collisionSet of exactCollisions) {
    console.error(`- ${collisionSet.join(" <-> ")}`);
  }

  for (const [parentPath, childPath] of prefixConflicts) {
    console.error(`- ${parentPath} <-> ${childPath}`);
  }

  console.error(
    "[validate:case-collisions] Keep only one canonical casing per path and remove duplicates.",
  );
  process.exit(1);
}

console.log(
  `[validate:case-collisions] No case-insensitive path collisions across ${trackedPaths.length} tracked path(s).`,
);
