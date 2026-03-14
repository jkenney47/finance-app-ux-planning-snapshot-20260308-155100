import {
  DEFAULT_ONBOARDING_ROUTE,
  type OnboardingRouteId,
  type OnboardingState,
} from "@/utils/contracts/onboarding";

export type OnboardingRouteConfig = {
  id: OnboardingRouteId;
  section?: string;
  progressCurrent?: number;
  progressTotal?: number;
};

export const ONBOARDING_PUBLIC_ROUTES: readonly OnboardingRouteId[] = [
  "/onboarding/welcome",
  "/onboarding/demo-roadmap",
  "/onboarding/create-account",
] as const;

export const ONBOARDING_INTAKE_ROUTES: readonly OnboardingRouteId[] = [
  "/onboarding/intake/help-goal",
  "/onboarding/intake/urgency-timeline",
  "/onboarding/intake/major-goal",
  "/onboarding/intake/monthly-stability",
  "/onboarding/intake/main-struggle",
  "/onboarding/intake/past-attempts",
  "/onboarding/intake/household",
  "/onboarding/intake/housing",
  "/onboarding/intake/income-type",
  "/onboarding/intake/employer-match",
  "/onboarding/intake/upcoming-events",
  "/onboarding/intake/guidance-style",
  "/onboarding/intake/biggest-fear",
] as const;

export const ONBOARDING_ROUTE_CONFIG: readonly OnboardingRouteConfig[] = [
  { id: "/onboarding/welcome" },
  { id: "/onboarding/demo-roadmap" },
  { id: "/onboarding/create-account" },
  { id: "/onboarding/intake-intro" },
  ...ONBOARDING_INTAKE_ROUTES.map((id, index) => ({
    id,
    progressCurrent: index + 1,
    progressTotal: ONBOARDING_INTAKE_ROUTES.length,
    section:
      index <= 2
        ? "Your priorities"
        : index <= 5
          ? "Your finances today"
          : index <= 10
            ? "Your situation"
            : "How we guide you",
  })),
  { id: "/onboarding/intake-summary" },
  { id: "/onboarding/linking-why" },
  { id: "/onboarding/link-accounts" },
  { id: "/onboarding/generating-roadmap" },
  { id: "/onboarding/roadmap-reveal" },
] as const;

const ROUTE_TO_INDEX = new Map(
  ONBOARDING_ROUTE_CONFIG.map((route, index) => [route.id, index]),
);

export function getRouteConfig(
  route: OnboardingRouteId,
): OnboardingRouteConfig | undefined {
  return ONBOARDING_ROUTE_CONFIG.find((item) => item.id === route);
}

export function getNextOnboardingRoute(
  route: OnboardingRouteId,
): OnboardingRouteId | undefined {
  const index = ROUTE_TO_INDEX.get(route);
  if (index == null) return undefined;
  return ONBOARDING_ROUTE_CONFIG[index + 1]?.id;
}

export function getPreviousOnboardingRoute(
  route: OnboardingRouteId,
): OnboardingRouteId | undefined {
  const index = ROUTE_TO_INDEX.get(route);
  if (index == null || index === 0) return undefined;
  return ONBOARDING_ROUTE_CONFIG[index - 1]?.id;
}

export function isIntakeComplete(state: OnboardingState): boolean {
  return Boolean(state.progress.intakeCompletedAt);
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return Boolean(state.progress.onboardingCompletedAt);
}

export function getResumeOnboardingRoute(
  state: OnboardingState,
): OnboardingRouteId {
  if (isOnboardingComplete(state)) {
    return "/onboarding/roadmap-reveal";
  }

  if (!state.auth.accountCreated) {
    const currentRoute = state.progress.currentRoute;
    if (ONBOARDING_PUBLIC_ROUTES.includes(currentRoute)) {
      return currentRoute;
    }
    return DEFAULT_ONBOARDING_ROUTE;
  }

  return state.progress.currentRoute || DEFAULT_ONBOARDING_ROUTE;
}

export function resolveGuardRedirect(
  route: OnboardingRouteId,
  state: OnboardingState,
): OnboardingRouteId | null {
  if (!state.auth.accountCreated && !ONBOARDING_PUBLIC_ROUTES.includes(route)) {
    return "/onboarding/create-account";
  }

  if (
    !isIntakeComplete(state) &&
    [
      "/onboarding/intake-summary",
      "/onboarding/linking-why",
      "/onboarding/link-accounts",
      "/onboarding/generating-roadmap",
      "/onboarding/roadmap-reveal",
    ].includes(route)
  ) {
    return "/onboarding/intake/biggest-fear";
  }

  if (
    !state.linking.coreTransactionalLinked &&
    ["/onboarding/generating-roadmap", "/onboarding/roadmap-reveal"].includes(
      route,
    )
  ) {
    return "/onboarding/link-accounts";
  }

  if (isOnboardingComplete(state) && route !== "/onboarding/roadmap-reveal") {
    return "/onboarding/roadmap-reveal";
  }

  return null;
}
