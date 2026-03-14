// Supabase Edge Function: plaidLinkToken (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";
import { getAuthenticatedUserId } from "./auth.ts";

type LinkTokenRequestPayload = {
  userId?: string;
  sandbox_auto_link?: boolean;
};

type PlaidEnvironment = "sandbox" | "development" | "production";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV;
const PLAID_COUNTRY_CODES = process.env.PLAID_COUNTRY_CODES ?? "US";
const PLAID_PRODUCTS = process.env.PLAID_PRODUCTS ?? "transactions";
const PLAID_REDIRECT_URI = process.env.PLAID_REDIRECT_URI;
const PLAID_WEBHOOK_URL = process.env.PLAID_WEBHOOK_URL;
const PLAID_SANDBOX_INSTITUTION_ID =
  process.env.PLAID_SANDBOX_INSTITUTION_ID ?? "ins_109508";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const plaidRequestHeaders = {
  "Content-Type": "application/json",
} as const;

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

  let payload: LinkTokenRequestPayload = {};
  try {
    payload = (await req.json()) as LinkTokenRequestPayload;
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

  const environment = resolvePlaidEnvironment(PLAID_ENV);
  const countryCodes = parseCsv(PLAID_COUNTRY_CODES);
  const products = parseCsv(PLAID_PRODUCTS);

  try {
    const linkTokenResponse = await plaidPost(
      environment,
      "/link/token/create",
      {
        client_name: "Finance App",
        country_codes: countryCodes,
        language: "en",
        products,
        user: {
          client_user_id: userId,
        },
        ...(PLAID_REDIRECT_URI ? { redirect_uri: PLAID_REDIRECT_URI } : {}),
        ...(PLAID_WEBHOOK_URL ? { webhook: PLAID_WEBHOOK_URL } : {}),
      },
    );

    const linkToken =
      typeof linkTokenResponse.link_token === "string"
        ? linkTokenResponse.link_token
        : null;
    if (!linkToken) {
      return jsonError({
        status: 502,
        error: "Plaid did not return a link token",
        code: "plaid_link_token_missing",
        cors: true,
        requestId,
      });
    }

    let sandboxPublicToken: string | null = null;
    if (environment === "sandbox" && payload.sandbox_auto_link !== false) {
      const sandboxResponse = await plaidPost(
        environment,
        "/sandbox/public_token/create",
        {
          institution_id: PLAID_SANDBOX_INSTITUTION_ID,
          initial_products: products,
          options: {
            webhook: PLAID_WEBHOOK_URL,
          },
        },
      );
      sandboxPublicToken =
        typeof sandboxResponse.public_token === "string"
          ? sandboxResponse.public_token
          : null;
    }

    return jsonSuccess(
      {
        link_token: linkToken,
        ...(sandboxPublicToken
          ? { sandbox_public_token: sandboxPublicToken }
          : {}),
        mode: environment,
      },
      { status: 200, cors: true, requestId, includeRequestIdInBody: true },
    );
  } catch (error) {
    return jsonError({
      status: 502,
      error:
        error instanceof Error ? error.message : "Unable to create link token",
      code: "plaid_upstream_error",
      cors: true,
      requestId,
    });
  }
});
