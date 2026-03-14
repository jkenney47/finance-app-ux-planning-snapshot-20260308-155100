import type {
  AgentCapability,
  AgentGatewayError,
  AgentInvocationRequest,
  AgentInvocationResponse,
  AgentProviderProtocol,
  AgentProvider,
  AgentProviderAuthType,
  AgentProviderStatus,
} from "@/utils/contracts/agents";
import {
  isAgentCapability,
  isAgentProviderProtocol,
} from "@/utils/contracts/agents";

export type AgentProviderRow = {
  provider_key: string;
  display_name: string;
  status: string;
  auth_type: string;
  endpoint_url: string | null;
  capabilities: string[] | null;
  metadata: Record<string, string | number | boolean | null> | null;
  updated_at: string;
};

type AgentInvocationLogRow = {
  id: string;
  provider_key: string;
  capability: string;
  status: string;
  latency_ms: number | null;
  created_at: string;
  error_message: string | null;
};

export type AgentInvocationLogEntry = {
  id: string;
  providerKey: string;
  capability: string;
  status: string;
  latencyMs: number | null;
  createdAt: string;
  errorMessage: string | null;
};

function toProviderStatus(value: string): AgentProviderStatus {
  return value === "active" ? "active" : "inactive";
}

function toAuthType(value: string): AgentProviderAuthType {
  if (value === "bearer_env") return "bearer_env";
  if (value === "api_key_env") return "api_key_env";
  return "none";
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toProtocol(
  metadata: AgentProviderRow["metadata"],
): AgentProviderProtocol {
  const protocolValue = asString(metadata?.protocol);
  if (protocolValue && isAgentProviderProtocol(protocolValue)) {
    return protocolValue;
  }
  return "finance_app_v1";
}

function toCapabilities(values: string[] | null): AgentCapability[] {
  if (!values) return [];
  return values.filter((value): value is AgentCapability =>
    isAgentCapability(value),
  );
}

export function mapAgentProviderRow(row: AgentProviderRow): AgentProvider {
  return {
    providerKey: row.provider_key,
    displayName: row.display_name,
    status: toProviderStatus(row.status),
    authType: toAuthType(row.auth_type),
    protocol: toProtocol(row.metadata),
    endpointUrl: row.endpoint_url ?? undefined,
    capabilities: toCapabilities(row.capabilities),
    metadata: row.metadata ?? undefined,
    updatedAt: row.updated_at,
  };
}

function formatGatewayError(
  status: number,
  message: string,
  details?: unknown,
): AgentGatewayError {
  return {
    status,
    message,
    details,
  };
}

export async function listAgentProviders(): Promise<AgentProvider[]> {
  const { supabase } = await import("@/utils/supabaseClient");
  const { data, error } = await supabase
    .from("agent_providers")
    .select(
      "provider_key,display_name,status,auth_type,endpoint_url,capabilities,metadata,updated_at",
    )
    .eq("status", "active")
    .order("display_name", { ascending: true });

  if (error) {
    throw formatGatewayError(
      500,
      "Failed to load agent providers",
      error.message,
    );
  }

  return ((data as AgentProviderRow[] | null) ?? []).map(mapAgentProviderRow);
}

export async function invokeAgent(
  request: AgentInvocationRequest,
): Promise<AgentInvocationResponse> {
  const { supabase } = await import("@/utils/supabaseClient");
  const { data, error } = await supabase.functions.invoke("agentGateway", {
    body: request,
  });

  if (error) {
    throw formatGatewayError(500, "Agent gateway invocation failed", error);
  }

  return data as AgentInvocationResponse;
}

export async function listAgentInvocationHistory(
  limit = 10,
): Promise<AgentInvocationLogEntry[]> {
  const { supabase } = await import("@/utils/supabaseClient");
  const safeLimit = Math.max(1, Math.min(50, limit));
  const { data, error } = await supabase
    .from("agent_invocation_logs")
    .select(
      "id,provider_key,capability,status,latency_ms,created_at,error_message",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw formatGatewayError(
      500,
      "Failed to load agent invocation history",
      error.message,
    );
  }

  return ((data as AgentInvocationLogRow[] | null) ?? []).map((row) => ({
    id: row.id,
    providerKey: row.provider_key,
    capability: row.capability,
    status: row.status,
    latencyMs: row.latency_ms,
    createdAt: row.created_at,
    errorMessage: row.error_message,
  }));
}
