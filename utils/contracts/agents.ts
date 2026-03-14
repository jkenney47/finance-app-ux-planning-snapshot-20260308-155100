export type AgentProviderAuthType = "none" | "bearer_env" | "api_key_env";

export type AgentProviderStatus = "active" | "inactive";

export const AGENT_PROVIDER_PROTOCOLS = [
  "finance_app_v1",
  "json_rpc_2_0",
] as const;

export type AgentProviderProtocol = (typeof AGENT_PROVIDER_PROTOCOLS)[number];

export const AGENT_CAPABILITIES = [
  "explain",
  "summarize",
  "plan",
  "classify",
  "extract",
  "custom",
] as const;

export type AgentCapability = (typeof AGENT_CAPABILITIES)[number];

export type AgentProvider = {
  providerKey: string;
  displayName: string;
  status: AgentProviderStatus;
  authType: AgentProviderAuthType;
  protocol: AgentProviderProtocol;
  endpointUrl?: string;
  capabilities: AgentCapability[];
  metadata?: Record<string, string | number | boolean | null>;
  updatedAt?: string;
};

export type AgentInvocationConstraints = {
  maxOutputTokens?: number;
  responseFormat?: "markdown" | "json" | "text";
  temperature?: number;
};

export type AgentInvocationRequest = {
  providerKey: string;
  capability: AgentCapability;
  instruction: string;
  context?: Record<string, unknown>;
  constraints?: AgentInvocationConstraints;
  dryRun?: boolean;
};

export type AgentInvocationStatus =
  | "success"
  | "dry_run"
  | "provider_unavailable"
  | "failed";

export type AgentInvocationResponse = {
  requestId: string;
  providerKey: string;
  providerProtocol?: AgentProviderProtocol;
  capability: AgentCapability;
  status: AgentInvocationStatus;
  output: string;
  latencyMs: number;
  raw?: unknown;
  warnings?: string[];
};

export type AgentGatewayError = {
  status: number;
  message: string;
  details?: unknown;
};

export type AgentWorkflowStep = {
  id: string;
  providerKey: string;
  capability: AgentCapability;
  instructionTemplate: string;
  required?: boolean;
  parallelGroup?: string;
  dryRun?: boolean;
};

export type AgentWorkflowDefinition = {
  workflowId: string;
  initialInstruction: string;
  sharedContext?: Record<string, unknown>;
  steps: AgentWorkflowStep[];
  dryRun?: boolean;
};

export type AgentWorkflowStepResult = {
  stepId: string;
  providerKey: string;
  capability: AgentCapability;
  parallelGroup?: string;
  required: boolean;
  status: AgentInvocationStatus;
  output: string;
  latencyMs: number;
  startedAt: string;
  completedAt: string;
  warnings: string[];
};

export type AgentWorkflowStatus = "success" | "partial_success" | "failed";

export type AgentWorkflowMetrics = {
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  optionalFailures: number;
  totalLatencyMs: number;
  parallelGroups: string[];
};

export type AgentWorkflowResult = {
  workflowId: string;
  status: AgentWorkflowStatus;
  finalOutput: string;
  failedStepId?: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  metrics: AgentWorkflowMetrics;
  steps: AgentWorkflowStepResult[];
};

export function isAgentCapability(value: string): value is AgentCapability {
  return (AGENT_CAPABILITIES as readonly string[]).includes(value);
}

export function isAgentProviderProtocol(
  value: string,
): value is AgentProviderProtocol {
  return (AGENT_PROVIDER_PROTOCOLS as readonly string[]).includes(value);
}
