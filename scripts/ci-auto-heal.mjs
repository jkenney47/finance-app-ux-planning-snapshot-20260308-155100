#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { enforceJulesDailySessionBudget } from "./lib/jules-session-budget.mjs";

const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const eventPath = process.env.GITHUB_EVENT_PATH ?? "";
const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY ?? "";

const julesApiBaseUrl = (
  process.env.JULES_API_BASE_URL ?? "https://jules.googleapis.com/v1alpha"
).replace(/\/+$/, "");
const julesApiToken = process.env.JULES_API_TOKEN ?? "";
const julesSourceOverride = process.env.JULES_SOURCE ?? "";
const [defaultOwner = "", defaultRepo = ""] = repository.split("/");
const julesSourceOwner = process.env.JULES_GITHUB_OWNER || defaultOwner;
const julesSourceRepo = process.env.JULES_GITHUB_REPO || defaultRepo;
const manualRunId = Number.parseInt(process.env.CI_AUTO_HEAL_RUN_ID ?? "", 10);

function parseBoolean(value, fallback = false) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

const maxFlakeRerunAttempt = Number.parseInt(
  process.env.CI_AUTO_HEAL_MAX_FLAKE_RERUN_ATTEMPT ?? "1",
  10,
);
const maxRunAttempt = Number.parseInt(
  process.env.CI_AUTO_HEAL_MAX_RUN_ATTEMPT ?? "5",
  10,
);
const enableDeterministicFixes = parseBoolean(
  process.env.CI_AUTO_HEAL_ENABLE_DETERMINISTIC_FIXES ?? "0",
  false,
);
const enableFailedJobRerun = parseBoolean(
  process.env.CI_AUTO_HEAL_ENABLE_FAILED_JOB_RERUN ?? "0",
  false,
);
const enableJulesRemediation = parseBoolean(
  process.env.CI_AUTO_HEAL_ENABLE_JULES ?? "0",
  false,
);
const enablePrComments = parseBoolean(
  process.env.CI_AUTO_HEAL_ENABLE_PR_COMMENTS ?? "0",
  false,
);
const julesDailySessionLimit = Number.parseInt(
  process.env.JULES_DAILY_SESSION_LIMIT ?? "100",
  10,
);
const julesDailySessionLookbackHours = Number.parseInt(
  process.env.JULES_DAILY_SESSION_LOOKBACK_HOURS ?? "24",
  10,
);

const githubApiBaseUrl = "https://api.github.com";
const autoHealCommitPrefix = "chore(ci): auto-heal";
const autoHealMarker = "[CI_AUTO_HEAL]";

const checkDefinitions = [
  {
    id: "canonical-validation",
    label: "Canonical Validation",
    failureSignals: ["Run canonical validation gate"],
    reviewCommand: ["npm", "run", "validate"],
  },
  {
    id: "eslint",
    label: "ESLint",
    failureSignals: ["ESLint", "Run ESLint"],
    deterministicFixCommand: ["npm", "run", "lint:fix"],
    reviewCommand: ["npm", "run", "lint", "--", "--max-warnings=0"],
  },
  {
    id: "prettier",
    label: "Prettier",
    failureSignals: ["Prettier", "Run Prettier", "Run Prettier check"],
    deterministicFixCommand: ["npm", "run", "format"],
    reviewCommand: ["npm", "run", "format:check"],
  },
  {
    id: "typescript",
    label: "TypeScript",
    failureSignals: ["TypeScript", "Run TypeScript", "Run TypeScript check"],
    reviewCommand: ["npm", "run", "typecheck"],
  },
  {
    id: "tests-coverage-gate",
    label: "Tests (Coverage Gate)",
    failureSignals: [
      "Tests (Coverage Gate)",
      "Run Tests (Coverage Gate)",
      "Run tests with coverage thresholds",
    ],
    reviewCommand: ["npm", "run", "test:coverage"],
  },
  {
    id: "dependency-graph-cycles",
    label: "Dependency Graph (Cycles)",
    failureSignals: [
      "Dependency Graph (Cycles)",
      "Run Dependency Graph",
      "Check for circular dependencies",
    ],
    reviewCommand: ["npm", "run", "depgraph:check"],
  },
  {
    id: "instruction-drift",
    label: "Instruction Drift",
    failureSignals: [
      "Instruction Drift",
      "Run Instruction Drift",
      "Run instruction drift check",
    ],
    reviewCommand: ["npm", "run", "check:instruction-drift"],
  },
];

const ignoredFailureSignals = new Set(["Quality"]);
const checkDefinitionByFailureSignal = new Map(
  checkDefinitions.flatMap((check) =>
    check.failureSignals.map((signal) => [signal, check]),
  ),
);

