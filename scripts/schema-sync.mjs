#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const schemaPath = path.join(repoRoot, "schema.sql");
const mode = process.argv[2] ?? "";

function listMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

function normalizeContent(value) {
  return value.replace(/\r\n/g, "\n").trimEnd();
}

function buildSchemaSnapshot() {
  const migrationFiles = listMigrationFiles();
  const sections = migrationFiles.map((fileName) => {
    const migrationPath = path.join(migrationsDir, fileName);
    const migrationSql = normalizeContent(
      fs.readFileSync(migrationPath, "utf8"),
    );
    return [`-- >>> ${fileName}`, migrationSql, `-- <<< ${fileName}`].join(
      "\n",
    );
  });

  return [
    "-- AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.",
    "-- Source of truth: supabase/migrations/*.sql",
    "-- Regenerate with: npm run schema:generate",
    "",
    ...sections,
    "",
  ].join("\n");
}

function runGenerate() {
  const generated = buildSchemaSnapshot();
  fs.writeFileSync(schemaPath, generated, "utf8");
  const migrationCount = listMigrationFiles().length;
  console.log(
    `[schema:generate] Wrote ${path.relative(repoRoot, schemaPath)} from ${migrationCount} migration file(s).`,
  );
}

function runCheck() {
  if (!fs.existsSync(schemaPath)) {
    console.error(
      `[schema:check] Missing ${path.relative(repoRoot, schemaPath)}. Run npm run schema:generate.`,
    );
    process.exit(1);
  }

  const expected = buildSchemaSnapshot();
  const current = normalizeContent(fs.readFileSync(schemaPath, "utf8"));
  const normalizedExpected = normalizeContent(expected);

  if (current !== normalizedExpected) {
    console.error(
      `[schema:check] ${path.relative(repoRoot, schemaPath)} is out of sync with supabase/migrations.`,
    );
    console.error(
      "[schema:check] Run npm run schema:generate and commit the updated snapshot.",
    );
    process.exit(1);
  }

  console.log(
    `[schema:check] ${path.relative(repoRoot, schemaPath)} is synchronized with supabase/migrations.`,
  );
}

if (mode === "generate") {
  runGenerate();
} else if (mode === "check") {
  runCheck();
} else {
  console.error("Usage: node scripts/schema-sync.mjs <generate|check>");
  process.exit(1);
}
