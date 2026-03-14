// Supabase Edge Function: plaidExchangeToken (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";
import { getAuthenticatedUserId } from "./auth.ts";

type PlaidEnvironment = "sandbox" | "development" | "production";

type ExchangeRequestPayload = {
  public_token?: string;
  userId?: string;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV;
const PLAID_COUNTRY_CODES = process.env.PLAID_COUNTRY_CODES ?? "US";
const PLAID_ACCESS_TOKEN_ENCRYPTION_KEY =
  process.env.PLAID_ACCESS_TOKEN_ENCRYPTION_KEY ?? SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const plaidRequestHeaders = {
  "Content-Type": "application/json",
} as const;
const textEncoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function encryptPlaidAccessToken(accessToken: string): Promise<string> {
  const keySeed = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(PLAID_ACCESS_TOKEN_ENCRYPTION_KEY),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    keySeed,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    textEncoder.encode(accessToken),
  );

  return `v1.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(cipherBuffer))}`;
}

function resolvePlaidEnvironment(
  rawValue: string | undefined,
): PlaidEnvironment {
  if (rawValue === "development" || rawValue === "production") {
    return rawValue;
  }
  return "sandbox";
}

function plaidBaseUrl(environment: PlaidEnvironment): string {
  return `https://${environment}.plaid.com`;
}

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function resolveUserIdFromAccessToken(
  accessToken: string,
): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user?.id) {
    return null;
  }

  return data.user.id;
}

async function plaidPost(
  environment: PlaidEnvironment,
  path: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!/^\/[a-zA-Z0-9_/-]+$/.test(path)) {
    throw new Error(`Invalid Plaid API path: ${path}`);
  }

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    throw new Error("Missing Plaid credentials");
  }

  const response = await fetch(`${plaidBaseUrl(environment)}${path}`, {
    method: "POST",
    headers: plaidRequestHeaders,
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      ...payload,
    }),
  });

  const responseBody = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const message =
      typeof responseBody.error_message === "string"
        ? responseBody.error_message
        : `Plaid request failed with status ${response.status}`;
    throw new Error(message);
  }

  return responseBody;
}

async function resolveInstitutionName(
  environment: PlaidEnvironment,
  institutionId: string | null,
): Promise<string | null> {
  if (!institutionId) {
    return null;
  }

  const countryCodes = parseCsv(PLAID_COUNTRY_CODES);
  try {
    const response = await plaidPost(environment, "/institutions/get_by_id", {
      institution_id: institutionId,
      country_codes: countryCodes,
      options: {
        include_optional_metadata: true,
      },
    });

    const institution = response.institution as
      | { name?: string }
      | undefined
      | null;
    return typeof institution?.name === "string" ? institution.name : null;
  } catch {
    return null;
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

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return jsonError({
      status: 503,
      error: "Plaid credentials are not configured for this environment",
      code: "plaid_credentials_missing",
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

  let payload: ExchangeRequestPayload;
  try {
    payload = (await req.json()) as ExchangeRequestPayload;
  } catch {
    return jsonError({
      status: 400,
      error: "Invalid JSON payload",
      code: "invalid_json_payload",
      cors: true,
      requestId,
    });
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

  if (!payload.public_token) {
    return jsonError({
      status: 400,
      error: "public_token is required",
      code: "missing_public_token",
      cors: true,
      requestId,
    });
  }

  const environment = resolvePlaidEnvironment(PLAID_ENV);

  try {
    const exchangeResponse = await plaidPost(
      environment,
      "/item/public_token/exchange",
      {
        public_token: payload.public_token,
      },
    );

    const accessToken =
      typeof exchangeResponse.access_token === "string"
        ? exchangeResponse.access_token
        : null;
    const itemId =
      typeof exchangeResponse.item_id === "string"
        ? exchangeResponse.item_id
        : null;

    if (!accessToken || !itemId) {
      return jsonError({
        status: 502,
        error: "Plaid exchange response is missing access token or item id",
        code: "plaid_exchange_missing_fields",
        cors: true,
        requestId,
      });
    }

    const itemGetResponse = await plaidPost(environment, "/item/get", {
      access_token: accessToken,
    });
    const institutionId =
      typeof (itemGetResponse.item as { institution_id?: string } | undefined)
        ?.institution_id === "string"
        ? (itemGetResponse.item as { institution_id: string }).institution_id
        : null;
    const institutionName = await resolveInstitutionName(
      environment,
      institutionId,
    );
    const encryptedAccessToken = await encryptPlaidAccessToken(accessToken);

    const { error: plaidItemError } = await supabase.from("plaid_items").upsert(
      [
        {
          user_id: userId,
          plaid_item_id: itemId,
          encrypted_plaid_access_token: encryptedAccessToken,
          institution_name: institutionName,
          institution_id: institutionId,
          updated_at: new Date().toISOString(),
        },
      ],
      {
        onConflict: "plaid_item_id",
      },
    );

    if (plaidItemError) {
      return jsonError({
        status: 500,
        error: "Failed to persist plaid item",
        code: "plaid_item_persist_failed",
        details: "internal_error",
        cors: true,
        requestId,
      });
    }

    const accountsResponse = await plaidPost(environment, "/accounts/get", {
      access_token: accessToken,
    });
    const rawAccounts = Array.isArray(accountsResponse.accounts)
      ? (accountsResponse.accounts as Array<Record<string, unknown>>)
      : [];

    const accountRows = rawAccounts.map((account) => {
      const balances =
        (account.balances as Record<string, unknown> | undefined) ?? {};
      const current = balances.current;
      const available = balances.available;
      const balance =
        typeof current === "number"
          ? current
          : typeof available === "number"
            ? available
            : 0;

      return {
        user_id: userId,
        plaid_item_id: itemId,
        plaid_account_id:
          typeof account.account_id === "string" ? account.account_id : "",
        account_name: typeof account.name === "string" ? account.name : null,
        account_type: typeof account.type === "string" ? account.type : null,
        account_subtype:
          typeof account.subtype === "string" ? account.subtype : null,
        balance,
        iso_currency_code:
          typeof balances.iso_currency_code === "string"
            ? balances.iso_currency_code
            : null,
        institution_name: institutionName,
        institution_id: institutionId,
        updated_at: new Date().toISOString(),
      };
    });

    const filteredAccountRows = accountRows.filter(
      (row) => row.plaid_account_id.length > 0,
    );

    if (filteredAccountRows.length > 0) {
      const { error: accountUpsertError } = await supabase
        .from("accounts")
        .upsert(filteredAccountRows, {
          onConflict: "user_id,plaid_account_id",
        });

      if (accountUpsertError) {
        return jsonError({
          status: 500,
          error: "Failed to upsert linked accounts",
          code: "linked_accounts_upsert_failed",
          details: "internal_error",
          cors: true,
          requestId,
        });
      }
    }

    return jsonSuccess(
      {
        item_id: itemId,
        accounts_linked: filteredAccountRows.length,
        mode: environment,
      },
      { status: 200, cors: true, requestId, includeRequestIdInBody: true },
    );
  } catch (error) {
    return jsonError({
      status: 502,
      error:
        error instanceof Error
          ? error.message
          : "Unable to exchange Plaid public token",
      code: "plaid_upstream_error",
      cors: true,
      requestId,
    });
  }
});