function appendSummary(line = "") {
  if (!stepSummaryPath) {
    return;
  }
  fs.appendFileSync(stepSummaryPath, `${line}\n`, "utf8");
}

function log(message) {
  console.log(`[ci-auto-heal] ${message}`);
  appendSummary(`- ${message}`);
}

function warn(message) {
  console.warn(`[ci-auto-heal] ${message}`);
  appendSummary(`- WARN: ${message}`);
}

function fail(message) {
  console.error(`[ci-auto-heal] ${message}`);
  appendSummary(`- ERROR: ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}`,
    );
  }
}

function runWithStatus(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  return {
    status: result.status ?? 1,
    ok: result.status === 0,
  };
}

function getCurrentHeadSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    return "";
  }
  return result.stdout.trim();
}

function hasGitChanges() {
  const result = spawnSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error("Unable to inspect git status.");
  }
  return result.stdout.trim().length > 0;
}

function readEventPayload() {
  if (!eventPath || !fs.existsSync(eventPath)) {
    fail("Missing GITHUB_EVENT_PATH payload.");
  }
  const raw = fs.readFileSync(eventPath, "utf8");
  return JSON.parse(raw);
}

function isFailureConclusion(conclusion) {
  return ["failure", "timed_out", "cancelled", "action_required"].includes(
    String(conclusion),
  );
}

function unique(items) {
  return Array.from(new Set(items));
}

function formatCommand(command, args) {
  return `${command} ${args.join(" ")}`.trim();
}

