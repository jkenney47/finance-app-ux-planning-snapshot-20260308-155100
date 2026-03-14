#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const fetchRemotes = args.has("--fetch");
const now = new Date();
const timestamp = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
const artifactDir = path.join(
  repoRoot,
  "artifacts",
  "branch-retention",
  timestamp,
);

const PROTECTED_BRANCHES = new Set(["main", "develop"]);
const HUMAN_FRESH_DAYS = 14;
const AUTOMATION_RETENTION_DAYS = 7;
const BACKUP_RETENTION_DAYS = 3;

function run(command, commandArgs, options = {}) {
  return execFileSync(command, commandArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function matchesPrefix(branchName, prefix) {
  if (prefix.endsWith("/")) {
    return branchName.startsWith(prefix);
  }
  return (
    branchName === prefix ||
    branchName.startsWith(`${prefix}/`) ||
    branchName.startsWith(`${prefix}-`)
  );
}

function classifyAutomation(branchName) {
  const backupPrefixes = ["stash-backup-", "worktree-backup-"];
  const automationPrefixes = ["codex/", "sentinel/", "bolt", "jules-", "add-"];

  if (backupPrefixes.some((prefix) => matchesPrefix(branchName, prefix))) {
    return {
      kind: "backup",
      retentionDays: BACKUP_RETENTION_DAYS,
    };
  }

  if (automationPrefixes.some((prefix) => matchesPrefix(branchName, prefix))) {
    return {
      kind: "automation",
      retentionDays: AUTOMATION_RETENTION_DAYS,
    };
  }

  return null;
}

function getOpenPrBranches() {
  try {
    const output = run("gh", [
      "pr",
      "list",
      "--state",
      "open",
      "--json",
      "headRefName",
      "--limit",
      "500",
    ]);
    const payload = output ? JSON.parse(output) : [];
    return new Set(payload.map((item) => item.headRefName).filter(Boolean));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

if (fetchRemotes) {
  run("git", ["fetch", "--all", "--prune"], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

const refsOutput = run("git", [
  "for-each-ref",
  "--format=%(refname:short)|%(committerdate:unix)|%(committerdate:iso8601-strict)|%(authorname)",
  "refs/remotes/origin",
]);

const openPrResult = getOpenPrBranches();
const openPrBranches = openPrResult instanceof Set ? openPrResult : null;
const openPrError = openPrResult instanceof Set ? null : openPrResult.error;

const branches = refsOutput
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [remoteRef, unixTimestamp, isoTimestamp, authorName] =
      line.split("|");
    return {
      remoteRef,
      branchName: remoteRef.replace(/^origin\//, ""),
      authorName,
      committedAt: isoTimestamp,
      committedAtUnix: Number(unixTimestamp),
    };
  })
  .filter((branch) => branch.branchName !== "HEAD");

const classifiedBranches = branches
  .map((branch) => {
    const ageDays = Math.max(
      0,
      Math.floor((now.getTime() - branch.committedAtUnix * 1000) / 86_400_000),
    );
    const automation = classifyAutomation(branch.branchName);
    const hasOpenPr = openPrBranches?.has(branch.branchName) ?? false;

    let decision = "keep";
    let reason = "non-automation branch requires manual judgment";

    if (PROTECTED_BRANCHES.has(branch.branchName)) {
      reason = "protected branch";
    } else if (hasOpenPr) {
      reason = "open pull request";
    } else if (automation && ageDays > automation.retentionDays) {
      decision = "cleanup";
      reason =
        automation.kind === "backup"
          ? `backup branch older than ${BACKUP_RETENTION_DAYS} day(s)`
          : `automation branch older than ${AUTOMATION_RETENTION_DAYS} day(s)`;
    } else if (automation) {
      reason = `${automation.kind} branch still inside retention window`;
    } else if (ageDays <= HUMAN_FRESH_DAYS) {
      reason = `human branch updated within ${HUMAN_FRESH_DAYS} day(s)`;
    } else {
      decision = "review";
      reason = "stale non-automation branch; review manually before deleting";
    }

    return {
      ...branch,
      ageDays,
      decision,
      hasOpenPr,
      automationKind: automation?.kind ?? null,
      reason,
    };
  })
  .sort((left, right) => right.ageDays - left.ageDays);

const cleanupCandidates = classifiedBranches.filter(
  (branch) => branch.decision === "cleanup",
);
const reviewBranches = classifiedBranches.filter(
  (branch) => branch.decision === "review",
);

if (apply && !openPrBranches) {
  console.error(
    `[branch-retention] Refusing to apply deletions because open PR detection failed: ${openPrError ?? "unknown error"}`,
  );
  process.exit(1);
}

const deletedBranches = [];
const failedDeletes = [];

if (apply) {
  for (const branch of cleanupCandidates) {
    try {
      run("git", ["push", "origin", "--delete", branch.branchName], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      deletedBranches.push(branch.branchName);
    } catch (error) {
      failedDeletes.push({
        branch: branch.branchName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

fs.mkdirSync(artifactDir, { recursive: true });

const summary = {
  generatedAt: now.toISOString(),
  fetchedRemotes: fetchRemotes,
  apply,
  totalRemoteBranches: branches.length,
  protectedBranches: [...PROTECTED_BRANCHES],
  openPrDetection:
    openPrBranches !== null
      ? { status: "ok", openPrCount: openPrBranches.size }
      : { status: "unavailable", error: openPrError ?? "unknown error" },
  thresholds: {
    humanFreshDays: HUMAN_FRESH_DAYS,
    automationRetentionDays: AUTOMATION_RETENTION_DAYS,
    backupRetentionDays: BACKUP_RETENTION_DAYS,
  },
  cleanupCandidates,
  reviewBranches,
  deletedBranches,
  failedDeletes,
};

const reportLines = [
  "# Branch Retention Report",
  "",
  `Generated: ${summary.generatedAt}`,
  `Mode: ${apply ? "apply" : "report-only"}`,
  `Remote branches inspected: ${branches.length}`,
  `Open PR detection: ${
    openPrBranches !== null
      ? `${openPrBranches.size} open PR head branch(es)`
      : `unavailable (${openPrError ?? "unknown error"})`
  }`,
  "",
  "## Policy",
  "",
  `- Protected branches kept: ${[...PROTECTED_BRANCHES].join(", ")}`,
  `- Human-owned branches kept automatically when updated within ${HUMAN_FRESH_DAYS} day(s)`,
  `- Automation branches become cleanup candidates after ${AUTOMATION_RETENTION_DAYS} day(s)`,
  `- Backup branches become cleanup candidates after ${BACKUP_RETENTION_DAYS} day(s)`,
  "",
  "## Cleanup Candidates",
  "",
];

if (cleanupCandidates.length === 0) {
  reportLines.push("- None");
} else {
  for (const branch of cleanupCandidates) {
    reportLines.push(
      `- ${branch.branchName} (${branch.ageDays}d, ${branch.reason}, author: ${branch.authorName})`,
    );
  }
}

reportLines.push("", "## Manual Review Queue", "");

if (reviewBranches.length === 0) {
  reportLines.push("- None");
} else {
  for (const branch of reviewBranches) {
    reportLines.push(
      `- ${branch.branchName} (${branch.ageDays}d, ${branch.reason}, author: ${branch.authorName})`,
    );
  }
}

if (apply) {
  reportLines.push("", "## Apply Result", "");
  reportLines.push(
    deletedBranches.length > 0
      ? `- Deleted: ${deletedBranches.join(", ")}`
      : "- Deleted: none",
  );
  reportLines.push(
    failedDeletes.length > 0
      ? `- Failed: ${failedDeletes.map((item) => `${item.branch}`).join(", ")}`
      : "- Failed: none",
  );
}

const summaryPath = path.join(artifactDir, "summary.json");
const reportPath = path.join(artifactDir, "report.md");

fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
fs.writeFileSync(reportPath, `${reportLines.join("\n")}\n`);

console.log(
  `[branch-retention] Report: ${path.relative(repoRoot, reportPath)}`,
);
console.log(
  `[branch-retention] Summary: ${path.relative(repoRoot, summaryPath)}`,
);

if (cleanupCandidates.length > 0) {
  console.log(
    `[branch-retention] Cleanup candidates: ${cleanupCandidates.length} (manual apply: npm run branch:retention:apply)`,
  );
} else {
  console.log("[branch-retention] No cleanup candidates.");
}

if (failedDeletes.length > 0) {
  process.exit(1);
}
