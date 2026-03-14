// Supabase Edge Function: getNetWorthSlice (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function getAuthenticatedUserId(
  authorizationHeader: string | null,
): Promise<string | null> {
  if (!authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const accessToken = authorizationHeader.slice(7).trim();
  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user?.id) {
    return null;
  }

  return data.user.id;
}

function isServiceRoleRequest(req: Request): boolean {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    return false;
  }

  const authorizationHeader = req.headers.get("authorization");
  const bearerToken = authorizationHeader?.toLowerCase().startsWith("bearer ")
    ? authorizationHeader.slice(7).trim()
    : "";
  const apiKeyHeader = req.headers.get("apikey")?.trim() ?? "";

  return bearerToken === serviceRoleKey || apiKeyHeader === serviceRoleKey;
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

  const serviceRoleRequest = isServiceRoleRequest(req);
  const authUserId = serviceRoleRequest
    ? null
    : await getAuthenticatedUserId(req.headers.get("authorization"));
  if (!serviceRoleRequest && !authUserId) {
    return jsonError({
      status: 401,
      error: "Unauthorized",
      code: "unauthorized",
      cors: true,
      requestId,
    });
  }

  const { user_id, days = 90 } = await req.json();
  if (!user_id) {
    return jsonError({
      status: 400,
      error: "user_id required",
      code: "missing_user_id",
      cors: true,
      requestId,
    });
  }

  if (!serviceRoleRequest && user_id !== authUserId) {
    return jsonError({
      status: 403,
      error: "user_id does not match authenticated user",
      code: "forbidden_user_mismatch",
      cors: true,
      requestId,
    });
  }

  // Roll up transactions into daily net-worth, income, and expenses.
  // Uses public.rollup_net_worth over public.transactions.
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("rollup_net_worth", {
    p_user_id: user_id,
    p_since: since,
    p_days: days,
  });
  if (error) {
    return jsonError({
      status: 500,
      error: "internal_error",
      code: "rollup_net_worth_failed",
      cors: true,
      requestId,
    });
  }
  return jsonSuccess(data, {
    status: 200,
    requestId,
    cors: true,
    includeRequestIdInBody: false,
  });
});
