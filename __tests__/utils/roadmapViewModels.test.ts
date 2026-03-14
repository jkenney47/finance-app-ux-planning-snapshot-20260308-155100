import type {
  FinancialSnapshotPayload,
  RoadmapPayload,
} from "@/utils/engine/types";
import {
  mapCoverageLevelToChip,
  roadmapToHomeViewModel,
  roadmapToRoadmapViewModel,
  roadmapToStepDetailViewModel,
} from "@/utils/roadmap/viewModels";

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
      rationale: "You need a dependable cash cushion before bigger tradeoffs.",
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
      goalImpacts: [
        "A starter buffer reduces the odds of pausing goal savings.",
      ],
    },
    completedStages: ["get_stable"],
    upcomingStages: [
      "capture_free_money",
      "clear_expensive_debt",
      "strengthen_your_safety_net",
      "fund_whats_next",
      "grow_and_optimize",
    ],
    blockedStages: [
      {
        stageId: "clear_expensive_debt",
        reason: "Debt accounts are only partially linked.",
      },
    ],
    recommendedAccountsToLink: ["credit cards", "retirement accounts"],
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

function buildSnapshot(): FinancialSnapshotPayload {
  return {
    asOf: "2026-03-13T12:00:00.000Z",
    netWorth: {
      label: "Net worth",
      value: "$12,000",
      rawValue: 12000,
    },
    monthlySurplus: {
      label: "Monthly surplus / shortfall",
      value: "$640",
      rawValue: 640,
    },
    liquidCash: {
      label: "Liquid cash",
      value: "$2,200",
      rawValue: 2200,
    },
    monthlySpending: {
      label: "Monthly spending",
      value: "$3,100",
      rawValue: 3100,
    },
    totalDebt: {
      label: "Total debt",
      value: "$4,200",
      rawValue: 4200,
    },
    accountFreshness: {
      hasRecentTransactions: true,
      staleCategories: [],
    },
  };
}

describe("roadmap view-model adapters", () => {
  it("maps coverage levels to the expected chip labels and tones", () => {
    expect(mapCoverageLevelToChip("demo")).toEqual({
      label: "Coverage limited",
      tone: "neutral",
    });
    expect(mapCoverageLevelToChip("preliminary")).toEqual({
      label: "Preliminary coverage",
      tone: "warning",
    });
    expect(mapCoverageLevelToChip("strong")).toEqual({
      label: "Coverage strong",
      tone: "positive",
    });
  });

  it("maps blocked, current, completed, and upcoming stages for the roadmap", () => {
    const viewModel = roadmapToRoadmapViewModel(buildRoadmapPayload());

    expect(
      viewModel.stageCards.find((card) => card.stageId === "get_stable"),
    ).toMatchObject({ status: "completed" });
    expect(
      viewModel.stageCards.find((card) => card.stageId === "build_your_buffer"),
    ).toMatchObject({ status: "current", isCurrent: true });
    expect(
      viewModel.stageCards.find(
        (card) => card.stageId === "clear_expensive_debt",
      ),
    ).toMatchObject({
      status: "blocked",
      blockedReason: "Debt accounts are only partially linked.",
    });
    expect(
      viewModel.stageCards.find(
        (card) => card.stageId === "capture_free_money",
      ),
    ).toMatchObject({ status: "upcoming" });
  });

  it("maps preliminary home CTA state and supports roadmap-only rendering", () => {
    const viewModel = roadmapToHomeViewModel(buildRoadmapPayload(), null);

    expect(viewModel.coverageChip).toEqual({
      label: "Preliminary coverage",
      tone: "warning",
    });
    expect(viewModel.snapshotCards).toBeUndefined();
    expect(viewModel.ctas.map((cta) => cta.type)).toEqual([
      "view_step_detail",
      "see_full_roadmap",
      "link_more_accounts",
    ]);
  });

  it("maps strong-coverage CTA state and selects compact snapshot cards", () => {
    const viewModel = roadmapToHomeViewModel(
      buildRoadmapPayload({
        overallCoverageLevel: "strong",
        recommendedAccountsToLink: [],
      }),
      buildSnapshot(),
    );

    expect(viewModel.ctas.map((cta) => cta.type)).toEqual([
      "view_step_detail",
      "see_full_roadmap",
      "manage_accounts",
    ]);
    expect(viewModel.snapshotCards).toHaveLength(3);
    expect(viewModel.snapshotCards?.map((card) => card.key)).toEqual([
      "liquidCash",
      "monthlySurplus",
      "monthlySpending",
    ]);
  });

  it("maps step-detail coverage, required domains, and CTA behavior", () => {
    const viewModel = roadmapToStepDetailViewModel(buildRoadmapPayload());

    expect(viewModel.domainCoverage).toContainEqual({
      domain: "Cashflow",
      level: "limited",
    });
    expect(viewModel.domainCoverage).toContainEqual({
      domain: "Liquidity",
      level: "strong",
    });
    expect(viewModel.requiredCoverageDomains).toEqual([
      "Cashflow",
      "Liquidity",
    ]);
    expect(viewModel.ctas.map((cta) => cta.type)).toEqual([
      "link_more_accounts",
      "see_full_roadmap",
    ]);
  });
});
