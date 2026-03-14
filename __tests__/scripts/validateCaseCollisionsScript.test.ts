import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const validateCaseCollisionsScriptPath = path.resolve(
  process.cwd(),
  "scripts/validate-case-collisions.mjs",
);

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runCommand(
  command: string,
  args: string[],
  cwd: string,
  input?: string,
): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    input,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function runGit(
  cwd: string,
  args: string[],
  input?: string,
): { stdout: string; stderr: string } {
  const result = runCommand("git", args, cwd, input);
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed (status ${result.status}): ${result.stderr || result.stdout}`,
    );
  }

  return {
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function addTrackedIndexEntry(cwd: string, trackedPath: string) {
  const hashObjectResult = runGit(
    cwd,
    ["hash-object", "-w", "--stdin"],
    `fixture:${trackedPath}\n`,
  );
  const blobHash = hashObjectResult.stdout.trim();

  runGit(cwd, [
    "update-index",
    "--add",
    "--cacheinfo",
    "100644",
    blobHash,
    trackedPath,
  ]);
}

function runValidateCaseCollisions(trackedPaths: string[]) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "case-collisions-"));

  try {
    runGit(tempDir, ["init"]);
    runGit(tempDir, ["config", "user.email", "tests@example.com"]);
    runGit(tempDir, ["config", "user.name", "Case Collision Tests"]);

    for (const trackedPath of trackedPaths) {
      addTrackedIndexEntry(tempDir, trackedPath);
    }

    return runCommand(
      process.execPath,
      [validateCaseCollisionsScriptPath],
      tempDir,
    );
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

describe("scripts/validate-case-collisions.mjs", () => {
  it("passes when tracked paths have no case-insensitive collisions", () => {
    const result = runValidateCaseCollisions([
      "app/index.tsx",
      "docs/README.md",
      "scripts/task.mjs",
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "[validate:case-collisions] No case-insensitive path collisions",
    );
    expect(result.stderr).toBe("");
  });

  it("fails when the same path is tracked with different casing", () => {
    const result = runValidateCaseCollisions([
      ".Jules/palette.md",
      ".jules/palette.md",
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "[validate:case-collisions] Found case-insensitive path collisions",
    );
    expect(result.stderr).toContain(".Jules/palette.md");
    expect(result.stderr).toContain(".jules/palette.md");
  });

  it("fails when a parent path collides with a child directory by case", () => {
    const result = runValidateCaseCollisions(["Foo", "foo/bar.ts"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Foo <-> foo/bar.ts");
  });
});
