#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const systemMapPath = path.join(repoRoot, "docs", "SYSTEM_MAP.md");

function isPathLike(token) {
  return (
    token.includes("/") ||
    token.includes(".") ||
    token.startsWith("app") ||
    token.startsWith("docs") ||
    token.startsWith("theme") ||
    token.startsWith("types") ||
    token.startsWith("utils") ||
    token.startsWith("hooks") ||
    token.startsWith("stores") ||
    token.startsWith("components") ||
    token.startsWith("supabase")
  );
}

function expandToken(token) {
  return token
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && isPathLike(part));
}

const document = fs.readFileSync(systemMapPath, "utf8");
const referencedPaths = [
  ...new Set(
    [...document.matchAll(/`([^`]+)`/g)]
      .flatMap((match) => expandToken(match[1]))
      .sort(),
  ),
];

const missingPaths = referencedPaths.filter(
  (relativePath) => !fs.existsSync(path.join(repoRoot, relativePath)),
);

if (missingPaths.length > 0) {
  console.error("[validate:system-map] Missing referenced path(s):");
  for (const relativePath of missingPaths) {
    console.error(`- ${relativePath}`);
  }
  process.exit(1);
}

console.log(
  `[validate:system-map] Verified ${referencedPaths.length} referenced path(s) in docs/SYSTEM_MAP.md.`,
);
