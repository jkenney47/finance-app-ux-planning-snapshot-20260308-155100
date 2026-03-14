import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { jsonError } from "./http.ts";
import { secureCompare } from "./signatures.ts";

type PolicyAdminAuthSuccess = {
  ok: true;
  authMode: "secret" | "admin_jwt";
  actorUserId: string | null;
};

type PolicyAdminAuthFailure = {
  ok: false;
  response: Response;
};

export type PolicyAdminAuthResult =
  | PolicyAdminAuthSuccess
  | PolicyAdminAuthFailure;

type PolicyAdminAuthOptions = {
  sharedSecret?: string;
  adminUserIdsCsv?: string;
};

function jsonResponse(status: number, error: string): Response {
  const code =
    status === 401
      ? "unauthorized"
      : status === 403
        ? "forbidden"
        : status === 500
          ? "admin_lookup_failed"
          : "policy_admin_auth_error";
  return jsonError({
    status,
    error,
    code,
  });
}

export function parseAdminUserIds(rawValue: string | undefined): Set<string> {
  if (!rawValue) return new Set();
  return new Set(
    rawValue
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
}

export function extractBearerToken(
  authorizationHeader: string | null,
): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token;
}

async function isAdminFromTable(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: true; isAdmin: boolean } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("policy_ops_admins")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, isAdmin: Boolean(data?.user_id) };
}

export async function authorizePolicyAdminAccess(
  req: Request,
  supabase: SupabaseClient,
  options: PolicyAdminAuthOptions = {},
): Promise<PolicyAdminAuthResult> {
  const sharedSecret = options.sharedSecret?.trim();
  const providedSecret = req.headers.get("x-policy-refresh-secret");

  if (sharedSecret && secureCompare(providedSecret, sharedSecret)) {
    return {
      ok: true,
      authMode: "secret",
      actorUserId: null,
    };
  }

  const token = extractBearerToken(req.headers.get("authorization"));
  if (!token) {
    return {
      ok: false,
      response: jsonResponse(401, "Unauthorized"),
    };
  }

  const { data, error } = await supabase.auth.getUser(token);
  const userId = data?.user?.id;
  if (error || !userId) {
    return {
      ok: false,
      response: jsonResponse(401, "Unauthorized"),
    };
  }

  const envAllowlist = parseAdminUserIds(
    options.adminUserIdsCsv ?? process.env.POLICY_OPS_ADMIN_USER_IDS,
  );
  if (envAllowlist.has(userId)) {
    return {
      ok: true,
      authMode: "admin_jwt",
      actorUserId: userId,
    };
  }

  const adminLookup = await isAdminFromTable(supabase, userId);
  if (!adminLookup.ok) {
    return {
      ok: false,
      response: jsonResponse(500, "Admin lookup failed"),
    };
  }

  if (!adminLookup.isAdmin) {
    return {
      ok: false,
      response: jsonResponse(403, "Forbidden"),
    };
  }

  return {
    ok: true,
    authMode: "admin_jwt",
    actorUserId: userId,
  };
}
