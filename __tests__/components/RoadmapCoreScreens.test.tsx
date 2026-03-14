import DashboardScreen from "@/app/(dashboard)/index";
import JourneyScreen from "@/app/(dashboard)/journey";
import StepDetailScreen from "@/app/(dashboard)/step/[recommendationId]";
import { fireEvent, render, screen } from "@test-utils";

const mockUseDashboardSummary = jest.fn();
const mockUseFinancialMaturityEvaluation = jest.fn();
const mockUseHomeViewModel = jest.fn();
const mockUseRoadmapViewModel = jest.fn();
const mockUseStepDetailViewModel = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    recommendationId: "starter_buffer",
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock("@/hooks/useDashboardData", () => ({
  useDashboardSummary: () => mockUseDashboardSummary(),
  useFinancialMaturityEvaluation: (...args: unknown[]) =>
    mockUseFinancialMaturityEvaluation(...args),
}));

jest.mock("@/utils/roadmap/featureFlags", () => ({
  isRoadmapCoreScreensEnabled: () => true,
}));

jest.mock("@/utils/queries/useRoadmapCore", () => ({
  useHomeViewModel: () => mockUseHomeViewModel(),
  useRoadmapViewModel: () => mockUseRoadmapViewModel(),
  useStepDetailViewModel: (stepId?: string) =>
    mockUseStepDetailViewModel(stepId),
}));

jest.mock("@/utils/queries/useAgentInterop", () => ({
  useRunAgentWorkflow: () => ({
    mutate: jest.fn(),
    data: null,
    isPending: false,
  }),
}));

jest.mock("@/utils/queries/useFmeEvaluationLogs", () => ({
  useFmeEvaluationLogHistory: () => ({
    data: [],
    isLoading: false,
  }),
}));

jest.mock("@/utils/queries/usePolicyGovernance", () => ({
  usePolicyGovernance: () => ({
    data: {
      snapshots: [],
    },
  }),
}));

jest.mock("@/utils/services/fmeAgentWorkflows", () => ({
  buildFmeExplanationWorkflow: jest.fn(),
  isFmeAgentExplanationEnabled: () => false,
}));

jest.mock("@/hooks/useErrorBanner", () => ({
  useErrorBanner: () => ({
    showError: jest.fn(),
  }),
}));

jest.mock("@/stores/useSessionStore", () => ({
  useSessionStore: <T,>(selector: (state: { session: null }) => T): T =>
    selector({ session: null }),
}));

const mockAskState = {
  setContext: jest.fn(),
  open: jest.fn(),
};

jest.mock("@/stores/useAskStore", () => ({
  useAskStore: <T,>(selector: (state: typeof mockAskState) => T): T =>
    selector(mockAskState),
}));

jest.mock("@/utils/analytics", () => ({
  trackEvent: jest.fn(),
  trackScreen: jest.fn(),
}));

function buildRoadmap() {
  return {
    overallCoverageLevel: "preliminary" as const,
    domainCoverage: {
      cashflow: "moderate",
      debt: "thin",
      liquidity: "strong",
      retirement: "none",
      goals: "moderate",
      housing: "none",
    },
    currentStage: {
      id: "build_your_buffer",
      label: "Build Your Buffer",
      description: "Build a starter emergency fund.",
    },
    currentFocus: {
      code: "starter_buffer",
      label: "Starter buffer",
      description: "Build one month of breathing room.",
    },
    nextAction: {
      actionId: "starter_buffer",
      actionType: "buffer",
      title: "Automate the starter buffer",
      recommendation: "Move $150 each payday into your emergency fund.",
      rationale: "You need dependable reserves before bigger tradeoffs.",
      confidence: "medium",
      requiredCoverageDomains: ["cashflow", "liquidity"],
      alternativeOptions: [
        {
          title: "Use weekly transfers",
          tradeoff: "Higher consistency, lower monthly amount.",
        },
      ],
    },
    keyMetric: {
      label: "Starter buffer progress",
      value: "42%",
      rawValue: 0.42,
    },
    explanation: {
      whyPlacedHere: "Your cash flow is usable, but reserves are still thin.",
      reasoningBullets: [
        "Liquid cash is below the starter target.",
        "Cash flow is positive enough to automate saving.",
      ],
      limitations: ["Retirement coverage is still sparse."],
      goalImpacts: ["A buffer reduces the odds of pausing goal savings."],
    },
    completedStages: ["get_stable"],
    upcomingStages: [
      "capture_free_money",
      "clear_expensive_debt",
      "strengthen_your_safety_net",
    ],
    blockedStages: [
      {
        stageId: "clear_expensive_debt",
        reason: "Debt data is limited.",
      },
    ],
    recommendedAccountsToLink: ["credit cards"],
    engineMeta: {
      generatedAt: "2026-03-13T12:00:00.000Z",
      version: "engine-v4",
      thresholdsUsed: {
        highInterestAprThreshold: 0.2,
        moderateInterestAprThreshold: 0.08,
        targetEmergencyMonths: 6,
        targetRetirementRate: 0.15,
      },
    },
  };
}

