import DashboardScreen from "@/app/(dashboard)/index";
import StepDetailScreen from "@/app/(dashboard)/step/[recommendationId]";
import type { DashboardSummary } from "@/utils/dashboard";
import { makeFact, type FactsSnapshot } from "@/utils/contracts/facts";
import type {
  FmeEvaluation,
  Recommendation,
  ReasoningTrace,
} from "@/utils/contracts/fme";
import { render, screen } from "@test-utils";

const mockUseDashboardSummary = jest.fn();
const mockUseFinancialMaturityEvaluation = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    recommendationId: "build_fortress_fund",
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock("@/hooks/useDashboardData", () => ({
  useDashboardSummary: () => mockUseDashboardSummary(),
  useFinancialMaturityEvaluation: (summary: DashboardSummary | undefined) =>
    mockUseFinancialMaturityEvaluation(summary),
}));

jest.mock("@/utils/roadmap/featureFlags", () => ({
  isRoadmapCoreScreensEnabled: () => false,
}));

const mockAskState = {
  setContext: jest.fn(),
  setScreenContext: jest.fn(),
  open: jest.fn(),
};

jest.mock("@/stores/useAskStore", () => ({
  useAskStore: <T,>(selector: (state: typeof mockAskState) => T): T =>
    selector(mockAskState),
}));

const mockPreferencesState = {
  advisorVoice: "neutral" as const,
  pinnedFocusMetric: "dynamic" as const,
  setPinnedFocusMetric: jest.fn(),
};

jest.mock("@/stores/usePreferencesStore", () => ({
  usePreferencesStore: <T,>(
    selector: (state: typeof mockPreferencesState) => T,
  ): T => selector(mockPreferencesState),
}));

jest.mock("@/utils/analytics", () => ({
  trackEvent: jest.fn(),
  trackScreen: jest.fn(),
}));

const baseSummary: DashboardSummary = {
  netWorth: 0,
  netWorthDelta: 0,
  cashFlowPoints: [],
  accounts: [],
  transactions: [],
  institutionStatuses: [],
};

const baseRecommendation: Recommendation = {
  id: "build_fortress_fund",
  phase: "fortress_fund",
  title: "Build your fortress fund",
  summary: "Grow reserves toward your target runway.",
  actionLabel: "Open journey",
  actionRoute: "/(dashboard)/journey",
  analyticsEvent: "fme_build_fortress_fund",
  pros: ["Builds resilience"],
  cons: ["Requires higher near-term savings"],
  assumptions: ["Income remains stable"],
  requiredFacts: [],
  policyDomains: ["thresholds"],
  priority: 10,
  traceRefs: ["trace-1"],
};

const secondaryRecommendation: Recommendation = {
  ...baseRecommendation,
  id: "connect_accounts",
  phase: "cash_flow_truth",
  title: "Connect accounts",
  analyticsEvent: "fme_connect_accounts",
  traceRefs: [],
};

const tertiaryRecommendation: Recommendation = {
  ...baseRecommendation,
  id: "tackle_toxic_debt",
  phase: "toxic_debt_purge",
  title: "Tackle toxic debt",
  analyticsEvent: "fme_tackle_toxic_debt",
  traceRefs: [],
};

const baseTrace: ReasoningTrace[] = [
  {
    traceId: "trace-1",
    ruleId: "rule_fortress_fund",
    factsUsed: ["hasLinkedAccounts"],
    policyRefs: ["thresholds:1"],
    computed: {
      target_months: 3,
    },
  },
];

const baseFacts: FactsSnapshot = {
  hasLinkedAccounts: makeFact("hasLinkedAccounts", false, "derived", 1),
};

function buildEvaluation(overrides?: Partial<FmeEvaluation>): FmeEvaluation {
  return {
    mode: "needs_info",
    decision: {
      mode: "hold_steady",
      confidence: 0.55,
      confidenceThreshold: 0.72,
      assumptions: [
        "Some profile inputs are still missing and may limit precision.",
      ],
      triggerConditions: [
        "Add your monthly net income to validate cash-flow direction.",
      ],
      nextMilestoneGate: {
        milestoneId: "cash_flow_truth",
        status: "needs_info",
        detail: "Need linked-account cash flow data.",
      },
      criticalMissingFacts: ["incomeMonthlyNet"],
      stalePolicyDomains: [],
      recommendedActionId: null,
    },
    primaryRecommendation: null,
    alternatives: [],
    milestones: [
      {
        id: "cash_flow_truth",
        title: "Cash flow truth",
        status: "needs_info",
        detail: "Need linked-account cash flow data.",
      },
    ],
    factRequests: [],
    policyStatus: [
      {
        domain: "thresholds",
        isStale: false,
        ageDays: 1,
        maxAgeDays: 30,
      },
    ],
    trace: baseTrace,
    generatedAt: "2026-03-03T12:00:00.000Z",
    ...overrides,
  };
}

