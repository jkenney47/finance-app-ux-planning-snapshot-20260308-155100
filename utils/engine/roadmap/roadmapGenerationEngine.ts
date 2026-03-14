import { engineConfig } from "@/utils/engine/config/engineConfig";
import { assessCoverage } from "@/utils/engine/coverage/coverageEngine";
import { deriveFinancialFacts } from "@/utils/engine/facts/financialFactEngine";
import { derivePlanningSignals } from "@/utils/engine/intake/intakeSignalEngine";
import { normalizeIntakeAnswers } from "@/utils/engine/intake/intakeNormalizer";
import {
  CURRENT_FOCUS_METADATA,
  selectCurrentFocus,
} from "@/utils/engine/roadmap/focusSelectionEngine";
import { buildExplanation } from "@/utils/engine/roadmap/explanationEngine";
import { buildNextAction } from "@/utils/engine/roadmap/nextActionEngine";
import { assignStage } from "@/utils/engine/roadmap/stageAssignmentEngine";
import { deriveGoalTargets } from "@/utils/engine/targets/goalTargetEngine";
import { deriveLiquidityTargets } from "@/utils/engine/targets/liquidityTargetEngine";
import { deriveRetirementTargets } from "@/utils/engine/targets/retirementTargetEngine";
import type { OnboardingState } from "@/utils/contracts/onboarding";
import type {
  CurrentFocusCode,
  FinancialFacts,
  KeyMetric,
  LinkedAccountSnapshot,
  RoadmapPayload,
  RoadmapStageId,
} from "@/utils/engine/types";

export const ROADMAP_STAGE_SEQUENCE: RoadmapStageId[] = [
  "get_stable",
  "build_your_buffer",
  "capture_free_money",
  "clear_expensive_debt",
  "strengthen_your_safety_net",
  "fund_whats_next",
  "grow_and_optimize",
];

export const ROADMAP_STAGE_METADATA: Record<
  RoadmapStageId,
  { label: string; description: string }
> = {
  get_stable: {
    label: "Get Stable",
    description:
      "Understand cash flow, cover essentials, stay current, and stop the bleeding.",
  },
  build_your_buffer: {
    label: "Build Your Buffer",
    description:
      "Create a starter emergency fund so one surprise does not create a setback.",
  },
  capture_free_money: {
    label: "Capture Free Money",
    description:
      "Secure employer match or equivalent guaranteed upside once stability is in place.",
  },
  clear_expensive_debt: {
    label: "Clear Expensive Debt",
    description:
      "Aggressively pay down high-interest debt that is slowing progress.",
  },
  strengthen_your_safety_net: {
    label: "Strengthen Your Safety Net",
    description:
      "Build a fuller buffer and handle remaining moderate-interest debt decisions.",
  },
  fund_whats_next: {
    label: "Fund What’s Next",
    description:
      "Support near-term goals without abandoning long-term progress.",
  },
  grow_and_optimize: {
    label: "Grow and Optimize",
    description:
      "Increase long-term saving and handle higher-order optimization choices.",
  },
};