describe("roadmap core screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboardSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    mockUseFinancialMaturityEvaluation.mockReturnValue(null);
    mockUseHomeViewModel.mockReturnValue({
      data: {
        coverageChip: {
          label: "Preliminary coverage",
          tone: "warning",
        },
        stage: {
          id: "build_your_buffer",
          label: "Build Your Buffer",
          description: "Build a starter emergency fund.",
        },
        currentFocus: {
          label: "Starter buffer",
          description: "Build one month of breathing room.",
        },
        nextAction: {
          actionId: "starter_buffer",
          title: "Automate the starter buffer",
          recommendation: "Move $150 each payday into your emergency fund.",
          confidence: "medium",
        },
        keyMetric: {
          label: "Starter buffer progress",
          value: "42%",
        },
        reasoningPreview: ["Liquid cash is below the starter target."],
        limitationPreview: ["Retirement coverage is still sparse."],
        snapshotCards: [
          {
            key: "liquidCash",
            label: "Liquid cash",
            value: "$2,200",
          },
        ],
        ctas: [
          { type: "view_step_detail", label: "View step detail" },
          { type: "see_full_roadmap", label: "See full roadmap" },
          { type: "link_more_accounts", label: "Link more accounts" },
        ],
      },
      roadmap: buildRoadmap(),
      snapshot: {
        asOf: "2026-03-13T12:00:00.000Z",
        accountFreshness: {
          hasRecentTransactions: true,
          staleCategories: [],
        },
      },
      isLoading: false,
      isError: false,
      hasRefreshError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseRoadmapViewModel.mockReturnValue({
      data: {
        coverageChip: {
          label: "Preliminary coverage",
          tone: "warning",
        },
        currentStageId: "build_your_buffer",
        stageCards: [
          {
            stageId: "get_stable",
            label: "Get Stable",
            status: "completed",
            description: "Stabilize cash flow.",
            isCurrent: false,
          },
          {
            stageId: "build_your_buffer",
            label: "Build Your Buffer",
            status: "current",
            description: "Build reserves.",
            isCurrent: true,
          },
          {
            stageId: "clear_expensive_debt",
            label: "Clear Expensive Debt",
            status: "blocked",
            description: "Tackle high-interest debt.",
            blockedReason: "Debt data is limited.",
            isCurrent: false,
          },
        ],
        currentFocus: {
          label: "Starter buffer",
          description: "Build one month of breathing room.",
        },
        nextAction: {
          actionId: "starter_buffer",
          title: "Automate the starter buffer",
          recommendation: "Move $150 each payday into your emergency fund.",
        },
        whyPlacedHere: "Your cash flow is usable, but reserves are still thin.",
        goalImpacts: ["A buffer reduces the odds of pausing goal savings."],
        limitations: ["Retirement coverage is still sparse."],
        recommendedAccountsToLink: ["credit cards"],
      },
      roadmap: buildRoadmap(),
      snapshot: null,
      isLoading: false,
      isError: false,
      hasRefreshError: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseStepDetailViewModel.mockReturnValue({
      data: {
        stage: {
          id: "build_your_buffer",
          label: "Build Your Buffer",
        },
        focus: {
          label: "Starter buffer",
          description: "Build one month of breathing room.",
        },
        nextAction: {
          actionId: "starter_buffer",
          title: "Automate the starter buffer",
          recommendation: "Move $150 each payday into your emergency fund.",
          rationale: "You need dependable reserves before bigger tradeoffs.",
          confidence: "medium",
          alternativeOptions: [
            {
              title: "Use weekly transfers",
              tradeoff: "Higher consistency, lower monthly amount.",
            },
          ],
        },
        whyNow: "Your cash flow is usable, but reserves are still thin.",
        reasoningBullets: [
          "Liquid cash is below the starter target.",
          "Cash flow is positive enough to automate saving.",
        ],
        limitations: ["Retirement coverage is still sparse."],
        goalImpacts: ["A buffer reduces the odds of pausing goal savings."],
        domainCoverage: [
          { domain: "Cashflow", level: "limited" },
          { domain: "Liquidity", level: "strong" },
        ],
        requiredCoverageDomains: ["Cashflow", "Liquidity"],
        ctas: [
          { type: "link_more_accounts", label: "Link more accounts" },
          { type: "see_full_roadmap", label: "See full roadmap" },
        ],
      },
      roadmap: buildRoadmap(),
      snapshot: null,
      isLoading: false,
      isError: false,
      hasRefreshError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it("renders Home from roadmap payloads without invoking legacy selectors", () => {
    render(<DashboardScreen />);

    expect(screen.getByTestId("home-coverage-chip")).toBeTruthy();
    expect(screen.getByTestId("home-utility-button")).toBeTruthy();
    expect(screen.getByTestId("home-monthly-review-card")).toBeTruthy();
    expect(screen.getByText("Build Your Buffer")).toBeTruthy();
    expect(screen.getByText("Starter buffer")).toBeTruthy();
    expect(screen.getByText("Automate the starter buffer")).toBeTruthy();
    expect(screen.getByText("View step detail")).toBeTruthy();
    expect(mockUseDashboardSummary).not.toHaveBeenCalled();
    expect(mockUseFinancialMaturityEvaluation).not.toHaveBeenCalled();
  });

  it("renders the roadmap timeline directly from stage cards", () => {
    render(<JourneyScreen />);

    expect(screen.getByTestId("journey-screen-title")).toBeTruthy();
    expect(screen.getByTestId("roadmap-utility-button")).toBeTruthy();
    expect(screen.getByTestId("roadmap-step-detail-cta")).toBeTruthy();
    expect(screen.getByText("Get Stable")).toBeTruthy();
    expect(screen.getByText("Build Your Buffer")).toBeTruthy();
    fireEvent.click(screen.getByText("Clear Expensive Debt"));
    expect(screen.getByText(/Debt data is limited\./i)).toBeTruthy();
    expect(screen.getByText("credit cards")).toBeTruthy();
  });

  it("renders step detail reasoning, limitations, and compare-options drilldown from the roadmap payload", () => {
    render(<StepDetailScreen />);

    expect(screen.getByTestId("step-detail-action-card")).toBeTruthy();
    expect(screen.getByTestId("step-detail-reasoning")).toBeTruthy();
    expect(
      screen.getByText(/Liquid cash is below the starter target\./i),
    ).toBeTruthy();
    expect(
      screen.getByText(/Retirement coverage is still sparse\./i),
    ).toBeTruthy();
    expect(screen.getAllByText("Cashflow").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("step-detail-compare-cta"));

    expect(screen.getByTestId("step-detail-compare-sheet")).toBeTruthy();
    expect(screen.getByText("Use weekly transfers")).toBeTruthy();
  });

  it("shows a strong-coverage home state without warning CTA regression", () => {
    const baseHomeResult = mockUseHomeViewModel();
    mockUseHomeViewModel.mockReturnValue({
      ...baseHomeResult,
      data: {
        ...baseHomeResult.data,
        coverageChip: {
          label: "Coverage strong",
          tone: "positive",
        },
        ctas: [
          { type: "view_step_detail", label: "View step detail" },
          { type: "see_full_roadmap", label: "See full roadmap" },
          { type: "manage_accounts", label: "Manage accounts" },
        ],
      },
      roadmap: {
        ...buildRoadmap(),
        overallCoverageLevel: "strong",
        recommendedAccountsToLink: [],
      },
    });

    render(<DashboardScreen />);

    expect(screen.getByText("Coverage strong")).toBeTruthy();
    expect(screen.queryByTestId("home-coverage-banner")).toBeNull();
    expect(screen.queryByText("Link more accounts")).toBeNull();
  });
});
