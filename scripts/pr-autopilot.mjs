#!/usr/bin/env node
import fs from "node:fs";
import { enforceJulesDailySessionBudget } from "./lib/jules-session-budget.mjs";

const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const eventPath = process.env.GITHUB_EVENT_PATH ?? "";
const eventName = process.env.GITHUB_EVENT_NAME ?? "";
const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY ?? "";

const julesApiToken = process.env.JULES_API_TOKEN || "";
const julesApiBaseUrl = (
  process.env.JULES_API_BASE_URL ?? "https://jules.googleapis.com/v1alpha"
).replace(/\/+$/, "");
const julesSourceOverride = process.env.JULES_SOURCE ?? "";
const [defaultOwner = "", defaultRepo = ""] = repository.split("/");
const julesSourceOwner = process.env.JULES_GITHUB_OWNER || defaultOwner;
const julesSourceRepo = process.env.JULES_GITHUB_REPO || defaultRepo;
function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
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

function parseCsvSet(value, fallback = "") {
  const source =
    value !== undefined && value !== null && String(value).trim().length > 0
      ? String(value)
      : fallback;
  return new Set(
    source
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function parseCsvList(value, fallback = "") {
  const source =
    value !== undefined && value !== null && String(value).trim().length > 0
      ? String(value)
      : fallback;
  return source
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

const scanWindowHours = parseNonNegativeInt(
  process.env.PR_AUTOPILOT_SCAN_WINDOW_HOURS ?? "0",
  0,
);
const maxEventsPerRun = parsePositiveInt(
  process.env.PR_AUTOPILOT_MAX_EVENTS_PER_RUN ?? "50",
  50,
);
const manualPrNumber = parsePositiveInt(
  process.env.PR_AUTOPILOT_PR_NUMBER ?? "0",
  0,
);
const manualCommandText = String(
  process.env.PR_AUTOPILOT_COMMAND_TEXT ?? "/pr-autopilot",
).trim();
const enableEventBacklogScan = parseBoolean(
  process.env.PR_AUTOPILOT_ENABLE_EVENT_BACKLOG_SCAN ?? "0",
  false,
);
const enablePrLifecycle = parseBoolean(
  process.env.PR_AUTOPILOT_ENABLE_PR_LIFECYCLE ?? "0",
  false,
);
const lifecycleCooldownHours = parseNonNegativeInt(
  process.env.PR_AUTOPILOT_LIFECYCLE_COOLDOWN_HOURS ?? "6",
  6,
);
const maxLifecycleActionsPerRun = parsePositiveInt(
  process.env.PR_AUTOPILOT_MAX_LIFECYCLE_ACTIONS_PER_RUN ?? "25",
  25,
);
const autoDelegateDrafts = parseBoolean(
  process.env.PR_AUTOPILOT_AUTO_DELEGATE_DRAFTS ?? "0",
  false,
);
const draftDelegationCooldownHours = parseNonNegativeInt(
  process.env.PR_AUTOPILOT_DRAFT_DELEGATION_COOLDOWN_HOURS ?? "24",
  24,
);
const autoResolveAutomationThreads = parseBoolean(
  process.env.PR_AUTOPILOT_AUTO_RESOLVE_AUTOMATION_THREADS ?? "0",
  false,
);
const automationThreadAuthors = parseCsvSet(
  process.env.PR_AUTOPILOT_AUTOMATION_THREAD_AUTHORS,
  "chatgpt-codex-connector,copilot-pull-request-reviewer[bot],google-labs-jules[bot],google-labs-jules,github-copilot[bot]",
);
const ignoredActors = parseCsvSet(
  process.env.PR_AUTOPILOT_IGNORED_ACTORS,
  "github-actions,github-actions[bot]",
);
const commandPrefixes = parseCsvList(
  process.env.PR_AUTOPILOT_COMMAND_PREFIXES,
  "/pr-autopilot,/autopilot,/codex-pr,/jules-followup",
);
const allowedMergeMethods = new Set(["merge", "squash", "rebase"]);
const requestedMergeMethod = String(
  process.env.PR_AUTOPILOT_AUTO_MERGE_METHOD ?? "squash",
)
  .trim()
  .toLowerCase();
const autoMergeMethod = allowedMergeMethods.has(requestedMergeMethod)
  ? requestedMergeMethod
  : "squash";
const githubRequestMaxAttempts = parsePositiveInt(
  process.env.PR_AUTOPILOT_GITHUB_MAX_ATTEMPTS ?? "3",
  3,
);
const githubRetryBaseDelayMs = parsePositiveInt(
  process.env.PR_AUTOPILOT_GITHUB_RETRY_BASE_DELAY_MS ?? "750",
  750,
);
const julesDailySessionLimit = parsePositiveInt(
  process.env.JULES_DAILY_SESSION_LIMIT ?? "100",
  100,
);
const julesDailySessionLookbackHours = parsePositiveInt(
  process.env.JULES_DAILY_SESSION_LOOKBACK_HOURS ?? "24",
  24,
);

const githubApiBaseUrl = "https://api.github.com";
const autopilotMarker = "<!-- codex-pr-autopilot:v1 -->";
const lifecycleMarker = "<!-- codex-pr-lifecycle:v1 -->";
const retryableGithubMethods = new Set(["GET", "PUT", "PATCH", "DELETE"]);
const retryableGithubStatusCodes = new Set([408, 425, 429, 500, 502, 503, 504]);

function appendSummary(line = "") {
  if (!stepSummaryPath) {
    return;
  }
  fs.appendFileSync(stepSummaryPath, `${line}\n`, "utf8");
}

function log(message) {
  console.log(`[pr-autopilot] ${message}`);
  appendSummary(`- ${message}`);
}

function fail(message) {
  console.error(`[pr-autopilot] ${message}`);
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
    fail("Missing GITHUB_EVENT_PATH payload.");
  }
  return safeParseJson(fs.readFileSync(eventPath, "utf8"));
}

function normalizeLogin(login) {
  return String(login ?? "")
    .trim()
    .toLowerCase();
}

function shouldIgnoreActor(login) {
  const value = normalizeLogin(login);
  if (!value) {
    return true;
  }
  return ignoredActors.has(value);
}

function isAutomationThreadAuthor(login) {
  const value = normalizeLogin(login);
  if (!value) {
    return false;
  }
  return automationThreadAuthors.has(value);
}

function isExplicitCommandRequest(actionText) {
  const normalized = String(actionText ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return false;
  }
  return commandPrefixes.some((prefix) => normalized.startsWith(prefix));
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

function isRetryableGithubMethod(method) {
  return retryableGithubMethods.has(String(method ?? "").toUpperCase());
}

function githubHeaders(userAgent) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${githubToken}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": userAgent,
    "Content-Type": "application/json",
  };
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
  { allowFailure = false, maxAttemptsOverride = undefined } = {},
) {
  if (!githubToken) {
    fail("Missing GITHUB_TOKEN for GitHub API calls.");
  }

  return githubJsonRequest(
    `${githubApiBaseUrl}/${pathname.replace(/^\/+/, "")}`,
    method,
    body,
    "finance-app-pr-autopilot",
    { allowFailure, maxAttemptsOverride },
  );
}

async function githubJsonRequest(
  url,
  method,
  body,
  userAgent,
  { allowFailure = false, maxAttemptsOverride = undefined } = {},
) {
  const normalizedMethod = String(method ?? "GET").toUpperCase();
  const maxAttempts =
    Number.isInteger(maxAttemptsOverride) && maxAttemptsOverride > 0
      ? maxAttemptsOverride
      : isRetryableGithubMethod(normalizedMethod)
        ? githubRequestMaxAttempts
        : 1;
  let lastResponse = null;
  let lastPayload = {};
  let lastText = "";
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: normalizedMethod,
        headers: githubHeaders(userAgent),
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
        await sleep(githubRetryBaseDelayMs * attempt);
        continue;
      }
      break;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && isTransientNetworkError(error)) {
        await sleep(githubRetryBaseDelayMs * attempt);
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
      `GitHub API ${normalizedMethod} ${url} failed before response: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }

  throw new Error(
    `GitHub API ${normalizedMethod} ${url} failed (${lastResponse?.status ?? 0} ${lastResponse?.statusText ?? "unknown"}): ${lastText.slice(0, 300)}`,
  );
}

async function githubGraphqlRequest(
  query,
  variables = {},
  { allowFailure = false } = {},
) {
  const response = await githubJsonRequest(
    `${githubApiBaseUrl}/graphql`,
    "POST",
    { query, variables },
    "finance-app-pr-autopilot-graphql",
    { allowFailure },
  );

  if (!response.ok) {
    return response;
  }

  const errors = Array.isArray(response.payload?.errors)
    ? response.payload.errors
    : [];
  if (errors.length === 0) {
    return response;
  }

  const errorMessage = errors
    .map((entry) => String(entry?.message ?? "").trim())
    .filter(Boolean)
    .join("; ");

  if (allowFailure) {
    return {
      ok: false,
      status: 400,
      payload: {
        message: errorMessage || "graphql-error",
      },
    };
  }

  throw new Error(`GitHub GraphQL request failed: ${errorMessage}`);
}

function latestThreadAuthor(thread) {
  const comments = Array.isArray(thread?.comments?.nodes)
    ? thread.comments.nodes
    : [];
  if (comments.length === 0) {
    return "";
  }
  const latest = comments[comments.length - 1];
  return normalizeLogin(latest?.author?.login ?? "");
}

async function listPullReviewThreads(owner, repo, prNumber) {
  const threads = [];
  let cursor = null;

  while (true) {
    const response = await githubGraphqlRequest(
      `
        query($owner: String!, $repo: String!, $number: Int!, $after: String) {
          repository(owner: $owner, name: $repo) {
            pullRequest(number: $number) {
              reviewThreads(first: 100, after: $after) {
                nodes {
                  id
                  isResolved
                  isOutdated
                  comments(last: 20) {
                    nodes {
                      author {
                        login
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `,
      { owner, repo, number: Number(prNumber), after: cursor },
    );

    const reviewThreads =
      response.payload?.data?.repository?.pullRequest?.reviewThreads;
    const pageItems = Array.isArray(reviewThreads?.nodes)
      ? reviewThreads.nodes
      : [];
    threads.push(...pageItems);

    const hasNextPage = Boolean(reviewThreads?.pageInfo?.hasNextPage);
    const endCursor = String(reviewThreads?.pageInfo?.endCursor ?? "");
    if (!hasNextPage || !endCursor) {
      break;
    }
    cursor = endCursor;
  }

  return threads;
}

async function resolveReviewThread(threadId) {
  return githubGraphqlRequest(
    `
      mutation($threadId: ID!) {
        resolveReviewThread(input: { threadId: $threadId }) {
          thread {
            isResolved
          }
        }
      }
    `,
    { threadId },
    { allowFailure: true },
  );
}

async function autoResolveAutomationReviewThreads(owner, repo, prNumber) {
  if (!autoResolveAutomationThreads) {
    return { scanned: 0, resolved: 0 };
  }

  const threads = await listPullReviewThreads(owner, repo, prNumber);
  let resolved = 0;

  for (const thread of threads) {
    if (!thread?.id || thread?.isResolved || thread?.isOutdated) {
      continue;
    }
    const author = latestThreadAuthor(thread);
    if (!isAutomationThreadAuthor(author)) {
      continue;
    }
    const result = await resolveReviewThread(thread.id);
    if (result.ok) {
      resolved += 1;
    }
  }

  return {
    scanned: threads.length,
    resolved,
  };
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
      `Jules API ${method} ${pathname} failed (${response.status} ${response.statusText}): ${text.slice(0, 300)}`,
    );
  }
  return payload;
}

async function listIssueComments(owner, repo, issueNumber) {
  const comments = [];
  let page = 1;
  while (true) {
    const response = await githubRequest(
      "GET",
      `repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`,
    );
    const pageComments = response.payload;
    if (!Array.isArray(pageComments) || pageComments.length === 0) {
      break;
    }
    comments.push(...pageComments);
    if (pageComments.length < 100) {
      break;
    }
    page += 1;
  }
  return comments;
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

  const preferredOwner = julesSourceOwner || owner;
  const preferredRepo = julesSourceRepo || repo;
  if (!preferredOwner || !preferredRepo) {
    return undefined;
  }

  return sources.find(
    (source) =>
      source?.githubRepo?.owner?.toLowerCase() ===
        preferredOwner.toLowerCase() &&
      source?.githubRepo?.repo?.toLowerCase() === preferredRepo.toLowerCase(),
  );
}

function marker(eventKey) {
  return `${autopilotMarker} key:${eventKey}`;
}

function hasMarkerComment(comments, eventKey) {
  const key = marker(eventKey);
  return comments.some((comment) => String(comment?.body ?? "").includes(key));
}

function lifecycleActionMarker(actionKey) {
  return `${lifecycleMarker} action:${actionKey}`;
}

function hasRecentLifecycleAction(comments, actionKey, cutoffMs) {
  const key = lifecycleActionMarker(actionKey);
  return comments.some((comment) => {
    const body = String(comment?.body ?? "");
    if (!body.includes(key)) {
      return false;
    }
    const createdMs = new Date(comment?.created_at ?? 0).getTime();
    return !Number.isNaN(createdMs) && createdMs >= cutoffMs;
  });
}

function lifecycleComment(actionKey, title, detailLines) {
  const details = (detailLines ?? [])
    .map((line) => String(line ?? "").trim())
    .filter(Boolean)
    .join("\n");
  return `${lifecycleActionMarker(actionKey)}
### PR Lifecycle Autopilot: ${title}

${details}`.trim();
}

function buildEventContext(payload) {
  if (eventName === "workflow_dispatch") {
    if (!manualPrNumber) {
      return null;
    }
    return {
      prNumber: manualPrNumber,
      headRef: null,
      eventKey: `workflow-dispatch-${manualPrNumber}`,
      actor: payload?.sender?.login ?? "",
      actionText: manualCommandText || "/pr-autopilot",
      sourceLabel: "Manual workflow dispatch",
      url: "",
    };
  }

  if (eventName === "issue_comment") {
    const issue = payload?.issue;
    const comment = payload?.comment;
    if (!issue?.pull_request) {
      return null;
    }
    const actionText = String(comment?.body ?? "").trim();
    if (!isExplicitCommandRequest(actionText)) {
      return null;
    }
    return {
      prNumber: issue.number,
      headRef: null,
      eventKey: `issue-comment-${comment?.id}`,
      actor: comment?.user?.login ?? "",
      actionText,
      sourceLabel: "PR issue comment",
      url: comment?.html_url ?? "",
    };
  }

  if (eventName === "pull_request_review_comment") {
    const pullRequest = payload?.pull_request;
    const comment = payload?.comment;
    return {
      prNumber: pullRequest?.number,
      headRef: pullRequest?.head?.ref ?? null,
      eventKey: `review-comment-${comment?.id}`,
      actor: comment?.user?.login ?? "",
      actionText: [
        `File: ${comment?.path ?? "unknown"}`,
        `Line: ${comment?.line ?? comment?.original_line ?? "unknown"}`,
        String(comment?.body ?? ""),
      ].join("\n"),
      sourceLabel: "PR review comment",
      url: comment?.html_url ?? "",
    };
  }

  if (eventName === "pull_request_review") {
    const pullRequest = payload?.pull_request;
    const review = payload?.review;
    const state = String(review?.state ?? "").toLowerCase();
    if (!["commented", "changes_requested"].includes(state)) {
      return null;
    }
    return {
      prNumber: pullRequest?.number,
      headRef: pullRequest?.head?.ref ?? null,
      eventKey: `review-${review?.id}`,
      actor: review?.user?.login ?? "",
      actionText: `Review state: ${state}\n${String(review?.body ?? "").trim()}`,
      sourceLabel: "PR review",
      url: review?.html_url ?? "",
    };
  }

  return null;
}

async function getPullRequest(owner, repo, prNumber) {
  const response = await githubRequest(
    "GET",
    `repos/${owner}/${repo}/pulls/${prNumber}`,
    undefined,
    { allowFailure: true },
  );
  if (!response.ok) {
    return null;
  }
  return response.payload;
}

async function listOpenPullRequests(owner, repo) {
  const pulls = [];
  let page = 1;
  while (true) {
    const response = await githubRequest(
      "GET",
      `repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}`,
    );
    const pageItems = Array.isArray(response.payload) ? response.payload : [];
    if (pageItems.length === 0) {
      break;
    }
    pulls.push(...pageItems);
    if (pageItems.length < 100) {
      break;
    }
    page += 1;
  }
  return pulls;
}

async function listPullReviewComments(owner, repo, prNumber) {
  const comments = [];
  let page = 1;
  while (true) {
    const response = await githubRequest(
      "GET",
      `repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100&page=${page}`,
    );
    const pageItems = Array.isArray(response.payload) ? response.payload : [];
    if (pageItems.length === 0) {
      break;
    }
    comments.push(...pageItems);
    if (pageItems.length < 100) {
      break;
    }
    page += 1;
  }
  return comments;
}

async function listPullReviews(owner, repo, prNumber) {
  const reviews = [];
  let page = 1;
  while (true) {
    const response = await githubRequest(
      "GET",
      `repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100&page=${page}`,
    );
    const pageItems = Array.isArray(response.payload) ? response.payload : [];
    if (pageItems.length === 0) {
      break;
    }
    reviews.push(...pageItems);
    if (pageItems.length < 100) {
      break;
    }
    page += 1;
  }
  return reviews;
}

function isMergeReadyState(mergeableState) {
  const value = String(mergeableState ?? "").toLowerCase();
  return ["clean", "unstable", "has_hooks"].includes(value);
}

function isBehindState(mergeableState) {
  return String(mergeableState ?? "").toLowerCase() === "behind";
}

function isDirtyState(mergeableState) {
  return String(mergeableState ?? "").toLowerCase() === "dirty";
}

function requiresReviewResolution(reason) {
  const normalized = String(reason ?? "").toLowerCase();
  return (
    normalized.includes("all comments must be resolved") ||
    (normalized.includes("review") && normalized.includes("resolved"))
  );
}

function isBaseBranchPolicyBlock(reason) {
  const normalized = String(reason ?? "").toLowerCase();
  return normalized.includes("base branch policy prohibits the merge");
}

function summarizeUnresolvedReviewThreads(threads) {
  const unresolved = Array.isArray(threads)
    ? threads.filter((thread) => !thread?.isResolved && !thread?.isOutdated)
    : [];
  const unresolvedAutomation = unresolved.filter((thread) =>
    isAutomationThreadAuthor(latestThreadAuthor(thread)),
  );
  return {
    unresolvedCount: unresolved.length,
    unresolvedAutomationCount: unresolvedAutomation.length,
  };
}

async function detectReviewResolutionBlock(owner, repo, prNumber, reason) {
  if (requiresReviewResolution(reason)) {
    return {
      needsReviewResolution: true,
      source: "merge-message",
      unresolvedCount: null,
      unresolvedAutomationCount: null,
    };
  }

  if (!isBaseBranchPolicyBlock(reason)) {
    return {
      needsReviewResolution: false,
      source: "none",
      unresolvedCount: null,
      unresolvedAutomationCount: null,
    };
  }

  try {
    const threads = await listPullReviewThreads(owner, repo, prNumber);
    const summary = summarizeUnresolvedReviewThreads(threads);
    return {
      needsReviewResolution: summary.unresolvedCount > 0,
      source: "thread-scan",
      unresolvedCount: summary.unresolvedCount,
      unresolvedAutomationCount: summary.unresolvedAutomationCount,
    };
  } catch (error) {
    const errorText = error instanceof Error ? error.message : String(error);
    log(
      `Review thread scan failed for PR #${prNumber}; falling back to review-resolution handling. Reason: ${errorText}`,
    );
    return {
      needsReviewResolution: true,
      source: "thread-scan-fallback",
      unresolvedCount: null,
      unresolvedAutomationCount: null,
    };
  }
}

function requiresCheckResolution(reason) {
  const normalized = String(reason ?? "").toLowerCase();
  return (
    normalized.includes("required status check") ||
    normalized.includes("required checks") ||
    normalized.includes("status checks") ||
    normalized.includes("checks have not completed") ||
    normalized.includes("check pending") ||
    normalized.includes("check failed")
  );
}

function summarizeCheckNames(names, limit = 8) {
  if (!Array.isArray(names) || names.length === 0) {
    return "none";
  }
  if (names.length <= limit) {
    return names.join(", ");
  }
  const remaining = names.length - limit;
  return `${names.slice(0, limit).join(", ")} (+${remaining} more)`;
}

async function requestBranchUpdate(owner, repo, pr) {
  const prNumber = pr?.number;
  if (!prNumber) {
    return { ok: false, reason: "missing-pr-number" };
  }

  const expectedHeadSha = String(pr?.head?.sha ?? "").trim();
  const body = expectedHeadSha ? { expected_head_sha: expectedHeadSha } : {};

  const response = await githubRequest(
    "PUT",
    `repos/${owner}/${repo}/pulls/${prNumber}/update-branch`,
    body,
    { allowFailure: true },
  );

  if (!response.ok) {
    return {
      ok: false,
      reason:
        String(response.payload?.message ?? "").trim() ||
        `status-${response.status}`,
    };
  }

  return { ok: true };
}

function checkLabel(prefix, name) {
  const value = String(name ?? "").trim();
  return value ? `${prefix}/${value}` : `${prefix}/unknown`;
}

async function listCommitCheckRuns(owner, repo, headSha) {
  const checkRuns = [];
  let page = 1;

  while (true) {
    const response = await githubRequest(
      "GET",
      `repos/${owner}/${repo}/commits/${headSha}/check-runs?per_page=100&page=${page}`,
    );
    const pageItems = Array.isArray(response.payload?.check_runs)
      ? response.payload.check_runs
      : [];
    if (pageItems.length === 0) {
      break;
    }
    checkRuns.push(...pageItems);
    if (pageItems.length < 100) {
      break;
    }
    page += 1;
  }

  return checkRuns;
}

async function listCommitStatuses(owner, repo, headSha) {
  const statuses = [];
  let page = 1;

  while (true) {
    const response = await githubRequest(
      "GET",
      `repos/${owner}/${repo}/commits/${headSha}/status?per_page=100&page=${page}`,
    );
    const pageItems = Array.isArray(response.payload?.statuses)
      ? response.payload.statuses
      : [];
    if (pageItems.length === 0) {
      break;
    }
    statuses.push(...pageItems);
    if (pageItems.length < 100) {
      break;
    }
    page += 1;
  }

  return statuses;
}

function statusSortTimestamp(status) {
  const updatedMs = new Date(status?.updated_at ?? 0).getTime();
  if (!Number.isNaN(updatedMs) && updatedMs > 0) {
    return updatedMs;
  }
  const createdMs = new Date(status?.created_at ?? 0).getTime();
  if (!Number.isNaN(createdMs) && createdMs > 0) {
    return createdMs;
  }
  return 0;
}

async function collectHeadCheckSummary(owner, repo, headSha) {
  const sha = String(headSha ?? "").trim();
  if (!sha) {
    return { failing: [], pending: [], passing: [] };
  }

  const failing = new Set();
  const pending = new Set();
  const passing = new Set();

  const checkRuns = await listCommitCheckRuns(owner, repo, sha);
  for (const checkRun of checkRuns) {
    const label = checkLabel("Check", checkRun?.name);
    const status = String(checkRun?.status ?? "").toLowerCase();
    const conclusion = String(checkRun?.conclusion ?? "").toLowerCase();
    if (status !== "completed") {
      pending.add(label);
      continue;
    }

    if (
      [
        "failure",
        "timed_out",
        "cancelled",
        "action_required",
        "startup_failure",
        "stale",
      ].includes(conclusion)
    ) {
      failing.add(label);
      continue;
    }

    passing.add(label);
  }

  const statuses = await listCommitStatuses(owner, repo, sha);
  const latestStatusByContext = new Map();
  for (const status of statuses) {
    const context = String(status?.context ?? "").trim();
    if (!context) {
      continue;
    }
    const existing = latestStatusByContext.get(context);
    if (!existing) {
      latestStatusByContext.set(context, status);
      continue;
    }
    if (statusSortTimestamp(status) >= statusSortTimestamp(existing)) {
      latestStatusByContext.set(context, status);
    }
  }

  for (const status of latestStatusByContext.values()) {
    const label = checkLabel("Status", status?.context);
    const state = String(status?.state ?? "").toLowerCase();
    if (state === "failure" || state === "error") {
      failing.add(label);
      continue;
    }
    if (state === "pending") {
      pending.add(label);
      continue;
    }
    if (state === "success") {
      passing.add(label);
    }
  }

  return {
    failing: Array.from(failing).sort((a, b) => a.localeCompare(b)),
    pending: Array.from(pending).sort((a, b) => a.localeCompare(b)),
    passing: Array.from(passing).sort((a, b) => a.localeCompare(b)),
  };
}

async function attemptPullRequestMerge(owner, repo, prNumber) {
  const response = await githubRequest(
    "PUT",
    `repos/${owner}/${repo}/pulls/${prNumber}/merge`,
    {
      merge_method: autoMergeMethod,
    },
    { allowFailure: true, maxAttemptsOverride: 1 },
  );

  if (!response.ok) {
    return {
      ok: false,
      reason:
        String(response.payload?.message ?? "").trim() ||
        `status-${response.status}`,
    };
  }

  const merged = Boolean(response.payload?.merged);
  return {
    ok: merged,
    reason: String(response.payload?.message ?? "").trim(),
  };
}

function buildLifecycleDelegationContext(pr, reason, actionText) {
  const prNumber = pr?.number;
  const branch = String(pr?.head?.ref ?? "");
  const headSha = String(pr?.head?.sha ?? "");
  return {
    prNumber,
    headRef: branch || null,
    eventKey: `lifecycle-${reason}-${prNumber}-${headSha}`,
    actor: "codex-pr-lifecycle",
    actionText,
    sourceLabel: `PR lifecycle (${reason})`,
    url: pr?.html_url ?? "",
  };
}

function buildJulesPrompt(context, pr) {
  return `You are handling a GitHub pull request follow-up.

Repository: ${repository}
Pull request: #${context.prNumber}
PR title: ${String(pr?.title ?? "")}
PR branch: ${String(pr?.head?.ref ?? context.headRef ?? "")}
PR URL: ${String(pr?.html_url ?? "")}

Incoming ${context.sourceLabel} from ${context.actor}:
${context.actionText}

Task:
1. Analyze the request/comment and determine required code/doc/test updates.
2. Implement a minimal, safe fix on the PR branch.
3. Run repository validation commands needed for confidence.
4. Push updates to the same PR branch.
5. Add a concise PR comment summarizing what was changed.`;
}

async function createJulesSession(owner, repo, context, pr) {
  const sources = await listJulesCollection("sources", "sources");
  const source = resolveJulesSource(sources, owner, repo);
  if (!source) {
    throw new Error(
      `Jules source not found for ${owner}/${repo}. Set JULES_SOURCE if lookup differs.`,
    );
  }

  await enforceJulesDailySessionBudget({
    dailyLimit: julesDailySessionLimit,
    listSessions: () => listJulesCollection("sessions", "sessions"),
    lookbackHours: julesDailySessionLookbackHours,
    sourceName: source.name,
  });

  const branch = String(pr?.head?.ref ?? context.headRef ?? "main");
  const session = await julesRequest("POST", "sessions", {
    title: `PR #${context.prNumber} follow-up (${context.sourceLabel})`,
    prompt: buildJulesPrompt(context, pr),
    sourceContext: {
      source: source.name,
      githubRepoContext: {
        startingBranch: branch,
      },
    },
    automationMode: "AUTO_CREATE_PR",
  });

  return {
    id: session?.id ?? "",
    name: session?.name ?? "",
  };
}

function successComment(context, sessionRef) {
  return `${marker(context.eventKey)}
### PR Autopilot

Handled event: ${context.sourceLabel}
Source: ${context.url || "n/a"}
Session: \`${sessionRef}\`

Action: delegated this PR follow-up to automated remediation.`;
}

function failureComment(context, reason) {
  return `${marker(context.eventKey)}
### PR Autopilot

Handled event: ${context.sourceLabel}
Source: ${context.url || "n/a"}
Session: unavailable

Action: tried to delegate this PR follow-up automatically but failed.
Reason: ${reason}`;
}

function isJulesFailedPrecondition(reason) {
  const normalized = String(reason ?? "").toLowerCase();
  return (
    normalized.includes("jules api") &&
    normalized.includes("failed (400") &&
    (normalized.includes("failed_precondition") ||
      normalized.includes("precondition check failed"))
  );
}

function isRecent(isoTimestamp, cutoffMs) {
  const valueMs = new Date(isoTimestamp ?? 0).getTime();
  return !Number.isNaN(valueMs) && valueMs >= cutoffMs;
}

function eventSortKey(context) {
  return new Date(context.createdAt ?? 0).getTime();
}

async function collectScanContexts(owner, repo) {
  const contexts = [];
  const cutoffMs =
    scanWindowHours > 0 ? Date.now() - scanWindowHours * 60 * 60 * 1000 : null;
  const pulls = await listOpenPullRequests(owner, repo);

  for (const pr of pulls) {
    const prNumber = pr?.number;
    if (!prNumber) {
      continue;
    }
    let issueComments = [];
    let reviewComments = [];
    let reviews = [];
    try {
      issueComments = await listIssueComments(owner, repo, prNumber);
      reviewComments = await listPullReviewComments(owner, repo, prNumber);
      reviews = await listPullReviews(owner, repo, prNumber);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      log(`Skipping PR #${prNumber} context scan due API error: ${reason}`);
      continue;
    }

    for (const comment of issueComments) {
      if (cutoffMs !== null && !isRecent(comment?.created_at, cutoffMs)) {
        continue;
      }
      const actor = comment?.user?.login ?? "";
      const body = String(comment?.body ?? "");
      if (shouldIgnoreActor(actor) || body.includes(autopilotMarker)) {
        continue;
      }
      const eventKey = `issue-comment-${comment?.id}`;
      if (hasMarkerComment(issueComments, eventKey)) {
        continue;
      }
      contexts.push({
        prNumber,
        headRef: pr?.head?.ref ?? null,
        eventKey,
        actor,
        actionText: body,
        sourceLabel: "PR issue comment",
        url: comment?.html_url ?? "",
        createdAt: comment?.created_at ?? null,
      });
    }

    for (const comment of reviewComments) {
      if (cutoffMs !== null && !isRecent(comment?.created_at, cutoffMs)) {
        continue;
      }
      const actor = comment?.user?.login ?? "";
      if (shouldIgnoreActor(actor)) {
        continue;
      }
      const eventKey = `review-comment-${comment?.id}`;
      if (hasMarkerComment(issueComments, eventKey)) {
        continue;
      }
      contexts.push({
        prNumber,
        headRef: pr?.head?.ref ?? null,
        eventKey,
        actor,
        actionText: [
          `File: ${comment?.path ?? "unknown"}`,
          `Line: ${comment?.line ?? comment?.original_line ?? "unknown"}`,
          String(comment?.body ?? ""),
        ].join("\n"),
        sourceLabel: "PR review comment",
        url: comment?.html_url ?? "",
        createdAt: comment?.created_at ?? null,
      });
    }

    for (const review of reviews) {
      if (cutoffMs !== null && !isRecent(review?.submitted_at, cutoffMs)) {
        continue;
      }
      const actor = review?.user?.login ?? "";
      const state = String(review?.state ?? "").toLowerCase();
      if (
        shouldIgnoreActor(actor) ||
        !["commented", "changes_requested"].includes(state)
      ) {
        continue;
      }
      const eventKey = `review-${review?.id}`;
      if (hasMarkerComment(issueComments, eventKey)) {
        continue;
      }
      contexts.push({
        prNumber,
        headRef: pr?.head?.ref ?? null,
        eventKey,
        actor,
        actionText: `Review state: ${state}\n${String(review?.body ?? "").trim()}`,
        sourceLabel: "PR review",
        url: review?.html_url ?? "",
        createdAt: review?.submitted_at ?? null,
      });
    }
  }

  const sortedContexts = contexts.sort(
    (a, b) => eventSortKey(a) - eventSortKey(b),
  );
  const limitedContexts = sortedContexts.slice(0, maxEventsPerRun);
  return {
    contexts: limitedContexts,
    totalContexts: sortedContexts.length,
    truncatedCount: Math.max(0, sortedContexts.length - limitedContexts.length),
  };
}

async function handleContext(owner, repo, context) {
  if (!context?.prNumber || !context?.eventKey) {
    return { handled: false, reason: "invalid-context" };
  }

  if (shouldIgnoreActor(context.actor)) {
    return { handled: false, reason: "ignored-actor" };
  }

  const comments = await listIssueComments(owner, repo, context.prNumber);
  if (hasMarkerComment(comments, context.eventKey)) {
    return { handled: false, reason: "already-handled" };
  }

  const pr = await getPullRequest(owner, repo, context.prNumber);
  if (!pr) {
    return { handled: false, reason: "pr-load-failed" };
  }

  if (String(pr?.state ?? "").toLowerCase() !== "open") {
    return { handled: false, reason: "pr-closed" };
  }

  try {
    const session = await createJulesSession(owner, repo, context, pr);
    const sessionRef = session.id || session.name || "unknown-session";
    await githubRequest(
      "POST",
      `repos/${owner}/${repo}/issues/${context.prNumber}/comments`,
      {
        body: successComment(context, sessionRef),
      },
    );
    return { handled: true, delegated: true, sessionRef };
  } catch (error) {
    let reason = error instanceof Error ? error.message : String(error);

    if (isJulesFailedPrecondition(reason)) {
      log(
        `Detected Jules FAILED_PRECONDITION for PR #${context.prNumber}; attempting recovery.`,
      );
      let recovered = false;
      let autoResolvedThreadCount = 0;
      try {
        const threadResolution = await autoResolveAutomationReviewThreads(
          owner,
          repo,
          context.prNumber,
        );
        autoResolvedThreadCount = threadResolution.resolved;

        if (autoResolvedThreadCount > 0) {
          const retrySession = await createJulesSession(
            owner,
            repo,
            context,
            pr,
          );
          const retrySessionRef =
            retrySession.id || retrySession.name || "unknown-session";
          await githubRequest(
            "POST",
            `repos/${owner}/${repo}/issues/${context.prNumber}/comments`,
            {
              body: `${successComment(context, retrySessionRef)}
Fallback: recovered from Jules FAILED_PRECONDITION by resolving ${autoResolvedThreadCount} automation-authored review thread(s) and retrying delegation once.`,
            },
          );
          recovered = true;
          return {
            handled: true,
            delegated: true,
            sessionRef: retrySessionRef,
          };
        }
      } catch (recoveryError) {
        const recoveryReason =
          recoveryError instanceof Error
            ? recoveryError.message
            : String(recoveryError);
        reason = `${reason}
Recovery attempt failed: ${recoveryReason}`;
      } finally {
        if (!recovered) {
          let unresolvedCount = null;
          let unresolvedAutomationCount = null;
          try {
            const threads = await listPullReviewThreads(
              owner,
              repo,
              context.prNumber,
            );
            const summary = summarizeUnresolvedReviewThreads(threads);
            unresolvedCount = summary.unresolvedCount;
            unresolvedAutomationCount = summary.unresolvedAutomationCount;
          } catch (threadError) {
            const threadReason =
              threadError instanceof Error
                ? threadError.message
                : String(threadError);
            log(
              `Unable to summarize unresolved review threads for PR #${context.prNumber}: ${threadReason}`,
            );
          }

          reason = [
            reason,
            autoResolvedThreadCount > 0
              ? `Recovery attempt: resolved ${autoResolvedThreadCount} automation-authored thread(s), but delegation still failed.`
              : "Recovery attempt: no automation-authored unresolved threads were available for auto-resolution.",
            unresolvedCount !== null
              ? `Unresolved review threads: ${unresolvedCount}`
              : null,
            unresolvedAutomationCount !== null
              ? `Automation-authored unresolved threads: ${unresolvedAutomationCount}`
              : null,
            "Manual follow-up: resolve remaining review threads, then re-trigger PR Autopilot with a new explicit command comment.",
          ]
            .filter(Boolean)
            .join("\n");
        }
      }
    }

    await githubRequest(
      "POST",
      `repos/${owner}/${repo}/issues/${context.prNumber}/comments`,
      {
        body: failureComment(context, reason),
      },
    );
    return { handled: true, delegated: false, reason };
  }
}

function cooldownBucket(hours) {
  if (hours <= 0) {
    return Date.now();
  }
  const windowMs = hours * 60 * 60 * 1000;
  return Math.floor(Date.now() / windowMs);
}

async function runLifecycleAutomation(owner, repo) {
  if (!enablePrLifecycle) {
    return {
      enabled: false,
      scanned: 0,
      actions: 0,
      delegated: 0,
      merged: 0,
      updated: 0,
      resolvedThreads: 0,
    };
  }

  const pulls = await listOpenPullRequests(owner, repo);
  if (pulls.length === 0) {
    return {
      enabled: true,
      scanned: 0,
      actions: 0,
      delegated: 0,
      merged: 0,
      updated: 0,
      resolvedThreads: 0,
    };
  }

  const lifecycleCutoffMs =
    Date.now() - lifecycleCooldownHours * 60 * 60 * 1000;
  const actionBudget = Math.max(1, maxLifecycleActionsPerRun);
  let actions = 0;
  let delegated = 0;
  let merged = 0;
  let updated = 0;
  let resolvedThreads = 0;

  for (const listedPr of pulls) {
    if (actions >= actionBudget) {
      break;
    }

    const prNumber = listedPr?.number;
    if (!prNumber) {
      continue;
    }
    try {
      const pr = await getPullRequest(owner, repo, prNumber);
      if (!pr || String(pr?.state ?? "").toLowerCase() !== "open") {
        continue;
      }

      const comments = await listIssueComments(owner, repo, prNumber);
      const mergeableState = String(pr?.mergeable_state ?? "").toLowerCase();
      const headSha = String(pr?.head?.sha ?? "").trim();

      if (pr?.draft) {
        if (!autoDelegateDrafts) {
          continue;
        }

        const draftBucket = cooldownBucket(draftDelegationCooldownHours);
        const draftContext = buildLifecycleDelegationContext(
          pr,
          "draft-follow-up",
          [
            "Draft pull request requires autonomous completion.",
            `Mergeable state: ${mergeableState || "unknown"}`,
            `Last updated at: ${pr?.updated_at ?? "unknown"}`,
            "Implement remaining fixes, run validation, and push updates to this same branch.",
          ].join("\n"),
        );
        draftContext.eventKey = `${draftContext.eventKey}-${draftBucket}`;

        if (hasMarkerComment(comments, draftContext.eventKey)) {
          continue;
        }

        const result = await handleContext(owner, repo, draftContext);
        if (!result.handled) {
          continue;
        }
        actions += 1;
        if (result.delegated) {
          delegated += 1;
        }
        continue;
      }

      if (isBehindState(mergeableState)) {
        const actionKey = `update-branch-pr-${prNumber}`;
        if (hasRecentLifecycleAction(comments, actionKey, lifecycleCutoffMs)) {
          continue;
        }

        const updateResult = await requestBranchUpdate(owner, repo, pr);
        const title = updateResult.ok
          ? "Update Branch Triggered"
          : "Update Branch Failed";
        const detailLines = [
          `PR: #${prNumber}`,
          updateResult.ok
            ? "Action: requested GitHub to update this branch from base."
            : `Action: could not update branch automatically (${updateResult.reason}).`,
        ];
        await githubRequest(
          "POST",
          `repos/${owner}/${repo}/issues/${prNumber}/comments`,
          {
            body: lifecycleComment(actionKey, title, detailLines),
          },
        );
        actions += 1;
        if (updateResult.ok) {
          updated += 1;
        }
        continue;
      }

      if (isDirtyState(mergeableState)) {
        const dirtyBucket = cooldownBucket(lifecycleCooldownHours);
        const dirtyContext = buildLifecycleDelegationContext(
          pr,
          "merge-conflict",
          [
            "Pull request has merge conflicts and needs autonomous resolution.",
            `Mergeable state: ${mergeableState || "unknown"}`,
            "Resolve conflicts on this branch, run validation, and push updates.",
          ].join("\n"),
        );
        dirtyContext.eventKey = `${dirtyContext.eventKey}-${dirtyBucket}`;

        if (hasMarkerComment(comments, dirtyContext.eventKey)) {
          continue;
        }

        const result = await handleContext(owner, repo, dirtyContext);
        if (!result.handled) {
          continue;
        }
        actions += 1;
        if (result.delegated) {
          delegated += 1;
        }
        continue;
      }

      if (!isMergeReadyState(mergeableState)) {
        let checkSummary = { failing: [], pending: [], passing: [] };
        try {
          checkSummary = await collectHeadCheckSummary(owner, repo, headSha);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          log(`Check summary load failed for PR #${prNumber}: ${reason}`);
        }

        if (checkSummary.failing.length > 0) {
          const checksBucket = cooldownBucket(lifecycleCooldownHours);
          const checksContext = buildLifecycleDelegationContext(
            pr,
            "checks-resolution",
            [
              "Pull request is blocked by failing checks/tests.",
              `Mergeable state: ${mergeableState || "unknown"}`,
              `Failing checks: ${summarizeCheckNames(checkSummary.failing)}`,
              checkSummary.pending.length > 0
                ? `Pending checks: ${summarizeCheckNames(checkSummary.pending)}`
                : null,
              "Fix failing checks/tests, run validation, and push updates.",
            ]
              .filter(Boolean)
              .join("\n"),
          );
          checksContext.eventKey = `${checksContext.eventKey}-${checksBucket}`;

          if (!hasMarkerComment(comments, checksContext.eventKey)) {
            const checksResult = await handleContext(
              owner,
              repo,
              checksContext,
            );
            if (checksResult.handled) {
              actions += 1;
              if (checksResult.delegated) {
                delegated += 1;
              }
            }
          }
        }
        continue;
      }

      const actionKey = `merge-attempt-pr-${prNumber}-${String(
        pr?.head?.sha ?? "unknown",
      )}`;
      if (hasRecentLifecycleAction(comments, actionKey, lifecycleCutoffMs)) {
        continue;
      }

      let mergeResult = await attemptPullRequestMerge(owner, repo, prNumber);
      actions += 1;
      if (mergeResult.ok) {
        merged += 1;
        log(`Auto-merged PR #${prNumber} with method '${autoMergeMethod}'.`);
        continue;
      }

      const reviewResolution = await detectReviewResolutionBlock(
        owner,
        repo,
        prNumber,
        mergeResult.reason,
      );

      if (reviewResolution.needsReviewResolution) {
        let autoResolvedThreadCount = 0;
        try {
          const threadResolution = await autoResolveAutomationReviewThreads(
            owner,
            repo,
            prNumber,
          );
          autoResolvedThreadCount = threadResolution.resolved;
          if (autoResolvedThreadCount > 0) {
            resolvedThreads += autoResolvedThreadCount;
            const resolveActionKey = `resolve-automation-threads-pr-${prNumber}-${headSha}`;
            if (
              !hasRecentLifecycleAction(
                comments,
                resolveActionKey,
                lifecycleCutoffMs,
              )
            ) {
              await githubRequest(
                "POST",
                `repos/${owner}/${repo}/issues/${prNumber}/comments`,
                {
                  body: lifecycleComment(
                    resolveActionKey,
                    "Resolved Automation Review Threads",
                    [
                      `PR: #${prNumber}`,
                      `Resolved threads: ${autoResolvedThreadCount}`,
                      "Action: automatically resolved AI-authored review threads, then re-attempted merge.",
                    ],
                  ),
                },
              );
            }

            mergeResult = await attemptPullRequestMerge(owner, repo, prNumber);
            actions += 1;
            if (mergeResult.ok) {
              merged += 1;
              log(
                `Auto-merged PR #${prNumber} after resolving ${autoResolvedThreadCount} automation review thread(s).`,
              );
              continue;
            }
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          log(`Thread auto-resolution failed for PR #${prNumber}: ${reason}`);
        }

        const reviewBucket = cooldownBucket(lifecycleCooldownHours);
        const reviewContext = buildLifecycleDelegationContext(
          pr,
          "review-resolution",
          [
            "Pull request is blocked by unresolved review comments/threads.",
            `Merge attempt result: ${mergeResult.reason || "unknown"}`,
            `Review-resolution source: ${reviewResolution.source}`,
            reviewResolution.unresolvedCount !== null
              ? `Unresolved threads detected: ${reviewResolution.unresolvedCount}`
              : null,
            reviewResolution.unresolvedAutomationCount !== null
              ? `Automation-authored unresolved threads: ${reviewResolution.unresolvedAutomationCount}`
              : null,
            autoResolvedThreadCount > 0
              ? `Automation threads resolved before delegation: ${autoResolvedThreadCount}`
              : null,
            "Address all outstanding review feedback, resolve review threads, run validation, and push updates.",
          ]
            .filter(Boolean)
            .join("\n"),
        );
        reviewContext.eventKey = `${reviewContext.eventKey}-${reviewBucket}`;

        if (!hasMarkerComment(comments, reviewContext.eventKey)) {
          const reviewResult = await handleContext(owner, repo, reviewContext);
          if (reviewResult.handled) {
            actions += 1;
            if (reviewResult.delegated) {
              delegated += 1;
            }
          }
        }
      }

      if (requiresCheckResolution(mergeResult.reason)) {
        let checkSummary = { failing: [], pending: [], passing: [] };
        try {
          checkSummary = await collectHeadCheckSummary(owner, repo, headSha);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          log(`Check summary load failed for PR #${prNumber}: ${reason}`);
        }

        const checksBucket = cooldownBucket(lifecycleCooldownHours);
        const checksContext = buildLifecycleDelegationContext(
          pr,
          "checks-resolution",
          [
            "Pull request merge is blocked by required checks/tests.",
            `Merge attempt result: ${mergeResult.reason || "unknown"}`,
            `Failing checks: ${summarizeCheckNames(checkSummary.failing)}`,
            checkSummary.pending.length > 0
              ? `Pending checks: ${summarizeCheckNames(checkSummary.pending)}`
              : null,
            "Fix failing checks/tests, run validation, and push updates.",
          ]
            .filter(Boolean)
            .join("\n"),
        );
        checksContext.eventKey = `${checksContext.eventKey}-${checksBucket}`;

        if (!hasMarkerComment(comments, checksContext.eventKey)) {
          const checksResult = await handleContext(owner, repo, checksContext);
          if (checksResult.handled) {
            actions += 1;
            if (checksResult.delegated) {
              delegated += 1;
            }
          }
        }
      }

      await githubRequest(
        "POST",
        `repos/${owner}/${repo}/issues/${prNumber}/comments`,
        {
          body: lifecycleComment(actionKey, "Merge Not Ready", [
            `PR: #${prNumber}`,
            `Mergeable state: ${mergeableState || "unknown"}`,
            `Result: ${mergeResult.reason || "merge requirements not met yet"}`,
            "Autopilot will retry automatically.",
          ]),
        },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      log(
        `Lifecycle automation skipped PR #${prNumber} due API error: ${reason}`,
      );
      continue;
    }
  }

  return {
    enabled: true,
    scanned: pulls.length,
    actions,
    delegated,
    merged,
    updated,
    resolvedThreads,
  };
}

async function main() {
  appendSummary("## PR Autopilot");

  const repoParts = parseRepository(repository);
  if (!repoParts) {
    fail(`Invalid GITHUB_REPOSITORY value '${repository}'.`);
  }

  const payload = readEventPayload();
  const context = buildEventContext(payload);
  const { owner, repo } = repoParts;
  let scanResult = { contexts: [], totalContexts: 0, truncatedCount: 0 };
  if (context) {
    scanResult = { contexts: [context], totalContexts: 1, truncatedCount: 0 };
  } else if (enableEventBacklogScan) {
    try {
      scanResult = await collectScanContexts(owner, repo);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      log(`Context scan failed for event '${eventName}': ${reason}`);
    }
  } else if (eventName === "workflow_dispatch") {
    log(
      "Manual dispatch received without a valid PR number; no PR action taken.",
    );
  }
  const contexts = scanResult.contexts;

  if (scanResult.truncatedCount > 0) {
    log(
      `Backlog detected: ${scanResult.totalContexts} unhandled PR events found; processing ${contexts.length} oldest events this run and deferring ${scanResult.truncatedCount}.`,
    );
  }

  if (contexts.length === 0) {
    log(`No actionable PR contexts for event '${eventName}'.`);
  } else {
    let handledCount = 0;
    for (const currentContext of contexts) {
      let result;
      try {
        result = await handleContext(owner, repo, currentContext);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        log(
          `Skipping context '${currentContext.eventKey}' due API error: ${reason}`,
        );
        continue;
      }
      if (!result.handled) {
        continue;
      }
      handledCount += 1;
      if (result.delegated) {
        log(
          `Delegated event '${currentContext.eventKey}' to session '${result.sessionRef}'.`,
        );
      } else {
        log(`Delegation failed for event '${currentContext.eventKey}'.`);
      }
    }

    log(`Handled ${handledCount}/${contexts.length} PR context event(s).`);
  }

  let lifecycle;
  try {
    lifecycle = await runLifecycleAutomation(owner, repo);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log(`Lifecycle automation run failed: ${reason}`);
    return;
  }
  if (!lifecycle.enabled) {
    log("PR lifecycle automation disabled by configuration.");
    return;
  }

  log(
    `Lifecycle scan: scanned=${lifecycle.scanned}, actions=${lifecycle.actions}, delegated=${lifecycle.delegated}, merged=${lifecycle.merged}, updated=${lifecycle.updated}, resolvedThreads=${lifecycle.resolvedThreads ?? 0}.`,
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
