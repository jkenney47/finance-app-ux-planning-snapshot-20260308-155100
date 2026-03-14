import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const dependencySecurityAuditScriptPath = path.resolve(
  process.cwd(),
  "scripts/dependency-security-audit.mjs",
);

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runAuditScript(report: Record<string, unknown>): CommandResult {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "security-audit-"));
  const reportPath = path.join(tempDir, "audit.json");

  try {
    fs.writeFileSync(reportPath, JSON.stringify(report), "utf8");

    const result = spawnSync(
      process.execPath,
      [dependencySecurityAuditScriptPath, "--from-file", reportPath],
      {
        encoding: "utf8",
      },
    );

    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runAuditScriptFromRaw(rawReport: string): CommandResult {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "security-audit-raw-"));
  const reportPath = path.join(tempDir, "audit.json");

  try {
    fs.writeFileSync(reportPath, rawReport, "utf8");

    const result = spawnSync(
      process.execPath,
      [dependencySecurityAuditScriptPath, "--from-file", reportPath],
      {
        encoding: "utf8",
      },
    );

    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

describe("scripts/dependency-security-audit.mjs", () => {
  it("passes when no high or critical vulnerabilities are present", () => {
    const result = runAuditScript({
      vulnerabilities: {
        ajv: {
          name: "ajv",
          severity: "moderate",
          fixAvailable: true,
        },
      },
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 1,
          high: 0,
          critical: 0,
          total: 1,
        },
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[security:audit:summary] PASS");
    expect(result.stdout).toContain("moderate=1");
    expect(result.stderr).toBe("");
  });

  it("fails and prints actionable fixes for blocking vulnerabilities", () => {
    const result = runAuditScript({
      vulnerabilities: {
        "form-data": {
          name: "form-data",
          severity: "critical",
          fixAvailable: true,
        },
        "@typescript-eslint/parser": {
          name: "@typescript-eslint/parser",
          severity: "high",
          fixAvailable: {
            name: "@typescript-eslint/parser",
            version: "8.56.1",
            isSemVerMajor: true,
          },
        },
      },
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 0,
          high: 1,
          critical: 1,
          total: 2,
        },
      },
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("[security:audit:summary] FAIL");
    expect(result.stderr).toContain(
      "[security:audit:summary] Blocking vulnerabilities:",
    );
    expect(result.stderr).toContain("critical form-data -> npm audit fix");
    expect(result.stderr).toContain(
      "high @typescript-eslint/parser -> @typescript-eslint/parser@8.56.1 (semver-major)",
    );
  });

  it("fails when npm audit returns an error payload", () => {
    const result = runAuditScript({
      error: {
        code: "EAUDITNETWORK",
        summary: "request to registry failed",
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "[security:audit:summary] npm audit failed: request to registry failed",
    );
  });

  it("falls back to top-level message when error summary is empty", () => {
    const result = runAuditScript({
      error: {
        code: "EAUDITNETWORK",
        summary: "   ",
      },
      message: "403 Forbidden - POST /-/npm/v1/security/advisories/bulk",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "[security:audit:summary] npm audit failed: 403 Forbidden - POST /-/npm/v1/security/advisories/bulk",
    );
  });

  it("parses JSON even when stderr noise trails the payload", () => {
    const result = runAuditScriptFromRaw(
      `${JSON.stringify({
        vulnerabilities: {},
        metadata: {
          vulnerabilities: {
            info: 0,
            low: 0,
            moderate: 0,
            high: 0,
            critical: 0,
            total: 0,
          },
        },
      })}\nnpm WARN audit endpoint slow`,
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[security:audit:summary] PASS");
  });
});
