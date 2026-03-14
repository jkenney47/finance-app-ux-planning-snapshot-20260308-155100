export type ResolveUserIdFromAccessToken = (
  accessToken: string,
) => Promise<string | null>;

export function parseBearerToken(
  authorizationHeader: string | null,
): string | null {
  if (!authorizationHeader?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const accessToken = authorizationHeader.slice(7).trim();
  return accessToken.length > 0 ? accessToken : null;
}

export async function getAuthenticatedUserIdFromHeader(
  authorizationHeader: string | null,
  resolveUserIdFromAccessToken: ResolveUserIdFromAccessToken,
): Promise<string | null> {
  const accessToken = parseBearerToken(authorizationHeader);
  if (!accessToken) {
    return null;
  }

  return resolveUserIdFromAccessToken(accessToken);
}
