import {
  parseBearerToken,
  type ResolveUserIdFromAccessToken,
} from "../_shared/userAuth.ts";

export type LogFmeEvaluationAuthResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "missing_auth" | "invalid_auth" };

export async function authenticateLogFmeEvaluationRequest(
  authorizationHeader: string | null,
  resolveUserIdFromAccessToken: ResolveUserIdFromAccessToken,
): Promise<LogFmeEvaluationAuthResult> {
  const accessToken = parseBearerToken(authorizationHeader);
  if (!accessToken) {
    return { ok: false, reason: "missing_auth" };
  }

  const userId = await resolveUserIdFromAccessToken(accessToken);
  if (!userId) {
    return { ok: false, reason: "invalid_auth" };
  }

  return { ok: true, userId };
}
