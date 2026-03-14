#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const workspaceRoot = process.cwd();
const artifactsDir = path.join(workspaceRoot, "artifacts", "jules");
const timestamp = new Date().toISOString().replace(/[:]/g, "-");
const jsonPath = path.join(artifactsDir, `jules-autopublish-${timestamp}.json`);
const latestJsonPath = path.join(artifactsDir, "latest.json");
const markdownPath = path.join(
  artifactsDir,
  `jules-autopublish-${timestamp}.md`,
);
const latestMarkdownPath = path.join(artifactsDir, "latest.md");
const deferredQueuePath = path.join(
  artifactsDir,
  "deferred-session-queue.json",
);

const baseUrl = (
  process.env.JULES_API_BASE_URL ?? "https://jules.googleapis.com/v1alpha"
).replace(/\/+$/, "");
const apiToken = process.env.JULES_API_TOKEN ?? "";
const sourceOverride = process.env.JULES_SOURCE ?? "";
const repository = process.env.GITHUB_REPOSITORY ?? "";
const [defaultOwner = "", defaultRepo = ""] = repository.split("/");
const sourceOwner = process.env.JULES_GITHUB_OWNER || defaultOwner;
const sourceRepo = process.env.JULES_GITHUB_REPO || defaultRepo;
const lookbackHours = Number.parseInt(
  process.env.JULES_LOOKBACK_HOURS ?? "48",
  10,
);
const maxSessions = Number.parseInt(process.env.JULES_MAX_SESSIONS ?? "30", 10);
const pageSize = Number.parseInt(process.env.JULES_PAGE_SIZE ?? "50", 10);
const pollAttempts = Number.parseInt(
  process.env.JULES_POLL_ATTEMPTS ?? "8",
  10,
);
const pollIntervalSeconds = Number.parseInt(
  process.env.JULES_POLL_INTERVAL_SECONDS ?? "15",
  10,
);
const marker = process.env.JULES_AUTOPUBLISH_MARKER ?? "[AUTO_PUBLISH_REQUEST]";
const completionMarker =
  process.env.JULES_COMPLETION_MARKER ?? "[AUTO_COMPLETION_UPDATE]";
const githubApiBaseUrl = (
  process.env.GITHUB_API_BASE_URL ?? "https://api.github.com"
).replace(/\/+$/, "");
const githubToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? "";
const publishPrompt =
  process.env.JULES_AUTOPUBLISH_PROMPT ??
  `${marker}
This session is complete. Please publish this work and create a draft GitHub pull request for the branch.
If publishing is blocked, reply with the exact blocker and what user action is required.`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isoToEpochMs(iso) {
  const epoch = Date.parse(iso ?? "");
  return Number.isNaN(epoch) ? 0 : epoch;
}

function readPullRequestOutputs(session) {
  return (session.outputs ?? [])
    .map((output) => output?.pullRequest)
    .filter((pullRequest) => pullRequest?.url);
}

function pickSessionId(sessionName) {
  if (!sessionName) {
    return "";
  }
  const parts = String(sessionName).split("/");
  return parts[parts.length - 1] ?? "";
}

