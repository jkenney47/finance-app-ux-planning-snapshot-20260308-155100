#!/usr/bin/env node
import fs from "node:fs";

const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const eventPath = process.env.GITHUB_EVENT_PATH ?? "";
const eventName = process.env.GITHUB_EVENT_NAME ?? "";
const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY ?? "";

const scanWindowHours = Number.parseInt(
  process.env.ACTIONS_AUTOPILOT_SCAN_WINDOW_HOURS ?? "24",
  10,
);
const maxRunsPerScan = Number.parseInt(
  process.env.ACTIONS_AUTOPILOT_MAX_RUNS_PER_SCAN ?? "10",
  10,
);
const githubRequestMaxAttempts = Number.parseInt(
  process.env.ACTIONS_AUTOPILOT_GITHUB_MAX_ATTEMPTS ?? "3",
  10,
);
const githubRetryBaseDelayMs = Number.parseInt(
  process.env.ACTIONS_AUTOPILOT_GITHUB_RETRY_BASE_DELAY_MS ?? "750",
  10,
);

const githubApiBaseUrl = "https://api.github.com";
const autopilotMarker = "<!-- codex-actions-failure-autopilot:v1 -->";
const kickoffMarker = "<!-- codex-actions-failure-kickoff:v1 -->";
const retryableGithubMethods = new Set(["GET", "PUT", "PATCH", "DELETE"]);
const retryableGithubStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504]);
const enableIssueWrites = parseBoolean(
  process.env.ACTIONS_AUTOPILOT_WRITE_ISSUES ?? "0",
  false,
);

function appendSummary(line = "") {
  if (!stepSummaryPath) {
    return;
  }
  fs.appendFileSync(stepSummaryPath, `${line}\n`, "utf8");
}

function log(message) {
  console.log(`[actions-failure-autopilot] ${message}`);
  appendSummary(`- ${message}`);
}

function fail(message) {
  console.error(`[actions-failure-autopilot] ${message}`);
  appendSummary(`- ERROR: ${message}`);
  process.exit(1);
}

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

function parseRepository(input) {
  const [owner, repo] = String(input).split("/");
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

function safeParseJson(text) {
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function readEventPayload() {
  if (!eventPath || !fs.existsSync(eventPath)) {
    return {};
  }
  return safeParseJson(fs.readFileSync(eventPath, "utf8"));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function shouldRetryGithubRequest(method, statusCode) {
  return (
    retryableGithubMethods.has(String(method ?? "").toUpperCase()) &&
    retryableGithubStatusCodes.has(statusCode)
  );
}

function isTransientNetworkError(error) {
  const text = String(error?.message ?? "").toLowerCase();
  return (
    text.includes("fetch failed") ||
    text.includes("network") ||
    text.includes("socket") ||
    text.includes("econnreset") ||
    text.includes("etimedout") ||
    text.includes("timed out")
  );
}

async function githubRequest(
  method,
  pathname,
  body,
  { allowFailure = false } = {},
) {
  const token = githubToken.trim();
  if (!token) {
    const message = "Missing GITHUB_TOKEN for GitHub API calls.";
    if (allowFailure) {
      return {
        ok: false,
        status: 401,
        payload: { message },
      };
    }
    throw new Error(message);
  }

  const normalizedMethod = String(method ?? "GET").toUpperCase();
  const maxAttempts = retryableGithubMethods.has(normalizedMethod)
    ? Math.max(1, githubRequestMaxAttempts)
    : 1;
  const url = `${githubApiBaseUrl}/${pathname.replace(/^\/+/, "")}`;
  let lastResponse = null;
  let lastPayload = {};
  let lastText = "";
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: normalizedMethod,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "finance-app-actions-failure-autopilot",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const text = await response.text();
      const payload = safeParseJson(text);
      if (response.ok) {
        return { ok: true, payload };
      }

      lastResponse = response;
      lastPayload = payload;
      lastText = text;
      if (
        attempt < maxAttempts &&
        shouldRetryGithubRequest(normalizedMethod, response.status)
      ) {
        await sleep(Math.max(1, githubRetryBaseDelayMs) * attempt);
        continue;
      }
      break;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && isTransientNetworkError(error)) {
        await sleep(Math.max(1, githubRetryBaseDelayMs) * attempt);
        continue;
      }
      break;
    }
  }

  if (allowFailure) {
    return {
      ok: false,
      status: lastResponse?.status ?? 0,
      payload:
        lastResponse?.status !== undefined
          ? lastPayload
          : {
              message: lastError
                ? String(
                    lastError instanceof Error ? lastError.message : lastError,
                  )
                : "unknown-error",
            },
    };
  }

  if (lastError && !lastResponse) {
    throw new Error(
      `GitHub API ${normalizedMethod} ${pathname} failed before response: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  throw new Error(
    `GitHub API ${normalizedMethod} ${pathname} failed (${lastResponse?.status ?? 0} ${lastResponse?.statusText ?? "unknown"}): ${lastText.slice(0, 300)}`,
  );
}

async function listRecentFailedRuns(owner, repo) {
  const response = await githubRequest(
    "GET",
    `repos/${owner}/${repo}/actions/runs?status=completed&per_page=100`,
  );

  const runs = Array.isArray(response.payload?.workflow_runs)
    ? response.payload.workflow_runs
    : [];

  const cutoffMs = Date.now() - scanWindowHours * 60 * 60 * 1000;
  return runs
    .filter((run) => String(run?.conclusion ?? "") === "failure")
    .filter((run) => {
      const updatedMs = new Date(run?.updated_at ?? 0).getTime();
      return !Number.isNaN(updatedMs) && updatedMs >= cutoffMs;
    })
    .filter(
      (run) =>
        String(run?.name ?? "").toLowerCase() !==
        "actions failure autopilot".toLowerCase(),
    )
    .slice(0, maxRunsPerScan);
}

function marker(runId) {
  return `${autopilotMarker} run:${runId}`;
}

function issueTitle(run) {
  return `Workflow failure: ${run?.name ?? "unknown"} #${run?.id ?? "n/a"}`;
}

function issueBody(run) {
  return `${marker(run?.id)}
[created-by: codex]

Detected failed GitHub Actions workflow run.

- Workflow: \`${run?.name ?? "unknown"}\`
- Run ID: \`${run?.id ?? "n/a"}\`
- Event: \`${run?.event ?? "n/a"}\`
- Branch: \`${run?.head_branch ?? "n/a"}\`
- SHA: \`${run?.head_sha ?? "n/a"}\`
- URL: ${run?.html_url ?? "n/a"}

Automation will route this incident through issue handling and remediation.`;
}

function kickoffComment(runId) {
  return `${kickoffMarker}
run: ${runId}

automation kickoff: triggering issue auto-handler for this workflow failure incident.`;
}

async function findOpenIssueForRun(owner, repo, runId) {
  const response = await githubRequest(
    "GET",
    `repos/${owner}/${repo}/issues?state=open&per_page=100&sort=updated&direction=desc`,
  );
  const issues = Array.isArray(response.payload) ? response.payload : [];
  const key = marker(runId);
  const match = issues.find((issue) => {
    if (issue?.pull_request) {
      return false;
    }
    const body = String(issue?.body ?? "");
    return body.includes(key);
  });
  return match ?? null;
}

async function ensureIncidentIssue(owner, repo, run) {
  const runId = run?.id;
  const existing = await findOpenIssueForRun(owner, repo, runId);
  if (existing) {
    return existing;
  }

  const created = await githubRequest("POST", `repos/${owner}/${repo}/issues`, {
    title: issueTitle(run),
    body: issueBody(run),
  });

  const issueNumber = created.payload?.number;
  if (issueNumber) {
    await githubRequest(
      "POST",
      `repos/${owner}/${repo}/issues/${issueNumber}/labels`,
      {
        labels: ["needs-triage", "automation", "codex-generated", "blocker"],
      },
      { allowFailure: true },
    );
  }

  return created.payload;
}

async function hasKickoffComment(owner, repo, issueNumber, runId) {
  const response = await githubRequest(
    "GET",
    `repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
  );
  const comments = Array.isArray(response.payload) ? response.payload : [];
  const needle = `${kickoffMarker}\nrun: ${runId}`;
  return comments.some((comment) =>
    String(comment?.body ?? "").includes(needle),
  );
}

async function processRun(owner, repo, run) {
  const runId = run?.id;
  if (!runId) {
    return { handled: false, reason: "missing-run-id" };
  }

  const issue = await ensureIncidentIssue(owner, repo, run);
  const issueNumber = issue?.number;
  if (!issueNumber) {
    return { handled: false, reason: "issue-create-failed" };
  }

  const alreadyKickedOff = await hasKickoffComment(
    owner,
    repo,
    issueNumber,
    runId,
  );
  if (!alreadyKickedOff) {
    await githubRequest(
      "POST",
      `repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        body: kickoffComment(runId),
      },
    );
  }

  return {
    handled: true,
    issueNumber,
    created: !alreadyKickedOff,
  };
}

