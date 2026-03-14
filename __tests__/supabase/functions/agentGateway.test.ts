import { afterEach, describe, expect, jest, test } from "@jest/globals";
import { URL } from "url";

import {
  type AgentProviderRow,
  invokeProvider,
  type ProviderInvocationDependencies,
} from "@/supabase/functions/agentGateway/providerInvocation";

type FetchMock = jest.MockedFunction<
  NonNullable<ProviderInvocationDependencies["fetchImpl"]>
>;

function createFetchMock(): FetchMock {
  return jest.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => "",
  })) as FetchMock;
}

function buildDependencies(
  overrides: Partial<ProviderInvocationDependencies> = {},
): ProviderInvocationDependencies {
  return {
    URLImpl: URL,
    createAbortController: () => ({
      abort: jest.fn(),
      signal: null,
    }),
    createUuid: () => "uuid",
    env: {},
    fetchImpl: createFetchMock(),
    ...overrides,
  };
}

describe("agentGateway invokeProvider", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("success path - finance_app_v1 protocol", async () => {
    const dependencies = buildDependencies();
    const fetchMock = dependencies.fetchImpl as FetchMock;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ output: "Test output" }),
      status: 200,
    });

    const provider: AgentProviderRow = {
      provider_key: "test_provider",
      display_name: "Test Provider",
      endpoint_url: "https://example.com/api",
      auth_type: "bearer_env",
      metadata: null,
    };

    const requestBody = { capability: "test_cap", instruction: "Do something" };
    dependencies.env = { TEST_PROVIDER_TOKEN: "my-token" };

    const result = await invokeProvider(provider, requestBody, dependencies);

    expect(result.status).toBe("success");
    expect(result.output).toBe("Test output");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchCallArgs = fetchMock.mock.calls[0] as [
      string,
      { headers: Record<string, string> },
    ];
    expect(fetchCallArgs[0]).toBe("https://example.com/api");
    expect(fetchCallArgs[1].headers.Authorization).toBe("Bearer my-token");
  });

  test("success path - JSON RPC 2.0 protocol", async () => {
    const dependencies = buildDependencies();
    const fetchMock = dependencies.fetchImpl as FetchMock;
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({ result: { output: "JSON RPC Output" } }),
      status: 200,
    });

    const provider: AgentProviderRow = {
      provider_key: "test_rpc",
      display_name: "Test RPC",
      endpoint_url: "https://example.com/rpc",
      auth_type: "none",
      metadata: { protocol: "json_rpc_2_0", rpc_method: "my.method" },
    };

    const requestBody = { capability: "test_cap", instruction: "Do something" };
    const result = await invokeProvider(provider, requestBody, dependencies);

    expect(result.status).toBe("success");
    expect(result.output).toBe("JSON RPC Output");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain(
      '"method":"my.method"',
    );
  });

  test("provider failure path - network error", async () => {
    const dependencies = buildDependencies();
    const fetchMock = dependencies.fetchImpl as FetchMock;
    fetchMock.mockRejectedValueOnce(new Error("Network timeout"));

    const provider: AgentProviderRow = {
      provider_key: "test_provider",
      display_name: "Test Provider",
      endpoint_url: "https://example.com/api",
      auth_type: "none",
      metadata: null,
    };

    const requestBody = { capability: "test_cap", instruction: "Do something" };
    const result = await invokeProvider(provider, requestBody, dependencies);

    expect(result.status).toBe("failed");
    expect(result.output).toBe(
      "Provider invocation failed due to a network or timeout error.",
    );
  });

  test("fallback path - mock provider", async () => {
    const dependencies = buildDependencies();
    const fetchMock = dependencies.fetchImpl as FetchMock;
    const provider: AgentProviderRow = {
      provider_key: "mock_agent_bridge",
      display_name: "Mock Bridge",
      endpoint_url: null,
      auth_type: "none",
      metadata: null,
    };

    const requestBody = { capability: "plan", instruction: "Make a plan" };
    const result = await invokeProvider(provider, requestBody, dependencies);

    expect(result.status).toBe("success");
    expect(result.output).toContain("Mock provider plan");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("provider_unavailable path - allowlist blocks unknown host", async () => {
    const dependencies = buildDependencies({
      allowedHosts: "api.allowed.example",
    });

    const provider: AgentProviderRow = {
      provider_key: "test_provider",
      display_name: "Test Provider",
      endpoint_url: "https://example.com/api",
      auth_type: "none",
      metadata: null,
    };

    const requestBody = { capability: "test_cap", instruction: "Do something" };
    const result = await invokeProvider(provider, requestBody, dependencies);

    expect(result.status).toBe("provider_unavailable");
    expect(result.output).toBe(
      "Provider host is not allowlisted for outbound routing.",
    );
  });
});