function safeParseJson(text) {
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function githubRequest(method, pathname, body) {
  if (!githubToken) {
    fail("Missing GITHUB_TOKEN for GitHub API calls.");
  }

  const url = `${githubApiBaseUrl}/${pathname.replace(/^\/+/, "")}`;
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "finance-app-ci-auto-heal",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = safeParseJson(text);
  if (!response.ok) {
    throw new Error(
      `GitHub API ${method} ${pathname} failed (${response.status} ${response.statusText}): ${text.slice(0, 500)}`,
    );
  }
  return payload;
}

async function resolveWorkflowRun(payload) {
  if (payload?.workflow_run) {
    return payload.workflow_run;
  }

  if (Number.isInteger(manualRunId) && manualRunId > 0) {
    return githubRequest(
      "GET",
      `repos/${repository}/actions/runs/${manualRunId}`,
    );
  }

  fail(
    "workflow_run payload missing. Provide CI_AUTO_HEAL_RUN_ID when running manually.",
  );
}

async function rerunFailedJobs(runId, reason) {
  await githubRequest(
    "POST",
    `repos/${repository}/actions/runs/${runId}/rerun-failed-jobs`,
  );
  log(`Triggered rerun of failed jobs for run #${runId} (${reason}).`);
}

async function listIssueComments(prNumber) {
  return githubRequest(
    "GET",
    `repos/${repository}/issues/${prNumber}/comments?per_page=100`,
  );
}

async function addIssueComment(prNumber, body) {
  return githubRequest(
    "POST",
    `repos/${repository}/issues/${prNumber}/comments`,
    {
      body,
    },
  );
}

function parseFailedJobs(jobs = []) {
  return jobs
    .filter((job) => isFailureConclusion(job?.conclusion))
    .map((job) => {
      const failedStepNames = (job?.steps ?? [])
        .filter((step) => isFailureConclusion(step?.conclusion))
        .map((step) => step?.name)
        .filter((name) => typeof name === "string" && name.length > 0);
      return {
        id: job?.id ?? null,
        name: typeof job?.name === "string" ? job.name : "Unnamed Job",
        htmlUrl: job?.html_url ?? "",
        failedStepNames,
      };
    });
}

function resolveFailedChecks(failedJobs) {
  const checksById = new Map();
  const unmappedSignals = [];

  for (const job of failedJobs) {
    const signals = [job?.name, ...(job?.failedStepNames ?? [])].filter(
      (signal) => typeof signal === "string" && signal.length > 0,
    );
    for (const signal of signals) {
      if (ignoredFailureSignals.has(signal)) {
        continue;
      }

      const check = checkDefinitionByFailureSignal.get(signal);
      if (!check) {
        unmappedSignals.push(signal);
        continue;
      }

      const existing = checksById.get(check.id);
      if (existing) {
        existing.matchedSignals.push(signal);
      } else {
        checksById.set(check.id, {
          ...check,
          matchedSignals: [signal],
        });
      }
    }
  }

  return {
    checks: Array.from(checksById.values()),
    unmappedSignals: unique(unmappedSignals),
  };
}

function buildFailedJobSummary(failedJobs) {
  return failedJobs
    .map((job) => {
      const steps =
        job.failedStepNames.length > 0
          ? job.failedStepNames.join(", ")
          : "no step metadata";
      const urlSuffix = job.htmlUrl ? ` (${job.htmlUrl})` : "";
      return `- ${job.name}: failed steps = ${steps}${urlSuffix}`;
    })
    .join("\n");
}

async function julesRequest(method, pathname, body, query = {}) {
  if (!julesApiToken) {
    throw new Error("Missing JULES_API_TOKEN.");
  }

  const url = new URL(`${julesApiBaseUrl}/${pathname.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": julesApiToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = safeParseJson(text);
  if (!response.ok) {
    throw new Error(
      `Jules API ${method} ${pathname} failed (${response.status} ${response.statusText}): ${text.slice(0, 500)}`,
    );
  }
  return payload;
}

async function listJulesCollection(endpoint, collectionKey) {
  const items = [];
  let pageToken = "";
  while (true) {
    const response = await julesRequest("GET", endpoint, undefined, {
      pageSize: 100,
      pageToken,
    });
    const pageItems = Array.isArray(response?.[collectionKey])
      ? response[collectionKey]
      : [];
    items.push(...pageItems);
    pageToken = response?.nextPageToken ?? "";
    if (!pageToken) {
      break;
    }
  }
  return items;
}

function resolveJulesSource(sources, owner, repo) {
  if (julesSourceOverride) {
    return sources.find(
      (source) =>
        source.name === julesSourceOverride ||
        source.id === julesSourceOverride,
    );
  }

  if (!owner || !repo) {
    return undefined;
  }

  return sources.find(
    (source) =>
      source?.githubRepo?.owner?.toLowerCase() === owner.toLowerCase() &&
      source?.githubRepo?.repo?.toLowerCase() === repo.toLowerCase(),
  );
}

function buildJulesPrompt({
  runId,
  runAttempt,
  runUrl,
  headSha,
  headBranch,
  failedJobs,
}) {
  const failedJobsSummary = buildFailedJobSummary(failedJobs);
  return `You are remediating a failed GitHub Actions CI run.

Repository: ${repository}
Target branch: ${headBranch}
Workflow run: ${runUrl || `run #${runId}`}
Run attempt: ${runAttempt}
Commit SHA: ${headSha}

Failed jobs:
${failedJobsSummary}

Task:
1. Start from branch "${headBranch}".
2. Reproduce and fix the failures with minimal, scoped changes.
3. Run and pass these checks:
   - npm ci
   - npm run typecheck
   - npm run lint -- --max-warnings=0
   - npm run format:check
   - npm run test:coverage
   - npm run depgraph:check
   - npm run check:instruction-drift
4. Push fixes so the original PR branch "${headBranch}" receives updated commits and CI reruns.
5. If direct branch push is unavailable, create a PR that clearly references the failing run (${runUrl || runId}).

Focus only on CI remediation; do not refactor unrelated code.`;
}

async function createJulesRemediationSession({
  runId,
  runAttempt,
  runUrl,
  headSha,
  headBranch,
  failedJobs,
  owner,
  repo,
}) {
  const sources = await listJulesCollection("sources", "sources");
  const source = resolveJulesSource(sources, owner, repo);
  if (!source) {
    throw new Error(
      `Jules source not found for ${owner}/${repo}. Set JULES_SOURCE if source lookup differs.`,
    );
  }

  await enforceJulesDailySessionBudget({
    dailyLimit: Number.isFinite(julesDailySessionLimit)
      ? julesDailySessionLimit
      : 100,
    listSessions: () => listJulesCollection("sessions", "sessions"),
    lookbackHours: Number.isFinite(julesDailySessionLookbackHours)
      ? julesDailySessionLookbackHours
      : 24,
    sourceName: source.name,
  });

  const session = await julesRequest("POST", "sessions", {
    title: `CI auto-heal run #${runId} (${headBranch})`,
    prompt: buildJulesPrompt({
      runId,
      runAttempt,
      runUrl,
      headSha,
      headBranch,
      failedJobs,
    }),
    sourceContext: {
      source: source.name,
      githubRepoContext: {
        startingBranch: headBranch,
      },
    },
    automationMode: "AUTO_CREATE_PR",
  });

  return {
    id: session?.id ?? "",
    name: session?.name ?? "",
    sourceName: source.name,
  };
}

