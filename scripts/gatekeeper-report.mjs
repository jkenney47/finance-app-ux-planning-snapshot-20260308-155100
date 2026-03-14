#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const artifactsDir = path.join(workspaceRoot, "artifacts", "gatekeeper");
const timestamp = new Date().toISOString().replace(/[:]/g, "-");
const reportPath = path.join(artifactsDir, `gatekeeper-report-${timestamp}.md`);
const latestReportPath = path.join(artifactsDir, "latest-report.md");
const reportJsonPath = path.join(
  artifactsDir,
  `gatekeeper-report-${timestamp}.json`,
);
const statePath = path.join(artifactsDir, "state.json");
const windowHours = Number.parseInt(
  process.env.GATEKEEPER_WINDOW_HOURS ?? "24",
  10,
);
const maxCandidates = Number.parseInt(
  process.env.GATEKEEPER_MAX_CANDIDATES ?? "6",
  10,
);
const cutoffOverlapSeconds = Number.parseInt(
  process.env.GATEKEEPER_CUTOFF_OVERLAP_SECONDS ?? "300",
  10,
);
const gatekeeperRunEnv = {
  ...process.env,
  HUSKY: process.env.HUSKY ?? "0",
};
const autoResetTrackedPaths = new Set([
  ".agents/memory/rules.md",
  ".agents/memory/active_context.md",
  ".agents/memory/events.ndjson",
  ".agents/memory/index.json",
]);

function formatCommand(command) {
  return Array.isArray(command) ? command.join(" ") : command;
}

function run(command, options = {}) {
  const {
    allowFailure = false,
    cwd = workspaceRoot,
    timeoutMs = 15 * 60 * 1000,
    env = gatekeeperRunEnv,
  } = options;

  try {
    /** @type {import("node:child_process").ExecFileSyncOptionsWithStringEncoding} */
    const fileExecutionOptions = {
      cwd,
      env,
      stdio: "pipe",
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 64,
    };
    /** @type {import("node:child_process").ExecSyncOptionsWithStringEncoding} */
    const shellExecutionOptions = {
      cwd,
      env,
      stdio: "pipe",
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 64,
    };
    const output = Array.isArray(command)
      ? execFileSync(command[0], command.slice(1), fileExecutionOptions)
      : execSync(command, shellExecutionOptions);
    return { ok: true, output: output.trim() };
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout).trim() : "";
    const stderr = error?.stderr ? String(error.stderr).trim() : "";
    const output = [stdout, stderr].filter(Boolean).join("\n");
    if (allowFailure) {
      return { ok: false, output };
    }
    throw new Error(`Command failed: ${formatCommand(command)}\n${output}`);
  }
}

function runGit(args, options = {}) {
  return run(["git", ...args], {
    ...options,
    env: {
      ...process.env,
      ...(options.env ?? {}),
      HUSKY: "0",
    },
  });
}

function splitLines(output) {
  return output
    ? output
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
}

function listDirtyTrackedPaths() {
  const unstaged = runGit(["diff", "--name-only"], {
    allowFailure: true,
  });
  const staged = runGit(["diff", "--cached", "--name-only"], {
    allowFailure: true,
  });
  return Array.from(
    new Set([...splitLines(unstaged.output), ...splitLines(staged.output)]),
  );
}

function ensureCleanCheckoutState(targetRef) {
  const dirtyPaths = listDirtyTrackedPaths();
  if (dirtyPaths.length === 0) {
    return;
  }

  const autoResetPaths = dirtyPaths.filter((filePath) =>
    autoResetTrackedPaths.has(filePath),
  );
  const blockingPaths = dirtyPaths.filter(
    (filePath) => !autoResetTrackedPaths.has(filePath),
  );

  if (autoResetPaths.length > 0) {
    runGit(["restore", "--staged", "--worktree", "--", ...autoResetPaths]);
  }

  if (blockingPaths.length > 0) {
    throw new Error(
      [
        `Refusing to checkout ${targetRef} with tracked local changes:`,
        ...blockingPaths.map((filePath) => `- ${filePath}`),
      ].join("\n"),
    );
  }

  const remainingDirtyPaths = listDirtyTrackedPaths();
  if (remainingDirtyPaths.length > 0) {
    throw new Error(
      [
        `Failed to clean tracked generated files before checkout ${targetRef}:`,
        ...remainingDirtyPaths.map((filePath) => `- ${filePath}`),
      ].join("\n"),
    );
  }
}

