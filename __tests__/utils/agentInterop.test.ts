import {
  isAgentCapability,
  isAgentProviderProtocol,
} from "@/utils/contracts/agents";
import {
  mapAgentProviderRow,
  type AgentProviderRow,
} from "@/utils/services/agentInteropClient";

describe("agent interop contracts", () => {
  it("accepts supported capabilities and rejects unknown values", () => {
    expect(isAgentCapability("plan")).toBe(true);
    expect(isAgentCapability("summarize")).toBe(true);
    expect(isAgentCapability("invalid_capability")).toBe(false);
  });

  it("accepts supported provider protocols and rejects unknown values", () => {
    expect(isAgentProviderProtocol("finance_app_v1")).toBe(true);
    expect(isAgentProviderProtocol("json_rpc_2_0")).toBe(true);
    expect(isAgentProviderProtocol("unsupported_protocol")).toBe(false);
  });
});

describe("mapAgentProviderRow", () => {
  it("maps provider rows and filters unknown capabilities", () => {
    const row: AgentProviderRow = {
      provider_key: "provider-demo",
      display_name: "Demo Provider",
      status: "active",
      auth_type: "bearer_env",
      endpoint_url: "https://example.com/invoke",
      capabilities: ["plan", "summarize", "unknown"],
      metadata: {
        model: "demo-1",
        protocol: "json_rpc_2_0",
      },
      updated_at: "2026-02-16T00:00:00.000Z",
    };

    const mapped = mapAgentProviderRow(row);

    expect(mapped.providerKey).toBe("provider-demo");
    expect(mapped.displayName).toBe("Demo Provider");
    expect(mapped.status).toBe("active");
    expect(mapped.authType).toBe("bearer_env");
    expect(mapped.protocol).toBe("json_rpc_2_0");
    expect(mapped.capabilities).toEqual(["plan", "summarize"]);
    expect(mapped.endpointUrl).toBe("https://example.com/invoke");
    expect(mapped.metadata).toEqual({
      model: "demo-1",
      protocol: "json_rpc_2_0",
    });
    expect(mapped.updatedAt).toBe("2026-02-16T00:00:00.000Z");
  });

  it("normalizes unknown status and auth type to safe defaults", () => {
    const row: AgentProviderRow = {
      provider_key: "provider-safe-default",
      display_name: "Safe Default",
      status: "deprecated",
      auth_type: "unhandled",
      endpoint_url: null,
      capabilities: null,
      metadata: {
        protocol: "unhandled_protocol",
      },
      updated_at: "2026-02-16T00:00:00.000Z",
    };

    const mapped = mapAgentProviderRow(row);

    expect(mapped.status).toBe("inactive");
    expect(mapped.authType).toBe("none");
    expect(mapped.protocol).toBe("finance_app_v1");
    expect(mapped.capabilities).toEqual([]);
    expect(mapped.endpointUrl).toBeUndefined();
    expect(mapped.metadata).toEqual({
      protocol: "unhandled_protocol",
    });
  });
});