async function maybeCreateJulesSession({
  runId,
  runAttempt,
  runUrl,
  headSha,
  headBranch,
  prNumber,
  failedJobs,
  owner,
  repo,
}) {
  if (!enableJulesRemediation) {
    log("Jules remediation disabled by configuration.");
    return;
  }

  if (!julesApiToken) {
    log("JULES_API_TOKEN is not configured; skipping AI remediation session.");
    return;
  }

  if (!prNumber) {
    log("No PR number found; skipping Jules remediation session creation.");
    return;
  }

  const marker = `${autoHealMarker} run:${runId}`;
  try {
    const comments = await listIssueComments(prNumber);
    const markerExists = Array.isArray(comments)
      ? comments.some((comment) => String(comment?.body ?? "").includes(marker))
      : false;
    if (markerExists) {
      log(
        `Jules remediation session already requested for run #${runId}; skipping duplicate request.`,
      );
      return;
    }
  } catch (error) {
    warn(
      `Unable to list PR comments for dedupe; continuing with session creation. ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let session;
  try {
    session = await createJulesRemediationSession({
      runId,
      runAttempt,
      runUrl,
      headSha,
      headBranch,
      failedJobs,
      owner,
      repo,
    });
  } catch (error) {
    warn(
      `Skipping Jules remediation session. ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  log(`Created Jules remediation session ${session.id || session.name}.`);
  const commentBody = [
    marker,
    `Created Jules remediation session \`${session.id || session.name}\` for failed Quality Checks run #${runId} (attempt ${runAttempt}).`,
    `Run: ${runUrl || "n/a"}`,
    "Automation mode: `AUTO_CREATE_PR`.",
    "This was triggered automatically after deterministic auto-heal and one flaky-job rerun path were exhausted.",
  ].join("\n\n");

  if (enablePrComments) {
    try {
      await addIssueComment(prNumber, commentBody);
      log(`Posted CI auto-heal status comment on PR #${prNumber}.`);
    } catch (error) {
      warn(
        `Failed to post PR comment for Jules session ${session.id || session.name}. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    log("PR status comments disabled by configuration.");
  }
}

async function main() {
  appendSummary("## CI Failure Triage");
  const payload = readEventPayload();
  const workflowRun = await resolveWorkflowRun(payload);

  const [repositoryOwner = "", repositoryName = ""] = repository.split("/");
  const owner = julesSourceOwner || repositoryOwner;
  const repo = julesSourceRepo || repositoryName;

  const runId = workflowRun.id;
  const runAttempt = Number(workflowRun.run_attempt ?? 1);
  const headBranch = workflowRun.head_branch ?? "";
  const headSha = workflowRun.head_sha ?? "";
  const headCommitMessage = workflowRun.head_commit?.message ?? "";
  const isAutoHealCommit = headCommitMessage.startsWith(autoHealCommitPrefix);
  const runUrl = workflowRun.html_url ?? "";
  const prNumber = workflowRun.pull_requests?.[0]?.number ?? null;

  log(`Run: #${runId} attempt ${runAttempt}`);
  log(`Branch: ${headBranch || "(none)"}`);
  log(`Commit: ${headSha || "(none)"}`);
  if (runUrl) {
    log(`Run URL: ${runUrl}`);
  }

  if (!isFailureConclusion(workflowRun.conclusion)) {
    log(`Workflow run is '${workflowRun.conclusion}', nothing to heal.`);
    return;
  }

  if (!headBranch) {
    log("No head branch available in workflow_run payload. Skipping.");
    return;
  }

  if (headSha) {
    const currentHeadSha = getCurrentHeadSha();
    if (currentHeadSha && currentHeadSha !== headSha) {
      fail(
        `Checked out commit ${currentHeadSha} does not match failing run commit ${headSha}. Re-run triage on the failing revision.`,
      );
    }
  }

  if (runAttempt > maxRunAttempt) {
    log(
      `Run attempt ${runAttempt} exceeded max auto-heal attempt limit (${maxRunAttempt}); skipping.`,
    );
    return;
  }

  const jobsResponse = await githubRequest(
    "GET",
    `repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
  );
  const failedJobs = parseFailedJobs(jobsResponse?.jobs ?? []);
  const failedSignals = unique(
    failedJobs
      .flatMap((job) => [job.name, ...(job.failedStepNames ?? [])])
      .filter((value) => typeof value === "string" && value.length > 0),
  );

  if (failedSignals.length === 0) {
    log("No failed jobs detected. Skipping.");
    return;
  }

  log(`Failed signals: ${failedSignals.join(", ")}`);

  const { checks: failedChecks, unmappedSignals } =
    resolveFailedChecks(failedJobs);
  if (failedChecks.length > 0) {
    log(
      `Matched checks: ${failedChecks.map((check) => `${check.label} (${unique(check.matchedSignals).join(", ")})`).join("; ")}`,
    );
  }
  if (unmappedSignals.length > 0) {
    warn(
      `Unmapped failed signals detected: ${unmappedSignals.join(", ")}. These will bypass flaky rerun and escalate directly.`,
    );
  }

  const deterministicCommands = unique(
    failedChecks
      .map((check) => check.deterministicFixCommand)
      .filter((command) => Array.isArray(command))
      .map((command) => command.join("\u0000")),
  ).map((serialized) => serialized.split("\u0000"));

  let deterministicFixCommandFailed = false;
  if (deterministicCommands.length > 0) {
    if (!enableDeterministicFixes) {
      log(
        "Deterministic auto-fixes disabled by configuration; triage is read-only.",
      );
    } else if (!(isAutoHealCommit && runAttempt > 1)) {
      for (const [command, ...args] of deterministicCommands) {
        try {
          log(
            `Running deterministic auto-fix command: ${command} ${args.join(" ")}`,
          );
          run(command, args);
        } catch (error) {
          deterministicFixCommandFailed = true;
          warn(
            `Deterministic auto-fix command failed. ${error instanceof Error ? error.message : String(error)}`,
          );
          break;
        }
      }

      if (!deterministicFixCommandFailed && hasGitChanges()) {
        run("git", ["config", "user.name", "github-actions[bot]"]);
        run("git", [
          "config",
          "user.email",
          "41898282+github-actions[bot]@users.noreply.github.com",
        ]);
        run("git", ["add", "-A"]);

        const fixedChecks = failedChecks
          .filter((check) => Array.isArray(check.deterministicFixCommand))
          .map((check) => check.id.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
        const commitMessage = `${autoHealCommitPrefix} ${fixedChecks.join("+")} (run #${runId})`;
        run("git", ["commit", "-m", commitMessage]);
        run("git", ["push", "origin", `HEAD:${headBranch}`]);

        log(`Pushed deterministic auto-heal commit to ${headBranch}.`);
        if (prNumber) {
          log(
            `PR #${prNumber} will receive a fresh Quality Checks run from this push.`,
          );
        }
        return;
      }
    } else {
      log(
        "Skipping repeated deterministic fixes because run already comes from an auto-heal commit and rerun attempt > 1.",
      );
    }
  }

  const reviewCommands = unique(
    failedChecks
      .map((check) => {
        if (!Array.isArray(check.reviewCommand)) {
          return undefined;
        }
        return `${check.label}\u0000${check.reviewCommand.join("\u0000")}`;
      })
      .filter((value) => typeof value === "string"),
  ).map((serialized) => {
    const [name, ...parts] = serialized.split("\u0000");
    return { name, command: parts };
  });

  const reviewFailures = [];
  for (const entry of reviewCommands) {
    const [command, ...args] = entry.command;
    log(
      `Reviewing failed job "${entry.name}" with command: ${formatCommand(command, args)}`,
    );
    const result = runWithStatus(command, args);
    if (!result.ok) {
      reviewFailures.push({
        name: entry.name,
        command: formatCommand(command, args),
        status: result.status,
      });
      warn(
        `Review command failed for "${entry.name}" (exit ${result.status}).`,
      );
    }
  }

  if (reviewCommands.length > 0 && reviewFailures.length === 0) {
    log(
      "All review commands passed locally for failed jobs; treating this run as likely transient.",
    );
  }
  if (reviewFailures.length > 0) {
    log(
      `Locally reproduced failing checks: ${reviewFailures.map((item) => item.name).join(", ")}.`,
    );
  }

  if (
    runAttempt <= maxFlakeRerunAttempt &&
    !deterministicFixCommandFailed &&
    reviewFailures.length === 0 &&
    unmappedSignals.length === 0
  ) {
    if (enableFailedJobRerun) {
      await rerunFailedJobs(
        runId,
        reviewCommands.length > 0
          ? "all review commands passed locally; retry once for transient runner failure"
          : "all mapped checks passed locally; retry once before AI remediation",
      );
    } else {
      log(
        "Failed-job reruns disabled by configuration; triage stopping after review commands.",
      );
    }
    return;
  }

  if (deterministicFixCommandFailed) {
    warn(
      "Deterministic auto-fix command failed; escalating directly to Jules remediation.",
    );
  }
  if (unmappedSignals.length > 0) {
    warn(
      "Skipping flaky rerun because failed signals are unmapped; escalating directly to Jules remediation.",
    );
  }

  await maybeCreateJulesSession({
    runId,
    runAttempt,
    runUrl,
    headSha,
    headBranch,
    prNumber,
    failedJobs,
    owner,
    repo,
  });
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
