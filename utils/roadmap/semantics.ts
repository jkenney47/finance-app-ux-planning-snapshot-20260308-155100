import type {
  JourneyMilestone,
  JourneyMilestoneId,
  MilestoneStatus,
  Recommendation,
  RecommendationId,
} from "@/utils/contracts/fme";

export type RoadmapStepType = "setup" | "threshold" | "maintain";

const RECOMMENDATION_TYPE_MAP: Record<RecommendationId, RoadmapStepType> = {
  connect_accounts: "setup",
  stabilize_cash_flow: "maintain",
  build_deductible_shield: "threshold",
  close_protection_gap: "maintain",
  capture_employer_match: "setup",
  tackle_toxic_debt: "threshold",
  build_fortress_fund: "threshold",
  collect_missing_facts: "setup",
  keep_momentum: "maintain",
};

const MILESTONE_TYPE_MAP: Record<JourneyMilestoneId, RoadmapStepType> = {
  cash_flow_truth: "maintain",
  deductible_shield: "threshold",
  protection_gap: "maintain",
  match_arbitrage: "setup",
  toxic_debt_purge: "threshold",
  fortress_fund: "threshold",
};

const MILESTONE_MEASUREMENT_REASON: Record<JourneyMilestoneId, string> = {
  cash_flow_truth:
    "Measured across the last 2 pay periods to track recurring cash-flow direction.",
  deductible_shield:
    "Measured using the 30-day median daily balance compared to deductible-floor target.",
  protection_gap:
    "Measured from current coverage signals and household risk context, then monitored continuously.",
  match_arbitrage:
    "Measured using your current contribution rate against employer-match thresholds in the latest payroll settings.",
  toxic_debt_purge:
    "Measured directly from live principal and APR values without smoothing.",
  fortress_fund:
    "Measured using a 30-day median daily balance plus rolling 60-90 day cash-flow trend against reserve-month targets.",
};

type StatusPresentation = {
  label: string;
  ongoingStatus?: string;
};

function setupStatusPresentation(status: MilestoneStatus): StatusPresentation {
  switch (status) {
    case "complete":
      return { label: "Completed" };
    case "in_progress":
      return { label: "In setup" };
    case "needs_info":
      return { label: "Needs input" };
    case "blocked_policy_stale":
      return { label: "Blocked" };
    case "not_relevant":
      return { label: "Not needed" };
    default:
      return { label: "Unknown" };
  }
}

function thresholdStatusPresentation(
  status: MilestoneStatus,
): StatusPresentation {
  switch (status) {
    case "complete":
      return { label: "Unlocked", ongoingStatus: "On track" };
    case "in_progress":
      return { label: "Building", ongoingStatus: "Below threshold" };
    case "needs_info":
      return { label: "Needs input" };
    case "blocked_policy_stale":
      return { label: "Blocked" };
    case "not_relevant":
      return { label: "Not active" };
    default:
      return { label: "Unknown" };
  }
}

function maintainStatusPresentation(
  status: MilestoneStatus,
): StatusPresentation {
  switch (status) {
    case "complete":
      return { label: "On track", ongoingStatus: "Stable" };
    case "in_progress":
      return { label: "Needs attention", ongoingStatus: "Drifting" };
    case "needs_info":
      return { label: "Needs input" };
    case "blocked_policy_stale":
      return { label: "Blocked" };
    case "not_relevant":
      return { label: "Not active" };
    default:
      return { label: "Unknown" };
  }
}

export function getRecommendationStepType(
  recommendationId: RecommendationId,
): RoadmapStepType {
  return RECOMMENDATION_TYPE_MAP[recommendationId];
}

export function getMilestoneStepType(
  milestoneId: JourneyMilestoneId,
): RoadmapStepType {
  return MILESTONE_TYPE_MAP[milestoneId];
}

export function getStepTypeLabel(stepType: RoadmapStepType): string {
  if (stepType === "setup") return "Setup";
  if (stepType === "threshold") return "Threshold";
  return "Maintain";
}

export function getMilestoneMeasurementReason(
  milestoneId: JourneyMilestoneId,
): string {
  return MILESTONE_MEASUREMENT_REASON[milestoneId];
}

export function getMilestoneStatusPresentation(
  milestone: JourneyMilestone,
): StatusPresentation {
  const stepType = getMilestoneStepType(milestone.id);

  if (stepType === "setup") {
    return setupStatusPresentation(milestone.status);
  }

  if (stepType === "threshold") {
    return thresholdStatusPresentation(milestone.status);
  }

  return maintainStatusPresentation(milestone.status);
}

export function sortRecommendationsByRoadmapHorizon(
  recommendations: Recommendation[],
): {
  now: Recommendation[];
  next: Recommendation[];
  later: Recommendation[];
} {
  const now = recommendations.slice(0, 1);
  const next = recommendations.slice(1, 2);
  const later = recommendations.slice(2);

  return { now, next, later };
}
