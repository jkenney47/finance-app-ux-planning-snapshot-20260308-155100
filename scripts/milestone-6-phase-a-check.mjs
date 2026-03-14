#!/usr/bin/env node

import fs from "fs";
import path from "path";

const allowedPhases = new Set(["A2", "A3", "ALL"]);
const defaultPhase = "ALL";

const requiredBaseEnvKeys = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];

const requiredLiveOnlyEnvKeys = [
  "MILESTONE6_QA_EMAIL",
  "MILESTONE6_QA_PASSWORD",
];

const usageText = `Usage: npm run rollout:phase-a -- [--phase A2|A3|ALL] [--dry-run] [--output-dir <path>]

Captures Milestone 6 Phase A request-id evidence for Plaid edge functions.

Options:
  --phase       Target phase to verify (default: ALL)
  --dry-run     Validate config and write artifact skeleton only (no network calls)
  --output-dir  Output directory for artifacts (default: artifacts/rollout-phase-a/<timestamp>)
  --help        Show this message

Required environment variables:
  EXPO_PUBLIC_SUPABASE_URL
  EXPO_PUBLIC_SUPABASE_ANON_KEY

Live mode only (non-dry-run):
  MILESTONE6_QA_EMAIL
  MILESTONE6_QA_PASSWORD
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
  const cwd = process.cwd();
  const envFileOrder = [".env", ".env.local"];

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

function parseArgs(argv) {
  const options = {
    phase: defaultPhase,
    dryRun: false,
    outputDir: "",
    help: false,
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

    if (arg === "--phase") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --phase");
      }
      options.phase = value.trim().toUpperCase();
      index += 1;
      continue;
    }

    if (arg === "--output-dir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --output-dir");
      }
      options.outputDir = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!allowedPhases.has(options.phase)) {
    throw new Error(
      `Invalid --phase "${options.phase}". Expected one of: ${Array.from(allowedPhases).join(", ")}`,
    );
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
    "rollout-phase-a",
    nowForPath(),
  );
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, {
    recursive: true,
  });
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

function parseJsonPayload(rawText) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

async function signInWithPassword({ supabaseUrl, anonKey, email, password }) {
  const authUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const rawText = await response.text();
  const payload = parseJsonPayload(rawText);

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload.error_description === "string"
        ? payload.error_description
        : payload && typeof payload.msg === "string"
          ? payload.msg
          : rawText;
    throw new Error(
      `Supabase auth sign-in failed (${response.status}): ${errorMessage || "unknown error"}`,
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Supabase auth sign-in returned a non-JSON payload.");
  }

  if (
    typeof payload.access_token !== "string" ||
    !payload.user ||
    typeof payload.user !== "object" ||
    typeof payload.user.id !== "string"
  ) {
    throw new Error(
      "Supabase auth sign-in payload is missing access token or user id.",
    );
  }

  return {
    accessToken: payload.access_token,
    userId: payload.user.id,
  };
}

async function callFunction({
  functionsBaseUrl,
  functionName,
  body,
  accessToken,
  anonKey,
}) {
  const url = `${functionsBaseUrl}/${functionName}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  const payload = parseJsonPayload(rawText);
  const requestId = extractRequestId(payload, response);

  if (!response.ok) {
    const fallbackError =
      payload && typeof payload.message === "string"
        ? payload.message
        : payload && typeof payload.error === "string"
          ? payload.error
          : rawText;
    throw new Error(
      `${functionName} failed (${response.status})${requestId ? ` [request_id=${requestId}]` : ""}: ${fallbackError || "unknown error"}`,
    );
  }

  return {
    payload,
    requestId,
  };
}

