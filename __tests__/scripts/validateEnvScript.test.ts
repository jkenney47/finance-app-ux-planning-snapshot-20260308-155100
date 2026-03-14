import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const validateEnvScriptPath = path.resolve(
  process.cwd(),
  "scripts/validate-env.mjs",
);

type RunValidateEnvInput = {
  envLocalContent?: string;
  envContent?: string;
};

type RunValidateEnvResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runValidateEnv(input: RunValidateEnvInput): RunValidateEnvResult {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "validate-env-"));

  try {
    if (typeof input.envContent === "string") {
      fs.writeFileSync(path.resolve(tempDir, ".env"), input.envContent, "utf8");
    }

    if (typeof input.envLocalContent === "string") {
      fs.writeFileSync(
        path.resolve(tempDir, ".env.local"),
        input.envLocalContent,
        "utf8",
      );
    }

    const result = spawnSync(process.execPath, [validateEnvScriptPath], {
      cwd: tempDir,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "1",
      },
    });

    return {
      status: result.status,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  } finally {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

const baseMockOnlyEnv = [
  "EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key",
  "EXPO_PUBLIC_USE_MOCK_DATA=true",
  "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false",
  "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false",
].join("\n");

describe("scripts/validate-env.mjs", () => {
  it("passes for strict boolean rollout flags in mock-only mode", () => {
    const result = runValidateEnv({
      envLocalContent: baseMockOnlyEnv,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      "[validate:env] Environment validation passed",
    );
    expect(result.stderr).toBe("");
  });

  it("fails when a rollout flag is not a strict boolean", () => {
    const result = runValidateEnv({
      envLocalContent: [
        "EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key",
        "EXPO_PUBLIC_USE_MOCK_DATA=true",
        "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=nope",
        "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=false",
      ].join("\n"),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK must be a strict boolean (true|false).",
    );
  });

  it("fails when real account data is enabled while mock mode is enabled", () => {
    const result = runValidateEnv({
      envLocalContent: [
        "EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key",
        "EXPO_PUBLIC_USE_MOCK_DATA=true",
        "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true",
        "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true",
      ].join("\n"),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Illegal rollout combination: EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true requires EXPO_PUBLIC_USE_MOCK_DATA=false.",
    );
  });

  it("fails when real account data is enabled without sandbox linking", () => {
    const result = runValidateEnv({
      envLocalContent: [
        "EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key",
        "EXPO_PUBLIC_USE_MOCK_DATA=false",
        "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=false",
        "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true",
      ].join("\n"),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Illegal rollout combination: EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true requires EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true.",
    );
  });

  it("prefers .env.local values over .env when both files are present", () => {
    const result = runValidateEnv({
      envContent: [
        "EXPO_PUBLIC_SUPABASE_URL=https://project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key",
        "EXPO_PUBLIC_USE_MOCK_DATA=true",
        "EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=invalid",
        "EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true",
      ].join("\n"),
      envLocalContent: baseMockOnlyEnv,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
  });
});
