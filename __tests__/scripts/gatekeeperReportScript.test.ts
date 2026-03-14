import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const gatekeeperScriptPath = path.resolve(
  process.cwd(),
  "scripts/gatekeeper-report.mjs",
);

function run(
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string | undefined> = {},
  timeout = 30_000,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout,
    env: {
      ...process.env,
      ...env,
    },
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function expectSuccess(result: {
  status: number | null;
  stdout: string;
  stderr: string;
}): void {
  expect(result.status).toBe(0);
}

function gitOutput(args: string[], cwd: string): string {
  const result = run("git", args, cwd);
  expectSuccess(result);
  return result.stdout.trim();
}

function createGatekeeperFixture(): { tempRoot: string; worktreePath: string } {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gatekeeper-"));
  const remoteRepoPath = path.join(tempRoot, "origin.git");
  const worktreePath = path.join(tempRoot, "worktree");

  expectSuccess(run("git", ["init", "--bare", remoteRepoPath], tempRoot));
  expectSuccess(run("git", ["clone", remoteRepoPath, worktreePath], tempRoot));
  expectSuccess(
    run("git", ["config", "user.name", "Gatekeeper Test"], worktreePath),
  );
  expectSuccess(
    run(
      "git",
      ["config", "user.email", "gatekeeper-test@example.com"],
      worktreePath,
    ),
  );
  expectSuccess(run("git", ["checkout", "-b", "main"], worktreePath));

  const memoryDir = path.join(worktreePath, ".agents", "memory");
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(
    path.join(memoryDir, "rules.md"),
    "baseline rules\n",
    "utf8",
  );

  fs.mkdirSync(path.join(worktreePath, "scripts"), { recursive: true });
  fs.copyFileSync(
    gatekeeperScriptPath,
    path.join(worktreePath, "scripts", "gatekeeper-report.mjs"),
  );

  fs.writeFileSync(
    path.join(worktreePath, "README.md"),
    "gatekeeper test fixture\n",
    "utf8",
  );

  expectSuccess(run("git", ["add", "."], worktreePath));
  expectSuccess(run("git", ["commit", "-m", "seed main"], worktreePath));
  expectSuccess(run("git", ["push", "-u", "origin", "main"], worktreePath));

  expectSuccess(
    run("git", ["checkout", "-b", "codex/test-gatekeeper"], worktreePath),
  );
  fs.writeFileSync(
    path.join(worktreePath, "feature.txt"),
    "candidate diff\n",
    "utf8",
  );
  expectSuccess(run("git", ["add", "feature.txt"], worktreePath));
  expectSuccess(run("git", ["commit", "-m", "candidate update"], worktreePath));
  expectSuccess(
    run("git", ["push", "-u", "origin", "codex/test-gatekeeper"], worktreePath),
  );
  expectSuccess(run("git", ["checkout", "main"], worktreePath));

  return { tempRoot, worktreePath };
}

describe("gatekeeper report script", () => {
  test("keeps checkout stable when post-checkout hook would mutate tracked memory files", () => {
    const { tempRoot, worktreePath } = createGatekeeperFixture();
    try {
      const postCheckoutHookPath = path.join(
        worktreePath,
        ".git",
        "hooks",
        "post-checkout",
      );
      fs.writeFileSync(
        postCheckoutHookPath,
        `#!/bin/sh
if [ "$HUSKY" = "0" ]; then
  exit 0
fi
echo "hook-ran" >> .hook-ran
echo "hook-mutated" >> .agents/memory/rules.md
`,
        {
          encoding: "utf8",
          mode: 0o755,
        },
      );
      const initialBranch = gitOutput(
        ["branch", "--show-current"],
        worktreePath,
      );
      const initialHead = gitOutput(["rev-parse", "HEAD"], worktreePath);

      const scriptResult = run(
        process.execPath,
        ["scripts/gatekeeper-report.mjs"],
        worktreePath,
        {
          GATEKEEPER_MAX_CANDIDATES: "1",
          GATEKEEPER_WINDOW_HOURS: "24",
          GATEKEEPER_CUTOFF_OVERLAP_SECONDS: "0",
        },
        90_000,
      );

      expect(scriptResult.status).toBe(0);
      expect(scriptResult.stdout).toContain("Gatekeeper report written:");
      expect(
        fs.existsSync(path.join(worktreePath, "artifacts", "gatekeeper")),
      ).toBe(true);
      const latestReportPath = path.join(
        worktreePath,
        "artifacts",
        "gatekeeper",
        "latest-report.md",
      );
      expect(fs.existsSync(latestReportPath)).toBe(true);
      expect(fs.readFileSync(latestReportPath, "utf8")).toContain(
        "origin/codex/test-gatekeeper",
      );
      const reportDir = path.join(worktreePath, "artifacts", "gatekeeper");
      const jsonReports = fs
        .readdirSync(reportDir)
        .filter(
          (entry) =>
            entry.startsWith("gatekeeper-report-") && entry.endsWith(".json"),
        );
      expect(jsonReports.length).toBeGreaterThan(0);
      const latestJsonReport = path.join(
        reportDir,
        jsonReports.sort().at(-1) ?? "",
      );
      const parsedReport = JSON.parse(
        fs.readFileSync(latestJsonReport, "utf8"),
      ) as {
        candidates?: Array<{ name?: string }>;
      };
      expect(
        parsedReport.candidates?.some(
          (candidate) => candidate.name === "origin/codex/test-gatekeeper",
        ),
      ).toBe(true);
      expect(
        `${scriptResult.stdout}\n${scriptResult.stderr}`.includes(
          "would be overwritten by checkout",
        ),
      ).toBe(false);
      expect(
        `${scriptResult.stdout}\n${scriptResult.stderr}`.includes(
          ".agents/memory/rules.md",
        ),
      ).toBe(false);
      expect(fs.existsSync(path.join(worktreePath, ".hook-ran"))).toBe(false);
      expect(gitOutput(["branch", "--show-current"], worktreePath)).toBe(
        initialBranch,
      );
      expect(gitOutput(["rev-parse", "HEAD"], worktreePath)).toBe(initialHead);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("restores detached checkout when report generation fails", () => {
    const { tempRoot, worktreePath } = createGatekeeperFixture();
    try {
      const mainHead = gitOutput(["rev-parse", "HEAD"], worktreePath);
      expectSuccess(
        run("git", ["checkout", "--detach", mainHead], worktreePath),
      );
      const initialDetachedHead = gitOutput(
        ["rev-parse", "HEAD"],
        worktreePath,
      );

      fs.mkdirSync(
        path.join(worktreePath, "artifacts", "gatekeeper", "latest-report.md"),
        {
          recursive: true,
        },
      );

      const scriptResult = run(
        process.execPath,
        ["scripts/gatekeeper-report.mjs"],
        worktreePath,
        {
          GATEKEEPER_MAX_CANDIDATES: "1",
          GATEKEEPER_WINDOW_HOURS: "24",
          GATEKEEPER_CUTOFF_OVERLAP_SECONDS: "0",
        },
        90_000,
      );

      expect(scriptResult.status).not.toBe(0);
      const combinedOutput = `${scriptResult.stdout}\n${scriptResult.stderr}`;
      expect(combinedOutput).toContain("latest-report.md");
      expect(/EISDIR|is a directory/i.test(combinedOutput)).toBe(true);
      expect(gitOutput(["branch", "--show-current"], worktreePath)).toBe("");
      expect(gitOutput(["rev-parse", "HEAD"], worktreePath)).toBe(
        initialDetachedHead,
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
