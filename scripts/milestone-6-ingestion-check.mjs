#!/usr/bin/env node

import fs from "fs";
import path from "path";

const defaultWindowHours = 24;
const defaultRollupDays = 30;

const usageText = `Usage: npm run rollout:ingestion -- [--window-hours <n>] [--days <n>] [--user-id <uuid>] [--probe-webhook] [--dry-run] [--output-dir <path>]

Captures Milestone 6 ingestion reliability evidence for:
- plaidWebhook intake
- raw_transactions queue
- pending_insights queue
- downstream rollup consumer (getNetWorthSlice)

Options:
  --window-hours  Time window for recent-event metrics (default: 24)
  --days          Days for getNetWorthSlice rollup probe (default: 30)
  --user-id       Optional explicit user id for rollup probe
  --probe-webhook Send a synthetic plaidWebhook event and verify queue inserts
  --dry-run       Validate config and emit artifact skeleton only (no network calls)
  --output-dir    Output directory for artifacts (default: artifacts/rollout-ingestion/<timestamp>)
  --help          Show this message

Required environment variables:
  EXPO_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`;

function parseEnvFile(content) {
  const map = new Map();

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (key) {
      map.set(key, value);
    }
  }

  return map;
}

function loadLocalEnv() {
  const envFileOrder = [".env", ".env.local"];
  const cwd = process.cwd();

  for (const envFile of envFileOrder) {
    const resolvedPath = path.resolve(cwd, envFile);
    if (!fs.existsSync(resolvedPath)) continue;

    const parsed = parseEnvFile(fs.readFileSync(resolvedPath, "utf8"));
    for (const [key, value] of parsed.entries()) {
      if (typeof process.env[key] === "undefined") {
        process.env[key] = value;
      }
    }
  }
}

