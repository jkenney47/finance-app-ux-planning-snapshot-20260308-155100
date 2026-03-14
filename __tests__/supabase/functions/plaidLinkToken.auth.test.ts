import fs from "node:fs";
import path from "node:path";
import { describe, expect, jest, test } from "@jest/globals";

import { getAuthenticatedUserId } from "@/supabase/functions/plaidLinkToken/auth";

describe("plaidLinkToken auth regression", () => {
  test("missing auth is rejected", async () => {
    const resolveUserId = jest.fn(async () => "user-1");
    const userId = await getAuthenticatedUserId(null, resolveUserId);

    expect(userId).toBeNull();
    expect(resolveUserId).not.toHaveBeenCalled();
  });

  test("invalid auth is rejected", async () => {
    const resolveUserId = jest.fn(async () => null);
    const userId = await getAuthenticatedUserId(
      "Bearer invalid-token",
      resolveUserId,
    );

    expect(userId).toBeNull();
    expect(resolveUserId).toHaveBeenCalledWith("invalid-token");
  });

  test("valid auth is allowed", async () => {
    const resolveUserId = jest.fn(async () => "user-123");
    const userId = await getAuthenticatedUserId(
      "Bearer valid-token",
      resolveUserId,
    );

    expect(userId).toBe("user-123");
    expect(resolveUserId).toHaveBeenCalledWith("valid-token");
  });

  test("entrypoint is wired to auth helper", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "supabase/functions/plaidLinkToken/index.ts"),
      "utf8",
    );

    expect(source).toContain('from "./auth.ts"');
    expect(source).toContain("getAuthenticatedUserId(");
  });
});
