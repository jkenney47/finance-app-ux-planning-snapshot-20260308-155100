#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join(
  process.cwd(),
  "artifacts",
  "dependency-graph",
  "latest",
);

const MADGE_ARGS = [
  "--extensions",
  "ts,tsx",
  "--ts-config",
  "tsconfig.json",
  "--json",
  "app",
  "components",
  "hooks",
  "stores",
  "theme",
  "utils",
];

function runMadge(args) {
  return execFileSync("madge", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseJsonOutput(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Unable to parse madge output: ${String(error)}`);
  }
}

const graph = parseJsonOutput(runMadge(MADGE_ARGS));
const circular = parseJsonOutput(runMadge(["--circular", ...MADGE_ARGS]));

const graphEntries = Object.entries(graph);
const edgeCount = graphEntries.reduce((total, [, deps]) => {
  return total + (Array.isArray(deps) ? deps.length : 0);
}, 0);

const summary = {
  generatedAt: new Date().toISOString(),
  nodeCount: graphEntries.length,
  edgeCount,
  circularDependencyCount: Array.isArray(circular) ? circular.length : 0,
  circularDependencies: Array.isArray(circular) ? circular : [],
};

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(
  path.join(OUTPUT_DIR, "dependency-graph.json"),
  `${JSON.stringify(graph, null, 2)}\n`,
);
writeFileSync(
  path.join(OUTPUT_DIR, "summary.json"),
  `${JSON.stringify(summary, null, 2)}\n`,
);

console.log(
  `[depgraph] Wrote ${path.join(OUTPUT_DIR, "dependency-graph.json")}`,
);
console.log(`[depgraph] Wrote ${path.join(OUTPUT_DIR, "summary.json")}`);
