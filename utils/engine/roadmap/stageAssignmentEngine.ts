import type {
  CoverageAssessment,
  FinancialFacts,
  GoalTargets,
  LiquidityTargets,
  RetirementTargets,
  RoadmapStageId,
  StageAssignmentResult,
} from "@/utils/engine/types";

const STAGE_ORDER: readonly RoadmapStageId[] = [
  "get_stable",
  "build_your_buffer",
  "capture_free_money",
  "clear_expensive_debt",
  "strengthen_your_safety_net",
  "fund_whats_next",
  "grow_and_optimize",
] as const;

function stagesAfter(stage: RoadmapStageId): RoadmapStageId[] {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 ? [...STAGE_ORDER.slice(index + 1)] : [];
}

function stagesBefore(stage: RoadmapStageId): RoadmapStageId[] {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 ? [...STAGE_ORDER.slice(0, index)] : [];
}

export function assignStage(args: {
  coverage: CoverageAssessment;
  facts: FinancialFacts;
  liquidityTargets: LiquidityTargets;
  goalTargets: GoalTargets;
  retirementTargets: RetirementTargets;
}): StageAssignmentResult {
  const { coverage, facts, liquidityTargets, goalTargets, retirementTargets } =
    args;

  if (coverage.overall === "demo" || coverage.domains.cashflow === "none") {
    return {
      currentStage: "get_stable",
      completedStages: [],
      upcomingStages: stagesAfter("get_stable"),
      blockedStages: [
        {
          stageId: "clear_expensive_debt",
          reason:
            "More transactional coverage is needed before the roadmap can verify later stages.",
        },
      ],
    };
  }

  if (facts.behindOnBills || facts.negativeMonthlyMargin) {
    return {
      currentStage: "get_stable",
      completedStages: [],
      upcomingStages: stagesAfter("get_stable"),
      blockedStages: [],
    };
  }

  if ((facts.liquidCash ?? 0) < liquidityTargets.stage2ExitBufferUsd) {
    return {
      currentStage: "build_your_buffer",
      completedStages: stagesBefore("build_your_buffer"),
      upcomingStages: stagesAfter("build_your_buffer"),
      blockedStages: [],
    };
  }

  if (
    facts.employerMatchAvailable === true &&
    facts.fullEmployerMatchCaptured !== true
  ) {
    return {
      currentStage: "capture_free_money",
      completedStages: stagesBefore("capture_free_money"),
      upcomingStages: stagesAfter("capture_free_money"),
      blockedStages: [],
    };
  }

  if (coverage.domains.debt === "none" || coverage.domains.debt === "thin") {
    return {
      currentStage: "build_your_buffer",
      completedStages: ["get_stable", "build_your_buffer"],
      upcomingStages: [
        "clear_expensive_debt",
        "strengthen_your_safety_net",
        "fund_whats_next",
        "grow_and_optimize",
      ],
      blockedStages: [
        {
          stageId: "clear_expensive_debt",
          reason:
            "Debt accounts are missing, so the roadmap is holding at the highest verified stage.",
        },
      ],
    };
  }

  if ((facts.highInterestDebtBalance ?? 0) > 0 || facts.hasExpensiveDebt) {
    return {
      currentStage: "clear_expensive_debt",
      completedStages: stagesBefore("clear_expensive_debt"),
      upcomingStages: stagesAfter("clear_expensive_debt"),
      blockedStages: [],
    };
  }

  if (
    (facts.emergencyFundMonths ?? 0) < liquidityTargets.targetEmergencyMonths ||
    facts.hasModerateDebt
  ) {
    return {
      currentStage: "strengthen_your_safety_net",
      completedStages: stagesBefore("strengthen_your_safety_net"),
      upcomingStages: stagesAfter("strengthen_your_safety_net"),
      blockedStages: [],
    };
  }

  if (goalTargets.hasNearTermGoal || retirementTargets.isBelowTargetRate) {
    return {
      currentStage: "fund_whats_next",
      completedStages: stagesBefore("fund_whats_next"),
      upcomingStages: stagesAfter("fund_whats_next"),
      blockedStages: [],
    };
  }

  return {
    currentStage: "grow_and_optimize",
    completedStages: stagesBefore("grow_and_optimize"),
    upcomingStages: [],
    blockedStages: [],
  };
}
