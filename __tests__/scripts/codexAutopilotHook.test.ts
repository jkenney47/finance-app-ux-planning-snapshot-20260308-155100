import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const scriptPath = path.resolve(
  process.cwd(),
  ".agents/hooks/codex-autopilot.sh",
);

type RunAutopilotResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function createBlockedRepoMemoryDir(rootDir: string): string {
  const repoMemoryDir = path.join(rootDir, "repo-memory");
  fs.mkdirSync(repoMemoryDir, { recursive: true });
  fs.mkdirSync(path.join(repoMemoryDir, "active_context.md"));
  fs.mkdirSync(path.join(repoMemoryDir, "events.ndjson"));
  return repoMemoryDir;
}

function findFallbackMemoryDir(tmpRoot: string): string {
  const fallbackDir = fs
    .readdirSync(tmpRoot, { withFileTypes: true })
    .find(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith("codex-autopilot-memory-"),
    );

  if (!fallbackDir) {
    throw new Error("Expected fallback memory directory to be created");
  }

  return path.join(tmpRoot, fallbackDir.name);
}

function runAutopilot(
  args: string[],
  env: Record<string, string>,
): RunAutopilotResult {
  const result = spawnSync("bash", [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 20_000,
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

describe(".agents/hooks/codex-autopilot.sh", () => {
  it("falls back to temp memory for start when repo memory files are unusable", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-autopilot-"));
    try {
      const repoMemoryDir = createBlockedRepoMemoryDir(tempRoot);
      const result = runAutopilot(["start", "fallback-start"], {
        CODEX_AUTOPILOT_MEMORY_REPO_DIR: repoMemoryDir,
        TMPDIR: tempRoot,
      });

      expect(result.status).toBe(0);
      expect(result.stderr).toContain("Using fallback memory directory");

      const fallbackDir = findFallbackMemoryDir(tempRoot);
      const activeContextPath = path.join(fallbackDir, "active_context.md");
      const eventsPath = path.join(fallbackDir, "events.ndjson");

      expect(fs.statSync(activeContextPath).isFile()).toBe(true);
      expect(fs.statSync(eventsPath).isFile()).toBe(true);
      expect(
        fs.readFileSync(activeContextPath, "utf8").trim().length,
      ).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("logs command failures into fallback memory during run mode", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "codex-autopilot-"));
    try {
      const repoMemoryDir = createBlockedRepoMemoryDir(tempRoot);
      const result = runAutopilot(
        [
          "run",
          "failing-command",
          "--",
          "bash",
          "-lc",
          "echo boom >&2; exit 7",
        ],
        {
          CODEX_AUTOPILOT_MEMORY_REPO_DIR: repoMemoryDir,
          TMPDIR: tempRoot,
        },
      );

      expect(result.status).toBe(7);
      expect(result.stderr).toContain("Using fallback memory directory");

      const fallbackDir = findFallbackMemoryDir(tempRoot);
      const eventsPath = path.join(fallbackDir, "events.ndjson");
      const events = fs
        .readFileSync(eventsPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .map(
          (line) => JSON.parse(line) as { trigger: string; mistake: string },
        );

      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            trigger: "command-run:failing-command",
            mistake: expect.stringContaining("bash -lc echo boom >&2; exit 7"),
          }),
        ]),
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
