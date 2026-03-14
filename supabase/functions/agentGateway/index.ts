// Supabase Edge Function: agentGateway (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";
import {
  invokeProvider,
  resolveProviderProtocol,
  type AgentGatewayRequest,
  type AgentProviderRow,
  type InvocationResult,
} from "./providerInvocation.ts";
import { getAuthenticatedUserId } from "./auth.ts";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function jsonResponse(payload: unknown, status = 200): Response {
  const requestId = createRequestId();
  const payloadRecord =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;

  if (status >= 400) {
    const error =
      typeof payloadRecord?.error === "string"
        ? payloadRecord.error
        : "Agent gateway error";
    const code =
      typeof payloadRecord?.code === "string"
        ? payloadRecord.code
        : "agent_gateway_error";
    const message =
      typeof payloadRecord?.message === "string"
        ? payloadRecord.message
        : error;

    return jsonError({
      status,
      error,
      message,
      code,
      details: payloadRecord?.details,
      context:
        payloadRecord?.context &&
        typeof payloadRecord.context === "object" &&
        !Array.isArray(payloadRecord.context)
          ? (payloadRecord.context as Record<string, unknown>)
          : undefined,
      requestId,
      cors: true,
    });
  }

  if (payloadRecord) {
    return jsonSuccess(payloadRecord, {
      status,
      requestId,
      includeRequestIdInBody: true,
      cors: true,
    });
  }

  return jsonSuccess(payload, {
    status,
    requestId,
    includeRequestIdInBody: false,
    cors: true,
  });
}

async function resolveUserIdFromAccessToken(
  accessToken: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user.id;
}

async function persistInvocationLog(input: {
  userId: string | null;
  providerKey: string;
  capability: string;
  requestPayload: AgentGatewayRequest;
  result: InvocationResult;
  latencyMs: number;
}) {
  const { error } = await supabase.from("agent_invocation_logs").insert([
    {
      user_id: input.userId,
      provider_key: input.providerKey,
      capability: input.capability,
      request_payload: input.requestPayload,
      response_payload: input.result.raw ?? null,
      status: input.result.status,
      latency_ms: input.latencyMs,
      error_message:
        input.result.status === "failed" ||
        input.result.status === "provider_unavailable"
          ? input.result.output
          : null,
    },
  ]);

  if (error) {
    console.warn("Failed to persist agent invocation log", error.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const userId = await getAuthenticatedUserId(
    req.headers.get("authorization"),
    resolveUserIdFromAccessToken,
  );
  if (!userId) {
    return jsonResponse(
      {
        error: "Unauthorized",
        message: "Missing or invalid bearer token.",
        code: "unauthorized",
      },
      401,
    );
  }

  let body: AgentGatewayRequest;
  try {
    body = (await req.json()) as AgentGatewayRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  if (!body.providerKey || !body.capability || !body.instruction) {
    return jsonResponse(
      {
        error: "providerKey, capability, and instruction are required",
      },
      400,
    );
  }

  const { data: providerRowData, error: providerError } = await supabase
    .from("agent_providers")
    .select("provider_key,display_name,endpoint_url,auth_type,metadata")
    .eq("provider_key", body.providerKey)
    .eq("status", "active")
    .maybeSingle();

  if (providerError) {
    return jsonResponse(
      { error: "Failed to load provider", details: "internal_error" },
      500,
    );
  }

  if (!providerRowData) {
    return jsonResponse({ error: "Provider not found or inactive" }, 404);
  }

  const provider = providerRowData as AgentProviderRow;
  const startedAt = Date.now();
  const result = await invokeProvider(provider, body);
  const latencyMs = Date.now() - startedAt;
  const requestId = crypto.randomUUID();

  await persistInvocationLog({
    userId,
    providerKey: provider.provider_key,
    capability: body.capability,
    requestPayload: body,
    result,
    latencyMs,
  });

  return jsonResponse({
    requestId,
    providerKey: provider.provider_key,
    providerProtocol: resolveProviderProtocol(provider).protocol,
    capability: body.capability,
    status: result.status,
    output: result.output,
    latencyMs,
    raw: result.raw,
    warnings: result.warnings ?? [],
  });
});