function buildMarkdownReport(report) {
  const lines = [
    "# Milestone 6 Phase A Verification Report",
    "",
    `- Timestamp: ${report.timestamp}`,
    `- Mode: ${report.mode}`,
    `- Phase target: ${report.phase}`,
    `- Supabase URL: ${report.summary.supabaseUrl}`,
    `- Functions base URL: ${report.summary.functionsBaseUrl}`,
    `- Auth user id: ${report.summary.userId ?? "N/A"}`,
    "",
  ];

  if (report.mode === "dry_run") {
    lines.push(
      "Dry run only. No network calls were executed and no request IDs were collected.",
      "",
    );
  }

  if (report.results?.a2) {
    lines.push("## A2 Sandbox Link Trial");
    lines.push("");
    lines.push(
      `- plaidLinkToken request_id: ${report.results.a2.linkTokenRequestId}`,
    );
    lines.push(
      `- plaidExchangeToken request_id: ${report.results.a2.exchangeTokenRequestId}`,
    );
    lines.push(`- Accounts linked: ${report.results.a2.accountsLinked}`);
    lines.push("");
  }

  if (report.results?.a3) {
    lines.push("## A3 Real Summary Trial");
    lines.push("");
    lines.push(
      `- plaidAccounts request_id: ${report.results.a3.plaidAccountsRequestId}`,
    );
    lines.push(`- Accounts returned: ${report.results.a3.accountsReturned}`);
    lines.push("");
  }

  if (report.results?.a2 || report.results?.a3) {
    lines.push("## Evidence Log Snippet");
    lines.push("");
    if (report.results?.a2) {
      lines.push(
        `- A2 request-id evidence: \`plaidLinkToken\`: \`${report.results.a2.linkTokenRequestId}\` / \`plaidExchangeToken\`: \`${report.results.a2.exchangeTokenRequestId}\``,
      );
    }
    if (report.results?.a3) {
      lines.push(
        `- A3 request-id evidence: \`plaidAccounts\`: \`${report.results.a3.plaidAccountsRequestId}\``,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    console.log(usageText);
    return;
  }

  loadLocalEnv();

  const missingKeys = requiredBaseEnvKeys.filter((key) => {
    const value = process.env[key];
    return !(typeof value === "string" && value.trim().length > 0);
  });

  if (!options.dryRun) {
    for (const key of requiredLiveOnlyEnvKeys) {
      const value = process.env[key];
      if (!(typeof value === "string" && value.trim().length > 0)) {
        missingKeys.push(key);
      }
    }
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(", ")}`,
    );
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL.trim().replace(
    /\/$/,
    "",
  );
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim();
  const functionsBaseUrl = (
    process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL?.trim() ||
    `${supabaseUrl}/functions/v1`
  ).replace(/\/$/, "");

  const outputDir = resolveOutputDir(options.outputDir);
  ensureDirectory(outputDir);

  const report = {
    timestamp: new Date().toISOString(),
    phase: options.phase,
    mode: options.dryRun ? "dry_run" : "live",
    summary: {
      supabaseUrl,
      functionsBaseUrl,
      userId: null,
      outputDir,
    },
    results: {},
  };

  if (!options.dryRun) {
    const qaEmail = process.env.MILESTONE6_QA_EMAIL.trim();
    const qaPassword = process.env.MILESTONE6_QA_PASSWORD.trim();

    const auth = await signInWithPassword({
      supabaseUrl,
      anonKey,
      email: qaEmail,
      password: qaPassword,
    });

    report.summary.userId = auth.userId;

    const shouldRunA2 = options.phase === "A2" || options.phase === "ALL";
    const shouldRunA3 = options.phase === "A3" || options.phase === "ALL";

    if (shouldRunA2) {
      const linkResult = await callFunction({
        functionsBaseUrl,
        functionName: "plaidLinkToken",
        body: {
          userId: auth.userId,
          sandbox_auto_link: true,
        },
        accessToken: auth.accessToken,
        anonKey,
      });

      if (
        !linkResult.payload ||
        typeof linkResult.payload !== "object" ||
        typeof linkResult.payload.sandbox_public_token !== "string"
      ) {
        throw new Error(
          "plaidLinkToken response is missing sandbox_public_token; cannot continue with A2 exchange.",
        );
      }

      const exchangeResult = await callFunction({
        functionsBaseUrl,
        functionName: "plaidExchangeToken",
        body: {
          public_token: linkResult.payload.sandbox_public_token,
          userId: auth.userId,
        },
        accessToken: auth.accessToken,
        anonKey,
      });

      const accountsLinked =
        exchangeResult.payload &&
        typeof exchangeResult.payload === "object" &&
        typeof exchangeResult.payload.accounts_linked === "number"
          ? exchangeResult.payload.accounts_linked
          : 0;

      report.results.a2 = {
        linkTokenRequestId: linkResult.requestId ?? "missing",
        exchangeTokenRequestId: exchangeResult.requestId ?? "missing",
        accountsLinked,
      };
    }

    if (shouldRunA3) {
      const accountsResult = await callFunction({
        functionsBaseUrl,
        functionName: "plaidAccounts",
        body: {
          userId: auth.userId,
        },
        accessToken: auth.accessToken,
        anonKey,
      });

      const accountsReturned = Array.isArray(accountsResult.payload)
        ? accountsResult.payload.length
        : accountsResult.payload &&
            typeof accountsResult.payload === "object" &&
            Array.isArray(accountsResult.payload.accounts)
          ? accountsResult.payload.accounts.length
          : 0;

      report.results.a3 = {
        plaidAccountsRequestId: accountsResult.requestId ?? "missing",
        accountsReturned,
      };
    }
  }

  const reportJsonPath = path.resolve(outputDir, "phase-a-report.json");
  const reportMarkdownPath = path.resolve(outputDir, "phase-a-report.md");

  fs.writeFileSync(
    reportJsonPath,
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    reportMarkdownPath,
    `${buildMarkdownReport(report)}\n`,
    "utf8",
  );

  if (options.dryRun) {
    console.log("[rollout:phase-a] Dry run completed.");
  } else {
    console.log("[rollout:phase-a] Verification completed.");
  }
  console.log(`[rollout:phase-a] JSON report: ${reportJsonPath}`);
  console.log(`[rollout:phase-a] Markdown report: ${reportMarkdownPath}`);

  if (report.results.a2) {
    console.log(
      `[rollout:phase-a] A2 request IDs: plaidLinkToken=${report.results.a2.linkTokenRequestId}, plaidExchangeToken=${report.results.a2.exchangeTokenRequestId}`,
    );
  }
  if (report.results.a3) {
    console.log(
      `[rollout:phase-a] A3 request ID: plaidAccounts=${report.results.a3.plaidAccountsRequestId}`,
    );
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[rollout:phase-a] ${message}`);
  process.exit(1);
});
