// Supabase Edge Function: plaidAccounts (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";
import { getAuthenticatedUserId } from "./auth.ts";

type AccountsRequestPayload = {
  userId?: string;
};

type AccountRow = {
  plaid_account_id: string;
  account_name: string | null;
  account_type: string | null;
  account_subtype: string | null;
  balance: number | string | null;
  iso_currency_code: string | null;
  institution_name: string | null;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function resolveUserIdFromAccessToken(
  accessToken: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user?.id) {
    return null;
  }

  return data.user.id;
}

function toNumericBalance(value: number | string | null): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
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

  const userId = await getAuthenticatedUserId(
    req.headers.get("authorization"),
    resolveUserIdFromAccessToken,
  );
  if (!userId) {
    return jsonError({
      status: 401,
      error: "Unauthorized",
      code: "unauthorized",
      cors: true,
      requestId,
    });
  }

  let payload: AccountsRequestPayload = {};
  try {
    payload = (await req.json()) as AccountsRequestPayload;
  } catch {
    payload = {};
  }

  if (payload.userId && payload.userId !== userId) {
    return jsonError({
      status: 403,
      error: "userId does not match authenticated user",
      code: "forbidden_user_mismatch",
      cors: true,
      requestId,
    });
  }

  const { data, error } = await supabase
    .from("accounts")
    .select(
      "plaid_account_id, account_name, account_type, account_subtype, balance, iso_currency_code, institution_name",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load linked accounts", error);
    return jsonError({
      status: 500,
      error: "Failed to load linked accounts",
      code: "linked_accounts_fetch_failed",
      details: "internal_error",
      cors: true,
      requestId,
    });
  }

  const rows = (data ?? []) as AccountRow[];
  const response = rows.map((row) => {
    const accountId = row.plaid_account_id;
    return {
      account_id: accountId,
      name: row.account_name ?? "Linked account",
      type: row.account_type ?? "depository",
      subtype: row.account_subtype ?? "checking",
      mask: accountId.slice(-4),
      institution_name: row.institution_name ?? "Linked institution",
      balances: {
        current: toNumericBalance(row.balance),
        iso_currency_code: row.iso_currency_code ?? "USD",
      },
    };
  });

  return jsonSuccess(
    {
      accounts: response,
    },
    { status: 200, cors: true, requestId, includeRequestIdInBody: true },
  );
});
