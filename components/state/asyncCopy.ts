export const DASHBOARD_RETRY_ACTION_LABEL = "Try again";

const DASHBOARD_RETRY_HINT = "Check your connection and try again in a moment.";

export function buildDashboardRefreshErrorDescription(
  surfaceLabel: string,
): string {
  return `We could not refresh ${surfaceLabel}. ${DASHBOARD_RETRY_HINT}`;
}

export function buildDashboardLoadingLabel(surfaceLabel: string): string {
  return `Loading ${surfaceLabel}...`;
}
