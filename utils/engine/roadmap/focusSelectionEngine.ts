import type {
  CurrentFocusCode,
  DerivedPlanningSignals,
  FinancialFacts,
  GoalTargets,
  RoadmapStageId,
} from "@/utils/engine/types";

export const CURRENT_FOCUS_METADATA: Record<
  CurrentFocusCode,
  { label: string; description: string }
> = {
  cover_essentials: {
    label: "Cover essentials first",
    description:
      "Protect the bills and expenses that keep day-to-day life stable.",
  },
  catch_up_bills: {
    label: "Catch up on the most urgent bills",
    description:
      "Use available cash to clear the obligations most likely to trigger fees or missed payments.",
  },
  stop_overdrafts: {
    label: "Stop overdrafts",
    description:
      "Create enough breathing room to avoid repeat fees and cash-flow shocks.",
  },
  stabilize_cash_flow: {
    label: "Create consistent monthly breathing room",
    description:
      "Reduce recurring outflow and make your monthly margin more reliable.",
  },
  starter_buffer: {
    label: "Build your starter buffer",
    description:
      "Reach the first cash target that makes the next surprise less disruptive.",
  },
  cash_reserve_habit: {
    label: "Make saving automatic",
    description:
      "Turn buffer-building into a repeatable habit before the plan gets more complex.",
  },
  increase_to_match: {
    label: "Capture the full employer match",
    description: "Secure the guaranteed employer dollars available to you.",
  },
  debt_avalanche: {
    label: "Highest-interest balance first",
    description:
      "Focus extra payments on the debt creating the biggest drag on progress.",
  },
  debt_snowball: {
    label: "Smallest balance first",
    description:
      "Use quick wins to build momentum while staying current on every debt.",
  },
  debt_consolidation_review: {
    label: "Review consolidation options",
    description:
      "Check whether lowering borrowing costs could accelerate payoff without adding risk.",
  },
  full_emergency_fund: {
    label: "Build your fuller safety net",
    description:
      "Increase cash reserves to the level your situation calls for.",
  },
  moderate_debt_paydown: {
    label: "Chip away at moderate-rate debt",
    description:
      "Keep building resilience while reducing debt that still slows progress.",
  },
  moderate_debt_vs_saving_tradeoff: {
    label: "Balance buffer growth and debt payoff",
    description:
      "Split new progress dollars between resilience and debt drag reduction.",
  },
  near_term_goal_fund: {
    label: "Fund your near-term goal",
    description:
      "Build the money you will need soon in a liquid, lower-volatility bucket.",
  },
  goal_bucket_build: {
    label: "Build a goal bucket",
    description: "Create a dedicated savings lane for what is coming next.",
  },
  retirement_rate_ramp: {
    label: "Raise your retirement saving rate",
    description:
      "Increase long-term saving now that the major foundations are in place.",
  },
  increase_retirement_savings: {
    label: "Increase retirement savings",
    description:
      "Direct more surplus toward long-term growth and tax-advantaged savings.",
  },
  hsa_funding: {
    label: "Fund your HSA",
    description:
      "Use tax-advantaged health savings when that benefit becomes available.",
  },
  education_savings: {
    label: "Build education savings",
    description:
      "Support a dedicated education goal without undermining core stability.",
  },
  taxable_investing: {
    label: "Invest outside retirement accounts",
    description:
      "Put extra long-term dollars to work after higher-priority shelters are addressed.",
  },
  advanced_tax_optimization: {
    label: "Optimize taxes and allocations",
    description:
      "Refine higher-order planning after the main foundations are already strong.",
  },
};

export function selectCurrentFocus(args: {
  stage: RoadmapStageId;
  facts: FinancialFacts;
  signals: DerivedPlanningSignals;
  goalTargets: GoalTargets;
}): CurrentFocusCode {
  const { stage, facts, signals, goalTargets } = args;

  switch (stage) {
    case "get_stable":
      if (facts.recentLatePaymentSignal) return "catch_up_bills";
      if (facts.recentOverdraftSignal) return "stop_overdrafts";
      if ((facts.avgMonthlyNetCashFlow ?? 0) < 0) return "stabilize_cash_flow";
      return "cover_essentials";
    case "build_your_buffer":
      return signals.behaviorSupportNeed === "high"
        ? "cash_reserve_habit"
        : "starter_buffer";
    case "capture_free_money":
      return "increase_to_match";
    case "clear_expensive_debt":
      return signals.guidanceSignals.pathPreference === "stick_with_it"
        ? "debt_snowball"
        : "debt_avalanche";
    case "strengthen_your_safety_net":
      return (facts.emergencyFundMonths ?? 0) < 2
        ? "full_emergency_fund"
        : facts.hasModerateDebt
          ? "moderate_debt_vs_saving_tradeoff"
          : "moderate_debt_paydown";
    case "fund_whats_next":
      return goalTargets.hasNearTermGoal
        ? "near_term_goal_fund"
        : "retirement_rate_ramp";
    case "grow_and_optimize":
    default:
      return "increase_retirement_savings";
  }
}
