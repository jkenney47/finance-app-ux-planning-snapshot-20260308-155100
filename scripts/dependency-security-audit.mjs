#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BLOCKING_SEVERITIES = new Set(["critical", "high"]);
const SEVERITY_ORDER = new Map([
  ["critical", 0],
  ["high", 1],
  ["moderate", 2],
  ["low", 3],
  ["info", 4],
]);

function parseArgs(argv) {
  let fromFile = null;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--from-file") {
      continue;
    }

    fromFile = argv[index + 1] ?? null;
    index += 1;
  }

  return { fromFile };
}

function extractJsonPayload(rawOutput) {
  const trimmed = rawOutput.trim();

  if (!trimmed) {
    throw new Error("Audit output did not contain a JSON payload.");
  }

  const firstBrace = trimmed.indexOf("{");

  if (firstBrace === -1) {
    throw new Error("Audit output did not contain a JSON payload.");
  }

  for (
    let closingBrace = trimmed.lastIndexOf("}");
    closingBrace > firstBrace;
    closingBrace = trimmed.lastIndexOf("}", closingBrace - 1)
  ) {
    const candidate = trimmed.slice(firstBrace, closingBrace + 1);

    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Try the next-most-recent closing brace until a valid JSON payload is found.
    }
  }

  throw new Error("Audit output did not contain a parseable JSON payload.");
}

function loadAuditReport(fromFile) {
  if (fromFile) {
    return JSON.parse(extractJsonPayload(readFileSync(fromFile, "utf8")));
  }

  const result = spawnSync("npm", ["audit", "--json"], {
    encoding: "utf8",
  });

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();

  if (!output) {
    throw new Error("npm audit returned no output.");
  }

  return JSON.parse(extractJsonPayload(output));
}

function formatFix(fixAvailable) {
  if (!fixAvailable) {
    return "no automated fix available";
  }

  if (fixAvailable === true) {
    return "npm audit fix";
  }

  const majorMarker = fixAvailable.isSemVerMajor ? " (semver-major)" : "";
  return `${fixAvailable.name}@${fixAvailable.version}${majorMarker}`;
}

function collectBlockingFindings(vulnerabilities = {}) {
  return Object.values(vulnerabilities)
    .filter((entry) => BLOCKING_SEVERITIES.has(entry.severity))
    .sort((left, right) => {
      const severityDelta =
        (SEVERITY_ORDER.get(left.severity) ?? 99) -
        (SEVERITY_ORDER.get(right.severity) ?? 99);

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return left.name.localeCompare(right.name);
    });
}

function formatCounts(counts = {}) {
  return [
    `critical=${counts.critical ?? 0}`,
    `high=${counts.high ?? 0}`,
    `moderate=${counts.moderate ?? 0}`,
    `low=${counts.low ?? 0}`,
    `total=${counts.total ?? 0}`,
  ].join(" ");
}

function main() {
  const { fromFile } = parseArgs(process.argv.slice(2));
  const report = loadAuditReport(fromFile);

  if (report.error) {
    const errorSummary =
      typeof report.error.summary === "string"
        ? report.error.summary.trim()
        : "";
    const topLevelMessage =
      typeof report.message === "string" ? report.message.trim() : "";
    const errorDetail =
      typeof report.error.detail === "string" ? report.error.detail.trim() : "";
    const errorMessage =
      errorSummary ||
      topLevelMessage ||
      errorDetail ||
      JSON.stringify(report.error);
    console.error(`[security:audit:summary] npm audit failed: ${errorMessage}`);
    process.exit(1);
  }

  if (!report.vulnerabilities || typeof report.vulnerabilities !== "object") {
    console.error(
      "[security:audit:summary] npm audit payload missing vulnerabilities data.",
    );
    process.exit(1);
  }

  const counts = report.metadata?.vulnerabilities ?? {};
  const blockingFindings = collectBlockingFindings(report.vulnerabilities);
  const isPassing = blockingFindings.length === 0;

  console.log(
    `[security:audit:summary] ${isPassing ? "PASS" : "FAIL"} ${formatCounts(counts)}`,
  );

  if (blockingFindings.length > 0) {
    console.error("[security:audit:summary] Blocking vulnerabilities:");

    for (const finding of blockingFindings) {
      console.error(
        `- ${finding.severity} ${finding.name} -> ${formatFix(finding.fixAvailable)}`,
      );
    }
  }

  process.exit(isPassing ? 0 : 1);
}

main();
