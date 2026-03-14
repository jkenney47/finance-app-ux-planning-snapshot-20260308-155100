#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const allowPatterns = new Set([
  "SUPABASE_ACCESS_TOKEN=...",
  "SUPABASE_ACCESS_TOKEN=YOUR_SUPABASE_ACCESS_TOKEN",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY",
]);

const secretPatterns = [
  { label: "Supabase PAT", regex: /\bsbp_[A-Za-z0-9]{20,}\b/g },
  { label: "GitHub classic token", regex: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { label: "GitHub OAuth token", regex: /\bgho_[A-Za-z0-9]{20,}\b/g },
  {
    label: "GitHub fine-grained token",
    regex: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  },
  { label: "OpenAI-style key", regex: /\bsk-[A-Za-z0-9]{20,}\b/g },
];

function listTrackedFiles() {
  const output = execFileSync(
    "git",
    [
      "ls-files",
      "README.md",
      "AI_RULES.md",
      "CODEX.md",
      "DEVELOPMENT.md",
      "START_HERE.md",
      ".github",
      ".codex",
      ".agents/memory/rules.md",
      ".agents/plan/current-plan.txt",
      "app",
      "components",
      "docs",
      "hooks",
      "stores",
      "supabase/migrations",
      "supabase/functions",
      "scripts",
      "theme",
      "utils",
      "package.json",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );

  return output
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry) => fs.existsSync(path.join(repoRoot, entry)));
}

function findMatches(filePath) {
  const absolutePath = path.join(repoRoot, filePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const findings = [];

  for (const { label, regex } of secretPatterns) {
    const matches = content.matchAll(regex);
    for (const match of matches) {
      const value = match[0];
      if (allowPatterns.has(value)) {
        continue;
      }

      const before = content.slice(0, match.index ?? 0);
      const line = before.split("\n").length;
      findings.push({
        filePath,
        label,
        line,
        value,
      });
    }
  }

  return findings;
}

const trackedFiles = listTrackedFiles();
const findings = trackedFiles.flatMap(findMatches);

if (findings.length > 0) {
  console.error("[scan:tracked-secrets] Found tracked secret-like literals:");
  for (const finding of findings) {
    console.error(
      `- ${finding.filePath}:${finding.line} ${finding.label}: ${finding.value}`,
    );
  }
  process.exit(1);
}

console.log(
  `[scan:tracked-secrets] No tracked secret-like literals found in ${trackedFiles.length} file(s).`,
);
