import {
  getAuthenticatedUserIdFromHeader,
  type ResolveUserIdFromAccessToken,
} from "../_shared/userAuth.ts";

export async function getAuthenticatedUserId(
  authorizationHeader: string | null,
  resolveUserIdFromAccessToken: ResolveUserIdFromAccessToken,
): Promise<string | null> {
  return getAuthenticatedUserIdFromHeader(
    authorizationHeader,
    resolveUserIdFromAccessToken,
  );
}
