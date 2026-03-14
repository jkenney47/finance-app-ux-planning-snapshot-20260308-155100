import fs from "node:fs";
import path from "node:path";
import { describe, expect, jest, test } from "@jest/globals";

import { authenticateLogFmeEvaluationRequest } from "@/supabase/functions/logFmeEvaluation/auth";

describe("logFmeEvaluation auth regression", () => {
  test("missing auth is rejected", async () => {
    const resolveUserId = jest.fn(async () => "user-1");
    const authResult = await authenticateLogFmeEvaluationRequest(
      null,
      resolveUserId,
    );

    expect(authResult).toEqual({ ok: false, reason: "missing_auth" });
    expect(resolveUserId).not.toHaveBeenCalled();
  });

  test("invalid auth is rejected", async () => {
    const resolveUserId = jest.fn(async () => null);
    const authResult = await authenticateLogFmeEvaluationRequest(
      "Bearer invalid-token",
      resolveUserId,
    );

    expect(authResult).toEqual({ ok: false, reason: "invalid_auth" });
    expect(resolveUserId).toHaveBeenCalledWith("invalid-token");
  });

  test("valid auth is allowed", async () => {
    const resolveUserId = jest.fn(async () => "user-123");
    const authResult = await authenticateLogFmeEvaluationRequest(
      "Bearer valid-token",
      resolveUserId,
    );

    expect(authResult).toEqual({ ok: true, userId: "user-123" });
    expect(resolveUserId).toHaveBeenCalledWith("valid-token");
  });

  test("entrypoint is wired to auth helper", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "supabase/functions/logFmeEvaluation/index.ts"),
      "utf8",
    );

    expect(source).toContain('from "./auth.ts"');
    expect(source).toContain("authenticateLogFmeEvaluationRequest(");
  });
});
