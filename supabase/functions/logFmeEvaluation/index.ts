// Supabase Edge Function: logFmeEvaluation (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";
import { authenticateLogFmeEvaluationRequest } from "./auth.ts";

type LogRequestPayload = {
  facts_hash?: string | null;
  facts_summary?: Record<string, unknown> | null;
  policy_versions?: Record<string, number | null> | null;
  rule_version?: number | null;
  output_summary?: Record<string, unknown> | null;
  trace?: unknown;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LOG_SIGNING_SECRET = process.env.FME_LOG_SIGNING_SECRET;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function badRequest(message: string, requestId: string): Response {
  return jsonError({
    status: 400,
    error: message,
    code: "invalid_request",
    cors: true,
    requestId,
  });
}

function unauthorized(message: string, requestId: string): Response {
  return jsonError({
    status: 401,
    error: message,
    code: "unauthorized",
    cors: true,
    requestId,
  });
}

function internalError(
  message: string,
  details: unknown,
  requestId: string,
): Response {
  return jsonError({
    status: 500,
    error: message,
    code: "internal_error",
    details,
    cors: true,
    requestId,
  });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    const serialized = entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",");
    return `{${serialized}}`;
  }
  return JSON.stringify(value);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function evaluationSignatureFor(
  userId: string,
  payload: LogRequestPayload,
): string {
  return hashString(
    stableStringify({
      userId,
      factsHash: payload.facts_hash ?? null,
      policyVersions: payload.policy_versions ?? {},
      ruleVersion: payload.rule_version ?? null,
      outputSummary: payload.output_summary ?? {},
    }),
  );
}

async function artifactSignatureFor(
  evaluationSignature: string,
  createdAt: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(LOG_SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${evaluationSignature}:${createdAt}`),
  );
  return Array.from(new Uint8Array(signed))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hasMissingSignatureColumnsError(error: { message?: string }): boolean {
  const message = (error?.message ?? "").toLowerCase();
  return (
    message.includes("evaluation_signature") &&
    message.includes("does not exist")
  );
}

async function resolveUserIdFromAccessToken(
  accessToken: string,
): Promise<string | null> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser(accessToken);
  if (authError || !authData?.user?.id) {
    return null;
  }
  return authData.user.id;
}

async function authenticateRequest(
  authorizationHeader: string | null,
  requestId: string,
): Promise<string | Response> {
  const authResult = await authenticateLogFmeEvaluationRequest(
    authorizationHeader,
    resolveUserIdFromAccessToken,
  );
  if (!authResult.ok) {
    return unauthorized(
      authResult.reason === "missing_auth"
        ? "Unauthorized"
        : "Unable to verify authenticated user",
      requestId,
    );
  }
  return authResult.userId;
}

async function parsePayload(
  req: Request,
  requestId: string,
): Promise<LogRequestPayload | Response> {
  let payload: LogRequestPayload;
  try {
    payload = (await req.json()) as LogRequestPayload;
  } catch {
    return badRequest("Invalid JSON payload", requestId);
  }

  if (!payload.output_summary || !payload.policy_versions) {
    return badRequest(
      "Missing required fields: output_summary, policy_versions",
      requestId,
    );
  }
  return payload;
}

async function checkExistingLog(
  userId: string,
  evaluationSignature: string,
  artifactSignature: string,
  requestId: string,
): Promise<Response | null> {
  const { data: existingRow, error: existingRowError } = await supabase
    .from("fme_evaluation_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("evaluation_signature", evaluationSignature)
    .maybeSingle();

  if (existingRowError && !hasMissingSignatureColumnsError(existingRowError)) {
    return internalError(
      "Failed to query existing evaluation log",
      existingRowError.message,
      requestId,
    );
  }

  if (existingRow?.id) {
    return jsonSuccess(
      {
        status: "duplicate",
        logId: existingRow.id,
        evaluationSignature,
        artifactSignature,
      },
      { status: 200, cors: true, requestId, includeRequestIdInBody: true },
    );
  }
  return null;
}

async function insertLog(
  userId: string,
  payload: LogRequestPayload,
  evaluationSignature: string,
  artifactSignature: string,
  createdAt: string,
  requestId: string,
): Promise<Response> {
  const baseInsertPayload = {
    user_id: userId,
    facts_hash: payload.facts_hash ?? null,
    facts_summary: payload.facts_summary ?? null,
    policy_versions: payload.policy_versions,
    rule_version: payload.rule_version ?? null,
    output_summary: payload.output_summary,
    trace: payload.trace ?? null,
    created_at: createdAt,
  };

  const insertWithSignatures = {
    ...baseInsertPayload,
    evaluation_signature: evaluationSignature,
    artifact_signature: artifactSignature,
  };

  const { data: insertedWithSignatures, error: insertError } = await supabase
    .from("fme_evaluation_logs")
    .insert([insertWithSignatures])
    .select("id")
    .maybeSingle();

  if (insertError && hasMissingSignatureColumnsError(insertError)) {
    const { data: insertedFallback, error: fallbackError } = await supabase
      .from("fme_evaluation_logs")
      .insert([baseInsertPayload])
      .select("id")
      .maybeSingle();

    if (fallbackError) {
      return internalError(
        "Failed to insert evaluation log",
        fallbackError,
        requestId,
      );
    }

    return jsonSuccess(
      {
        status: "inserted",
        logId: insertedFallback?.id ?? null,
        evaluationSignature,
        artifactSignature,
        signaturePersistence: "legacy_schema",
      },
      { status: 200, cors: true, requestId, includeRequestIdInBody: true },
    );
  }

  if (insertError) {
    return internalError(
      "Failed to insert evaluation log",
      insertError,
      requestId,
    );
  }

  return jsonSuccess(
    {
      status: "inserted",
      logId: insertedWithSignatures?.id ?? null,
      evaluationSignature,
      artifactSignature,
      signaturePersistence: "full",
    },
    { status: 200, cors: true, requestId, includeRequestIdInBody: true },
  );
}

serve(async (req) => {
  const requestId = createRequestId();

  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  if (req.method !== "POST") {
    return jsonError({
      status: 405,
      error: "Method Not Allowed",
      code: "method_not_allowed",
      cors: true,
      requestId,
    });
  }

  if (!LOG_SIGNING_SECRET) {
    return jsonError({
      status: 503,
      error: "Server configuration error: Missing log signing secret.",
      code: "missing_configuration",
      cors: true,
      requestId,
    });
  }

  const authResult = await authenticateRequest(
    req.headers.get("authorization"),
    requestId,
  );
  if (authResult instanceof Response) return authResult;
  const userId = authResult;

  const payloadResult = await parsePayload(req, requestId);
  if (payloadResult instanceof Response) return payloadResult;
  const payload = payloadResult;

  const createdAt = new Date().toISOString();
  const evaluationSignature = evaluationSignatureFor(userId, payload);
  const artifactSignature = await artifactSignatureFor(
    evaluationSignature,
    createdAt,
  );

  const duplicateResponse = await checkExistingLog(
    userId,
    evaluationSignature,
    artifactSignature,
    requestId,
  );
  if (duplicateResponse) return duplicateResponse;

  return insertLog(
    userId,
    payload,
    evaluationSignature,
    artifactSignature,
    createdAt,
    requestId,
  );
});
