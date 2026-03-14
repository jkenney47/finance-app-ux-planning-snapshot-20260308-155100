import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { makeFact, type FactsSnapshot } from "@/utils/contracts/facts";
import type { FmeEvaluation } from "@/utils/contracts/fme";
import type * as DashboardDataModule from "@/hooks/useDashboardData";
import type { DashboardSummary } from "@/utils/dashboard";
import { getDashboardSummaryQueryKey } from "@/utils/queryKeys";
import { act, renderHook, waitFor } from "@test-utils";

const mockLinkedAccountsState = {
  hasLinkedAccounts: false,
};

const mockFactRegistryState = {
  facts: {} as FactsSnapshot,
};

const mockIsRealAccountDataEnabled = jest.fn(() => false);
const mockGetMockScenario = jest.fn(() => "default");
const mockGetDashboardSummary = jest.fn();
const mockGetResolvedDashboardLinkedAccounts = jest.fn();
const mockGetMergedFinancialFacts = jest.fn();
const mockGetFinancialMaturityEvaluation = jest.fn();
const mockUseFmeEvaluationLogger = jest.fn();
const mockRefetchPolicyBundle = jest.fn().mockResolvedValue(undefined);

const mockPolicyBundle = {
  asOf: "2026-03-08T00:00:00.000Z",
  domains: {},
};

const mockRulePack = null;

jest.mock("@/stores/useMockLinkedAccountsStore", () => ({
  useMockLinkedAccountsStore: <T,>(
    selector: (state: typeof mockLinkedAccountsState) => T,
  ): T => selector(mockLinkedAccountsState),
}));

jest.mock("@/stores/useFactRegistryStore", () => ({
  useFactRegistryStore: <T,>(
    selector: (state: typeof mockFactRegistryState) => T,
  ): T => selector(mockFactRegistryState),
}));

jest.mock("@/utils/account", () => ({
  isRealAccountDataEnabled: () => mockIsRealAccountDataEnabled(),
}));

jest.mock("@/utils/mocks/mockScenarios", () => ({
  getMockScenario: () => mockGetMockScenario(),
}));

jest.mock("@/utils/dashboard", () => ({
  getDashboardSummary: (input: unknown) => mockGetDashboardSummary(input),
  getResolvedDashboardLinkedAccounts: (input: unknown) =>
    mockGetResolvedDashboardLinkedAccounts(input),
  getMergedFinancialFacts: (input: unknown) =>
    mockGetMergedFinancialFacts(input),
  getFinancialMaturityEvaluation: (input: unknown) =>
    mockGetFinancialMaturityEvaluation(input),
}));

jest.mock("@/utils/queries/usePolicyBundle", () => ({
  usePolicyBundle: () => ({
    data: mockPolicyBundle,
    isLoading: false,
    isError: false,
    refetch: mockRefetchPolicyBundle,
  }),
}));

