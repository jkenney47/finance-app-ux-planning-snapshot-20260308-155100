import type { RoadmapPayload } from "@/utils/engine/types";

export type CoverageLevel = "demo" | "preliminary" | "strong";

export type OnboardingRouteId =
  | "/onboarding/welcome"
  | "/onboarding/demo-roadmap"
  | "/onboarding/create-account"
  | "/onboarding/intake-intro"
  | "/onboarding/intake/help-goal"
  | "/onboarding/intake/urgency-timeline"
  | "/onboarding/intake/major-goal"
  | "/onboarding/intake/monthly-stability"
  | "/onboarding/intake/main-struggle"
  | "/onboarding/intake/past-attempts"
  | "/onboarding/intake/household"
  | "/onboarding/intake/housing"
  | "/onboarding/intake/income-type"
  | "/onboarding/intake/employer-match"
  | "/onboarding/intake/upcoming-events"
  | "/onboarding/intake/guidance-style"
  | "/onboarding/intake/biggest-fear"
  | "/onboarding/intake-summary"
  | "/onboarding/linking-why"
  | "/onboarding/link-accounts"
  | "/onboarding/generating-roadmap"
  | "/onboarding/roadmap-reveal";

export const ONBOARDING_ROUTE_IDS: readonly OnboardingRouteId[] = [
  "/onboarding/welcome",
  "/onboarding/demo-roadmap",
  "/onboarding/create-account",
  "/onboarding/intake-intro",
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
  "/onboarding/intake-summary",
  "/onboarding/linking-why",
  "/onboarding/link-accounts",
  "/onboarding/generating-roadmap",
  "/onboarding/roadmap-reveal",
] as const;

export type OnboardingLinkCategory =
  | "checking_savings"
  | "credit_cards"
  | "loans"
  | "retirement_investments"
  | "mortgage";

export type OnboardingMockLinkScenario =
  | "none"
  | "core_transactional"
  | "core_plus_debt"
  | "full_coverage";

export type OnboardingState = {
  auth: {
    accountCreated: boolean;
    userId?: string;
  };
  progress: {
    currentRoute: OnboardingRouteId;
    completedRoutes: OnboardingRouteId[];
    intakeStartedAt?: string;
    intakeCompletedAt?: string;
    onboardingCompletedAt?: string;
    lastSavedAt?: string;
  };
  intake: {
    primaryHelpGoal?: string;
    primaryHelpGoalOtherText?: string;
    urgentArea?: string;
    progressHorizon?: string;
    hasMajorGoal?: boolean;
    majorGoalType?: string;
    majorGoalTiming?: string;
    monthlySituation?: string;
    essentialsCoverage?: string;
    mainStruggles?: string[];
    pastAttempts?: string[];
    attemptWhyNotEnough?: string[];
    householdStatus?: string;
    dependentsStatus?: string;
    housingStatus?: string;
    incomeType?: string;
    incomePredictability?: string;
    employerMatch?: string;
    fullMatchContribution?: string;
    upcomingEvents?: string[];
    guidanceDirectness?: string;
    pathPreference?: string;
    biggestFear?: string;
  };
  linking: {
    linkedInstitutionsCount: number;
    linkedAccountsCount: number;
    coreTransactionalLinked: boolean;
    linkedCategories: OnboardingLinkCategory[];
    mockScenario: OnboardingMockLinkScenario;
  };
  roadmap: {
    coverageLevel?: CoverageLevel;
    initialStage?: string;
    currentFocus?: string;
    nextAction?: string;
    keyMetricLabel?: string;
    keyMetricValue?: string;
    whyPlacedHere?: string;
  };
  generatedRoadmap?: RoadmapPayload | null;
};

export const DEFAULT_ONBOARDING_ROUTE: OnboardingRouteId =
  "/onboarding/welcome";

export const createDefaultOnboardingState = (): OnboardingState => ({
  auth: {
    accountCreated: false,
  },
  progress: {
    currentRoute: DEFAULT_ONBOARDING_ROUTE,
    completedRoutes: [],
  },
  intake: {},
  linking: {
    linkedInstitutionsCount: 0,
    linkedAccountsCount: 0,
    coreTransactionalLinked: false,
    linkedCategories: [],
    mockScenario: "none",
  },
  roadmap: {},
  generatedRoadmap: null,
});
