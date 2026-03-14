import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const scriptPath = path.resolve(
  process.cwd(),
  "scripts/milestone-6-ingestion-check.mjs",
);

type RunScriptInput = {
  args?: string[];
  cwd: string;
};

type RunScriptResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function createIsolatedScriptEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CI: "1",
  };

  for (const key of [
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "MILESTONE6_QA_EMAIL",
    "MILESTONE6_QA_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    delete env[key];
  }

  return env;
}

function runScript(input: RunScriptInput): RunScriptResult {
  const result = spawnSync(
    process.execPath,
    [scriptPath, ...(input.args ?? [])],
    {
      cwd: input.cwd,
      encoding: "utf8",
      env: createIsolatedScriptEnv(),
    },
  );

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("scripts/milestone-6-ingestion-check.mjs", () => {
  it("prints help output", () => {
    const tempDir = createTempDir("ingestion-help-");

    try {
      const result = runScript({
        cwd: tempDir,
        args: ["--help"],
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Usage: npm run rollout:ingestion");
      expect(result.stderr).toBe("");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails when required base env keys are missing", () => {
    const tempDir = createTempDir("ingestion-missing-env-");

    try {
      const result = runScript({
        cwd: tempDir,
        args: ["--dry-run"],
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("EXPO_PUBLIC_SUPABASE_URL");
      expect(result.stderr).toContain("SUPABASE_SERVICE_ROLE_KEY");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("fails for invalid window-hours input", () => {
    const tempDir = createTempDir("ingestion-invalid-window-");

    try {
      fs.writeFileSync(
        path.resolve(tempDir, ".env.local"),
        [
          "EXPO_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co",
          "SUPABASE_SERVICE_ROLE_KEY=service-role-secret",
        ].join("\n"),
        "utf8",
      );

      const result = runScript({
        cwd: tempDir,
        args: ["--dry-run", "--window-hours", "0"],
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "--window-hours must be a positive integer",
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("writes dry-run artifacts with base env config", () => {
    const tempDir = createTempDir("ingestion-dry-run-");
    const outputDir = path.resolve(tempDir, "artifacts", "ingestion-test");

    try {
      fs.writeFileSync(
        path.resolve(tempDir, ".env.local"),
        [
          "EXPO_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co",
          "SUPABASE_SERVICE_ROLE_KEY=service-role-secret",
        ].join("\n"),
        "utf8",
      );

      const result = runScript({
        cwd: tempDir,
        args: ["--dry-run", "--probe-webhook", "--output-dir", outputDir],
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("[rollout:ingestion] Dry run completed.");
      expect(result.stderr).toBe("");

      const jsonPath = path.resolve(outputDir, "ingestion-check.json");
      const markdownPath = path.resolve(outputDir, "ingestion-check.md");

      expect(fs.existsSync(jsonPath)).toBe(true);
      expect(fs.existsSync(markdownPath)).toBe(true);

      const report = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
        mode: string;
        summary: {
          supabaseUrl: string;
          probeWebhook: boolean;
        };
        webhookProbe: {
          status: string;
        };
      };

      expect(report.mode).toBe("dry_run");
      expect(report.summary.supabaseUrl).toBe(
        "https://project-ref.supabase.co",
      );
      expect(report.summary.probeWebhook).toBe(true);
      expect(report.webhookProbe.status).toBe("dry_run");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
