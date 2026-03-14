#!/usr/bin/env node
import fs from "node:fs";

const githubToken = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const eventPath = process.env.GITHUB_EVENT_PATH ?? "";
const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY ?? "";

const githubApiBaseUrl = "https://api.github.com";
const closeMarker = "<!-- codex-issue-auto-close:v1 -->";
const resolvedLabelName = "resolved-by-automation";

function appendSummary(line = "") {
  if (!stepSummaryPath) {
    return;
  }
  fs.appendFileSync(stepSummaryPath, `${line}\n`, "utf8");
}

function log(message) {
  console.log(`[issue-close-on-verification] ${message}`);
  appendSummary(`- ${message}`);
}

function fail(message) {
  console.error(`[issue-close-on-verification] ${message}`);
  appendSummary(`- ERROR: ${message}`);
  process.exit(1);
}

function parseRepository(input) {
  const [owner, repo] = String(input).split("/");
  if (!owner || !repo) {
    return null;
  }
  return { owner, repo };
}

function readEventPayload() {
  if (!eventPath || !fs.existsSync(eventPath)) {
    fail("Missing GITHUB_EVENT_PATH payload.");
  }

  try {
    return JSON.parse(fs.readFileSync(eventPath, "utf8"));
  } catch (error) {
    fail(
      `Unable to parse event payload: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function githubRequest(
  method,
  pathname,
  body,
  { allowFailure = false } = {},
) {
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
      "User-Agent": "finance-app-issue-close-on-verification",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok) {
    if (allowFailure) {
      return { ok: false, status: response.status, payload };
    }

    throw new Error(
      `GitHub API ${method} ${pathname} failed (${response.status} ${response.statusText}): ${text.slice(0, 300)}`,
    );
  }

  return { ok: true, payload };
}

function hasLabel(issue, labelName) {
  const lower = labelName.toLowerCase();
  return (issue?.labels ?? []).some(
    (label) => String(label?.name ?? "").toLowerCase() === lower,
  );
}

function shouldTriggerClose(commentBody) {
  const text = String(commentBody ?? "").toLowerCase();
  return [
    "verification passed",
    "verified fixed",
    "autopilot recovered",
    "resolved and verified",
  ].some((token) => text.includes(token));
}

function isAuthorizedCloser(payload, repositoryOwner) {
  const issueAuthor = String(payload?.issue?.user?.login ?? "").toLowerCase();
  const commentAuthor = String(
    payload?.comment?.user?.login ?? "",
  ).toLowerCase();
  const commentAssociation = String(
    payload?.comment?.author_association ?? "",
  ).toUpperCase();

  if (!commentAuthor) {
    return false;
  }

  if (
    commentAuthor === issueAuthor ||
    commentAuthor === String(repositoryOwner).toLowerCase()
  ) {
    return true;
  }

  return ["OWNER", "MEMBER", "COLLABORATOR"].includes(commentAssociation);
}

async function ensureResolvedLabel(owner, repo) {
  const existing = await githubRequest(
    "GET",
    `repos/${owner}/${repo}/labels/${encodeURIComponent(resolvedLabelName)}`,
    undefined,
    { allowFailure: true },
  );

  if (existing.ok) {
    return;
  }

  if (existing.status !== 404) {
    log(`Skipping resolved label ensure due to status ${existing.status}.`);
    return;
  }

  await githubRequest("POST", `repos/${owner}/${repo}/labels`, {
    name: resolvedLabelName,
    color: "0052cc",
    description:
      "Issue was automatically closed after explicit verification signal.",
  });
  log(`Created missing label '${resolvedLabelName}'.`);
}

async function main() {
  appendSummary("## Issue Auto-close On Verification");

  const repoParts = parseRepository(repository);
  if (!repoParts) {
    fail(`Invalid GITHUB_REPOSITORY value '${repository}'.`);
  }

  const payload = readEventPayload();
  const action = String(payload?.action ?? "");
  if (action !== "created") {
    log(`Action '${action}' is not handled. Skipping.`);
    return;
  }

  const issue = payload?.issue;
  if (!issue) {
    log("No issue payload present. Skipping.");
    return;
  }

  if (issue.pull_request) {
    log(`Issue #${issue.number} is a pull request. Skipping.`);
    return;
  }

  if (String(issue.state ?? "").toLowerCase() !== "open") {
    log(`Issue #${issue.number} is not open. Skipping.`);
    return;
  }

  const trackedIssue =
    hasLabel(issue, "blocker") ||
    hasLabel(issue, "autopilot") ||
    hasLabel(issue, "codex-generated") ||
    hasLabel(issue, "automation") ||
    hasLabel(issue, "auto-remediation-in-progress") ||
    hasLabel(issue, "needs-triage");

  if (!trackedIssue) {
    log(`Issue #${issue.number} is not a tracked automation issue. Skipping.`);
    return;
  }

  if (!shouldTriggerClose(payload?.comment?.body)) {
    log(
      `Comment did not include a verification phrase for issue #${issue.number}.`,
    );
    return;
  }

  const { owner, repo } = repoParts;
  if (!isAuthorizedCloser(payload, owner)) {
    log(
      `Commenter is not authorized to close issue #${issue.number} automatically.`,
    );
    return;
  }

  await ensureResolvedLabel(owner, repo);

  await githubRequest(
    "POST",
    `repos/${owner}/${repo}/issues/${issue.number}/labels`,
    {
      labels: [resolvedLabelName],
    },
  );

  await githubRequest(
    "DELETE",
    `repos/${owner}/${repo}/issues/${issue.number}/labels/${encodeURIComponent("stale-blocker")}`,
    undefined,
    { allowFailure: true },
  );

  await githubRequest(
    "PATCH",
    `repos/${owner}/${repo}/issues/${issue.number}`,
    {
      state: "closed",
    },
  );

  await githubRequest(
    "POST",
    `repos/${owner}/${repo}/issues/${issue.number}/comments`,
    {
      body: `${closeMarker}\nAuto-closed after explicit verification signal from an authorized commenter.`,
    },
  );

  log(`Closed issue #${issue.number} after verification signal.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