function formatCurrency(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "Not enough data yet";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildKeyMetric(args: {
  stage: RoadmapStageId;
  facts: FinancialFacts;
  targetEmergencyMonths: number;
  stage2ExitBufferUsd: number;
}): KeyMetric {
  const { stage, facts, targetEmergencyMonths, stage2ExitBufferUsd } = args;
  switch (stage) {
    case "get_stable":
      return {
        label: "Monthly surplus / shortfall",
        value: formatCurrency(facts.avgMonthlyNetCashFlow),
        rawValue: facts.avgMonthlyNetCashFlow ?? null,
      };
    case "build_your_buffer": {
      const progress = Math.max(
        0,
        Math.min(1, (facts.liquidCash ?? 0) / Math.max(stage2ExitBufferUsd, 1)),
      );
      return {
        label: "Starter buffer progress",
        value: `${Math.round(progress * 100)}%`,
        rawValue: progress,
      };
    }
    case "capture_free_money":
      return {
        label: "Employer match gap",
        value:
          facts.fullEmployerMatchCaptured === false
            ? "Still available"
            : "Almost there",
      };
    case "clear_expensive_debt":
      return {
        label: "Highest APR debt balance",
        value: formatCurrency(facts.highInterestDebtBalance),
        rawValue: facts.highInterestDebtBalance ?? null,
      };
    case "strengthen_your_safety_net":
      return {
        label: "Emergency fund months",
        value:
          facts.emergencyFundMonths == null
            ? "Preliminary"
            : `${facts.emergencyFundMonths.toFixed(1)} of ${targetEmergencyMonths}`,
        rawValue: facts.emergencyFundMonths ?? null,
      };
    case "fund_whats_next":
      return {
        label: "Goal timeline",
        value:
          facts.activeNearTermGoalMonths != null
            ? `${facts.activeNearTermGoalMonths} months`
            : "Longer-term horizon",
      };
    case "grow_and_optimize":
    default:
      return {
        label: "Retirement savings rate",
        value:
          facts.estimatedRetirementContributionRate != null
            ? `${Math.round(facts.estimatedRetirementContributionRate * 100)}%`
            : "Build from current plan",
      };
  }
}

export function buildRoadmapPayload(args: {
  rawIntake: OnboardingState["intake"];
  snapshot: LinkedAccountSnapshot;
}): RoadmapPayload {
  const intake = normalizeIntakeAnswers(args.rawIntake);
  const signals = derivePlanningSignals(intake);
  const coverage = assessCoverage(args.snapshot, intake);
  const facts = deriveFinancialFacts({
    snapshot: args.snapshot,
    intake,
    signals,
  });
  const liquidityTargets = deriveLiquidityTargets({ facts, signals });
  const goalTargets = deriveGoalTargets(signals);
  const retirementTargets = deriveRetirementTargets(facts);
  const stageAssignment = assignStage({
    coverage,
    facts,
    liquidityTargets,
    goalTargets,
    retirementTargets,
  });
  const currentFocus = selectCurrentFocus({
    stage: stageAssignment.currentStage,
    facts,
    signals,
    goalTargets,
  });
  const nextAction = buildNextAction({
    currentFocus,
    overallCoverageLevel: coverage.overall,
    facts,
    liquidityTargets,
    goalTargets,
  });
  const explanation = buildExplanation({
    stage: stageAssignment.currentStage,
    currentFocus,
    intake,
    signals,
    coverage,
    facts,
  });
  const keyMetric = buildKeyMetric({
    stage: stageAssignment.currentStage,
    facts,
    targetEmergencyMonths: liquidityTargets.targetEmergencyMonths,
    stage2ExitBufferUsd: liquidityTargets.stage2ExitBufferUsd,
  });

  return {
    overallCoverageLevel: coverage.overall,
    domainCoverage: coverage.domains,
    currentStage: {
      id: stageAssignment.currentStage,
      ...ROADMAP_STAGE_METADATA[stageAssignment.currentStage],
    },
    currentFocus: {
      code: currentFocus as CurrentFocusCode,
      ...CURRENT_FOCUS_METADATA[currentFocus],
    },
    nextAction,
    keyMetric,
    explanation,
    completedStages: stageAssignment.completedStages,
    upcomingStages: stageAssignment.upcomingStages,
    blockedStages: stageAssignment.blockedStages,
    recommendedAccountsToLink: coverage.nextBestLinkingPrompts,
    engineMeta: {
      generatedAt: new Date().toISOString(),
      version: engineConfig.version,
      thresholdsUsed: {
        highInterestAprThreshold: engineConfig.debt.highInterestAprThreshold,
        moderateInterestAprThreshold:
          engineConfig.debt.moderateInterestAprThreshold,
        targetEmergencyMonths: liquidityTargets.targetEmergencyMonths,
        targetRetirementRate: engineConfig.retirement.targetContributionRate,
      },
    },
  };
}
