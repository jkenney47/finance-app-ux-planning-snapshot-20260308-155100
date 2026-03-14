#!/usr/bin/env node

import fs from "fs";
import path from "path";

const flowsDir = path.resolve(process.cwd(), "maestro/flows");

if (!fs.existsSync(flowsDir)) {
  console.log(
    "[validate:maestro-flows] maestro/flows directory not found. Skipping flow checks.",
  );
  process.exit(0);
}

const flowFiles = fs
  .readdirSync(flowsDir)
  .filter((fileName) => fileName.endsWith(".yaml"))
  .sort();

if (flowFiles.length === 0) {
  console.log(
    "[validate:maestro-flows] No flow files found in maestro/flows. Skipping flow checks.",
  );
  process.exit(0);
}

const errors = [];

for (const flowFile of flowFiles) {
  const absolutePath = path.resolve(flowsDir, flowFile);
  const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
  const trimmedLines = lines.map((line) => line.trim());

  const hasDashboardScreen = trimmedLines.includes(
    "id: dashboard-screen-title",
  );
  if (!hasDashboardScreen) {
    errors.push(`${flowFile}: missing required id: dashboard-screen-title`);
  }

  const firstIndexOf = (target) =>
    trimmedLines.findIndex((line) => line === target);
  const firstPlaidPrimaryIndex = firstIndexOf("id: plaid-link-primary");
  if (firstPlaidPrimaryIndex !== -1) {
    const plaidScreenIndex = firstIndexOf("id: plaid-link-screen-title");
    const plaidModeMockIndex = firstIndexOf("id: plaid-link-mode-mock");

    if (plaidScreenIndex === -1 || plaidScreenIndex > firstPlaidPrimaryIndex) {
      errors.push(
        `${flowFile}: id: plaid-link-primary requires prior id: plaid-link-screen-title`,
      );
    }

    if (
      plaidModeMockIndex === -1 ||
      plaidModeMockIndex > firstPlaidPrimaryIndex
    ) {
      errors.push(
        `${flowFile}: id: plaid-link-primary requires prior id: plaid-link-mode-mock`,
      );
    }
  }

  let sawJourneyTab = false;
  let returnedToHomeAfterJourney = false;
  let hasJourneyScreen = false;

  for (const trimmed of trimmedLines) {
    if (trimmed === "id: tab-journey") {
      sawJourneyTab = true;
      returnedToHomeAfterJourney = false;
      continue;
    }

    if (trimmed === "id: journey-screen-title") {
      hasJourneyScreen = true;
      continue;
    }

    if (sawJourneyTab && trimmed === "id: tab-home") {
      returnedToHomeAfterJourney = true;
      continue;
    }

    if (
      sawJourneyTab &&
      !returnedToHomeAfterJourney &&
      trimmed === "id: dashboard-next-step-action"
    ) {
      errors.push(
        `${flowFile}: dashboard-next-step-action appears after tab-journey without returning via tab-home`,
      );
    }
  }

  if (sawJourneyTab && !hasJourneyScreen) {
    errors.push(
      `${flowFile}: includes tab-journey but does not assert id: journey-screen-title`,
    );
  }
}

if (errors.length > 0) {
  console.error("[validate:maestro-flows] Flow validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `[validate:maestro-flows] Flow validation passed for ${flowFiles.length} file(s).`,
);
