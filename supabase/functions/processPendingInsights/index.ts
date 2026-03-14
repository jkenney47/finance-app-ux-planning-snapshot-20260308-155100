// Supabase Edge Function: processPendingInsights (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";
import {
  processItemTransactions,
  resolvePlaidEnvironment,
} from "../_shared/plaidTransactions.ts";
import { secureCompare } from "../_shared/signatures.ts";

type ProcessRequestPayload = {
  batch_size?: unknown;
};

type PendingInsightQueueRow = {
  id: string;
  user_id: string | null;
  plaid_env: string | null;
  webhook_id: string | null;
  payload: unknown;
};

type PlaidItemRow = {
  user_id: string;
  encrypted_plaid_access_token: string;
};

type RowProcessingResult = {
  ok: boolean;
  pendingInsightId: string;
  error?: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PENDING_INSIGHTS_WORKER_SECRET =
  process.env.PENDING_INSIGHTS_WORKER_SECRET;
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 50;
const STALE_CLAIM_THRESHOLD_MS = 15 * 60 * 1000;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseBatchSize(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value)) {
    return Math.min(Math.max(value, 1), MAX_BATCH_SIZE);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed)) {
      return Math.min(Math.max(parsed, 1), MAX_BATCH_SIZE);
    }
  }

  return DEFAULT_BATCH_SIZE;
}

function isAuthorized(req: Request): boolean {
  const secretHeader = req.headers.get("x-pending-insights-secret");
  if (
    PENDING_INSIGHTS_WORKER_SECRET &&
    secureCompare(secretHeader, PENDING_INSIGHTS_WORKER_SECRET)
  ) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    return false;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return false;
  }

  if (secureCompare(token, SUPABASE_SERVICE_ROLE_KEY)) {
    return true;
  }

  return Boolean(
    PENDING_INSIGHTS_WORKER_SECRET &&
      secureCompare(token, PENDING_INSIGHTS_WORKER_SECRET),
  );
}

async function updateRawTransactionStatus(input: {
  rawTransactionId: string | null;
  webhookId: string | null;
  status: "processed" | "failed";
  errorMessage: string | null;
  processedAt: string;
}): Promise<void> {
  if (!input.rawTransactionId && !input.webhookId) {
    return;
  }

  let updateQuery = supabase.from("raw_transactions").update({
    status: input.status,
    error_message: input.errorMessage,
    processed_at: input.processedAt,
  });

  if (input.rawTransactionId) {
    updateQuery = updateQuery.eq("id", input.rawTransactionId);
  } else {
    updateQuery = updateQuery.eq("webhook_id", input.webhookId);
  }

  const { error } = await updateQuery;
  if (error) {
    console.error("Failed to update raw_transactions row.", {
      rawTransactionId: input.rawTransactionId,
      webhookId: input.webhookId,
      message: error.message,
    });
  }
}

