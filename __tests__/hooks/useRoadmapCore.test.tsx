import { renderHook } from "@test-utils";

import type { OnboardingState } from "@/utils/contracts/onboarding";
import type { DashboardSummary } from "@/utils/dashboard";
import {
  createRoadmapPayloadSignature,
  resolveCurrentRoadmapPayload,
} from "@/utils/roadmap/readModels";
import type * as RoadmapCoreModule from "@/utils/queries/useRoadmapCore";

const mockUseDashboardSummary = jest.fn();
const mockSetGeneratedRoadmap = jest.fn();

const mockOnboardingState = {
  intake: {},
  linking: {
    linkedInstitutionsCount: 1,
    linkedAccountsCount: 1,
    coreTransactionalLinked: true,
    linkedCategories: ["checking_savings"],
    mockScenario: "core_transactional",
  } as OnboardingState["linking"],
  generatedRoadmap: null,
  setGeneratedRoadmap: (payload: unknown) => mockSetGeneratedRoadmap(payload),
};

jest.mock("@/hooks/useDashboardData", () => ({
  useDashboardSummary: () => mockUseDashboardSummary(),
}));

jest.mock("@/stores/useOnboardingStore", () => ({
  useOnboardingStore: <T,>(
    selector: (state: typeof mockOnboardingState) => T,
  ): T => selector(mockOnboardingState),
}));

const roadmapCore = jest.requireActual(
  "@/utils/queries/useRoadmapCore",
) as typeof RoadmapCoreModule;
const {
  useCurrentRoadmap,
  useHomeViewModel,
  useRoadmapViewModel,
  useStepDetailViewModel,
} = roadmapCore;

const baseSummary: DashboardSummary = {
  netWorth: 6400,
  netWorthDelta: 0,
  cashFlowPoints: [],
  accounts: [],
  transactions: [],
  institutionStatuses: [],
};

describe("useRoadmapCore hooks", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-13T12:00:00.000Z"));
    jest.clearAllMocks();
    mockOnboardingState.intake = {};
    mockOnboardingState.linking = {
      linkedInstitutionsCount: 1,
      linkedAccountsCount: 1,
      coreTransactionalLinked: true,
      linkedCategories: ["checking_savings"],
      mockScenario: "core_transactional",
    };
    mockOnboardingState.generatedRoadmap = null;
    mockUseDashboardSummary.mockReturnValue({
      data: baseSummary,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("uses the same roadmap resolver as onboarding reveal", () => {
    const expectedPayload = resolveCurrentRoadmapPayload({
      intake: mockOnboardingState.intake,
      linking: mockOnboardingState.linking,
      summary: baseSummary,
    });
    const { result } = renderHook(() => useCurrentRoadmap());

    expect(result.current.data).toEqual(expectedPayload);
    expect(mockSetGeneratedRoadmap).toHaveBeenCalledWith(expectedPayload);
  });

  it("keeps Home, Roadmap, and Step Detail in sync after roadmap source changes", () => {
    const home = renderHook(() => useHomeViewModel());
    const roadmap = renderHook(() => useRoadmapViewModel());
    const step = renderHook(() => useStepDetailViewModel("starter_buffer"));

    const initialSignature = createRoadmapPayloadSignature(
      home.result.current.roadmap,
    );

    expect(initialSignature).toBe(
      createRoadmapPayloadSignature(roadmap.result.current.roadmap),
    );
    expect(initialSignature).toBe(
      createRoadmapPayloadSignature(step.result.current.roadmap),
    );

    mockOnboardingState.linking = {
      ...mockOnboardingState.linking,
      linkedInstitutionsCount: 4,
      linkedAccountsCount: 5,
      linkedCategories: [
        "checking_savings",
        "credit_cards",
        "loans",
        "retirement_investments",
      ],
      mockScenario: "full_coverage",
    };

    home.rerender();
    roadmap.rerender();
    step.rerender();

    const refreshedSignature = createRoadmapPayloadSignature(
      home.result.current.roadmap,
    );

    expect(refreshedSignature).toBe(
      createRoadmapPayloadSignature(roadmap.result.current.roadmap),
    );
    expect(refreshedSignature).toBe(
      createRoadmapPayloadSignature(step.result.current.roadmap),
    );
    expect(refreshedSignature).not.toBe(initialSignature);
  });
});
