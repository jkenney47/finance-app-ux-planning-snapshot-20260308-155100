// Supabase Edge Function: plaidWebhook (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";

type PlaidWebhookPayload = {
  webhook_type?: unknown;
  webhook_code?: unknown;
  item_id?: unknown;
  environment?: unknown;
  webhook_id?: unknown;
  user_id?: unknown;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PLAID_VERIFICATION_CODE = process.env.PLAID_VERIFICATION_CODE;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asUuid(value: unknown): string | null {
  const normalized = asString(value);
  if (!normalized || !UUID_V4_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
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

  if (!PLAID_VERIFICATION_CODE) {
    return jsonError({
      status: 500,
      error: "PLAID_VERIFICATION_CODE is not configured",
      code: "missing_plaid_verification_code",
      cors: true,
      requestId,
    });
  }

  const verificationCode = req.headers.get("plaid-verification-code");
  if (!verificationCode || verificationCode !== PLAID_VERIFICATION_CODE) {
    return jsonError({
      status: 401,
      error: "Unauthorized",
      code: "unauthorized",
      cors: true,
      requestId,
    });
  }

  let body: PlaidWebhookPayload;
  try {
    body = (await req.json()) as PlaidWebhookPayload;
  } catch {
    return jsonError({
      status: 400,
      error: "Invalid JSON",
      code: "invalid_json_payload",
      cors: true,
      requestId,
    });
  }

  if (
    body.webhook_type !== "TRANSACTIONS" ||
    body.webhook_code !== "TRANSACTIONS_WEBHOOK"
  ) {
    return jsonSuccess(
      { status: "ignored" },
      { status: 200, requestId, includeRequestIdInBody: true, cors: true },
    );
  }

  const plaidItemId = asString(body.item_id);
  const plaidEnv = asString(body.environment);
  const webhookId = asString(body.webhook_id);
  const requestUserId = asUuid(body.user_id);

  if (!plaidItemId || !webhookId) {
    return jsonError({
      status: 400,
      error: "item_id and webhook_id are required for transaction webhooks",
      code: "missing_required_fields",
      cors: true,
      requestId,
    });
  }

  const nowIso = new Date().toISOString();

  const { data: rawRow, error: rawInsertError } = await supabase
    .from("raw_transactions")
    .insert([
      {
        plaid_item_id: plaidItemId,
        plaid_env: plaidEnv,
        webhook_id: webhookId,
        webhook_payload: body,
        status: "received",
        created_at: nowIso,
      },
    ])
    .select("id")
    .single<{ id: string }>();

  if (rawInsertError) {
    return jsonError({
      status: 500,
      error: "Failed to persist raw_transactions",
      code: "raw_transactions_insert_failed",
      details: "internal_error",
      cors: true,
      requestId,
    });
  }

  const queuePayload: Record<string, unknown> = {
    plaid_item_id: plaidItemId,
    raw_transaction_id: rawRow.id,
  };

  const rawRequestUserId = asString(body.user_id);
  if (rawRequestUserId) {
    queuePayload.requested_user_id = rawRequestUserId;
  }

  const { data: pendingRow, error: pendingInsertError } = await supabase
    .from("pending_insights")
    .insert([
      {
        user_id: requestUserId,
        plaid_env: plaidEnv,
        webhook_id: webhookId,
        status: "pending",
        payload: queuePayload,
        created_at: nowIso,
      },
    ])
    .select("id")
    .single<{ id: string }>();

  if (pendingInsertError) {
    await supabase
      .from("raw_transactions")
      .update({
        status: "failed",
        error_message: "Failed to queue pending_insights",
        processed_at: new Date().toISOString(),
      })
      .eq("id", rawRow.id);

    return jsonError({
      status: 500,
      error: "Failed to queue pending_insights",
      code: "pending_insights_insert_failed",
      details: "internal_error",
      cors: true,
      requestId,
    });
  }

  return jsonSuccess(
    {
      status: "queued",
      raw_transaction_id: rawRow.id,
      pending_insight_id: pendingRow.id,
    },
    { status: 200, requestId, includeRequestIdInBody: true, cors: true },
  );
});