function checkoutDetached(ref) {
  ensureCleanCheckoutState(ref);
  runGit(["checkout", "--detach", ref]);
}

function checkoutBranch(ref) {
  ensureCleanCheckoutState(ref);
  runGit(["checkout", ref]);
}

function getInitialCheckoutContext() {
  const branchResult = runGit(["symbolic-ref", "--quiet", "--short", "HEAD"], {
    allowFailure: true,
  });
  const headSha = runGit(["rev-parse", "--verify", "HEAD"]).output;

  return {
    branchName: branchResult.ok ? branchResult.output : null,
    headSha,
  };
}

function restoreInitialCheckoutContext(context) {
  if (context.branchName) {
    checkoutBranch(context.branchName);
    return;
  }

  checkoutDetached(context.headSha);
}

function toEpochSeconds(isoDate) {
  return Math.floor(new Date(isoDate).getTime() / 1000);
}

function readLastRunIso() {
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return typeof state.lastRunIso === "string" ? state.lastRunIso : null;
  } catch {
    return null;
  }
}

function persistRunState(context) {
  const {
    nowIso,
    cutoffIso,
    cutoffSource,
    candidateCount,
    nextLastRunIso,
    deferredCandidateCount,
  } = context;
  fs.writeFileSync(
    statePath,
    JSON.stringify(
      {
        lastRunIso: nextLastRunIso ?? nowIso,
        lastCompletedRunIso: nowIso,
        lastCutoffIso: cutoffIso,
        cutoffSource,
        candidateCount,
        deferredCandidateCount,
        windowHours,
        updatedAt: nowIso,
      },
      null,
      2,
    ),
    "utf8",
  );
}

function parseBranchRef(line) {
  const [
    name,
    sha,
    isoDate,
    authorName,
    authorEmail,
    committerName,
    committerEmail,
    subject,
  ] = line.split("|");
  return {
    name,
    sha,
    isoDate,
    authorName,
    authorEmail,
    committerName,
    committerEmail,
    subject: subject ?? "",
    epoch: toEpochSeconds(isoDate),
  };
}

function escapePipe(value) {
  return String(value ?? "").replace(/\|/g, "\\|");
}

function includesJules(ref) {
  return /jules/i.test(
    `${ref.authorName} ${ref.authorEmail} ${ref.committerName} ${ref.committerEmail} ${ref.subject}`,
  );
}

function isAgentLikeBranch(refName) {
  return /origin\/(fix|chore|agent|codex|refactor|testing)[/-]/i.test(refName);
}

function classifyRisk(input) {
  const {
    hasDiff,
    validationFailures,
    highRiskTouched,
    hasSecuritySensitivePaths,
    hasTestsTouched,
  } = input;

  if (!hasDiff) {
    return { rating: "MED", reason: "Branch has no effective diff vs main." };
  }
  if (validationFailures.length > 0) {
    return {
      rating: "HIGH",
      reason: "One or more pre-merge validation checks failed.",
    };
  }
  if (hasSecuritySensitivePaths && !hasTestsTouched) {
    return {
      rating: "HIGH",
      reason:
        "Security-sensitive files changed without direct test coverage updates.",
    };
  }
  if (highRiskTouched) {
    return {
      rating: "MED",
      reason: "High-risk paths changed; validation passed.",
    };
  }
  return { rating: "LOW", reason: "Diff is scoped and validation passed." };
}

function listBranchRefs() {
  const refsRaw = runGit([
    "for-each-ref",
    "--sort=-committerdate",
    "--format=%(refname:short)|%(objectname:short)|%(committerdate:iso-strict)|%(authorname)|%(authoremail)|%(committername)|%(committeremail)|%(subject)",
    "refs/remotes/origin",
  ]).output;

  const refs = refsRaw
    .split("\n")
    .filter(Boolean)
    .map(parseBranchRef)
    .filter((ref) => !/^origin(\/(HEAD|main|master))?$/.test(ref.name));

  return refs;
}

