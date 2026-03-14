#!/usr/bin/env node

import fs from "fs";
import path from "path";

const envFiles = [".env.local", ".env"];
const requiredKeys = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
];
const rolloutFlagKeys = [
  "EXPO_PUBLIC_USE_MOCK_DATA",
  "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK",
  "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA",
];
const strictBooleanValues = new Set(["true", "false"]);
const requiredNodeMajor = "20";
const shouldWarnNodeMismatch = Boolean(process.stdout.isTTY) && !process.env.CI;

const currentNodeMajor = process.versions.node.split(".")[0];
if (currentNodeMajor !== requiredNodeMajor && shouldWarnNodeMismatch) {
  console.warn(
    `[validate:env] Node ${requiredNodeMajor}.x expected, found ${process.version}. Run "nvm use" before install/validation.`,
  );
}

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

function parseStrictBooleanFlag(key, rawValue) {
  if (!rawValue) {
    return {
      value: null,
      error: `${key} is missing. Set the flag to true or false.`,
    };
  }

  const normalized = rawValue.trim().toLowerCase();
  if (!strictBooleanValues.has(normalized)) {
    return {
      value: null,
      error: `${key} must be a strict boolean (true|false). Found "${rawValue}".`,
    };
  }

  return {
    value: normalized === "true",
    error: null,
  };
}

const foundFiles = envFiles.filter((file) =>
  fs.existsSync(path.resolve(process.cwd(), file)),
);

if (foundFiles.length === 0) {
  console.log(
    "[validate:env] No .env.local or .env found. Skipping local env validation.",
  );
  process.exit(0);
}

const merged = new Map();
const mergeOrder = [".env", ".env.local"];
for (const file of mergeOrder) {
  if (!foundFiles.includes(file)) continue;
  const content = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
  const parsed = parseEnvFile(content);
  for (const [key, value] of parsed.entries()) {
    merged.set(key, value);
  }
}

const missing = [];
for (const key of requiredKeys) {
  const value = merged.get(key);
  if (!value) {
    missing.push(key);
  }
}

const placeholderKeys = [];
for (const [key, value] of merged.entries()) {
  if (/YOUR_/i.test(value)) {
    placeholderKeys.push(key);
  }
}

const rolloutFlagErrors = [];
const parsedRolloutFlags = new Map();

for (const key of rolloutFlagKeys) {
  const parsed = parseStrictBooleanFlag(key, merged.get(key));
  if (parsed.error) {
    rolloutFlagErrors.push(parsed.error);
    continue;
  }
  parsedRolloutFlags.set(key, parsed.value);
}

if (rolloutFlagErrors.length === 0) {
  const useMockData = parsedRolloutFlags.get("EXPO_PUBLIC_USE_MOCK_DATA");
  const enablePlaidSandboxLink = parsedRolloutFlags.get(
    "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK",
  );
  const enableRealAccountData = parsedRolloutFlags.get(
    "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA",
  );

  if (enableRealAccountData && useMockData) {
    rolloutFlagErrors.push(
      "Illegal rollout combination: EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true requires EXPO_PUBLIC_USE_MOCK_DATA=false.",
    );
  }

  if (enableRealAccountData && !enablePlaidSandboxLink) {
    rolloutFlagErrors.push(
      "Illegal rollout combination: EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true requires EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true.",
    );
  }
}

if (missing.length || placeholderKeys.length || rolloutFlagErrors.length) {
  if (missing.length) {
    console.error(
      "[validate:env] Missing required keys: " + missing.join(", "),
    );
  }
  if (placeholderKeys.length) {
    console.error(
      "[validate:env] Placeholder values detected (contains YOUR_): " +
        placeholderKeys.join(", "),
    );
  }
  if (rolloutFlagErrors.length) {
    for (const error of rolloutFlagErrors) {
      console.error("[validate:env] " + error);
    }
  }
  process.exit(1);
}

console.log(
  "[validate:env] Environment validation passed for: " + foundFiles.join(", "),
);
