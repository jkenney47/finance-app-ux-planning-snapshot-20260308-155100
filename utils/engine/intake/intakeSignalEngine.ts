import { engineConfig } from "@/utils/engine/config/engineConfig";
import type {
  DerivedPlanningSignals,
  IntakeAnswers,
  MajorGoalTiming,
} from "@/utils/engine/types";

function majorGoalTimingToMonths(
  timing: MajorGoalTiming | undefined,
): number | undefined {
  switch (timing) {
    case "under_1_year":
      return 12;
    case "one_to_three_years":
      return 24;
    case "three_to_five_years":
      return 48;
    case "five_plus_years":
      return 72;
    default:
      return undefined;
  }
}

function clampWeight(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function derivePlanningSignals(
  intake: IntakeAnswers,
): DerivedPlanningSignals {
  const goalTimingMonths = majorGoalTimingToMonths(intake.majorGoalTiming);
  const hasDependents = intake.dependentsStatus !== "none";
  const variableIncome =
    intake.incomeType === "self_employed" ||
    intake.incomeType === "multiple_sources" ||
    intake.incomeType === "variable";
  const lowPredictability =
    intake.incomePredictability === "not_very_predictable";
  const stabilityHigh =
    intake.monthlySituation === "behind_or_juggling" ||
    intake.essentialsCoverage === "not_consistent" ||
    intake.urgentArea === "monthly_expenses" ||
    intake.mainStruggles.some((value) =>
      ["overspending", "inconsistent_income", "feeling_behind"].includes(value),
    );
  const debtUrgent =
    intake.primaryHelpGoal === "debt_payoff" ||
    intake.urgentArea === "debt" ||
    intake.mainStruggles.includes("debt_stress") ||
    intake.biggestFear === "wrong_priority";
  const liquidityRiskCount =
    Number(variableIncome) +
    Number(lowPredictability) +
    Number(hasDependents) +
    Number((goalTimingMonths ?? Number.POSITIVE_INFINITY) <= 36) +
    Number(
      intake.housingStatus === "mortgage" &&
        intake.monthlySituation === "current_but_tight",
    );
  const majorEventPressure = intake.upcomingEvents.some((event) =>
    [
      "home_purchase",
      "moving",
      "wedding",
      "children",
      "education",
      "large_purchase",
    ].includes(event),
  );
  const behaviorSupportHigh =
    intake.pastAttempts.includes("avoidance") ||
    intake.attemptWhyNotEnough.includes("hard_to_stay_consistent") ||
    intake.pathPreference === "stick_with_it";
  const explanationHigh =
    intake.biggestFear === "missing_something" ||
    intake.guidanceDirectness === "show_options" ||
    intake.attemptWhyNotEnough.some((value) =>
      ["didnt_trust", "still_no_next_step"].includes(value),
    );

  const targetEmergencyMonths =
    liquidityRiskCount >= 2
      ? engineConfig.buffers.emergencyMonthsHigh
      : liquidityRiskCount === 1
        ? engineConfig.buffers.emergencyMonthsMedium
        : engineConfig.buffers.emergencyMonthsBase;

  return {
    priorityWeights: {
      stabilization: clampWeight(
        0.4 +
          Number(stabilityHigh) * 0.35 +
          Number(intake.primaryHelpGoal === "spending_control") * 0.1,
      ),
      debt: clampWeight(
        0.25 +
          Number(debtUrgent) * 0.4 +
          Number(intake.primaryHelpGoal === "debt_payoff") * 0.2,
      ),
      emergencyFund: clampWeight(
        0.3 +
          Number(intake.primaryHelpGoal === "emergency_fund") * 0.25 +
          Number(liquidityRiskCount >= 1) * 0.2,
      ),
      majorGoals: clampWeight(
        0.2 +
          Number(intake.hasMajorGoal) * 0.35 +
          Number(majorEventPressure) * 0.2,
      ),
      retirement: clampWeight(
        0.15 +
          Number(intake.primaryHelpGoal === "retirement") * 0.3 +
          Number(intake.employerMatch === "yes") * 0.1,
      ),
      clarity: clampWeight(
        0.3 +
          Number(intake.primaryHelpGoal === "clarity") * 0.4 +
          Number(intake.mainStruggles.includes("prioritization")) * 0.15,
      ),
    },
    urgencyFlags: {
      potentialInstability: stabilityHigh,
      likelyCashFlowStress:
        intake.monthlySituation === "behind_or_juggling" ||
        intake.essentialsCoverage === "tight" ||
        intake.essentialsCoverage === "not_consistent",
      likelyDebtStress: debtUrgent,
    },
    goalSignals: {
      hasMajorGoal: intake.hasMajorGoal,
      goalType: intake.majorGoalType,
      goalTimingMonths,
      nearTermGoal:
        intake.hasMajorGoal &&
        (goalTimingMonths ?? Number.POSITIVE_INFINITY) <=
          engineConfig.goals.shortTermGoalMaxMonths,
    },
    householdSignals: {
      hasDependents,
      housingType: intake.housingStatus,
    },
    incomeSignals: {
      variableIncome,
      lowPredictability,
    },
    guidanceSignals: {
      directness: intake.guidanceDirectness,
      pathPreference: intake.pathPreference,
      reassuranceFocus: intake.biggestFear,
    },
    behaviorSignals: {
      simplificationNeeded:
        intake.attemptWhyNotEnough.includes("too_complicated"),
      consistencyChallenge: behaviorSupportHigh,
      organizationChallenge: intake.mainStruggles.includes("organization"),
    },
    bufferSignals: {
      recommendedStarterBufferMode:
        liquidityRiskCount >= 1 ? "elevated" : "standard",
      recommendedFullBufferMonths: targetEmergencyMonths,
    },
    linkingSignals: {
      prioritizeCashFlowAccounts:
        intake.urgentArea === "monthly_expenses" ||
        intake.primaryHelpGoal === "spending_control",
      prioritizeDebtAccounts:
        debtUrgent || intake.primaryHelpGoal === "debt_payoff",
      prioritizeInvestmentAccounts:
        intake.primaryHelpGoal === "retirement" ||
        intake.employerMatch === "yes",
      prioritizeHousingAccounts:
        intake.housingStatus === "mortgage" ||
        intake.majorGoalType === "home_purchase",
    },
    stabilizationPriority: stabilityHigh ? "high" : "medium",
    debtUrgencySignal: debtUrgent ? "high" : "medium",
    liquidityNeed:
      liquidityRiskCount >= 2
        ? "high"
        : liquidityRiskCount === 1
          ? "medium"
          : "low",
    goalPressure:
      intake.hasMajorGoal && (goalTimingMonths ?? 99) <= 36
        ? "high"
        : intake.hasMajorGoal || majorEventPressure
          ? "medium"
          : "none",
    incomeVolatility:
      variableIncome && lowPredictability
        ? "high"
        : variableIncome
          ? "medium"
          : "low",
    behaviorSupportNeed: behaviorSupportHigh ? "high" : "medium",
    explanationNeed: explanationHigh ? "high" : "medium",
    autonomyPreference:
      intake.guidanceDirectness === "recommend_only"
        ? "low"
        : intake.guidanceDirectness === "recommend_with_tradeoffs"
          ? "medium"
          : "high",
  };
}