function gatherCandidateBranches(refs, cutoffEpoch) {
  const eligible = refs
    .filter((ref) => ref.epoch >= cutoffEpoch)
    .filter((ref) => includesJules(ref) || isAgentLikeBranch(ref.name));

  const candidates = eligible.slice(0, maxCandidates);
  const deferred = eligible.slice(maxCandidates);
  const nextLastRunEpoch =
    deferred.length > 0
      ? Math.max(0, deferred[0].epoch - cutoffOverlapSeconds)
      : null;

  return {
    candidates,
    deferredCount: deferred.length,
    nextLastRunEpoch,
  };
}

function getChangedFiles(branchName) {
  const output = runGit(
    ["diff", "--name-only", `origin/main...${branchName}`],
    {
      allowFailure: true,
    },
  );
  if (!output.ok || !output.output) {
    return [];
  }
  return output.output.split("\n").filter(Boolean);
}

function runValidationsForBranch(branchName) {
  const commands = [
    "npm run typecheck",
    "npm run lint",
    "npm run format:check",
    "npm test -- --runInBand",
  ];
  const results = [];

  checkoutDetached(branchName);

  const npmCiResult = run("npm ci", {
    allowFailure: true,
    timeoutMs: 20 * 60 * 1000,
  });
  results.push({
    command: "npm ci",
    ok: npmCiResult.ok,
    output: npmCiResult.output,
  });

  if (!npmCiResult.ok) {
    return results;
  }

  for (const command of commands) {
    const commandResult = run(command, {
      allowFailure: true,
      timeoutMs: command.includes("npm test") ? 20 * 60 * 1000 : 15 * 60 * 1000,
    });
    results.push({
      command,
      ok: commandResult.ok,
      output: commandResult.output,
    });
    if (!commandResult.ok) {
      break;
    }
  }

  return results;
}

function recommendMerge(risk, hasDiff) {
  if (!hasDiff) {
    return "NEEDS CHANGES";
  }
  if (risk === "HIGH") {
    return "DO NOT MERGE";
  }
  if (risk === "MED") {
    return "NEEDS CHANGES";
  }
  return "MERGE";
}

function appendValidationBlock(reportLines, validationResults) {
  for (const result of validationResults) {
    reportLines.push(
      `  - \`${result.command}\`: ${result.ok ? "pass" : "fail"}`,
    );
    if (!result.ok && result.output) {
      const excerpt = result.output.split("\n").slice(0, 12).join("\n").trim();
      if (excerpt) {
        reportLines.push("");
        reportLines.push("```text");
        reportLines.push(excerpt);
        reportLines.push("```");
      }
    }
  }
}

