import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const scriptPath = path.resolve(
  process.cwd(),
  "scripts/actions-failure-autopilot.mjs",
);

type RunScriptInput = {
  eventName?: string;
  eventPayload?: unknown;
  repository?: string;
  env?: Partial<NodeJS.ProcessEnv>;
};

type RunScriptResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runScript(input: RunScriptInput = {}): RunScriptResult {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "actions-autopilot-"));
  const eventPath = path.join(tempDir, "event.json");
  const hasEventPayload = input.eventPayload !== undefined;
  if (hasEventPayload) {
    fs.writeFileSync(eventPath, JSON.stringify(input.eventPayload), "utf8");
  }

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: tempDir,
    encoding: "utf8",
    timeout: 20_000,
    env: {
      ...process.env,
      GITHUB_REPOSITORY: input.repository ?? "owner/repo",
      GITHUB_EVENT_NAME: input.eventName ?? "workflow_dispatch",
      GITHUB_EVENT_PATH: hasEventPayload ? eventPath : "",
      GITHUB_TOKEN: "",
      GH_TOKEN: "",
      ACTIONS_AUTOPILOT_WRITE_ISSUES: "0",
      ...input.env,
    },
  });

  fs.rmSync(tempDir, { recursive: true, force: true });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("scripts/actions-failure-autopilot.mjs", () => {
  test("report-only mode exits successfully when token is missing", () => {
    const result = runScript();

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Missing GITHUB_TOKEN; report-only mode cannot scan recent failed runs without API auth.",
    );
  });

  test("write mode fails without token", () => {
    const result = runScript({
      env: {
        ACTIONS_AUTOPILOT_WRITE_ISSUES: "1",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Missing GITHUB_TOKEN for GitHub API calls.",
    );
  });

  test("report-only mode logs workflow-run incident details without API token", () => {
    const result = runScript({
      eventName: "workflow_run",
      eventPayload: {
        workflow_run: {
          id: 123456,
          name: "Quality Checks",
          conclusion: "failure",
          event: "pull_request",
          head_branch: "feature/test",
          head_sha: "abc123",
          html_url: "https://example.test/runs/123456",
        },
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "Report-only mode enabled; issue/comment writes are disabled.",
    );
    expect(result.stdout).toContain("run='123456'");
    expect(result.stdout).toContain("workflow='Quality Checks'");
  });
});
