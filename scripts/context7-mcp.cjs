#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const baseArgs = ["-y", "@upstash/context7-mcp"];
const envFiles = [".mcp.env.local", ".env.mcp.local", ".env.local", ".env"];

function readApiKeyFromLocalEnv() {
  for (const relativeFilePath of envFiles) {
    const absoluteFilePath = path.resolve(process.cwd(), relativeFilePath);
    if (!fs.existsSync(absoluteFilePath)) {
      continue;
    }
    const fileContents = fs.readFileSync(absoluteFilePath, "utf8");
    const match = fileContents.match(/^CONTEXT7_API_KEY=(.*)$/m);
    if (!match) {
      continue;
    }
    const rawValue = (match[1] || "").trim();
    if (!rawValue) {
      continue;
    }
    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      return rawValue.slice(1, -1).trim();
    }
    return rawValue;
  }
  return "";
}

const apiKey =
  (process.env.CONTEXT7_API_KEY || "").trim() || readApiKeyFromLocalEnv();
const args = apiKey.length > 0 ? [...baseArgs, "--api-key", apiKey] : baseArgs;
const childEnv = { ...process.env };
if (apiKey.length > 0 && !childEnv.CONTEXT7_API_KEY) {
  childEnv.CONTEXT7_API_KEY = apiKey;
}

const child = spawn("npx", args, {
  env: childEnv,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`[context7-mcp] Failed to start: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
