import {
  parseBearerToken,
  type ResolveUserIdFromAccessToken,
} from "../_shared/userAuth.ts";

export type ChatExplainAuthResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "missing_bearer" | "invalid_bearer" };

export async function authenticateChatExplainRequest(
  authorizationHeader: string | null,
  resolveUserIdFromAccessToken: ResolveUserIdFromAccessToken,
): Promise<ChatExplainAuthResult> {
  const accessToken = parseBearerToken(authorizationHeader);
  if (!accessToken) {
    return { ok: false, reason: "missing_bearer" };
  }

  const userId = await resolveUserIdFromAccessToken(accessToken);
  if (!userId) {
    return { ok: false, reason: "invalid_bearer" };
  }

  return { ok: true, userId };
}