function collectWorkflowRunTargets(payload) {
  if (eventName === "workflow_run") {
    const workflowRun = payload?.workflow_run;
    if (
      workflowRun &&
      String(workflowRun?.conclusion ?? "") === "failure" &&
      String(workflowRun?.name ?? "").toLowerCase() !==
        "actions failure autopilot".toLowerCase()
    ) {
      return [workflowRun];
    }
    return [];
  }
  return [];
}

function reportRun(run) {
  const runId = String(run?.id ?? "n/a");
  const workflowName = String(run?.name ?? "unknown");
  const branch = String(run?.head_branch ?? "n/a");
  const event = String(run?.event ?? "n/a");
  const url = String(run?.html_url ?? "n/a");

  log(
    `Report-only incident: workflow='${workflowName}', run='${runId}', branch='${branch}', event='${event}', url='${url}'.`,
  );
}

async function main() {
  appendSummary("## Actions Failure Autopilot");

  const repoParts = parseRepository(repository);
  if (!repoParts) {
    fail(`Invalid GITHUB_REPOSITORY value '${repository}'.`);
  }
  const { owner, repo } = repoParts;

  const payload = readEventPayload();
  let runs = collectWorkflowRunTargets(payload);
  if (runs.length === 0) {
    if (!githubToken.trim() && !enableIssueWrites) {
      log(
        "Missing GITHUB_TOKEN; report-only mode cannot scan recent failed runs without API auth.",
      );
      return;
    }
    runs = await listRecentFailedRuns(owner, repo);
  }

  if (runs.length === 0) {
    log("No failed workflow runs to process.");
    return;
  }

  if (!enableIssueWrites) {
    log("Report-only mode enabled; issue/comment writes are disabled.");
    for (const run of runs) {
      reportRun(run);
    }
    log(`Failed runs reported: ${runs.length}.`);
    return;
  }

  let handled = 0;
  for (const run of runs) {
    let result;
    try {
      result = await processRun(owner, repo, run);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      log(`Skipping run '${run?.id ?? "n/a"}' due API error: ${reason}`);
      continue;
    }
    if (!result.handled) {
      log(`Skipped run '${run?.id ?? "n/a"}' (${result.reason}).`);
      continue;
    }
    handled += 1;
    log(`Processed failed run '${run?.id}' via issue #${result.issueNumber}.`);
  }

  log(`Failed runs processed: ${handled}/${runs.length}.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
