import type {
  CoverageAssessment,
  CurrentFocusCode,
  DerivedPlanningSignals,
  FinancialFacts,
  IntakeAnswers,
  RoadmapExplanation,
  RoadmapStageId,
} from "@/utils/engine/types";

export function buildExplanation(args: {
  stage: RoadmapStageId;
  currentFocus: CurrentFocusCode;
  intake: IntakeAnswers;
  signals: DerivedPlanningSignals;
  coverage: CoverageAssessment;
  facts: FinancialFacts;
}): RoadmapExplanation {
  const { stage, currentFocus, intake, signals, coverage, facts } = args;
  const reasoningBullets: string[] = [];
  const goalImpacts: string[] = [];

  if (stage === "get_stable") {
    reasoningBullets.push(
      "Recent cash-flow signals suggest monthly stability needs attention before the roadmap moves to later goals.",
    );
  }

  if ((facts.highInterestDebtBalance ?? 0) > 0) {
    reasoningBullets.push(
      "High-interest debt is creating one of the biggest drags on progress.",
    );
  }

  if ((facts.emergencyFundMonths ?? 0) < 1 && stage !== "get_stable") {
    reasoningBullets.push(
      "Liquid cash is still below the level that provides reliable protection from the next surprise.",
    );
  }

  if (intake.primaryHelpGoal === "debt_payoff") {
    reasoningBullets.push(
      "You said debt payoff is a priority, so the roadmap is highlighting debt-related tradeoffs early.",
    );
  }

  if (signals.goalSignals.nearTermGoal && intake.majorGoalType) {
    goalImpacts.push(
      `Your ${intake.majorGoalType.replace(/_/g, " ")} goal increases the amount of cash the roadmap prefers to keep liquid.`,
    );
  }

  if (stage === "clear_expensive_debt" && coverage.domains.debt !== "strong") {
    reasoningBullets.push(
      "Debt guidance is conservative because some liability details are still incomplete.",
    );
  }

  const whyPlacedHere =
    stage === "get_stable"
      ? "Based on your linked cash-flow signals and the priorities you shared, the first priority is creating reliable monthly breathing room."
      : stage === "clear_expensive_debt"
        ? "Based on your linked accounts and the priorities you shared, reducing expensive debt is the next move most likely to improve progress."
        : `Based on what you shared and the financial coverage available today, the roadmap starts with ${currentFocus.replace(/_/g, " ")}.`;

  return {
    whyPlacedHere,
    reasoningBullets: reasoningBullets.slice(0, 4),
    limitations: coverage.missingDataReasons,
    goalImpacts,
  };
}
