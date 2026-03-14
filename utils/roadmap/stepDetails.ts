import type { Recommendation, RecommendationId } from "@/utils/contracts/fme";

type StepEffects = {
  unlocks: string[];
  delays: string[];
};

const STEP_EFFECTS: Record<RecommendationId, StepEffects> = {
  connect_accounts: {
    unlocks: [
      "Higher-confidence cash flow and runway estimates",
      "More personalized roadmap sequencing",
    ],
    delays: ["Detailed optimization guidance until account data is connected"],
  },
  stabilize_cash_flow: {
    unlocks: ["Stronger emergency fund progress", "Lower debt spiral risk"],
    delays: ["Aggressive investing while monthly cash flow is negative"],
  },
  build_deductible_shield: {
    unlocks: ["Protection gap planning without liquidity stress"],
    delays: ["Extra debt acceleration while shield target is unmet"],
  },
  close_protection_gap: {
    unlocks: ["Cleaner transition into growth-stage actions"],
    delays: ["Some long-term optimization steps while risk gaps remain open"],
  },
  capture_employer_match: {
    unlocks: ["Better retirement compounding from matched dollars"],
    delays: ["Higher cash-on-hand in the near term"],
  },
  tackle_toxic_debt: {
    unlocks: ["More monthly cash flow as high APR balances decline"],
    delays: ["Other optional goals until toxic APR debt is reduced"],
  },
  build_fortress_fund: {
    unlocks: ["Higher resilience to unexpected expenses or income shocks"],
    delays: ["Optimization moves that increase short-term liquidity risk"],
  },
  collect_missing_facts: {
    unlocks: ["More precise recommendation confidence and tradeoffs"],
    delays: ["Data-backed prioritization across all roadmap steps"],
  },
  keep_momentum: {
    unlocks: ["Stable plan maintenance with low-friction monitoring"],
    delays: ["Major plan changes until conditions materially change"],
  },
};

const STEP_MEASUREMENT_COPY: Record<RecommendationId, string> = {
  connect_accounts:
    "We use linked transactions and balances to reduce assumptions. Without linked data, confidence is reduced and some steps stay in needs-info mode.",
  stabilize_cash_flow:
    "Cash flow direction is measured across the last 2 pay periods so one-off spending spikes do not over-steer your roadmap.",
  build_deductible_shield:
    "Deductible coverage uses the 30-day median daily balance against your shield target. Median balance is used to reduce day-to-day noise.",
  close_protection_gap:
    "Protection checks combine insurance flags, dependents, and current policy assumptions to identify catastrophic downside exposure before optimization.",
  capture_employer_match:
    "Match capture compares your current contribution percentage against employer-match thresholds from your latest payroll settings.",
  tackle_toxic_debt:
    "Debt payoff progress is measured directly from current principal and APR balances without smoothing.",
  build_fortress_fund:
    "Fortress targets combine 30-day median daily balance with rolling 60-90 day savings and cash-flow trends to confirm durable reserve coverage.",
  collect_missing_facts:
    "Missing input prompts are prioritized by fiduciary impact. Completing high-priority facts raises recommendation confidence and option quality.",
  keep_momentum:
    "Maintenance health is reviewed each pay cycle and confirmed with rolling 60-90 day trends so progress stays stable, not just briefly improved.",
};

const STEP_CHECKLIST: Record<RecommendationId, string[]> = {
  connect_accounts: [
    "Link your primary checking account first for immediate cash flow accuracy.",
    "Confirm institution sync status and reconnect any failed links.",
    "Refresh Home to verify confidence improvements.",
  ],
  stabilize_cash_flow: [
    "Identify the top 2 recurring expense categories driving the gap.",
    "Set one immediate reduction and one structural reduction.",
    "Recheck cash flow after the next pay cycle.",
  ],
  build_deductible_shield: [
    "Set a shield target equal to deductible or policy floor (whichever is higher).",
    "Automate a transfer toward that target on each paycheck.",
    "Pause lower-priority optimization until target is met.",
  ],
  close_protection_gap: [
    "Review current health, disability, and life coverage status.",
    "Prioritize the highest-risk gap first (especially with dependents).",
    "Update facts after coverage changes to refresh recommendations.",
  ],
  capture_employer_match: [
    "Confirm your employer match percentage and vesting details.",
    "Adjust contribution to at least the match threshold.",
    "Verify updated contribution appears in your next payroll cycle.",
  ],
  tackle_toxic_debt: [
    "List debt balances and APRs to confirm priority order.",
    "Apply extra payments to the first toxic debt target.",
    "Roll freed payment amount into the next debt after payoff.",
  ],
  build_fortress_fund: [
    "Set a reserve target based on your current stability profile.",
    "Automate recurring savings toward the reserve target.",
    "Re-evaluate monthly burn to keep the target current.",
  ],
  collect_missing_facts: [
    "Open onboarding and complete the highest-priority missing inputs first.",
    "Save each input and recheck coverage confidence.",
    "Review the updated suggested next step.",
  ],
  keep_momentum: [
    "Review your roadmap once per pay period.",
    "Reconnect any stale or disconnected accounts quickly.",
    "Update profile facts when your situation changes.",
  ],
};

export function getSecondOrderEffects(
  recommendationId: RecommendationId,
): StepEffects {
  return STEP_EFFECTS[recommendationId];
}

export function getMeasurementCopy(recommendationId: RecommendationId): string {
  return STEP_MEASUREMENT_COPY[recommendationId];
}

export function getChecklist(recommendationId: RecommendationId): string[] {
  return STEP_CHECKLIST[recommendationId];
}

export function inferImpact(
  recommendation: Recommendation,
): "Low" | "Medium" | "High" {
  if (recommendation.priority >= 90) return "High";
  if (recommendation.priority >= 60) return "Medium";
  return "Low";
}

export function inferEffort(
  recommendation: Recommendation,
): "Low" | "Medium" | "High" {
  if (recommendation.requiredFacts.length >= 4) return "High";
  if (recommendation.requiredFacts.length >= 2) return "Medium";
  return "Low";
}
