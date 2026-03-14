export type LinkedAccountsResolutionInput = {
  linkedAccountCount: number;
  hasMockLinkedAccounts: boolean;
  realDataEnabled: boolean;
};

/**
 * Explicit ownership boundary:
 * - mock mode: linked account state is owned by the mock-linked-accounts store.
 * - real-data mode: linked account state is owned by fetched account summary data.
 */
export function resolveHasLinkedAccounts({
  linkedAccountCount,
  hasMockLinkedAccounts,
  realDataEnabled,
}: LinkedAccountsResolutionInput): boolean {
  if (realDataEnabled) {
    return linkedAccountCount > 0;
  }
  return hasMockLinkedAccounts && linkedAccountCount > 0;
}