jest.mock("@/utils/queries/useRulePack", () => ({
  useRulePack: () => ({
    data: mockRulePack,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock("@/utils/queries/useFmeEvaluationLogs", () => ({
  useFmeEvaluationLogger: (input: unknown) => mockUseFmeEvaluationLogger(input),
}));

const dashboardData = jest.requireActual(
  "@/hooks/useDashboardData",
) as typeof DashboardDataModule;
const {
  useDashboardSummary,
  useFinancialMaturityEvaluation,
  usePrefetchDashboard,
} = dashboardData;

const baseSummary: DashboardSummary = {
  netWorth: 6400,
  netWorthDelta: 250,
  cashFlowPoints: [800, 950, 1000],
  accounts: [
    {
      id: "acct-1",
      name: "Primary checking",
      type: "Checking",
      balance: 6400,
    },
  ],
  transactions: [],
  institutionStatuses: [],
};

const baseFacts: FactsSnapshot = {
  hasLinkedAccounts: makeFact("hasLinkedAccounts", true, "derived", 1),
};

const factOverrides: FactsSnapshot = {
  liquidSavings: makeFact("liquidSavings", 10000, "manual", 0.95),
};

const baseEvaluation: FmeEvaluation = {
  mode: "build",
  decision: {
    mode: "hold_steady",
    confidence: 0.82,
    confidenceThreshold: 0.7,
    assumptions: [],
    triggerConditions: [],
    nextMilestoneGate: null,
    criticalMissingFacts: [],
    stalePolicyDomains: [],
    recommendedActionId: "build_fortress_fund",
  },
  primaryRecommendation: {
    id: "build_fortress_fund",
    phase: "fortress_fund",
    title: "Build your fortress fund",
    summary: "Grow reserves toward target runway.",
    actionLabel: "Open journey",
    actionRoute: "/(dashboard)/journey",
    analyticsEvent: "fme_build_fortress_fund",
    pros: ["Improves resilience"],
    cons: ["Requires near-term savings"],
    assumptions: ["Income remains stable"],
    requiredFacts: [],
    policyDomains: ["thresholds"],
    priority: 10,
    traceRefs: ["trace-1"],
  },
  alternatives: [],
  milestones: [],
  factRequests: [],
  policyStatus: [],
  trace: [],
  generatedAt: "2026-03-08T00:00:00.000Z",
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("useDashboardData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinkedAccountsState.hasLinkedAccounts = false;
    mockFactRegistryState.facts = {};
    mockIsRealAccountDataEnabled.mockReturnValue(false);
    mockGetMockScenario.mockReturnValue("default");
    mockGetDashboardSummary.mockResolvedValue(baseSummary);
    mockGetResolvedDashboardLinkedAccounts.mockReturnValue(true);
    mockGetMergedFinancialFacts.mockReturnValue(baseFacts);
    mockGetFinancialMaturityEvaluation.mockReturnValue(baseEvaluation);
  });

  it("uses mock-linked-account state in the dashboard query cache key", async () => {
    const queryClient = createQueryClient();
    mockLinkedAccountsState.hasLinkedAccounts = true;

    const { result } = renderHook(() => useDashboardSummary(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const expectedKey = getDashboardSummaryQueryKey({
      realDataEnabled: false,
      hasMockLinkedAccounts: true,
      scenario: "default",
    });

    expect(mockGetDashboardSummary).toHaveBeenCalledWith({
      hasMockLinkedAccounts: true,
      realDataEnabled: false,
    });
    expect(queryClient.getQueryData(expectedKey)).toEqual(baseSummary);
  });

  it("prefetches dashboard data with the current linked-account state", async () => {
    const queryClient = createQueryClient();

    const { result } = renderHook(() => usePrefetchDashboard(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current();
    });

    const expectedKey = getDashboardSummaryQueryKey({
      realDataEnabled: false,
      hasMockLinkedAccounts: false,
      scenario: "default",
    });

    await waitFor(() =>
      expect(queryClient.getQueryData(expectedKey)).toEqual(baseSummary),
    );

    expect(mockGetDashboardSummary).toHaveBeenCalledWith({
      hasMockLinkedAccounts: false,
      realDataEnabled: false,
    });
  });

  it("passes store-backed fact overrides through the FME hook boundary", () => {
    const queryClient = createQueryClient();
    mockFactRegistryState.facts = factOverrides;

    const { result } = renderHook(
      () =>
        useFinancialMaturityEvaluation(baseSummary, {
          logEvaluation: false,
        }),
      {
        wrapper: createWrapper(queryClient),
      },
    );

    expect(mockGetResolvedDashboardLinkedAccounts).toHaveBeenCalledWith({
      summary: baseSummary,
      hasMockLinkedAccounts: false,
      realDataEnabled: false,
    });
    expect(mockGetMergedFinancialFacts).toHaveBeenCalledWith({
      summary: baseSummary,
      hasLinkedAccounts: true,
      factOverrides,
    });
    expect(mockGetFinancialMaturityEvaluation).toHaveBeenCalledWith({
      summary: baseSummary,
      hasLinkedAccounts: true,
      factOverrides,
      policyBundle: mockPolicyBundle,
    });
    expect(mockUseFmeEvaluationLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        evaluation: baseEvaluation,
        facts: baseFacts,
        policyBundle: mockPolicyBundle,
        rulePack: mockRulePack,
      }),
    );
    expect(result.current.facts).toBe(baseFacts);
  });
});
