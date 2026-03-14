import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const scriptPath = path.resolve(
  process.cwd(),
  "scripts/milestone-6-phase-a-check.mjs",
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

describe("scripts/milestone-6-phase-a-check.mjs", () => {
  it("prints help output", () => {
    const tempDir = createTempDir("phase-a-help-");

    try {
      const result = runScript({
        cwd: tempDir,
        args: ["--help"],
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Usage: npm run rollout:phase-a");
      expect(result.stderr).toBe("");
    } finally {
      fs.rmSync(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });

  it("fails when required base env keys are missing", () => {
    const tempDir = createTempDir("phase-a-missing-env-");

    try {
      const result = runScript({
        cwd: tempDir,
        args: ["--dry-run"],
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Missing required environment variables");
      expect(result.stderr).toContain("EXPO_PUBLIC_SUPABASE_URL");
      expect(result.stderr).toContain("EXPO_PUBLIC_SUPABASE_ANON_KEY");
    } finally {
      fs.rmSync(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });

  it("loads .env.local base values and writes dry-run artifacts", () => {
    const tempDir = createTempDir("phase-a-dry-run-");
    const outputDir = path.resolve(tempDir, "artifacts", "phase-a");

    try {
      fs.writeFileSync(
        path.resolve(tempDir, ".env.local"),
        [
          "EXPO_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co",
          "EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key",
        ].join("\n"),
        "utf8",
      );

      const result = runScript({
        cwd: tempDir,
        args: ["--dry-run", "--phase", "all", "--output-dir", outputDir],
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("[rollout:phase-a] Dry run completed.");
      expect(result.stderr).toBe("");

      const reportJsonPath = path.resolve(outputDir, "phase-a-report.json");
      const reportMarkdownPath = path.resolve(outputDir, "phase-a-report.md");

      expect(fs.existsSync(reportJsonPath)).toBe(true);
      expect(fs.existsSync(reportMarkdownPath)).toBe(true);

      const report = JSON.parse(fs.readFileSync(reportJsonPath, "utf8")) as {
        phase: string;
        mode: string;
        summary: { functionsBaseUrl: string };
      };

      expect(report.phase).toBe("ALL");
      expect(report.mode).toBe("dry_run");
      expect(report.summary.functionsBaseUrl).toBe(
        "https://project-ref.supabase.co/functions/v1",
      );
    } finally {
      fs.rmSync(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });

  it("fails in live mode when QA credentials are missing", () => {
    const tempDir = createTempDir("phase-a-live-missing-");

    try {
      fs.writeFileSync(
        path.resolve(tempDir, ".env.local"),
        [
          "EXPO_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co",
          "EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key",
        ].join("\n"),
        "utf8",
      );

      const result = runScript({
        cwd: tempDir,
        args: ["--phase", "A2"],
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("MILESTONE6_QA_EMAIL");
      expect(result.stderr).toContain("MILESTONE6_QA_PASSWORD");
    } finally {
      fs.rmSync(tempDir, {
        recursive: true,
        force: true,
      });
    }
  });
});
