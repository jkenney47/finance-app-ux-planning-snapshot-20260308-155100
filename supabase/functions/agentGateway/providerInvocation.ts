export type AgentGatewayRequest = {
  providerKey?: string;
  capability?: string;
  instruction?: string;
  context?: Record<string, unknown>;
  constraints?: {
    maxOutputTokens?: number;
    responseFormat?: "markdown" | "json" | "text";
    temperature?: number;
  };
  dryRun?: boolean;
};

export type AgentProviderRow = {
  provider_key: string;
  display_name: string;
  endpoint_url: string | null;
  auth_type: "none" | "bearer_env" | "api_key_env";
  metadata: Record<string, unknown> | null;
};

export type AgentProviderProtocol = "finance_app_v1" | "json_rpc_2_0";

export type InvocationResult = {
  status: "success" | "dry_run" | "provider_unavailable" | "failed";
  output: string;
  raw?: unknown;
  warnings?: string[];
};

type EnvMap = Record<string, string | undefined>;

type ProviderResponse = {
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

type FetchImpl = (
  input: string,
  init?: RequestInit,
) => Promise<ProviderResponse>;

type TimeoutHandle = ReturnType<typeof setTimeout>;

type AbortControllerLike = {
  abort(): void;
  signal: AbortSignal | null;
};

type UrlLike = {
  host: string;
};

type UrlConstructor = new (input: string) => UrlLike;

export type ProviderInvocationDependencies = {
  URLImpl?: UrlConstructor;
  allowedHosts?: string;
  clearTimeoutImpl?: (timeout: TimeoutHandle) => void;
  createAbortController?: () => AbortControllerLike;
  createUuid?: () => string;
  defaultProviderTimeoutMs?: number;
  env?: EnvMap;
  fetchImpl?: FetchImpl;
  setTimeoutImpl?: (callback: () => void, delay: number) => TimeoutHandle;
};

const DEFAULT_PROVIDER_TIMEOUT_MS = 10_000;

function getAllowedHosts(rawAllowedHosts: string): Set<string> {
  return new Set(
    rawAllowedHosts
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function numberOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function resolveProviderProtocol(provider: AgentProviderRow): {
  protocol: AgentProviderProtocol;
  warning?: string;
} {
  const rawProtocol = stringOrNull(provider.metadata?.protocol);

  if (!rawProtocol || rawProtocol === "finance_app_v1") {
    return { protocol: "finance_app_v1" };
  }
  if (rawProtocol === "json_rpc_2_0") {
    return { protocol: "json_rpc_2_0" };
  }

  return {
    protocol: "finance_app_v1",
    warning: `Unsupported provider protocol "${rawProtocol}". Falling back to finance_app_v1.`,
  };
}

function resolveBearerAuthValue(
  provider: AgentProviderRow,
  env: EnvMap,
): {
  headerValue: string | null;
  warning?: string;
} {
  const envKey =
    stringOrNull(provider.metadata?.token_env_key) ??
    `${provider.provider_key.toUpperCase()}_TOKEN`;
  const token = env[envKey];
  if (!token) {
    return {
      headerValue: null,
      warning: `Missing bearer token in env key ${envKey}`,
    };
  }
  return { headerValue: `Bearer ${token}` };
}

function resolveApiKeyAuthValue(
  provider: AgentProviderRow,
  env: EnvMap,
): {
  headerName: string;
  headerValue: string | null;
  warning?: string;
} {
  const envKey =
    stringOrNull(provider.metadata?.api_key_env_key) ??
    `${provider.provider_key.toUpperCase()}_API_KEY`;
  const headerName =
    stringOrNull(provider.metadata?.api_key_header) ?? "x-api-key";
  const apiKey = env[envKey];

  if (!apiKey) {
    return {
      headerName,
      headerValue: null,
      warning: `Missing API key in env key ${envKey}`,
    };
  }

  return {
    headerName,
    headerValue: apiKey,
  };
}

function extractProviderOutput(payload: unknown, fallbackText: string): string {
  if (typeof payload === "string" && payload.trim()) return payload;

  if (payload && typeof payload === "object") {
    const source = payload as Record<string, unknown>;
    const candidates = [
      source.output,
      source.markdown,
      source.response,
      source.result,
      source.message,
    ];
    for (const value of candidates) {
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  return fallbackText;
}

function extractJsonRpcError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const source = payload as Record<string, unknown>;
  const error = source.error;
  if (!error || typeof error !== "object") return null;
  const errorRecord = error as Record<string, unknown>;
  const message = stringOrNull(errorRecord.message);
  if (message && message.trim()) return message;
  const code = numberOrNull(errorRecord.code);
  if (code !== null) return `JSON-RPC error ${code}`;
  return "JSON-RPC provider returned an error.";
}

function buildProviderPayload(input: {
  provider: AgentProviderRow;
  requestBody: AgentGatewayRequest;
  protocol: AgentProviderProtocol;
  createUuid: () => string;
}) {
  if (input.protocol === "json_rpc_2_0") {
    const method =
      stringOrNull(input.provider.metadata?.rpc_method) ?? "agent.invoke";
    return {
      jsonrpc: "2.0",
      id: input.createUuid(),
      method,
      params: {
        capability: input.requestBody.capability,
        instruction: input.requestBody.instruction,
        context: input.requestBody.context ?? {},
        constraints: input.requestBody.constraints ?? {},
      },
    };
  }

  return {
    capability: input.requestBody.capability,
    instruction: input.requestBody.instruction,
    context: input.requestBody.context ?? {},
    constraints: input.requestBody.constraints ?? {},
  };
}

function buildSuccessResult(input: {
  protocol: AgentProviderProtocol;
  payload: unknown;
  warnings: string[];
}): InvocationResult {
  if (input.protocol === "json_rpc_2_0") {
    const jsonRpcError = extractJsonRpcError(input.payload);
    if (jsonRpcError) {
      return {
        status: "failed",
        output: jsonRpcError,
        raw: input.payload,
        warnings: input.warnings,
      };
    }

    if (input.payload && typeof input.payload === "object") {
      const source = input.payload as Record<string, unknown>;
      const resultPayload = source.result ?? source;
      return {
        status: "success",
        output: extractProviderOutput(
          resultPayload,
          "Provider returned an empty response.",
        ),
        raw: input.payload,
        warnings: input.warnings,
      };
    }
  }

  return {
    status: "success",
    output: extractProviderOutput(
      input.payload,
      "Provider returned an empty response.",
    ),
    raw: input.payload,
    warnings: input.warnings,
  };
}

function isBuiltInMockProvider(provider: AgentProviderRow): boolean {
  if (provider.provider_key === "mock_agent_bridge") {
    return true;
  }

  const metadataMode = stringOrNull(provider.metadata?.mode);
  return metadataMode === "dry_run" || metadataMode === "mock_response";
}

function stringifyContext(
  context: Record<string, unknown> | undefined,
): string {
  if (!context || Object.keys(context).length === 0) {
    return "No context provided.";
  }
  try {
    return JSON.stringify(context);
  } catch {
    return "Context could not be serialized.";
  }
}

function buildMockProviderOutput(input: {
  provider: AgentProviderRow;
  requestBody: AgentGatewayRequest;
}): string {
  const capability = input.requestBody.capability ?? "custom";
  const instruction = input.requestBody.instruction ?? "";
  const contextPreview = stringifyContext(input.requestBody.context);

  if (capability === "summarize") {
    return [
      "Mock provider summary",
      `Provider: ${input.provider.display_name}`,
      `Instruction: ${instruction}`,
      "Recommended action: prioritize one measurable next step this week.",
      `Context: ${contextPreview}`,
    ].join("\n");
  }

  if (capability === "plan") {
    return [
      "Mock provider plan",
      "1. Clarify the target outcome for the next 30 days.",
      "2. Choose one action with clear completion criteria.",
      "3. Review progress and adjust assumptions.",
      `Instruction source: ${instruction}`,
    ].join("\n");
  }

  if (capability === "explain") {
    return [
      "Mock provider explanation",
      "This recommendation focuses on reducing uncertainty before optimizing returns.",
      `Prompt: ${instruction}`,
      `Context: ${contextPreview}`,
    ].join("\n");
  }

  return [
    "Mock provider response",
    `Capability: ${capability}`,
    `Instruction: ${instruction}`,
    `Context: ${contextPreview}`,
  ].join("\n");
}

function handleDryRun(provider: AgentProviderRow): InvocationResult {
  return {
    status: "dry_run",
    output: `Dry run only. Provider ${provider.display_name} is registered and ready for external routing.`,
    raw: {
      providerKey: provider.provider_key,
      endpointConfigured: Boolean(provider.endpoint_url),
    },
  };
}

function handleMockProvider(
  provider: AgentProviderRow,
  requestBody: AgentGatewayRequest,
): InvocationResult {
  const output = buildMockProviderOutput({ provider, requestBody });
  return {
    status: "success",
    output,
    raw: {
      providerKey: provider.provider_key,
      mode: "builtin_mock",
      endpointConfigured: false,
      capability: requestBody.capability ?? null,
    },
    warnings: [
      "Using built-in mock provider response because endpoint_url is not configured.",
    ],
  };
}

function handleUnconfiguredEndpoint(
  provider: AgentProviderRow,
): InvocationResult {
  return {
    status: "provider_unavailable",
    output: "Provider endpoint is not configured.",
    raw: {
      providerKey: provider.provider_key,
      endpointConfigured: false,
    },
    warnings: ["Set endpoint_url for this provider or use dryRun mode."],
  };
}

function validateProviderEndpoint(input: {
  allowedHosts: string;
  endpointUrl: string;
  URLImpl: UrlConstructor;
}): {
  endpoint: UrlLike | null;
  errorResult?: InvocationResult;
} {
  let endpoint: UrlLike;
  try {
    endpoint = new input.URLImpl(input.endpointUrl);
  } catch {
    return {
      endpoint: null,
      errorResult: {
        status: "failed",
        output: "Provider endpoint URL is invalid.",
        warnings: ["Invalid provider endpoint URL."],
      },
    };
  }

  const allowedHosts = getAllowedHosts(input.allowedHosts);
  if (allowedHosts.size > 0 && !allowedHosts.has(endpoint.host.toLowerCase())) {
    return {
      endpoint: null,
      errorResult: {
        status: "provider_unavailable",
        output: "Provider host is not allowlisted for outbound routing.",
        warnings: [
          `Host ${endpoint.host} is not in AGENT_GATEWAY_ALLOWED_HOSTS.`,
        ],
      },
    };
  }

  return { endpoint };
}

function buildProviderHeaders(
  provider: AgentProviderRow,
  env: EnvMap,
): {
  headers: Record<string, string> | null;
  errorResult?: InvocationResult;
} {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (provider.auth_type === "bearer_env") {
    const auth = resolveBearerAuthValue(provider, env);
    if (!auth.headerValue) {
      return {
        headers: null,
        errorResult: {
          status: "provider_unavailable",
          output: "Provider auth is not configured.",
          warnings: auth.warning ? [auth.warning] : [],
        },
      };
    }
    headers.Authorization = auth.headerValue;
  }

  if (provider.auth_type === "api_key_env") {
    const auth = resolveApiKeyAuthValue(provider, env);
    if (!auth.headerValue) {
      return {
        headers: null,
        errorResult: {
          status: "provider_unavailable",
          output: "Provider API key is not configured.",
          warnings: auth.warning ? [auth.warning] : [],
        },
      };
    }
    headers[auth.headerName] = auth.headerValue;
  }

  return { headers };
}

async function executeProviderRequest(input: {
  clearTimeoutImpl: (timeout: TimeoutHandle) => void;
  createAbortController: () => AbortControllerLike;
  endpointUrl: string;
  fetchImpl: FetchImpl;
  headers: Record<string, string>;
  payload: unknown;
  protocol: AgentProviderProtocol;
  setTimeoutImpl: (callback: () => void, delay: number) => TimeoutHandle;
  timeoutMs: number;
  warnings: string[];
}): Promise<InvocationResult> {
  const abortController = input.createAbortController();
  const timeout = input.setTimeoutImpl(
    () => abortController.abort(),
    input.timeoutMs,
  );
  const { protocol, warnings } = input;

  try {
    const response = await input.fetchImpl(input.endpointUrl, {
      method: "POST",
      headers: input.headers,
      body: JSON.stringify(input.payload),
      signal: abortController.signal,
    });

    const responseText = await response.text();
    const parsed =
      responseText.length > 0
        ? (() => {
            try {
              return JSON.parse(responseText);
            } catch {
              return responseText;
            }
          })()
        : null;

    if (!response.ok) {
      warnings.push(`Provider returned HTTP ${response.status}`);
      return {
        status: "failed",
        output:
          extractJsonRpcError(parsed) ??
          extractProviderOutput(parsed, "Provider request failed."),
        raw: parsed,
        warnings,
      };
    }

    return buildSuccessResult({
      protocol,
      payload: parsed,
      warnings,
    });
  } catch (error) {
    return {
      status: "failed",
      output: "Provider invocation failed due to a network or timeout error.",
      raw: error instanceof Error ? error.message : String(error),
      warnings,
    };
  } finally {
    input.clearTimeoutImpl(timeout);
  }
}

export async function invokeProvider(
  provider: AgentProviderRow,
  requestBody: AgentGatewayRequest,
  dependencies: ProviderInvocationDependencies = {},
): Promise<InvocationResult> {
  const env = dependencies.env ?? process.env;

  if (requestBody.dryRun) {
    return handleDryRun(provider);
  }

  if (!provider.endpoint_url) {
    if (isBuiltInMockProvider(provider)) {
      return handleMockProvider(provider, requestBody);
    }
    return handleUnconfiguredEndpoint(provider);
  }

  const { endpoint, errorResult: endpointError } = validateProviderEndpoint({
    endpointUrl: provider.endpoint_url,
    allowedHosts:
      dependencies.allowedHosts ?? env.AGENT_GATEWAY_ALLOWED_HOSTS ?? "",
    URLImpl: dependencies.URLImpl ?? globalThis.URL,
  });
  if (endpointError || !endpoint) {
    return endpointError!;
  }

  const { headers, errorResult: headersError } = buildProviderHeaders(
    provider,
    env,
  );
  if (headersError || !headers) {
    return headersError!;
  }

  const warnings: string[] = [];
  const protocolResolution = resolveProviderProtocol(provider);
  if (protocolResolution.warning) {
    warnings.push(protocolResolution.warning);
  }

  const timeoutMs =
    numberOrNull(provider.metadata?.timeout_ms) ??
    dependencies.defaultProviderTimeoutMs ??
    DEFAULT_PROVIDER_TIMEOUT_MS;
  const outboundPayload = buildProviderPayload({
    provider,
    requestBody,
    protocol: protocolResolution.protocol,
    createUuid: dependencies.createUuid ?? (() => crypto.randomUUID()),
  });

  return executeProviderRequest({
    endpointUrl: provider.endpoint_url,
    headers,
    payload: outboundPayload,
    timeoutMs,
    protocol: protocolResolution.protocol,
    warnings,
    clearTimeoutImpl: dependencies.clearTimeoutImpl ?? clearTimeout,
    createAbortController:
      dependencies.createAbortController ?? (() => new AbortController()),
    fetchImpl: dependencies.fetchImpl ?? fetch,
    setTimeoutImpl: dependencies.setTimeoutImpl ?? setTimeout,
  });
}
