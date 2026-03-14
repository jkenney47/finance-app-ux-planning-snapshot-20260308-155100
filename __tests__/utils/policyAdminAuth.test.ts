import {
  authorizePolicyAdminAccess,
  extractBearerToken,
  parseAdminUserIds,
} from "@/supabase/functions/_shared/policyAdminAuth";

beforeAll(() => {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    });
  }
  if (!globalThis.crypto.randomUUID) {
    let counter = 0;
    globalThis.crypto.randomUUID = () => {
      counter += 1;
      return `10000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
    };
  }
  if (!globalThis.Response) {
    class PolyfillResponse {
      body: string;
      status: number;
      headers: Headers;

      constructor(
        body: string,
        init: { status?: number; headers?: HeadersInit },
      ) {
        this.body = body;
        this.status = init.status ?? 200;
        this.headers = new Headers(init.headers);
      }

      async json() {
        return JSON.parse(this.body);
      }
    }

    Object.defineProperty(globalThis, "Response", {
      value: PolyfillResponse,
      configurable: true,
    });
  }
});

type LookupResult = {
  data: { user_id?: string } | null;
  error: { message: string } | null;
};

function makeSupabaseMock(input: {
  userId?: string | null;
  authError?: { message: string } | null;
  lookup?: LookupResult;
}) {
  const lookupResult = input.lookup ?? {
    data: null,
    error: null,
  };

  const queryChain = {
    select: jest.fn(),
    eq: jest.fn(),
    limit: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: lookupResult.data,
      error: lookupResult.error,
    }),
  };
  queryChain.select.mockReturnValue(queryChain);
  queryChain.eq.mockReturnValue(queryChain);
  queryChain.limit.mockReturnValue(queryChain);

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: input.userId ? { id: input.userId } : null,
        },
        error: input.authError ?? null,
      }),
    },
    from: jest.fn().mockReturnValue(queryChain),
    __chain: queryChain,
  };
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: {
      get: (name: string) => {
        const key = Object.keys(headers).find(
          (headerName) => headerName.toLowerCase() === name.toLowerCase(),
        );
        return key ? headers[key] : null;
      },
    },
  } as unknown as Request;
}

describe("policy admin auth helpers", () => {
  it("parses admin user IDs from comma-separated env strings", () => {
    const parsed = parseAdminUserIds("  user-1, user-2 ,,user-3 ");
    expect(Array.from(parsed)).toEqual(["user-1", "user-2", "user-3"]);
  });

  it("returns empty set when env string is missing", () => {
    expect(parseAdminUserIds(undefined).size).toBe(0);
  });

  it("extracts bearer tokens only from valid Authorization headers", () => {
    expect(extractBearerToken("Bearer abc.def")).toBe("abc.def");
    expect(extractBearerToken("bearer token-123")).toBe("token-123");
    expect(extractBearerToken("Basic token-123")).toBeNull();
    expect(extractBearerToken("Bearer")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });

  it("authorizes when shared secret matches", async () => {
    const supabase = makeSupabaseMock({});
    const req = makeRequest({
      "x-policy-refresh-secret": "secret-123",
    });

    const result = await authorizePolicyAdminAccess(req, supabase as never, {
      sharedSecret: "secret-123",
    });

    expect(result).toEqual({
      ok: true,
      authMode: "secret",
      actorUserId: null,
    });
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it("returns unauthorized when bearer token is missing", async () => {
    const supabase = makeSupabaseMock({});
    const req = makeRequest();

    const result = await authorizePolicyAdminAccess(req, supabase as never);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.response.status).toBe(401);
    await expect(result.response.json()).resolves.toMatchObject({
      error: "Unauthorized",
      code: "unauthorized",
    });
  });

  it("authorizes JWT users from env allowlist", async () => {
    const supabase = makeSupabaseMock({ userId: "user-1" });
    const req = makeRequest({
      Authorization: "Bearer token-123",
    });

    const result = await authorizePolicyAdminAccess(req, supabase as never, {
      adminUserIdsCsv: "user-1,user-2",
    });

    expect(result).toEqual({
      ok: true,
      authMode: "admin_jwt",
      actorUserId: "user-1",
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns forbidden for authenticated non-admin users", async () => {
    const supabase = makeSupabaseMock({
      userId: "user-9",
      lookup: {
        data: null,
        error: null,
      },
    });
    const req = makeRequest({
      Authorization: "Bearer token-123",
    });

    const result = await authorizePolicyAdminAccess(req, supabase as never);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.response.status).toBe(403);
    await expect(result.response.json()).resolves.toMatchObject({
      error: "Forbidden",
      code: "forbidden",
    });
  });

  it("returns internal error when admin lookup fails", async () => {
    const supabase = makeSupabaseMock({
      userId: "user-9",
      lookup: {
        data: null,
        error: { message: "db unavailable" },
      },
    });
    const req = makeRequest({
      Authorization: "Bearer token-123",
    });

    const result = await authorizePolicyAdminAccess(req, supabase as never);
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.response.status).toBe(500);
    await expect(result.response.json()).resolves.toMatchObject({
      error: "Admin lookup failed",
      code: "admin_lookup_failed",
    });
  });

  it("authorizes active admins loaded from policy_ops_admins", async () => {
    const supabase = makeSupabaseMock({
      userId: "user-9",
      lookup: {
        data: { user_id: "user-9" },
        error: null,
      },
    });
    const req = makeRequest({
      Authorization: "Bearer token-123",
    });

    const result = await authorizePolicyAdminAccess(req, supabase as never);
    expect(result).toEqual({
      ok: true,
      authMode: "admin_jwt",
      actorUserId: "user-9",
    });
    expect(supabase.from).toHaveBeenCalledWith("policy_ops_admins");
  });
});