async function apiRequest(method, route, body, query = {}) {
  if (!apiToken) {
    throw new Error(
      "Missing JULES_API_TOKEN. Set it as a repository secret and map it to the workflow env.",
    );
  }

  const url = new URL(`${baseUrl}/${route.replace(/^\/+/, "")}`);
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
      "X-Goog-Api-Key": apiToken,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? safeParseJson(text) : {};

  if (!response.ok) {
    throw new Error(
      `Jules API request failed (${response.status} ${response.statusText}) ${method} ${url.pathname}: ${text.slice(0, 400)}`,
    );
  }
  return payload;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function listAll(endpoint, collectionKey, extraQuery = {}) {
  const items = [];
  let pageToken = "";
  while (true) {
    const response = await apiRequest("GET", endpoint, undefined, {
      pageSize,
      pageToken,
      ...extraQuery,
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

function resolveSource(sources) {
  if (sourceOverride) {
    return sources.find(
      (source) =>
        source.name === sourceOverride || source.id === sourceOverride,
    );
  }

  if (!sourceOwner || !sourceRepo) {
    return undefined;
  }

  return sources.find(
    (source) =>
      source?.githubRepo?.owner?.toLowerCase() === sourceOwner.toLowerCase() &&
      source?.githubRepo?.repo?.toLowerCase() === sourceRepo.toLowerCase(),
  );
}

function readDeferredQueue() {
  try {
    const raw = fs.readFileSync(deferredQueuePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (value) => typeof value === "string" && value.length > 0,
    );
  } catch {
    return [];
  }
}

function writeDeferredQueue(queue) {
  fs.writeFileSync(
    deferredQueuePath,
    `${JSON.stringify(queue, null, 2)}\n`,
    "utf8",
  );
}

function shouldConsiderSession(session, sourceName, cutoffEpochMs) {
  if (!session?.sourceContext?.source) {
    return false;
  }
  if (session.sourceContext.source !== sourceName) {
    return false;
  }
  const sessionUpdatedAt = isoToEpochMs(
    session?.updateTime ?? session?.createTime,
  );
  return sessionUpdatedAt >= cutoffEpochMs;
}

function hasMarker(activities, markerValue) {
  const escapedMarker = markerValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const markerPattern = new RegExp(`${escapedMarker}(?!\\d)`);
  return activities.some((activity) =>
    markerPattern.test(JSON.stringify(activity)),
  );
}

function hasAutopublishMarker(activities) {
  return hasMarker(activities, marker);
}

function parsePullRequestUrl(pullRequestUrl) {
  if (!pullRequestUrl) {
    return undefined;
  }

  let parsed;
  try {
    parsed = new URL(pullRequestUrl);
  } catch {
    return undefined;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 4 || segments[2] !== "pull") {
    return undefined;
  }

  const pullNumber = Number.parseInt(segments[3], 10);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0) {
    return undefined;
  }

  return {
    owner: segments[0],
    repo: segments[1],
    pullNumber,
  };
}

async function githubRequest(pathname) {
  const url = new URL(`${githubApiBaseUrl}/${pathname.replace(/^\/+/, "")}`);
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "finance-app-jules-autopublish",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  const text = await response.text();
  const payload = text ? safeParseJson(text) : {};

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed (${response.status} ${response.statusText}) GET ${url.pathname}: ${text.slice(0, 400)}`,
    );
  }

  return payload;
}

async function fetchPullRequestStatus(pullRequestUrl) {
  const reference = parsePullRequestUrl(pullRequestUrl);
  if (!reference) {
    throw new Error(`Unsupported pull request URL: ${pullRequestUrl}`);
  }

  const payload = await githubRequest(
    `repos/${reference.owner}/${reference.repo}/pulls/${reference.pullNumber}`,
  );

  return {
    owner: reference.owner,
    repo: reference.repo,
    number: payload.number ?? reference.pullNumber,
    url: payload.html_url ?? pullRequestUrl,
    title: payload.title ?? "",
    state: payload.state ?? "",
    merged: Boolean(payload.merged_at),
    changedFiles:
      typeof payload.changed_files === "number" ? payload.changed_files : -1,
    baseRef: payload?.base?.ref ?? "",
  };
}

function isRedundantClosedPullRequest(pullRequestStatus) {
  return (
    pullRequestStatus.state === "closed" &&
    !pullRequestStatus.merged &&
    pullRequestStatus.changedFiles === 0
  );
}

function buildCompletionPrompt(markerForPullRequest, pullRequestStatus) {
  const baseRef = pullRequestStatus.baseRef || "main";
  const nowDate = new Date().toISOString().slice(0, 10);
  return `${markerForPullRequest}
Gatekeeper resolution update (${nowDate}): pull request #${pullRequestStatus.number} (${pullRequestStatus.url}) was closed without merge and now reports 0 files changed versus \`${baseRef}\`.
Treat this task as completed and clear any pending review state for this session.`;
}

async function pollForPullRequest(sessionName) {
  for (let attempt = 1; attempt <= pollAttempts; attempt += 1) {
    await sleep(pollIntervalSeconds * 1000);
    const session = await apiRequest("GET", sessionName);
    const pullRequests = readPullRequestOutputs(session);
    if (pullRequests.length > 0) {
      return { published: true, session, pullRequests };
    }
  }
  const session = await apiRequest("GET", sessionName);
  return {
    published: false,
    session,
    pullRequests: readPullRequestOutputs(session),
  };
}

function buildMarkdown(summary) {
  const lines = [];
  lines.push("# Jules Auto-Publish Summary");
  lines.push("");
  lines.push(`- Generated: \`${summary.generatedAt}\``);
  lines.push(`- Source: \`${summary.sourceName}\``);
  lines.push(`- Lookback: last ${summary.lookbackHours}h`);
  lines.push(`- Sessions examined: ${summary.sessionsExamined}`);
  lines.push(
    `- Completed sessions with existing PR: ${summary.alreadyPublished.length}`,
  );
  lines.push(
    `- Redundant closed PRs detected: ${summary.redundantClosedPullRequests.length}`,
  );
  lines.push(
    `- Completion updates sent: ${summary.completionUpdatesSent.length}`,
  );
  lines.push(
    `- Completion updates already sent: ${summary.completionUpdatesSkipped.length}`,
  );
  lines.push(
    `- Auto-publish requests sent: ${summary.publishRequestsSent.length}`,
  );
  lines.push(`- New PRs detected: ${summary.newPullRequests.length}`);
  lines.push(`- Pending after request: ${summary.pending.length}`);
  lines.push(`- Errors: ${summary.errors.length}`);
  lines.push("");

  if (summary.newPullRequests.length > 0) {
    lines.push("## New PRs");
    for (const item of summary.newPullRequests) {
      lines.push(`- Session \`${item.sessionId}\`: ${item.url}`);
    }
    lines.push("");
  }

  if (summary.completionUpdatesSent.length > 0) {
    lines.push("## Completion Updates Sent");
    for (const item of summary.completionUpdatesSent) {
      lines.push(
        `- Session \`${item.sessionId}\`: notified for PR #${item.prNumber} (${item.url})`,
      );
    }
    lines.push("");
  }

  if (summary.completionUpdatesSkipped.length > 0) {
    lines.push("## Completion Updates Already Sent");
    for (const item of summary.completionUpdatesSkipped) {
      lines.push(
        `- Session \`${item.sessionId}\`: marker already present for PR #${item.prNumber} (${item.url})`,
      );
    }
    lines.push("");
  }

  if (summary.pending.length > 0) {
    lines.push("## Pending Publish");
    for (const item of summary.pending) {
      lines.push(
        `- Session \`${item.sessionId}\` is still \`${item.state}\` with no PR output yet.`,
      );
    }
    lines.push("");
  }

  if (summary.errors.length > 0) {
    lines.push("## Errors");
    for (const item of summary.errors) {
      lines.push(`- Session \`${item.sessionId}\`: ${item.error}`);
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  fs.mkdirSync(artifactsDir, { recursive: true });

  const now = new Date();
  const cutoffEpochMs = now.getTime() - lookbackHours * 60 * 60 * 1000;

  const summary = {
    generatedAt: now.toISOString(),
    sourceName: "",
    lookbackHours,
    sessionsExamined: 0,
    alreadyPublished: [],
    redundantClosedPullRequests: [],
    completionUpdatesSent: [],
    completionUpdatesSkipped: [],
    publishRequestsSent: [],
    newPullRequests: [],
    pending: [],
    errors: [],
  };

  const sources = await listAll("sources", "sources");
  const source = resolveSource(sources);
  if (!source) {
    throw new Error(
      `Jules source not found for owner/repo ${sourceOwner}/${sourceRepo}. Set JULES_SOURCE explicitly if needed.`,
    );
  }
  summary.sourceName = source.name;

  const sessions = await listAll("sessions", "sessions");
  const deferredSessionNames = readDeferredQueue();
  const sessionByName = new Map(
    sessions
      .filter((session) => typeof session?.name === "string" && session.name)
      .map((session) => [session.name, session]),
  );
  const deferredSessions = deferredSessionNames
    .map((sessionName) => sessionByName.get(sessionName))
    .filter(
      (session) => session && session?.sourceContext?.source === source.name,
    );
  const deferredSessionNameSet = new Set(
    deferredSessions.map((session) => session.name),
  );
  const recentSessions = sessions
    .filter((session) =>
      shouldConsiderSession(session, source.name, cutoffEpochMs),
    )
    .sort((a, b) => isoToEpochMs(b.updateTime) - isoToEpochMs(a.updateTime));
  const scopedSessions = [
    ...deferredSessions,
    ...recentSessions.filter(
      (session) => !deferredSessionNameSet.has(session.name),
    ),
  ].slice(0, maxSessions);
  summary.sessionsExamined = scopedSessions.length;
  const scopedSessionNameSet = new Set(
    scopedSessions.map((session) => session.name),
  );
  const nextDeferredSessionNames = new Set(
    deferredSessionNames.filter(
      (sessionName) => !scopedSessionNameSet.has(sessionName),
    ),
  );

  for (const session of scopedSessions) {
    const sessionId = session.id || pickSessionId(session.name);
    const pullRequests = readPullRequestOutputs(session);
    if (pullRequests.length > 0) {
      summary.alreadyPublished.push({
        sessionId,
        state: session.state,
        url: pullRequests[0]?.url ?? "",
      });

      const pullRequestStatuses = [];
      let hasStatusLookupFailure = false;
      for (const pullRequest of pullRequests) {
        try {
          const pullRequestStatus = await fetchPullRequestStatus(
            pullRequest.url,
          );
          pullRequestStatuses.push(pullRequestStatus);
        } catch (error) {
          hasStatusLookupFailure = true;
          summary.errors.push({
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (hasStatusLookupFailure) {
        nextDeferredSessionNames.add(session.name);
        summary.pending.push({
          sessionId,
          state: session.state,
          reason:
            "Deferred completion sync because one or more PR status checks failed.",
        });
        continue;
      }

      const hasOpenPullRequest = pullRequestStatuses.some(
        (pullRequestStatus) => pullRequestStatus.state === "open",
      );
      let cachedActivities;
      for (const pullRequestStatus of pullRequestStatuses) {
        if (!isRedundantClosedPullRequest(pullRequestStatus)) {
          continue;
        }

        try {
          summary.redundantClosedPullRequests.push({
            sessionId,
            state: session.state,
            prNumber: pullRequestStatus.number,
            url: pullRequestStatus.url,
            title: pullRequestStatus.title,
          });

          if (hasOpenPullRequest) {
            nextDeferredSessionNames.add(session.name);
            summary.pending.push({
              sessionId,
              state: session.state,
              reason:
                "Deferred completion sync because at least one PR output remains open.",
            });
            continue;
          }

          const markerForPullRequest = `${completionMarker} PR#${pullRequestStatus.number}`;
          if (!cachedActivities) {
            cachedActivities = await listAll(
              `${session.name}/activities`,
              "activities",
            );
          }
          if (hasMarker(cachedActivities, markerForPullRequest)) {
            summary.completionUpdatesSkipped.push({
              sessionId,
              state: session.state,
              prNumber: pullRequestStatus.number,
              url: pullRequestStatus.url,
            });
            continue;
          }

          await apiRequest("POST", `${session.name}:sendMessage`, {
            prompt: buildCompletionPrompt(
              markerForPullRequest,
              pullRequestStatus,
            ),
          });
          summary.completionUpdatesSent.push({
            sessionId,
            state: session.state,
            prNumber: pullRequestStatus.number,
            url: pullRequestStatus.url,
          });
          cachedActivities = [
            ...(cachedActivities ?? []),
            { marker: markerForPullRequest },
          ];
        } catch (error) {
          nextDeferredSessionNames.add(session.name);
          summary.errors.push({
            sessionId,
            error:
              error instanceof Error
                ? `PR #${pullRequestStatus.number}: ${error.message}`
                : `PR #${pullRequestStatus.number}: ${String(error)}`,
          });
        }
      }
      continue;
    }

    if (session.state !== "COMPLETED") {
      continue;
    }

    try {
      const activities = await listAll(
        `${session.name}/activities`,
        "activities",
      );
      if (hasAutopublishMarker(activities)) {
        nextDeferredSessionNames.add(session.name);
        summary.pending.push({
          sessionId,
          state: session.state,
          reason: "Autopublish request already sent earlier.",
        });
        continue;
      }

      await apiRequest("POST", `${session.name}:sendMessage`, {
        prompt: publishPrompt,
      });
      summary.publishRequestsSent.push({
        sessionId,
        state: session.state,
      });

      const pollResult = await pollForPullRequest(session.name);
      if (pollResult.pullRequests.length > 0) {
        for (const pullRequest of pollResult.pullRequests) {
          summary.newPullRequests.push({
            sessionId,
            state: pollResult.session.state,
            url: pullRequest.url,
            title: pullRequest.title ?? "",
          });
        }
      } else {
        nextDeferredSessionNames.add(session.name);
        summary.pending.push({
          sessionId,
          state: pollResult.session.state,
          reason: "No PR output detected after publish request polling window.",
        });
      }
    } catch (error) {
      nextDeferredSessionNames.add(session.name);
      summary.errors.push({
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  writeDeferredQueue(Array.from(nextDeferredSessionNames));

  const markdown = buildMarkdown(summary);
  fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(
    latestJsonPath,
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(markdownPath, markdown, "utf8");
  fs.writeFileSync(latestMarkdownPath, markdown, "utf8");

  console.log(`Jules auto-publish summary written: ${jsonPath}`);
  console.log(`Jules auto-publish latest: ${latestJsonPath}`);

  const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummaryPath) {
    fs.appendFileSync(stepSummaryPath, markdown, "utf8");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