function parsePositiveInteger(input, label) {
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `${label} must be a positive integer. Received "${input}".`,
    );
  }
  return parsed;
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    help: false,
    outputDir: "",
    windowHours: defaultWindowHours,
    rollupDays: defaultRollupDays,
    userId: "",
    probeWebhook: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--probe-webhook") {
      options.probeWebhook = true;
      continue;
    }

    if (arg === "--window-hours") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --window-hours");
      options.windowHours = parsePositiveInteger(value, "--window-hours");
      index += 1;
      continue;
    }

    if (arg === "--days") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --days");
      options.rollupDays = parsePositiveInteger(value, "--days");
      index += 1;
      continue;
    }

    if (arg === "--user-id") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --user-id");
      options.userId = value.trim();
      index += 1;
      continue;
    }

    if (arg === "--output-dir") {
      const value = argv[index + 1];
      if (!value) throw new Error("Missing value for --output-dir");
      options.outputDir = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function nowForPath() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const sec = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}${sec}`;
}

function resolveOutputDir(explicitOutputDir) {
  if (explicitOutputDir) {
    return path.resolve(process.cwd(), explicitOutputDir);
  }

  return path.resolve(
    process.cwd(),
    "artifacts",
    "rollout-ingestion",
    nowForPath(),
  );
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, {
    recursive: true,
  });
}

function parseContentRangeCount(contentRange) {
  if (!contentRange || !contentRange.includes("/")) return null;
  const parts = contentRange.split("/");
  if (parts.length !== 2) return null;
  const parsed = Number.parseInt(parts[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function parseJsonPayload(response) {
  const rawText = await response.text();
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function extractRequestId(payload, response) {
  const payloadRequestId =
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof payload.request_id === "string"
      ? payload.request_id
      : null;

  return payloadRequestId ?? response.headers.get("x-request-id");
}

function buildMarkdownReport(report) {
  const lines = [
    "# Milestone 6 Ingestion Check Report",
    "",
    `- Timestamp: ${report.timestamp}`,
    `- Mode: ${report.mode}`,
    `- Supabase URL: ${report.summary.supabaseUrl}`,
    `- Window hours: ${report.summary.windowHours}`,
    `- Rollup days: ${report.summary.rollupDays}`,
    `- Webhook probe enabled: ${report.summary.probeWebhook}`,
    "",
  ];

  if (report.mode === "dry_run") {
    lines.push(
      "Dry run only. No network calls were executed and no live metrics were collected.",
      "",
    );
    return lines.join("\n");
  }

  lines.push("## Counts");
  lines.push("");
  lines.push(
    `- raw_transactions total: ${report.metrics.rawTransactionsTotal}`,
  );
  lines.push(
    `- raw_transactions recent: ${report.metrics.rawTransactionsRecent}`,
  );
  lines.push(
    `- raw_transactions recent failed: ${report.metrics.rawTransactionsRecentFailed}`,
  );
  lines.push(
    `- pending_insights total: ${report.metrics.pendingInsightsTotal}`,
  );
  lines.push(
    `- pending_insights recent: ${report.metrics.pendingInsightsRecent}`,
  );
  lines.push(
    `- pending_insights active: ${report.metrics.pendingInsightsActive}`,
  );
  lines.push(
    `- pending_insights failed (recent): ${report.metrics.pendingInsightsRecentFailed}`,
  );
  lines.push(`- transactions recent: ${report.metrics.transactionsRecent}`);
  lines.push("");

  lines.push("## Webhook Probe");
  lines.push("");
  lines.push(`- Status: ${report.webhookProbe.status}`);
  lines.push(`- Webhook id: ${report.webhookProbe.webhookId ?? "N/A"}`);
  lines.push(`- Request id: ${report.webhookProbe.requestId ?? "N/A"}`);
  lines.push(
    `- raw_transactions rows: ${report.webhookProbe.rawTransactionsRows ?? "N/A"}`,
  );
  lines.push(
    `- pending_insights rows: ${report.webhookProbe.pendingInsightsRows ?? "N/A"}`,
  );
  if (report.webhookProbe.error) {
    lines.push(`- Error: ${report.webhookProbe.error}`);
  }
  lines.push("");

  lines.push("## Rollup Probe");
  lines.push("");
  lines.push(`- User id: ${report.rollupProbe.userId ?? "N/A"}`);
  lines.push(`- Status: ${report.rollupProbe.status}`);
  lines.push(`- Request id: ${report.rollupProbe.requestId ?? "N/A"}`);
  lines.push(`- Rows returned: ${report.rollupProbe.rowsReturned ?? "N/A"}`);
  if (report.rollupProbe.error) {
    lines.push(`- Error: ${report.rollupProbe.error}`);
  }
  lines.push("");

  lines.push("## Warnings");
  lines.push("");
  if (report.warnings.length === 0) {
    lines.push("- None");
  } else {
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

function latestUserIdFromRows(...rowsGroups) {
  for (const rows of rowsGroups) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (row && typeof row.user_id === "string" && row.user_id.length > 0) {
        return row.user_id;
      }
    }
  }
  return null;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usageText);
    return;
  }

  loadLocalEnv();

  const requiredEnvKeys = [
    "EXPO_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missingKeys = requiredEnvKeys.filter((key) => {
    const value = process.env[key];
    return !(typeof value === "string" && value.trim().length > 0);
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(", ")}`,
    );
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL.trim().replace(
    /\/$/,
    "",
  );
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();
  const restBaseUrl = `${supabaseUrl}/rest/v1`;
  const functionsBaseUrl = `${supabaseUrl}/functions/v1`;
  const outputDir = resolveOutputDir(options.outputDir);
  const windowStartIso = new Date(
    Date.now() - options.windowHours * 60 * 60 * 1000,
  ).toISOString();

  ensureDirectory(outputDir);

  const report = {
    timestamp: new Date().toISOString(),
    mode: options.dryRun ? "dry_run" : "live",
    summary: {
      supabaseUrl,
      restBaseUrl,
      functionsBaseUrl,
      outputDir,
      windowHours: options.windowHours,
      windowStartIso,
      rollupDays: options.rollupDays,
      probeWebhook: options.probeWebhook,
    },
    metrics: null,
    webhookProbe: {
      status: options.probeWebhook
        ? options.dryRun
          ? "dry_run"
          : "pending"
        : "not_requested",
      webhookId: null,
      requestId: null,
      rawTransactionsRows: null,
      pendingInsightsRows: null,
      error: null,
    },
    rollupProbe: {
      userId: options.userId || null,
      status: "skipped",
      requestId: null,
      rowsReturned: null,
      error: null,
    },
    warnings: [],
    samples: {
      rawTransactions: [],
      pendingInsights: [],
      transactions: [],
      accounts: [],
      plaidItems: [],
    },
  };

  if (!options.dryRun) {
    const fetchRest = async (table, queryEntries, headers = {}) => {
      const query = new URLSearchParams(queryEntries);
      const response = await fetch(
        `${restBaseUrl}/${table}?${query.toString()}`,
        {
          method: "GET",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            ...headers,
          },
        },
      );
      const payload = await parseJsonPayload(response);
      if (!response.ok) {
        throw new Error(
          `${table} query failed (${response.status}): ${JSON.stringify(payload)}`,
        );
      }
      return {
        payload,
        headers: response.headers,
      };
    };

    const fetchTableCount = async (table, filters = []) => {
      const response = await fetchRest(table, [["select", "id"], ...filters], {
        Prefer: "count=exact",
        "Range-Unit": "items",
        Range: "0-0",
      });
      return parseContentRangeCount(response.headers.get("content-range")) ?? 0;
    };

    const fetchTableRows = async ({
      table,
      select,
      filters = [],
      order = "created_at.desc",
      limit = 5,
    }) => {
      const response = await fetchRest(table, [
        ["select", select],
        ["order", order],
        ["limit", String(limit)],
        ...filters,
      ]);
      return Array.isArray(response.payload) ? response.payload : [];
    };

    const [
      rawTransactionsTotal,
      rawTransactionsRecent,
      rawTransactionsRecentFailed,
      pendingInsightsTotal,
      pendingInsightsRecent,
      pendingInsightsActive,
      pendingInsightsRecentFailed,
      transactionsRecent,
      rawTransactionsSample,
      pendingInsightsSample,
      transactionsSample,
      accountsSample,
      plaidItemsSample,
    ] = await Promise.all([
      fetchTableCount("raw_transactions"),
      fetchTableCount("raw_transactions", [
        ["created_at", `gte.${windowStartIso}`],
      ]),
      fetchTableCount("raw_transactions", [
        ["created_at", `gte.${windowStartIso}`],
        ["status", "eq.failed"],
      ]),
      fetchTableCount("pending_insights"),
      fetchTableCount("pending_insights", [
        ["created_at", `gte.${windowStartIso}`],
      ]),
      fetchTableCount("pending_insights", [
        ["status", "in.(pending,processing)"],
      ]),
      fetchTableCount("pending_insights", [
        ["created_at", `gte.${windowStartIso}`],
        ["status", "eq.failed"],
      ]),
      fetchTableCount("transactions", [
        ["created_at", `gte.${windowStartIso}`],
      ]),
      fetchTableRows({
        table: "raw_transactions",
        select: "id,plaid_item_id,status,error_message,created_at,processed_at",
        limit: 5,
      }),
      fetchTableRows({
        table: "pending_insights",
        select: "id,user_id,status,error_message,created_at,processed_at",
        limit: 5,
      }),
      fetchTableRows({
        table: "transactions",
        select: "id,user_id,plaid_item_id,transaction_date,created_at",
        limit: 5,
      }),
      fetchTableRows({
        table: "accounts",
        select: "id,user_id,plaid_item_id,created_at",
        limit: 5,
      }),
      fetchTableRows({
        table: "plaid_items",
        select: "id,user_id,plaid_item_id,created_at",
        limit: 5,
      }),
    ]);

    report.metrics = {
      rawTransactionsTotal,
      rawTransactionsRecent,
      rawTransactionsRecentFailed,
      pendingInsightsTotal,
      pendingInsightsRecent,
      pendingInsightsActive,
      pendingInsightsRecentFailed,
      transactionsRecent,
    };

    report.samples.rawTransactions = rawTransactionsSample;
    report.samples.pendingInsights = pendingInsightsSample;
    report.samples.transactions = transactionsSample;
    report.samples.accounts = accountsSample;
    report.samples.plaidItems = plaidItemsSample;

    const candidateUserId =
      options.userId ||
      latestUserIdFromRows(
        transactionsSample,
        accountsSample,
        plaidItemsSample,
      );

    if (options.probeWebhook) {
      const verificationCode = process.env.PLAID_VERIFICATION_CODE?.trim();
      if (!verificationCode) {
        report.webhookProbe.status = "skipped";
        report.webhookProbe.error =
          "PLAID_VERIFICATION_CODE missing in environment.";
        report.warnings.push(
          "Webhook probe requested but PLAID_VERIFICATION_CODE is unavailable.",
        );
      } else {
        const webhookId = `milestone6-probe-${Date.now()}`;
        const itemId =
          plaidItemsSample.find(
            (row) => row && typeof row.plaid_item_id === "string",
          )?.plaid_item_id ?? `probe-item-${Date.now()}`;
        const environment = (
          process.env.PLAID_ENV?.trim().toLowerCase() || "sandbox"
        ).slice(0, 24);

        report.webhookProbe.webhookId = webhookId;

        const probeResponse = await fetch(`${functionsBaseUrl}/plaidWebhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "plaid-verification-code": verificationCode,
          },
          body: JSON.stringify({
            webhook_type: "TRANSACTIONS",
            webhook_code: "TRANSACTIONS_WEBHOOK",
            item_id: itemId,
            environment,
            webhook_id: webhookId,
            ...(candidateUserId ? { user_id: candidateUserId } : {}),
          }),
        });

        const probePayload = await parseJsonPayload(probeResponse);
        const probeRequestId = extractRequestId(probePayload, probeResponse);
        report.webhookProbe.requestId = probeRequestId;

        if (!probeResponse.ok) {
          report.webhookProbe.status = "failed";
          report.webhookProbe.error = JSON.stringify(probePayload);
          report.warnings.push(
            `Webhook probe failed (${probeResponse.status}); inspect plaidWebhook logs.`,
          );
        } else {
          const [rawProbeRows, pendingProbeRows] = await Promise.all([
            fetchTableRows({
              table: "raw_transactions",
              select: "id,webhook_id,created_at",
              filters: [["webhook_id", `eq.${webhookId}`]],
              limit: 5,
            }),
            fetchTableRows({
              table: "pending_insights",
              select: "id,webhook_id,created_at",
              filters: [["webhook_id", `eq.${webhookId}`]],
              limit: 5,
            }),
          ]);

          report.webhookProbe.rawTransactionsRows = rawProbeRows.length;
          report.webhookProbe.pendingInsightsRows = pendingProbeRows.length;

          if (rawProbeRows.length > 0 && pendingProbeRows.length > 0) {
            report.webhookProbe.status = "ok";
          } else {
            report.webhookProbe.status = "partial";
            report.warnings.push(
              `Webhook probe inserted incomplete rows for webhook_id=${webhookId} (raw=${rawProbeRows.length}, pending=${pendingProbeRows.length}).`,
            );
          }
        }
      }
    }

    if (rawTransactionsRecent > 0 && pendingInsightsRecent === 0) {
      report.warnings.push(
        "raw_transactions has recent events but pending_insights has no recent queue entries.",
      );
    }
    if (pendingInsightsRecentFailed > 0) {
      report.warnings.push(
        `pending_insights has ${pendingInsightsRecentFailed} recent failed entries.`,
      );
    }
    if (pendingInsightsActive > 25) {
      report.warnings.push(
        `pending_insights active queue is elevated (${pendingInsightsActive}).`,
      );
    }
    if (rawTransactionsRecent > 0 && transactionsRecent === 0) {
      report.warnings.push(
        "raw_transactions has recent webhook intake but transactions has no recent normalized rows.",
      );
    }
    if (rawTransactionsRecent === 0) {
      report.warnings.push(
        `No raw_transactions events in the last ${options.windowHours} hours.`,
      );
    }

    const rollupUserId = candidateUserId;
    report.rollupProbe.userId = rollupUserId;

    if (rollupUserId) {
      const response = await fetch(`${functionsBaseUrl}/getNetWorthSlice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_id: rollupUserId,
          days: options.rollupDays,
        }),
      });

      const payload = await parseJsonPayload(response);
      const requestId = extractRequestId(payload, response);

      report.rollupProbe.requestId = requestId;

      if (!response.ok) {
        report.rollupProbe.status = "failed";
        report.rollupProbe.error = JSON.stringify(payload);
        report.warnings.push(
          `getNetWorthSlice probe failed for user ${rollupUserId}.`,
        );
      } else {
        report.rollupProbe.status = "ok";
        report.rollupProbe.rowsReturned = Array.isArray(payload)
          ? payload.length
          : 0;
      }
    } else {
      report.rollupProbe.status = "skipped";
      report.warnings.push(
        "No candidate user_id found in recent transactions/accounts/plaid_items for rollup probe.",
      );
    }
  }

  const jsonReportPath = path.resolve(outputDir, "ingestion-check.json");
  const markdownReportPath = path.resolve(outputDir, "ingestion-check.md");

  fs.writeFileSync(
    jsonReportPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    markdownReportPath,
    `${buildMarkdownReport(report)}\n`,
    "utf8",
  );

  if (options.dryRun) {
    console.log("[rollout:ingestion] Dry run completed.");
  } else {
    console.log("[rollout:ingestion] Live ingestion check completed.");
  }
  console.log(`[rollout:ingestion] JSON report: ${jsonReportPath}`);
  console.log(`[rollout:ingestion] Markdown report: ${markdownReportPath}`);

  if (!options.dryRun) {
    console.log(`[rollout:ingestion] Warning count: ${report.warnings.length}`);
    if (report.webhookProbe.requestId) {
      console.log(
        `[rollout:ingestion] plaidWebhook request_id: ${report.webhookProbe.requestId}`,
      );
    }
    if (report.rollupProbe.requestId) {
      console.log(
        `[rollout:ingestion] getNetWorthSlice request_id: ${report.rollupProbe.requestId}`,
      );
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[rollout:ingestion] ${message}`);
  process.exit(1);
});