describe("dashboard fallback flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardSummary.mockReturnValue({
      data: baseSummary,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUseFinancialMaturityEvaluation.mockReturnValue({
      evaluation: buildEvaluation(),
      facts: baseFacts,
      isPolicyLoading: false,
      isPolicyError: false,
      isRulePackLoading: false,
      isRulePackError: false,
    });
  });

  it("renders Home now-action strategy fallbacks when modeled actions are missing", () => {
    render(<DashboardScreen />);

    expect(screen.getByText("NOW ACTIONS")).toBeTruthy();
    expect(
      screen.getByText("Connect your primary checking account"),
    ).toBeTruthy();
    expect(
      screen.getByText("Complete the highest-priority missing input"),
    ).toBeTruthy();
    expect(screen.getByText("Review your roadmap sequence")).toBeTruthy();
    expect(
      screen.getAllByText("Source: Strategy fallback (non-modeled)"),
    ).toHaveLength(3);
  });

  it("renders modeled Home actions without strategy fallback labels", () => {
    mockUseFinancialMaturityEvaluation.mockReturnValue({
      evaluation: buildEvaluation({
        mode: "build",
        primaryRecommendation: baseRecommendation,
        alternatives: [secondaryRecommendation, tertiaryRecommendation],
      }),
      facts: baseFacts,
      isPolicyLoading: false,
      isPolicyError: false,
      isRulePackLoading: false,
      isRulePackError: false,
    });

    render(<DashboardScreen />);

    expect(
      screen.getByTestId(
        "dashboard-primary-recommendation-build_fortress_fund",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Connect accounts")).toBeTruthy();
    expect(screen.getByText("Tackle toxic debt")).toBeTruthy();
    expect(
      screen.queryByText("Source: Strategy fallback (non-modeled)"),
    ).toBeNull();
  });

  it("renders Home data-refresh error notice when summary query fails", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });

    render(<DashboardScreen />);

    expect(screen.getByText("Data refresh needed")).toBeTruthy();
  });

  it("renders Step Detail synthetic alternatives when modeled options are sparse", () => {
    mockUseFinancialMaturityEvaluation.mockReturnValue({
      evaluation: buildEvaluation({
        mode: "build",
        primaryRecommendation: baseRecommendation,
        alternatives: [],
      }),
      facts: baseFacts,
      isPolicyLoading: false,
      isPolicyError: false,
      isRulePackLoading: false,
      isRulePackError: false,
    });

    render(<StepDetailScreen />);

    expect(screen.getByText("OPTIONS + TRADEOFFS")).toBeTruthy();
    expect(screen.getAllByText("STRATEGY ALTERNATIVE")).toHaveLength(2);
    expect(
      screen.getAllByText("Source: Strategy fallback (non-modeled)"),
    ).toHaveLength(2);
    expect(
      screen.getByText(
        /0 modeled alternative options are available\. Connect more account data to unlock deeper option comparisons\./i,
      ),
    ).toBeTruthy();
  });

  it("renders Step Detail modeled alternatives without synthetic fallback cards", () => {
    mockUseFinancialMaturityEvaluation.mockReturnValue({
      evaluation: buildEvaluation({
        mode: "build",
        primaryRecommendation: baseRecommendation,
        alternatives: [secondaryRecommendation, tertiaryRecommendation],
      }),
      facts: baseFacts,
      isPolicyLoading: false,
      isPolicyError: false,
      isRulePackLoading: false,
      isRulePackError: false,
    });

    render(<StepDetailScreen />);

    expect(screen.getByText("Connect accounts")).toBeTruthy();
    expect(screen.getByText("Tackle toxic debt")).toBeTruthy();
    expect(screen.queryByText("STRATEGY ALTERNATIVE")).toBeNull();
  });

  it("renders Step Detail loading skeleton while recommendation context is resolving", () => {
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });
    mockUseFinancialMaturityEvaluation.mockReturnValue({
      evaluation: buildEvaluation({
        primaryRecommendation: null,
        alternatives: [],
      }),
      facts: baseFacts,
      isPolicyLoading: true,
      isPolicyError: false,
      isRulePackLoading: false,
      isRulePackError: false,
    });

    render(<StepDetailScreen />);

    expect(screen.queryByText("STEP DETAIL")).toBeNull();
    expect(screen.queryByText("SUMMARY")).toBeNull();
    expect(screen.queryByText("Step unavailable")).toBeNull();
  });

  it("renders Step Detail unavailable state when no recommendations exist", () => {
    mockUseFinancialMaturityEvaluation.mockReturnValue({
      evaluation: buildEvaluation({
        primaryRecommendation: null,
        alternatives: [],
      }),
      facts: baseFacts,
      isPolicyLoading: false,
      isPolicyError: false,
      isRulePackLoading: false,
      isRulePackError: false,
    });

    render(<StepDetailScreen />);

    expect(screen.getByText("Step unavailable")).toBeTruthy();
  });
});
