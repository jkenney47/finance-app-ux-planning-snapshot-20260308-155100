import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const scriptPath = path.resolve(
  process.cwd(),
  ".agents/skills/napkin/scripts/memory_cli.mjs",
);

function runMemoryCli(
  args: string[],
  memoryDir: string,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 20_000,
    env: {
      ...process.env,
      CODEX_AUTOPILOT_MEMORY_DIR: memoryDir,
    },
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("memory CLI", () => {
  test("writes auto-promoted rules to generated local state without mutating tracked rules", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "memory-cli-"));
    try {
      const memoryDir = path.join(tempDir, ".agents", "memory");
      fs.mkdirSync(memoryDir, { recursive: true });

      const curatedRules = `# Memory Rules

## User Preferences
- Keep curated manual rule.

## Promoted Rules (Auto)
<!-- AUTO_PROMOTED_RULES_START -->
- stale auto rule that should stay ignored
<!-- AUTO_PROMOTED_RULES_END -->
`;

      const now = new Date().toISOString();
      const repeatedEvent = {
        id: "20260308120000-test0001",
        timestamp: now,
        date: now.slice(0, 10),
        source: "self",
        trigger: "command-run:merge PR",
        mistake: "branch already used by worktree",
        correction: "Read the error output, apply a concrete fix, and rerun.",
        tags: ["auto", "command-failure", "git"],
        confidence: 0.9,
        severity: 2,
      };

      fs.writeFileSync(path.join(memoryDir, "rules.md"), curatedRules, "utf8");
      fs.writeFileSync(
        path.join(memoryDir, "events.ndjson"),
        `${JSON.stringify(repeatedEvent)}\n${JSON.stringify({
          ...repeatedEvent,
          id: "20260308120000-test0002",
        })}\n`,
        "utf8",
      );

      const promoteResult = runMemoryCli(
        ["promote", "--threshold", "2"],
        memoryDir,
      );
      expect(promoteResult.status).toBe(0);
      expect(fs.readFileSync(path.join(memoryDir, "rules.md"), "utf8")).toBe(
        curatedRules,
      );

      const autoRulesPath = path.join(memoryDir, "auto_rules.md");
      expect(fs.existsSync(autoRulesPath)).toBe(true);
      const autoRules = fs.readFileSync(autoRulesPath, "utf8");
      expect(autoRules).toContain("# Auto Promoted Memory Rules");
      expect(autoRules).toContain('trigger="command-run:merge PR"');

      const rankResult = runMemoryCli(["rank", "--limit", "20"], memoryDir);
      expect(rankResult.status).toBe(0);

      const ranked = JSON.parse(rankResult.stdout) as {
        items: Array<{ type: string; text?: string }>;
      };
      const ruleTexts = ranked.items
        .filter((item) => item.type === "rule")
        .map((item) => item.text ?? "");

      expect(ruleTexts).toContain("Keep curated manual rule.");
      expect(
        ruleTexts.some((text) =>
          text.includes('trigger="command-run:merge PR"'),
        ),
      ).toBe(true);
      expect(
        ruleTexts.some((text) =>
          text.includes("stale auto rule that should stay ignored"),
        ),
      ).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
