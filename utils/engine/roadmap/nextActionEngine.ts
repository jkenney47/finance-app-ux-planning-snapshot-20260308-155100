import type {
  CurrentFocusCode,
  FinancialFacts,
  GoalTargets,
  LiquidityTargets,
  RoadmapNextAction,
} from "@/utils/engine/types";

function roundToNearest(value: number, step: number): number {
  return Math.max(step, Math.round(value / step) * step);
}

export function buildNextAction(args: {
  currentFocus: CurrentFocusCode;
  overallCoverageLevel: "demo" | "preliminary" | "strong";
  facts: FinancialFacts;
  liquidityTargets: LiquidityTargets;
  goalTargets: GoalTargets;
}): RoadmapNextAction {
  const {
    currentFocus,
    overallCoverageLevel,
    facts,
    liquidityTargets,
    goalTargets,
  } = args;
  const confidence = overallCoverageLevel === "strong" ? "high" : "medium";

  switch (currentFocus) {
    case "catch_up_bills":
      return {
        actionId: "catch-up-minimums",
        actionType: "cashflow",
        title: "Catch up the bills that matter most first",
        recommendation:
          "Protect essentials and get the most urgent missed payments current before adding any new financial goals.",
        rationale:
          "Recent signals point to payment stress, so the safest first move is restoring stability.",
        confidence,
        requiredCoverageDomains: ["cashflow"],
      };
    case "stop_overdrafts":
      return {
        actionId: "stop-overdrafts",
        actionType: "cashflow",
        title: "Stop repeat overdrafts",
        recommendation:
          "Create a small checking cushion and tighten the largest recurring outflows that are causing cash timing issues.",
        rationale:
          "Removing overdraft risk creates breathing room for every later step in the roadmap.",
        confidence,
        requiredCoverageDomains: ["cashflow"],
      };
    case "stabilize_cash_flow": {
      const monthlyGap = Math.abs(
        Math.min(facts.avgMonthlyNetCashFlow ?? -300, -50),
      );
      const targetReduction = roundToNearest(monthlyGap, 50);
      return {
        actionId: "stabilize-cash-flow",
        actionType: "cashflow",
        title: "Create reliable monthly breathing room",
        recommendation: `Review recurring spending and free up about $${targetReduction} per month before taking on a more advanced goal.`,
        rationale:
          "Improving monthly margin is the fastest way to lower stress and support the rest of the roadmap.",
        confidence,
        requiredCoverageDomains: ["cashflow"],
      };
    }
    case "starter_buffer": {
      const gap = Math.max(
        0,
        liquidityTargets.stage2ExitBufferUsd - (facts.liquidCash ?? 0),
      );
      const transfer = roundToNearest(Math.max(gap / 6, 50), 25);
      return {
        actionId: "starter-buffer",
        actionType: "buffer",
        title: "Reach your starter buffer",
        recommendation: `Set up an automatic transfer of about $${transfer} each pay period until your starter buffer target is covered.`,
        rationale:
          "A starter buffer reduces the chance that the next surprise sends you backward.",
        confidence,
        requiredCoverageDomains: ["liquidity", "cashflow"],
      };
    }
    case "cash_reserve_habit":
      return {
        actionId: "cash-reserve-habit",
        actionType: "buffer",
        title: "Turn saving into a habit",
        recommendation:
          "Automate a small recurring transfer into cash reserves so buffer progress happens without extra decision fatigue.",
        rationale:
          "Consistency matters more than intensity when you are still building the base layer of resilience.",
        confidence,
        requiredCoverageDomains: ["liquidity"],
      };
    case "increase_to_match":
      return {
        actionId: "increase-to-match",
        actionType: "retirement_match",
        title: "Capture the full employer match",
        recommendation:
          "Increase your workplace retirement contribution to the full employer-match level before sending new dollars elsewhere.",
        rationale:
          "Once you are stable and have a starter buffer, unused employer match is the clearest guaranteed upside available.",
        confidence,
        requiredCoverageDomains: ["retirement"],
      };
    case "debt_snowball":
      return {
        actionId: "debt-snowball",
        actionType: "debt",
        title: "Start with the smallest balance",
        recommendation:
          "Keep every minimum current, then direct extra debt payments toward the smallest balance until it is gone.",
        rationale:
          "This path trades some interest efficiency for faster visible wins and better follow-through.",
        confidence,
        requiredCoverageDomains: ["debt"],
        alternativeOptions: [
          {
            title: "Use avalanche instead",
            tradeoff:
              "Saves more interest overall by targeting the highest APR first.",
          },
        ],
      };
    case "debt_avalanche":
      return {
        actionId: "debt-avalanche",
        actionType: "debt",
        title: "Target the highest-rate balance first",
        recommendation:
          "Keep every minimum current, then send extra debt payments to the highest-interest balance first.",
        rationale:
          "High-interest debt is creating the biggest drag on progress right now.",
        confidence,
        requiredCoverageDomains: ["debt"],
        alternativeOptions: [
          {
            title: "Use snowball instead",
            tradeoff:
              "Can be easier to stick with if quick balance wins matter more than maximum interest savings.",
          },
        ],
      };
    case "full_emergency_fund":
      return {
        actionId: "full-emergency-fund",
        actionType: "buffer",
        title: "Build your fuller safety net",
        recommendation: `Keep growing cash reserves until you have about ${liquidityTargets.targetEmergencyMonths} months of essential expenses covered.`,
        rationale:
          "Your finances are no longer in acute instability, but the full safety net is not in place yet.",
        confidence,
        requiredCoverageDomains: ["liquidity", "cashflow"],
      };
    case "moderate_debt_vs_saving_tradeoff":
      return {
        actionId: "moderate-debt-tradeoff",
        actionType: "debt",
        title: "Balance resilience and moderate-rate debt",
        recommendation:
          "Keep building cash reserves while directing a portion of surplus toward moderate-interest debt that is still slowing progress.",
        rationale:
          "This is a deliberate tradeoff stage rather than an all-or-nothing debt sprint.",
        confidence,
        requiredCoverageDomains: ["debt", "liquidity"],
      };
    case "moderate_debt_paydown":
      return {
        actionId: "moderate-debt-paydown",
        actionType: "debt",
        title: "Reduce moderate-interest debt",
        recommendation:
          "Continue minimum payments everywhere, then use extra dollars to shrink the remaining moderate-interest balances.",
        rationale:
          "The expensive debt phase is behind you, but moderate-rate balances still reduce flexibility.",
        confidence,
        requiredCoverageDomains: ["debt"],
      };
    case "near_term_goal_fund": {
      const monthlyGoalContribution = roundToNearest(
        Math.max((facts.avgMonthlyNetCashFlow ?? 300) * 0.4, 100),
        25,
      );
      const goalHorizon =
        goalTargets.goalTimingMonths != null
          ? `over the next ${goalTargets.goalTimingMonths} months`
          : "on your current timeline";
      return {
        actionId: "near-term-goal-fund",
        actionType: "goal_funding",
        title: "Fund your near-term goal in cash",
        recommendation: `Set aside about $${monthlyGoalContribution} each month in a liquid account so this goal stays on track ${goalHorizon}.`,
        rationale:
          "Near-term goals need reliable liquidity more than market risk.",
        confidence,
        requiredCoverageDomains: ["goals", "liquidity"],
      };
    }
    case "retirement_rate_ramp":
    case "increase_retirement_savings":
      return {
        actionId: "retirement-rate-ramp",
        actionType: "retirement",
        title: "Increase long-term saving",
        recommendation:
          "Raise your retirement contribution rate by 1 to 2 percentage points while keeping your core buffers intact.",
        rationale:
          "The foundational stages are in place, so additional long-term saving is the next best use of surplus.",
        confidence,
        requiredCoverageDomains: ["retirement"],
      };
    default:
      return {
        actionId: "keep-momentum",
        actionType: "optimization",
        title: "Keep momentum",
        recommendation:
          "Continue the current plan and use each new dollar to reinforce the stage you are in now.",
        rationale:
          "The current roadmap still has the strongest evidence behind it.",
        confidence,
        requiredCoverageDomains: ["cashflow"],
      };
  }
}