async function processClaimedQueueRow(
  row: PendingInsightQueueRow,
): Promise<RowProcessingResult> {
  const payload = asRecord(row.payload) ?? {};
  const plaidItemId = asString(payload.plaid_item_id);
  const rawTransactionId = asString(payload.raw_transaction_id);

  if (!plaidItemId) {
    const processedAt = new Date().toISOString();
    await Promise.all([
      supabase
        .from("pending_insights")
        .update({
          status: "failed",
          error_message: "Queue payload is missing plaid_item_id.",
          claimed_at: null,
          processed_at: processedAt,
        })
        .eq("id", row.id),
      updateRawTransactionStatus({
        rawTransactionId,
        webhookId: row.webhook_id,
        status: "failed",
        errorMessage: "Queue payload is missing plaid_item_id.",
        processedAt,
      }),
    ]);

    return {
      ok: false,
      pendingInsightId: row.id,
      error: "Queue payload is missing plaid_item_id.",
    };
  }

  let resolvedUserId = row.user_id;

  try {
    const { data: plaidItemRow, error: plaidItemLookupError } = await supabase
      .from("plaid_items")
      .select("user_id, encrypted_plaid_access_token")
      .eq("plaid_item_id", plaidItemId)
      .maybeSingle<PlaidItemRow>();

    if (plaidItemLookupError) {
      throw new Error(
        `Failed to resolve Plaid item: ${plaidItemLookupError.message}`,
      );
    }

    if (!plaidItemRow) {
      throw new Error("No linked Plaid item found for queue event.");
    }

    resolvedUserId = plaidItemRow.user_id;

    const processingResult = await processItemTransactions({
      plaidItemId,
      userId: plaidItemRow.user_id,
      encryptedAccessToken: plaidItemRow.encrypted_plaid_access_token,
      plaidEnvironment: resolvePlaidEnvironment(row.plaid_env),
    });

    const processedAt = new Date().toISOString();
    const nextPayload: Record<string, unknown> = {
      ...payload,
      plaid_item_id: plaidItemId,
      transactions_upserted: processingResult.upserted,
      transactions_removed: processingResult.removed,
    };

    await Promise.all([
      supabase
        .from("pending_insights")
        .update({
          user_id: resolvedUserId,
          status: "complete",
          error_message: null,
          claimed_at: null,
          processed_at: processedAt,
          payload: nextPayload,
        })
        .eq("id", row.id),
      updateRawTransactionStatus({
        rawTransactionId,
        webhookId: row.webhook_id,
        status: "processed",
        errorMessage: null,
        processedAt,
      }),
    ]);

    return {
      ok: true,
      pendingInsightId: row.id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown queue processing error.";
    const processedAt = new Date().toISOString();

    await Promise.all([
      supabase
        .from("pending_insights")
        .update({
          user_id: resolvedUserId,
          status: "failed",
          error_message: errorMessage,
          claimed_at: null,
          processed_at: processedAt,
        })
        .eq("id", row.id),
      updateRawTransactionStatus({
        rawTransactionId,
        webhookId: row.webhook_id,
        status: "failed",
        errorMessage,
        processedAt,
      }),
    ]);

    return {
      ok: false,
      pendingInsightId: row.id,
      error: errorMessage,
    };
  }
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

  if (!isAuthorized(req)) {
    return jsonError({
      status: 401,
      error: "Unauthorized",
      code: "unauthorized",
      cors: true,
      requestId,
    });
  }

  let payload: ProcessRequestPayload = {};
  const requestBodyText = await req.text();
  if (requestBodyText.trim().length > 0) {
    try {
      payload = JSON.parse(requestBodyText) as ProcessRequestPayload;
    } catch {
      return jsonError({
        status: 400,
        error: "Invalid JSON",
        code: "invalid_json_payload",
        cors: true,
        requestId,
      });
    }
  }

  const batchSize = parseBatchSize(payload.batch_size);
  const staleClaimCutoffIso = new Date(
    Date.now() - STALE_CLAIM_THRESHOLD_MS,
  ).toISOString();

  const { data: requeuedRows, error: requeueError } = await supabase
    .from("pending_insights")
    .update({
      status: "pending",
      error_message: "Recovered stale processing claim for retry.",
      claimed_at: null,
      processed_at: null,
    })
    .eq("status", "processing")
    .or(
      `claimed_at.lt.${staleClaimCutoffIso},and(claimed_at.is.null,created_at.lt.${staleClaimCutoffIso})`,
    )
    .select("id");

  if (requeueError) {
    return jsonError({
      status: 500,
      error: "Failed to recover stale queue claims",
      code: "pending_insights_requeue_failed",
      details: "internal_error",
      cors: true,
      requestId,
    });
  }

  const { data: pendingRows, error: pendingRowsError } = await supabase
    .from("pending_insights")
    .select("id, user_id, plaid_env, webhook_id, payload, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (pendingRowsError) {
    return jsonError({
      status: 500,
      error: "Failed to read pending_insights queue",
      code: "pending_insights_select_failed",
      details: "internal_error",
      cors: true,
      requestId,
    });
  }

  const resultSummary = {
    status: "ok",
    batch_size: batchSize,
    requeued: requeuedRows?.length ?? 0,
    scanned: pendingRows?.length ?? 0,
    claimed: 0,
    processed: 0,
    failed: 0,
    skipped: 0,
    errors: [] as Array<{ pending_insight_id: string; message: string }>,
  };

  for (const pendingRow of pendingRows ?? []) {
    const claimStartedAt = new Date().toISOString();
    const { data: claimedRow, error: claimError } = await supabase
      .from("pending_insights")
      .update({
        status: "processing",
        error_message: null,
        claimed_at: claimStartedAt,
        processed_at: null,
      })
      .eq("id", pendingRow.id)
      .eq("status", "pending")
      .select("id, user_id, plaid_env, webhook_id, payload")
      .maybeSingle<PendingInsightQueueRow>();

    if (claimError) {
      resultSummary.failed += 1;
      resultSummary.errors.push({
        pending_insight_id: pendingRow.id,
        message: `Failed to claim queue row: ${claimError.message}`,
      });
      continue;
    }

    if (!claimedRow) {
      resultSummary.skipped += 1;
      continue;
    }

    resultSummary.claimed += 1;
    const processingResult = await processClaimedQueueRow(claimedRow);

    if (processingResult.ok) {
      resultSummary.processed += 1;
    } else {
      resultSummary.failed += 1;
      if (processingResult.error) {
        resultSummary.errors.push({
          pending_insight_id: processingResult.pendingInsightId,
          message: processingResult.error,
        });
      }
    }
  }

  return jsonSuccess(resultSummary, {
    status: 200,
    requestId,
    includeRequestIdInBody: true,
    cors: true,
  });
});
