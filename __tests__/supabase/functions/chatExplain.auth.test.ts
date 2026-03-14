import fs from "node:fs";
import path from "node:path";
import { describe, expect, jest, test } from "@jest/globals";

import { authenticateChatExplainRequest } from "@/supabase/functions/chat-explain/auth";

describe("chat-explain auth regression", () => {
  test("missing auth is rejected", async () => {
    const resolveUserId = jest.fn(async () => "user-1");
    const authResult = await authenticateChatExplainRequest(
      null,
      resolveUserId,
    );

    expect(authResult).toEqual({ ok: false, reason: "missing_bearer" });
    expect(resolveUserId).not.toHaveBeenCalled();
  });

  test("invalid auth is rejected", async () => {
    const resolveUserId = jest.fn(async () => null);
    const authResult = await authenticateChatExplainRequest(
      "Bearer invalid-token",
      resolveUserId,
    );

    expect(authResult).toEqual({ ok: false, reason: "invalid_bearer" });
    expect(resolveUserId).toHaveBeenCalledWith("invalid-token");
  });

  test("valid auth is allowed", async () => {
    const resolveUserId = jest.fn(async () => "user-123");
    const authResult = await authenticateChatExplainRequest(
      "Bearer valid-token",
      resolveUserId,
    );

    expect(authResult).toEqual({ ok: true, userId: "user-123" });
    expect(resolveUserId).toHaveBeenCalledWith("valid-token");
  });

  test("entrypoint is wired to auth helper", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "supabase/functions/chat-explain/index.ts"),
      "utf8",
    );

    expect(source).toContain('from "./auth.ts"');
    expect(source).toContain("authenticateChatExplainRequest(");
  });
});
