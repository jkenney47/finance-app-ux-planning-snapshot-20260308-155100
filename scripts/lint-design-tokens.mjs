#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";

const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const TARGET_DIR_PATTERN = /^(app|components|hooks|stores|utils|theme)\//;
const ALLOW_MARKER = "design-token-lint: allow";
const ALLOW_NEXT_LINE_MARKER = "design-token-lint: allow-next-line";

const COLOR_LITERAL_REGEX =
  /#(?:[0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})\b|(?:rgb|hsl)a?\s*\(/;
const ARBITRARY_TAILWIND_VALUE_REGEX =
  /(?:^|[\s"'`])(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|space-x|space-y|rounded|w|h|min-w|min-h|max-w|max-h|text|leading|tracking)-\[[^\]]+\]/;
const NUMERIC_STYLE_VALUE_REGEX =
  /\b(?:margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|gap|rowGap|columnGap|borderRadius|fontSize|lineHeight|letterSpacing)\s*:\s*(?:[1-9]\d*|0?\.\d+)\b/;

const COLOR_ALLOWLIST = new Set([
  "theme/tokens.ts",
  "theme/token-source.js",
  "theme/paper.ts",
  "scripts/lint-design-tokens.mjs",
]);
const ARBITRARY_VALUE_ALLOWLIST = new Set(["scripts/lint-design-tokens.mjs"]);
const NUMERIC_STYLE_ALLOWLIST = new Set([
  "theme/tokens.ts",
  "theme/token-source.js",
  "theme/paper.ts",
  "scripts/lint-design-tokens.mjs",
]);
const REPO_ROOT = resolveRepoRoot();

function normalizeFile(filePath) {
  return filePath.split(path.sep).join("/");
}

function resolveRepoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return process.cwd();
  }
}

function toRepoRelativePath(filePath) {
  const rawValue = String(filePath ?? "").trim();
  if (!rawValue) {
    return "";
  }

  const absolutePath = path.isAbsolute(rawValue)
    ? rawValue
    : path.resolve(REPO_ROOT, rawValue);
  const relativePath = normalizeFile(path.relative(REPO_ROOT, absolutePath));
  return relativePath.replace(/^\.\/+/, "");
}

function isTargetFile(filePath) {
  const normalized = toRepoRelativePath(filePath);
  if (!normalized || normalized.startsWith("../")) {
    return false;
  }
  if (!TARGET_DIR_PATTERN.test(normalized)) {
    return false;
  }
  return TARGET_EXTENSIONS.has(path.extname(normalized));
}

function getStagedAddedLines(filePath) {
  let diffOutput = "";
  try {
    diffOutput = execFileSync(
      "git",
      ["diff", "--cached", "--unified=0", "--", filePath],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    if (typeof error.stdout === "string") {
      diffOutput = error.stdout;
    } else {
      throw error;
    }
  }

  const addedLines = [];
  let currentLineNumber = 0;
  let inHunk = false;

  for (const rawLine of diffOutput.split("\n")) {
    const hunkMatch = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      currentLineNumber = Number(hunkMatch[1]);
      inHunk = true;
      continue;
    }

    if (!inHunk) {
      continue;
    }

    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      addedLines.push({
        line: currentLineNumber,
        text: rawLine.slice(1),
      });
      currentLineNumber += 1;
      continue;
    }

    if (rawLine.startsWith("-") && !rawLine.startsWith("---")) {
      continue;
    }

    if (!rawLine.startsWith("\\")) {
      currentLineNumber += 1;
    }
  }

  return addedLines;
}

function collectViolations(filePath, addedLines) {
  const normalized = normalizeFile(filePath);
  const violations = [];

  for (let index = 0; index < addedLines.length; index += 1) {
    const line = addedLines[index];
    const previousLine = index > 0 ? addedLines[index - 1] : null;
    const hasAdjacentAllowComment =
      previousLine &&
      previousLine.line === line.line - 1 &&
      (previousLine.text.includes(ALLOW_MARKER) ||
        previousLine.text.includes(ALLOW_NEXT_LINE_MARKER));

    if (line.text.includes(ALLOW_MARKER) || hasAdjacentAllowComment) {
      continue;
    }

    if (
      !COLOR_ALLOWLIST.has(normalized) &&
      COLOR_LITERAL_REGEX.test(line.text)
    ) {
      violations.push({
        file: normalized,
        line: line.line,
        rule: "no-literal-colors",
        message:
          "Use design tokens instead of hardcoded color values (tokens.color.* or tokenized utility classes).",
        snippet: line.text.trim(),
      });
    }

    if (
      !ARBITRARY_VALUE_ALLOWLIST.has(normalized) &&
      ARBITRARY_TAILWIND_VALUE_REGEX.test(line.text)
    ) {
      violations.push({
        file: normalized,
        line: line.line,
        rule: "no-arbitrary-tailwind-values",
        message:
          'Avoid arbitrary Tailwind values ("...-[...]"). Use tokenized classes like px-sm, rounded-md, text-body, min-h-hit, etc.',
        snippet: line.text.trim(),
      });
    }

    if (
      !NUMERIC_STYLE_ALLOWLIST.has(normalized) &&
      NUMERIC_STYLE_VALUE_REGEX.test(line.text)
    ) {
      violations.push({
        file: normalized,
        line: line.line,
        rule: "no-raw-style-size-values",
        message:
          "Use token references for spacing, radius, and type sizes (tokens.space.*, tokens.radius.*, tokens.type.*).",
        snippet: line.text.trim(),
      });
    }
  }

  return violations;
}

function run() {
  const filesFromArgs = Array.from(
    new Set(
      process.argv.slice(2).map((filePath) => toRepoRelativePath(filePath)),
    ),
  ).filter(Boolean);
  const targetFiles = filesFromArgs.filter((filePath) =>
    isTargetFile(filePath),
  );
  const violations = [];

  for (const filePath of targetFiles) {
    const addedLines = getStagedAddedLines(filePath);
    if (addedLines.length === 0) {
      continue;
    }
    violations.push(...collectViolations(filePath, addedLines));
  }

  if (violations.length === 0) {
    process.exit(0);
  }

  console.error(
    "[design-token-lint] Found design-system token violations in staged changes:\n",
  );

  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} [${violation.rule}] ${violation.message}`,
    );
    console.error(`  > ${violation.snippet}`);
  }

  console.error(
    "\nFix the lines above before committing. This check only scans newly staged additions.",
  );
  console.error(
    "For intentional exceptions, annotate with '// design-token-lint: allow' or '// design-token-lint: allow-next-line'.",
  );

  process.exit(1);
}

run();