function buildReport(context) {
  const {
    candidates,
    analyses,
    cutoffIso,
    nowIso,
    highRiskFindings,
    cutoffSource,
    deferredCandidateCount,
    nextLastRunIso,
  } = context;
  const lines = [];

  lines.push("# Pre-Merge Gatekeeper Report");
  lines.push("");

  if (highRiskFindings.length > 0) {
    lines.push("## Blocker");
    for (const finding of highRiskFindings.slice(0, 3)) {
      lines.push(`- ${finding}`);
    }
    lines.push("");
  }

  lines.push("## Run Context");
  lines.push(`- Run time (UTC): \`${nowIso}\``);
  lines.push(`- Review window: last ${windowHours}h (cutoff \`${cutoffIso}\`)`);
  lines.push(
    `- Cutoff source: ${
      cutoffSource === "last_run"
        ? "last successful run state"
        : `${windowHours}h fallback window`
    }`,
  );
  lines.push(`- Candidate branches reviewed: ${candidates.length}`);
  if (deferredCandidateCount > 0) {
    lines.push(
      `- Deferred candidates: ${deferredCandidateCount} (cursor pinned to \`${nextLastRunIso}\` to avoid skipping unreviewed branches)`,
    );
  }
  lines.push("");

  if (candidates.length === 0) {
    lines.push(
      "No newly updated Jules-like branches were detected in the review window.",
    );
    lines.push("");
    return lines.join("\n");
  }

  lines.push("## Candidate Branches");
  lines.push("| Branch | Last Commit SHA | Commit Time (UTC) | Author |");
  lines.push("|---|---|---|---|");
  for (const ref of candidates) {
    lines.push(
      `| \`${escapePipe(ref.name)}\` | \`${escapePipe(ref.sha)}\` | \`${escapePipe(ref.isoDate)}\` | \`${escapePipe(ref.authorName)} <${escapePipe(ref.authorEmail)}>\` |`,
    );
  }
  lines.push("");

  for (const analysis of analyses) {
    lines.push(`## Branch: \`${analysis.branch}\``);
    lines.push(`- Summary: ${analysis.summary}`);
    lines.push(
      `- Risk rating: **${analysis.risk.rating}** (${analysis.risk.reason})`,
    );
    lines.push("- Validation results:");
    appendValidationBlock(lines, analysis.validationResults);
    lines.push("- Top issues:");
    for (const issue of analysis.topIssues) {
      lines.push(`  - ${issue}`);
    }
    lines.push("- Suggested patch list:");
    for (const patch of analysis.suggestedPatches) {
      lines.push(`  - ${patch}`);
    }
    lines.push(`- Merge recommendation: **${analysis.mergeRecommendation}**`);
    lines.push("- Follow-up tasks:");
    for (const task of analysis.followUpTasks) {
      lines.push(`  - ${task}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function analyzeBranch(ref) {
  const diffStatOutput = runGit(
    ["diff", "--stat", `origin/main...${ref.name}`],
    {
      allowFailure: true,
    },
  );
  const fullDiffOutput = runGit(["diff", `origin/main...${ref.name}`], {
    allowFailure: true,
    timeoutMs: 10 * 60 * 1000,
  });
  const changedFiles = getChangedFiles(ref.name);
  const hasDiff = changedFiles.length > 0;

  const highRiskTouched = changedFiles.some((file) =>
    /(supabase\/functions|utils\/validation|utils\/services|auth|security|payment|revenuecat|edge)/i.test(
      file,
    ),
  );
  const hasSecuritySensitivePaths = changedFiles.some((file) =>
    /(supabase\/functions|auth|security|cors|signature|policy)/i.test(file),
  );
  const hasTestsTouched = changedFiles.some((file) =>
    file.startsWith("__tests__/"),
  );

  let validationResults = [];
  if (hasDiff) {
    validationResults = runValidationsForBranch(ref.name);
  } else {
    validationResults = [
      {
        command: "git diff --stat origin/main...<branch>",
        ok: true,
        output: "No diff relative to main.",
      },
    ];
  }

  const validationFailures = validationResults.filter((result) => !result.ok);
  const risk = classifyRisk({
    hasDiff,
    validationFailures,
    highRiskTouched,
    hasSecuritySensitivePaths,
    hasTestsTouched,
  });
  const mergeRecommendation = recommendMerge(risk.rating, hasDiff);

  const topIssues = [];
  if (!hasDiff) {
    topIssues.push("Must-fix: no effective code delta against `origin/main`.");
  }
  if (validationFailures.length > 0) {
    topIssues.push(
      `Must-fix: failing checks (${validationFailures.map((item) => item.command).join(", ")}).`,
    );
  }
  if (hasSecuritySensitivePaths && !hasTestsTouched) {
    topIssues.push(
      "Must-fix: security-sensitive changes without corresponding tests.",
    );
  }
  if (topIssues.length === 0) {
    topIssues.push(
      "No material blocking issue detected from automated checks.",
    );
  }

  const suggestedPatches = [];
  if (!hasDiff) {
    suggestedPatches.push(
      "Push the intended branch changes; current branch is functionally identical to main.",
    );
  }
  if (validationFailures.length > 0) {
    suggestedPatches.push(
      "Fix failing validation checks and rerun the same command set.",
    );
  }
  if (hasSecuritySensitivePaths && !hasTestsTouched) {
    suggestedPatches.push(
      "Add focused tests for changed security/auth/cors code paths.",
    );
  }
  if (suggestedPatches.length === 0) {
    suggestedPatches.push("No patch required from automated gate checks.");
  }

  const followUpTasks = [];
  if (mergeRecommendation === "MERGE") {
    followUpTasks.push("Optional: request human review before merge.");
  } else {
    followUpTasks.push("Apply suggested patches to the branch.");
    followUpTasks.push(
      "Run `npm run typecheck && npm run lint && npm test -- --runInBand`.",
    );
    followUpTasks.push("Push updates and rerun gatekeeper.");
  }

  const summary = hasDiff
    ? `Diff detected with ${changedFiles.length} changed file(s).`
    : "No diff relative to `origin/main`.";

  return {
    branch: ref.name,
    summary,
    risk,
    mergeRecommendation,
    topIssues,
    suggestedPatches,
    followUpTasks,
    changedFiles,
    diffStat: diffStatOutput.output,
    fullDiffComputed: fullDiffOutput.ok,
    validationResults,
  };
}

function main() {
  const initialCheckoutContext = getInitialCheckoutContext();
  let executionError = null;
  let restoreError = null;

  try {
    fs.mkdirSync(artifactsDir, { recursive: true });

    runGit(["fetch", "origin", "--prune"]);
    checkoutDetached("origin/main");

    const now = new Date();
    const nowEpoch = Math.floor(now.getTime() / 1000);
    const fallbackCutoffEpoch = nowEpoch - windowHours * 3600;
    const lastRunIso = readLastRunIso();
    const hasLastRun = Boolean(lastRunIso);
    const lastRunEpoch = hasLastRun
      ? toEpochSeconds(lastRunIso)
      : fallbackCutoffEpoch;
    const baseCutoffEpoch = hasLastRun ? lastRunEpoch : fallbackCutoffEpoch;
    const cutoffSource = hasLastRun ? "last_run" : "window";
    const cutoffEpoch = Math.max(0, baseCutoffEpoch - cutoffOverlapSeconds);
    const cutoffIso = new Date(cutoffEpoch * 1000).toISOString();
    const nowIso = now.toISOString();

    const refs = listBranchRefs();
    const { candidates, deferredCount, nextLastRunEpoch } =
      gatherCandidateBranches(refs, cutoffEpoch);
    const nextLastRunIso = nextLastRunEpoch
      ? new Date(nextLastRunEpoch * 1000).toISOString()
      : nowIso;
    const analyses = candidates.map(analyzeBranch);

    checkoutDetached("origin/main");

    const highRiskFindings = analyses
      .filter((analysis) => analysis.risk.rating === "HIGH")
      .map(
        (analysis) =>
          `${analysis.branch}: ${analysis.topIssues.find((issue) => issue.startsWith("Must-fix")) ?? analysis.risk.reason}`,
      );

    const report = buildReport({
      candidates,
      analyses,
      cutoffIso,
      nowIso,
      highRiskFindings,
      cutoffSource,
      deferredCandidateCount: deferredCount,
      nextLastRunIso,
    });

    fs.writeFileSync(reportPath, `${report}\n`, "utf8");
    fs.writeFileSync(latestReportPath, `${report}\n`, "utf8");
    fs.writeFileSync(
      reportJsonPath,
      JSON.stringify(
        {
          generatedAt: nowIso,
          windowHours,
          cutoffIso,
          cutoffSource,
          nextLastRunIso,
          deferredCandidateCount: deferredCount,
          candidates,
          analyses,
        },
        null,
        2,
      ),
      "utf8",
    );

    console.log(`Gatekeeper report written: ${reportPath}`);
    console.log(`Gatekeeper report latest: ${latestReportPath}`);
    persistRunState({
      nowIso,
      cutoffIso,
      cutoffSource,
      candidateCount: candidates.length,
      deferredCandidateCount: deferredCount,
      nextLastRunIso,
    });

    const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (stepSummaryPath) {
      fs.appendFileSync(
        stepSummaryPath,
        [
          "## Gatekeeper Report",
          "",
          `- Generated: \`${nowIso}\``,
          `- Window: last ${windowHours}h`,
          `- Candidates: ${candidates.length}`,
          `- Report file: \`${path.relative(workspaceRoot, reportPath)}\``,
          "",
          report,
          "",
        ].join("\n"),
        "utf8",
      );
    }
  } catch (error) {
    executionError = error instanceof Error ? error : new Error(String(error));
  } finally {
    try {
      restoreInitialCheckoutContext(initialCheckoutContext);
    } catch (error) {
      restoreError = error instanceof Error ? error : new Error(String(error));
    }
  }

  if (executionError && restoreError) {
    throw new Error(
      `${executionError.message}\n\nAdditionally failed to restore checkout state:\n${restoreError.message}`,
      {
        cause: executionError,
      },
    );
  }

  if (restoreError) {
    throw restoreError;
  }

  if (executionError) {
    throw executionError;
  }
}

main();
