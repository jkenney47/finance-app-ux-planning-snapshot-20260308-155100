import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const scriptPath = path.resolve(
  process.cwd(),
  ".agents/skills/agent-ops-optimizer/scripts/analyze-agent-ops.mjs",
);

function run(
  command: string,
  args: string[],
  cwd: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: 20_000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("agent-ops-optimizer script", () => {
  test("generates markdown/json recommendations from memory and git patterns", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-ops-"));
    const eventsDir = path.join(tempDir, ".agents", "memory");
    const codexDir = path.join(tempDir, ".codex");
    const eventsFilePath = path.join(eventsDir, "events.ndjson");
    const configFilePath = path.join(codexDir, "config.toml");
    fs.mkdirSync(eventsDir, { recursive: true });
    fs.mkdirSync(codexDir, { recursive: true });

    const now = new Date().toISOString();
    const events = [
      {
        timestamp: now,
        trigger: "command-run:merge PR",
        mistake: "git rebase failed: unstaged changes",
        tags: ["auto", "command-failure", "git"],
      },
      {
        timestamp: now,
        trigger: "command-run:merge PR",
        mistake: "cannot switch branch while rebasing",
        tags: ["auto", "command-failure", "git"],
      },
      {
        timestamp: now,
        trigger: "command-run:merge PR",
        mistake: "branch already used by worktree",
        tags: ["auto", "command-failure", "git"],
      },
      {
        timestamp: now,
        trigger: "command-run:check status checks",
        mistake: "gh pr checks pending required status checks",
        tags: ["auto", "command-failure", "gh"],
      },
    ];
    fs.writeFileSync(
      eventsFilePath,
      `${events.map((item) => JSON.stringify(item)).join("\n")}\n`,
      "utf8",
    );
    fs.writeFileSync(
      configFilePath,
      `[profiles.planner]
prompt_file = ".codex/agents/planner.md"

[profiles.implementer]
prompt_file = ".codex/agents/implementer.md"
`,
      "utf8",
    );

    run("git", ["init", "-b", "main"], tempDir);
    run("git", ["config", "user.name", "Test User"], tempDir);
    run("git", ["config", "user.email", "test@example.com"], tempDir);

    fs.mkdirSync(path.join(tempDir, "app"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "app", "screen.tsx"),
      "export {};\n",
      "utf8",
    );
    run("git", ["add", "."], tempDir);
    run("git", ["commit", "-m", "frontend"], tempDir);

    fs.mkdirSync(path.join(tempDir, "scripts"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, "scripts", "task.mjs"),
      "console.log('x');\n",
      "utf8",
    );
    run("git", ["add", "."], tempDir);
    run("git", ["commit", "-m", "automation"], tempDir);

    fs.mkdirSync(path.join(tempDir, "supabase", "functions"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tempDir, "supabase", "functions", "edge.ts"),
      "export {};\n",
      "utf8",
    );
    run("git", ["add", "."], tempDir);
    run("git", ["commit", "-m", "backend"], tempDir);

    const result = run(
      process.execPath,
      [
        scriptPath,
        "--root",
        tempDir,
        "--days",
        "30",
        "--events",
        eventsFilePath,
        "--config",
        configFilePath,
        "--write",
        "docs/reports/agent-ops-latest.md",
        "--json",
        "docs/reports/agent-ops-latest.json",
      ],
      tempDir,
    );

    expect(result.status).toBe(0);

    const reportPath = path.join(
      tempDir,
      "docs",
      "reports",
      "agent-ops-latest.md",
    );
    const jsonPath = path.join(
      tempDir,
      "docs",
      "reports",
      "agent-ops-latest.json",
    );
    expect(fs.existsSync(reportPath)).toBe(true);
    expect(fs.existsSync(jsonPath)).toBe(true);

    const markdown = fs.readFileSync(reportPath, "utf8");
    expect(markdown).toContain("Recommended Runtime Parameters");
    expect(markdown).toContain("max_parallel_threads");

    const json = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
      options: { rootPath: string; eventsPath: string; configPath: string };
      recommendations: { maxParallelThreads: number };
      newAgentCandidates: Array<{ profile: string }>;
    };
    expect(json.options.rootPath).toBe(".");
    expect(json.options.eventsPath).toBe(".agents/memory/events.ndjson");
    expect(json.options.configPath).toBe(".codex/config.toml");
    expect(path.isAbsolute(json.options.eventsPath)).toBe(false);
    expect(path.isAbsolute(json.options.configPath)).toBe(false);
    expect(json.options.eventsPath).not.toContain(tempDir);
    expect(json.options.configPath).not.toContain(tempDir);
    expect(json.recommendations.maxParallelThreads).toBe(2);
    expect(
      json.newAgentCandidates.some(
        (candidate) => candidate.profile === "automation_implementer",
      ),
    ).toBe(true);

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
