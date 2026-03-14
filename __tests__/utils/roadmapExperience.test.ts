import type {
  FinancialSnapshotPayload,
  RoadmapPayload,
} from "@/utils/engine/types";
import {
  buildCoverageDisplay,
  buildMonthlyReviewSummary,
  isRoadmapStressMode,
} from "@/utils/roadmap/experience";

function buildRoadmapPayload(
  overrides?: Partial<RoadmapPayload>,
): RoadmapPayload {
  return {
    overallCoverageLevel: "preliminary",
    domainCoverage: {
      cashflow: "moderate",
      debt: "thin",
      liquidity: "strong",
      retirement: "none",
      goals: "moderate",
      housing: "none",
    },
    currentStage: {
      id: "get_stable",
      label: "Get Stable",
      description: "Stabilize cash flow.",
    },
    currentFocus: {
      code: "stabilize_cash_flow",
      label: "Stabilize cash flow",
      description: "Protect essentials first.",
    },
    nextAction: {
      actionId: "catch_up_bills",
      actionType: "cashflow",
      title: "Catch up the most urgent bills",
      recommendation: "Get essentials current before adding anything new.",
      rationale: "Late essential bills create the most immediate downside.",
      confidence: "medium",
      requiredCoverageDomains: ["cashflow", "liquidity"],
      alternativeOptions: [
        {
          title: "Pause goal contributions",
          tradeoff: "Frees cash now, but slows progress on optional goals.",
        },
      ],
    },
    keyMetric: {
      label: "Monthly surplus / shortfall",
      value: "-$180",
      rawValue: -180,
    },
    explanation: {
      whyPlacedHere: "Cash flow still needs stabilization before later stages.",
      reasoningBullets: [
        "Recent transaction flow suggests a monthly shortfall.",
        "Liquidity is not strong enough to absorb recurring misses.",
      ],
      limitations: ["Debt coverage is still partial."],
      goalImpacts: [
        "Stability work protects longer-term goals from interruption.",
      ],
    },
    completedStages: [],
    upcomingStages: ["build_your_buffer", "capture_free_money"],
    blockedStages: [],
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
    ...overrides,
  };
}

function buildSnapshot(
  overrides?: Partial<FinancialSnapshotPayload>,
): FinancialSnapshotPayload {
  return {
    asOf: "2026-03-13T12:00:00.000Z",
    monthlySurplus: {
      label: "Monthly surplus / shortfall",
      value: "-$180",
      rawValue: -180,
    },
    liquidCash: {
      label: "Liquid cash",
      value: "$900",
      rawValue: 900,
    },
    accountFreshness: {
      hasRecentTransactions: true,
      staleCategories: [],
    },
    ...overrides,
  };
}

describe("roadmap experience helpers", () => {
  it("detects stress mode from early-stage urgency signals", () => {
    expect(isRoadmapStressMode(buildRoadmapPayload())).toBe(true);
    expect(
      isRoadmapStressMode(
        buildRoadmapPayload({
          currentStage: {
            id: "build_your_buffer",
            label: "Build Your Buffer",
            description: "Build a starter buffer.",
          },
          keyMetric: {
            label: "Starter buffer progress",
            value: "42%",
            rawValue: 0.42,
          },
        }),
      ),
    ).toBe(false);
  });

  it("builds an action-needed coverage state when freshness is stale", () => {
    const coverage = buildCoverageDisplay({
      roadmap: buildRoadmapPayload(),
      snapshot: buildSnapshot({
        accountFreshness: {
          hasRecentTransactions: false,
          staleCategories: ["credit cards"],
        },
      }),
    });

    expect(coverage.label).toBe("Action needed");
    expect(coverage.banner?.title).toBe("Action needed");
    expect(coverage.actionLabel).toBe("Manage accounts");
  });

  it("builds strong coverage state when linked data is complete", () => {
    const coverage = buildCoverageDisplay({
      roadmap: buildRoadmapPayload({
        overallCoverageLevel: "strong",
        recommendedAccountsToLink: [],
      }),
      snapshot: buildSnapshot(),
    });

    expect(coverage.label).toBe("Coverage strong");
    expect(coverage.banner).toBeNull();
  });

  it("summarizes the monthly review with progress and next-move guidance", () => {
    const review = buildMonthlyReviewSummary({
      roadmap: buildRoadmapPayload(),
      snapshot: buildSnapshot(),
    });

    expect(review.roadmapProgress.currentStage).toBe("Get Stable");
    expect(review.roadmapProgress.nextStage).toBe("Build Your Buffer");
    expect(review.nextMove.primary).toBe("Catch up the most urgent bills");
    expect(review.whatChanged.length).toBeGreaterThan(0);
  });
});
