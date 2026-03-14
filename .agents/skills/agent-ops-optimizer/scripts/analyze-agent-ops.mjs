#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DEFAULTS = {
  days: 14,
  eventsPath: ".agents/memory/events.ndjson",
  configPath: ".codex/config.toml",
  writePath: "",
  jsonPath: "",
  rootPath: process.cwd(),
  topDomains: 5,
};

function parseIntArg(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseArgs(argv) {
  const options = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--days" && next) {
      options.days = parseIntArg(next, DEFAULTS.days);
      i += 1;
      continue;
    }
    if (token === "--events" && next) {
      options.eventsPath = next;
      i += 1;
      continue;
    }
    if (token === "--config" && next) {
      options.configPath = next;
      i += 1;
      continue;
    }
    if (token === "--write" && next) {
      options.writePath = next;
      i += 1;
      continue;
    }
    if (token === "--json" && next) {
      options.jsonPath = next;
      i += 1;
      continue;
    }
    if (token === "--root" && next) {
      options.rootPath = next;
      i += 1;
      continue;
    }
    if (token === "--top-domains" && next) {
      options.topDomains = parseIntArg(next, DEFAULTS.topDomains);
      i += 1;
      continue;
    }
  }
  return options;
}

function safeReadFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
}

function parseNdjson(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function countBy(items, keyFn) {
  const counts = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function mapToSortedArray(mapValue, limit = 999) {
  return Array.from(mapValue.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function normalizePath(input) {
  return String(input ?? "").replaceAll("\\", "/");
}

function classifyDomain(filePath) {
  const value = normalizePath(filePath);
  if (
    value.startsWith("app/") ||
    value.startsWith("components/") ||
    value.startsWith("hooks/") ||
    value.startsWith("stores/") ||
    value.startsWith("theme/")
  ) {
    return "frontend";
  }
  if (
    value.startsWith("supabase/functions/") ||
    value.startsWith("supabase/migrations/") ||
    value === "schema.sql"
  ) {
    return "backend";
  }
  if (value.startsWith("scripts/") || value.startsWith(".github/workflows/")) {
    return "automation";
  }
  if (value.startsWith("__tests__/")) {
    return "tests";
  }
  if (
    value.startsWith("docs/") ||
    value.startsWith(".agents/") ||
    value === "AI_RULES.md" ||
    value === "AGENTS.md" ||
    value === "DEVELOPMENT.md" ||
    value === "CODEX.md"
  ) {
    return "docs-policy";
  }
  return "other";
}

function collectGitDomains(rootPath, days) {
  const gitResult = spawnSync(
    "git",
    [
      "-C",
      rootPath,
      "log",
      `--since=${days} days ago`,
      "--pretty=format:__COMMIT__",
      "--name-only",
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );

  if (gitResult.status !== 0) {
    return {
      commits: 0,
      files: 0,
      domains: [],
      error: String(gitResult.stderr || gitResult.stdout || "git log failed"),
    };
  }

  const lines = String(gitResult.stdout ?? "").split("\n");
  const allFiles = [];
  let current = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "__COMMIT__") {
      if (current.length > 0) {
        allFiles.push(...current);
      }
      current = [];
      continue;
    }
    if (!line) {
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) {
    allFiles.push(...current);
  }

  const domainCounts = new Map();
  for (const file of allFiles) {
    const domain = classifyDomain(file);
    domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }

  const totalFiles = allFiles.length;
  const domainSummary = mapToSortedArray(domainCounts).map((entry) => ({
    ...entry,
    share: totalFiles > 0 ? Number((entry.count / totalFiles).toFixed(3)) : 0,
  }));

  const commits = lines.filter((line) => line.trim() === "__COMMIT__").length;
  return { commits, files: totalFiles, domains: domainSummary, error: "" };
}

function parseProfiles(configContent) {
  const profileMatches = Array.from(
    configContent.matchAll(/^\[profiles\.([^\]]+)\]/gm),
  );
  const agentMatches = Array.from(
    configContent.matchAll(/^\[agents\.([^\]]+)\]/gm),
  );
  return {
    profiles: new Set(profileMatches.map((match) => String(match[1]).trim())),
    agents: new Set(agentMatches.map((match) => String(match[1]).trim())),
  };
}

function getEventMetrics(events) {
  const failureEvents = events.filter((event) =>
    Array.isArray(event.tags) ? event.tags.includes("command-failure") : false,
  );
  const tagCounts = new Map();
  for (const event of failureEvents) {
    for (const tag of event.tags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const coordinationPattern =
    /rebase|worktree|stash|cannot switch branch|unstaged changes|already used by worktree|mergeable|bad object refs\/stash|head branch is not up to date/i;
  const ciSignalPattern =
    /checks|pending|required status checks|workflow failure|status check|mergepullrequest/i;
  const timeoutPattern = /timeout|timed out|time out/i;
  const authPattern = /auth|jwt|supabase|token|edge function/i;

  let coordinationIncidents = 0;
  let ciIncidents = 0;
  let timeoutIncidents = 0;
  let backendAuthSignals = 0;

  for (const event of failureEvents) {
    const haystack = `${event.trigger ?? ""}\n${event.mistake ?? ""}`;
    if (coordinationPattern.test(haystack)) {
      coordinationIncidents += 1;
    }
    if (ciSignalPattern.test(haystack)) {
      ciIncidents += 1;
    }
    if (timeoutPattern.test(haystack)) {
      timeoutIncidents += 1;
    }
    if (authPattern.test(haystack)) {
      backendAuthSignals += 1;
    }
  }

  const triggerCounts = countBy(failureEvents, (event) => event.trigger ?? "");

  return {
    totalEvents: events.length,
    failureEvents: failureEvents.length,
    topTags: mapToSortedArray(tagCounts, 8),
    topTriggers: mapToSortedArray(triggerCounts, 8),
    coordinationIncidents,
    ciIncidents,
    timeoutIncidents,
    backendAuthSignals,
  };
}

function findDomainShare(domains, name) {
  const match = domains.find((item) => item.name === name);
  return match ? match.share : 0;
}

function recommendRuntimeParams(metrics, domains) {
  const activeDomains = domains.filter((item) => item.share >= 0.15).length;

  let maxParallelThreads = 3;
  if (metrics.coordinationIncidents >= 6 || metrics.failureEvents >= 35) {
    maxParallelThreads = 1;
  } else if (
    metrics.coordinationIncidents >= 3 ||
    metrics.failureEvents >= 20
  ) {
    maxParallelThreads = 2;
  } else if (activeDomains >= 3 && metrics.failureEvents <= 8) {
    maxParallelThreads = 4;
  }

  let maxDelegationDepth = 2;
  if (metrics.coordinationIncidents >= 4) {
    maxDelegationDepth = 1;
  } else if (activeDomains >= 4 && metrics.coordinationIncidents === 0) {
    maxDelegationDepth = 3;
  }

  let maxRuntimeMinutes = 20;
  if (metrics.ciIncidents >= 5) {
    maxRuntimeMinutes = 30;
  }
  if (metrics.timeoutIncidents >= 2) {
    maxRuntimeMinutes += 15;
  }

  return {
    maxParallelThreads,
    maxDelegationDepth,
    maxRuntimeMinutes,
    rationale: {
      activeDomains,
      coordinationIncidents: metrics.coordinationIncidents,
      ciIncidents: metrics.ciIncidents,
      timeoutIncidents: metrics.timeoutIncidents,
    },
  };
}

function buildAgentCandidates(domains, metrics, existingProfiles) {
  const candidates = [];
  const frontendShare = findDomainShare(domains, "frontend");
  const backendShare = findDomainShare(domains, "backend");
  const automationShare = findDomainShare(domains, "automation");
  const docsShare = findDomainShare(domains, "docs-policy");

  if (
    automationShare >= 0.2 &&
    !existingProfiles.has("automation_implementer")
  ) {
    candidates.push({
      profile: "automation_implementer",
      role: "Implementer",
      reason:
        "Automation/workflow files dominate recent changes and merit a dedicated implementation profile.",
      promptFile: ".codex/agents/automation-implementer.md",
    });
  }

  if (metrics.ciIncidents >= 4 && !existingProfiles.has("ci_triage_reviewer")) {
    candidates.push({
      profile: "ci_triage_reviewer",
      role: "Reviewer",
      reason:
        "Frequent check-status incidents indicate value in a specialized CI triage reviewer profile.",
      promptFile: ".codex/agents/ci-triage-reviewer.md",
    });
  }

  if (
    backendShare >= 0.2 &&
    metrics.backendAuthSignals >= 2 &&
    !existingProfiles.has("backend_auth_reviewer")
  ) {
    candidates.push({
      profile: "backend_auth_reviewer",
      role: "Reviewer",
      reason:
        "Backend/auth signals recur in recent failures; add a reviewer profile focused on Supabase auth and edge-function safety.",
      promptFile: ".codex/agents/backend-auth-reviewer.md",
    });
  }

  if (frontendShare >= 0.3 && !existingProfiles.has("frontend_implementer")) {
    candidates.push({
      profile: "frontend_implementer",
      role: "Implementer",
      reason:
        "Frontend paths are a primary change hotspot; a focused implementer profile can reduce context switching.",
      promptFile: ".codex/agents/frontend-implementer.md",
    });
  }

  if (docsShare >= 0.2 && !existingProfiles.has("docs_policy_curator")) {
    candidates.push({
      profile: "docs_policy_curator",
      role: "Implementer",
      reason:
        "Docs and policy files are edited frequently enough to justify a dedicated docs/policy curation profile.",
      promptFile: ".codex/agents/docs-policy-curator.md",
    });
  }

  return candidates;
}

function formatTomlSnippet(candidate) {
  const name = candidate.profile;
  return [
    `[agents.${name}]`,
    `model = "gpt-5.4"`,
    `description = "${candidate.reason}"`,
    "",
    `[profiles.${name}]`,
    `prompt_file = "${candidate.promptFile}"`,
    `approval_policy = "on-request"`,
    `sandbox_mode = "read-only"`,
    `model = "gpt-5.4"`,
    `model_reasoning_effort = "high"`,
  ].join("\n");
}

function toMarkdown(report) {
  const domainLines =
    report.git.domains.length === 0
      ? "- No git domain data available."
      : report.git.domains
          .slice(0, report.options.topDomains)
          .map(
            (domain) =>
              `- ${domain.name}: ${domain.count} files (${Math.round(domain.share * 100)}%)`,
          )
          .join("\n");

  const tagLines =
    report.events.topTags.length === 0
      ? "- No failure-tag data in window."
      : report.events.topTags
          .map((tag) => `- ${tag.name}: ${tag.count}`)
          .join("\n");

  const triggerLines =
    report.events.topTriggers.length === 0
      ? "- No trigger data in window."
      : report.events.topTriggers
          .map((trigger) => `- ${trigger.name}: ${trigger.count}`)
          .join("\n");

  const candidateLines =
    report.newAgentCandidates.length === 0
      ? "- No new agent profile recommendation in this window."
      : report.newAgentCandidates
          .map(
            (candidate) =>
              `- \`${candidate.profile}\` (${candidate.role}): ${candidate.reason}`,
          )
          .join("\n");

  const snippetBlocks =
    report.newAgentCandidates.length === 0
      ? ""
      : `\n## Suggested Profile Snippets\n\n${report.newAgentCandidates
          .map(
            (candidate) =>
              `### ${candidate.profile}\n\n\`\`\`toml\n${formatTomlSnippet(candidate)}\n\`\`\``,
          )
          .join("\n\n")}\n`;

  return `# Agent Ops Optimization Report

Window: last ${report.options.days} day(s)
Generated: ${report.generatedAt}

## Usage Signals

- Total memory events: ${report.events.totalEvents}
- Command-failure events: ${report.events.failureEvents}
- Coordination incidents: ${report.events.coordinationIncidents}
- CI/check incidents: ${report.events.ciIncidents}
- Timeout incidents: ${report.events.timeoutIncidents}

### Top Failure Tags

${tagLines}

### Top Failure Triggers

${triggerLines}

## Development Pattern Summary

- Git commits in window: ${report.git.commits}
- Classified file touches: ${report.git.files}

### Domain Distribution

${domainLines}

## Recommended Runtime Parameters

- max_parallel_threads: ${report.recommendations.maxParallelThreads}
- max_delegation_depth: ${report.recommendations.maxDelegationDepth}
- max_runtime_minutes: ${report.recommendations.maxRuntimeMinutes}

Rationale:
- Active domains (>=15% share): ${report.recommendations.rationale.activeDomains}
- Coordination incidents: ${report.recommendations.rationale.coordinationIncidents}
- CI incidents: ${report.recommendations.rationale.ciIncidents}
- Timeout incidents: ${report.recommendations.rationale.timeoutIncidents}

## New Agent Profile Candidates

${candidateLines}
${snippetBlocks}
## Apply/Review Loop

1. If parameter recommendations are stable for 2+ runs, update orchestration defaults.
2. If a candidate profile appears in 2+ consecutive runs, scaffold the prompt file and add profile blocks in .codex/config.toml.
3. Re-run this report after major milestone changes.
`;
}

function ensureParentDir(targetPath) {
  const parent = path.dirname(targetPath);
  fs.mkdirSync(parent, { recursive: true });
}

function resolveFile(base, value) {
  if (!value) {
    return "";
  }
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(base, value);
}

function toRepoRelative(rootPath, targetPath) {
  const relative = path.relative(rootPath, targetPath);
  if (!relative || relative === ".") {
    return ".";
  }
  return relative.split(path.sep).join("/");
}

function buildReport(options) {
  const rootPath = path.resolve(options.rootPath);
  const eventsPath = resolveFile(rootPath, options.eventsPath);
  const configPath = resolveFile(rootPath, options.configPath);

  const now = Date.now();
  const cutoffMs = now - options.days * 24 * 60 * 60 * 1000;

  const eventsAll = parseNdjson(safeReadFile(eventsPath));
  const events = eventsAll.filter((event) => {
    const timestamp = new Date(event.timestamp ?? event.date ?? 0).getTime();
    if (Number.isNaN(timestamp)) {
      return false;
    }
    return timestamp >= cutoffMs;
  });

  const eventMetrics = getEventMetrics(events);
  const gitSummary = collectGitDomains(rootPath, options.days);
  const configContent = safeReadFile(configPath);
  const profileSummary = parseProfiles(configContent);
  const recommendations = recommendRuntimeParams(
    eventMetrics,
    gitSummary.domains,
  );
  const newAgentCandidates = buildAgentCandidates(
    gitSummary.domains,
    eventMetrics,
    profileSummary.profiles,
  );

  return {
    generatedAt: new Date().toISOString(),
    options: {
      days: options.days,
      rootPath: ".",
      eventsPath: toRepoRelative(rootPath, eventsPath),
      configPath: toRepoRelative(rootPath, configPath),
      topDomains: options.topDomains,
    },
    events: eventMetrics,
    git: gitSummary,
    existingProfiles: Array.from(profileSummary.profiles).sort(),
    recommendations,
    newAgentCandidates,
  };
}

function writeOutputs(report, options) {
  const outputRoot = path.resolve(options.rootPath);
  const markdown = toMarkdown(report);
  if (options.writePath) {
    const writeTarget = resolveFile(outputRoot, options.writePath);
    ensureParentDir(writeTarget);
    fs.writeFileSync(writeTarget, markdown, "utf8");
  } else {
    process.stdout.write(`${markdown}\n`);
  }

  if (options.jsonPath) {
    const jsonTarget = resolveFile(outputRoot, options.jsonPath);
    ensureParentDir(jsonTarget);
    fs.writeFileSync(
      jsonTarget,
      `${JSON.stringify(report, null, 2)}\n`,
      "utf8",
    );
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport(options);
  writeOutputs(report, options);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[agent-ops-optimizer] ${message}`);
  process.exit(1);
}
