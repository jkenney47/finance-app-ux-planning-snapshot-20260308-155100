import type { DecisionInput, DecisionOutput } from "@/utils/contracts/decision";

/**
 * @deprecated Keep for legacy contract/test compatibility only.
 * Canonical recommendation logic lives in utils/domain/fme/engine.ts.
 */
export function evaluateNextStep(input: DecisionInput): DecisionOutput {
  const {
    hasLinkedAccounts,
    emergencyFundMonths,
    employerMatchEligible,
    hasHighAprDebt,
    customGoalCount,
  } = input;

  if (!hasLinkedAccounts) {
    return {
      phase: "connect_accounts",
      title: "Link your financial accounts",
      description:
        "Connect your bank and credit accounts to get tailored guidance and live updates on your finances.",
      actionLabel: "Link accounts",
      analyticsEvent: "next_step_link_accounts",
    };
  }

  if (emergencyFundMonths < 3) {
    return {
      phase: "build_emergency_fund",
      title: "Boost your emergency savings",
      description:
        "Set aside at least 3 months of expenses to buffer against surprises and stay on track.",
      actionLabel: "Plan emergency fund",
      analyticsEvent: "next_step_emergency_fund",
    };
  }

  if (employerMatchEligible) {
    return {
      phase: "invest_employer_match",
      title: "Capture your employer match",
      description:
        "Increase your retirement contributions to at least the match threshold so you are not leaving money on the table.",
      actionLabel: "Adjust contributions",
      analyticsEvent: "next_step_employer_match",
    };
  }

  if (hasHighAprDebt) {
    return {
      phase: "focus_debt",
      title: "Tackle high-interest debt",
      description:
        "Prioritize payments on debts with APRs over 10% to reduce interest costs and free up cash flow.",
      actionLabel: "Create payoff plan",
      analyticsEvent: "next_step_high_apr_debt",
    };
  }

  if (customGoalCount === 0) {
    return {
      phase: "set_goal",
      title: "Create your next goal",
      description:
        "Set a savings or payoff goal to see forecasts, progress tracking, and tailored next actions.",
      actionLabel: "Create goal",
      analyticsEvent: "next_step_set_goal",
    };
  }

  return {
    phase: "set_goal",
    title: "Keep momentum going",
    description:
      "You are on track. Review your goals or add a new milestone to stay focused.",
    actionLabel: "Review goals",
    analyticsEvent: "next_step_review_goals",
  };
}
