import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "@/supabase/functions/_shared/http";

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
      return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
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

describe("shared http helpers", () => {
  it("creates unique request IDs", () => {
    const first = createRequestId();
    const second = createRequestId();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });

  it("builds structured error responses with request IDs", async () => {
    const response = jsonError({
      status: 400,
      error: "Invalid request",
      code: "invalid_request",
      details: { field: "user_id" },
      context: { scope: "test" },
    });

    expect(response.status).toBe(400);
    const requestId = response.headers.get("X-Request-Id");
    expect(requestId).toBeTruthy();

    const payload = await response.json();
    expect(payload).toMatchObject({
      error: "Invalid request",
      message: "Invalid request",
      code: "invalid_request",
      details: { field: "user_id" },
      context: { scope: "test" },
    });
    expect(payload.request_id).toBe(requestId);
  });

  it("supports CORS and custom headers on error responses", async () => {
    const response = jsonError({
      status: 401,
      error: "Unauthorized",
      code: "unauthorized",
      cors: true,
      headers: { "x-extra": "enabled" },
    });

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("x-extra")).toBe("enabled");

    const payload = await response.json();
    expect(payload.error).toBe("Unauthorized");
  });

  it("adds request IDs to object success payloads by default", async () => {
    const response = jsonSuccess({
      status: "ok",
    });

    const requestId = response.headers.get("X-Request-Id");
    const payload = await response.json();

    expect(payload.status).toBe("ok");
    expect(payload.request_id).toBe(requestId);
  });

  it("preserves non-object payloads when request ID body injection is disabled", async () => {
    const response = jsonSuccess(["a", "b"], {
      includeRequestIdInBody: false,
    });

    const payload = await response.json();
    expect(payload).toEqual(["a", "b"]);
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("returns preflight CORS responses", () => {
    const response = optionsResponse();
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "OPTIONS",
    );
  });
});
