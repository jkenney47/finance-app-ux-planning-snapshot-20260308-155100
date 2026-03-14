#!/usr/bin/env node

import fs from "fs";
import path from "path";

const envFiles = [".env", ".env.local"];

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

function readLocalEnv() {
  const merged = new Map();

  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;
    const parsed = parseEnvFile(fs.readFileSync(filePath, "utf8"));
    for (const [key, value] of parsed.entries()) {
      merged.set(key, value);
    }
  }

  return merged;
}

async function main() {
  const localEnv = readLocalEnv();
  const token =
    process.env.FIGMA_ACCESS_TOKEN ||
    localEnv.get("FIGMA_ACCESS_TOKEN") ||
    process.env.FIGMA_OAUTH_TOKEN ||
    localEnv.get("FIGMA_OAUTH_TOKEN");

  if (!token) {
    console.error(
      "[figma:api:check] Missing token. Set FIGMA_ACCESS_TOKEN (preferred) or FIGMA_OAUTH_TOKEN in .env.local.",
    );
    process.exit(1);
  }

  const baseUrl =
    process.env.FIGMA_API_BASE_URL ||
    localEnv.get("FIGMA_API_BASE_URL") ||
    "https://api.figma.com";

  const region =
    process.env.FIGMA_REGION ||
    localEnv.get("FIGMA_REGION") ||
    process.env.X_FIGMA_REGION ||
    localEnv.get("X_FIGMA_REGION");

  function buildHeaders(authScheme) {
    const headers = {
      Accept: "application/json",
    };

    if (authScheme === "bearer") {
      headers.Authorization = `Bearer ${token}`;
    } else {
      headers["X-Figma-Token"] = token;
    }

    if (region) {
      headers["X-Figma-Region"] = region;
    }

    return headers;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/me`;
    const attempts = [
      { scheme: "bearer", label: "Authorization: Bearer" },
      { scheme: "token", label: "X-Figma-Token" },
    ];

    let payload = {};
    let authedBy = null;
    let lastFailure = "unknown error";

    for (const attempt of attempts) {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: buildHeaders(attempt.scheme),
        signal: controller.signal,
      });

      const raw = await response.text();
      let parsed = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { raw };
      }

      if (response.ok) {
        payload = parsed;
        authedBy = attempt.label;
        break;
      }

      lastFailure = parsed?.err || parsed?.message || `HTTP ${response.status}`;
    }

    if (!authedBy) {
      console.error(`[figma:api:check] Failed: ${lastFailure}`);
      process.exit(1);
    }

    console.log("[figma:api:check] Authenticated successfully.");
    console.log(`- id: ${payload.id ?? "unknown"}`);
    console.log(`- handle: ${payload.handle ?? "unknown"}`);
    console.log(`- email: ${payload.email ?? "unknown"}`);
    console.log(`- authHeader: ${authedBy}`);
    console.log(`- baseUrl: ${baseUrl}`);
    console.log(`- regionHeader: ${region || "(none)"}`);
  } catch (error) {
    if (error?.name === "AbortError") {
      console.error(
        "[figma:api:check] Timed out after 15s while calling /v1/me.",
      );
      process.exit(1);
    }
    console.error(`[figma:api:check] Request error: ${String(error)}`);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

await main();
