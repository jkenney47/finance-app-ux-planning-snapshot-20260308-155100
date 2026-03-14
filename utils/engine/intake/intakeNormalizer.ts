import type { OnboardingState } from "@/utils/contracts/onboarding";
import type {
  AttemptWhyNotEnough,
  BiggestFear,
  DependentsStatus,
  EmployerMatchStatus,
  EssentialsCoverage,
  FullMatchContributionStatus,
  GuidanceDirectness,
  HouseholdStatus,
  HousingStatus,
  IncomePredictability,
  IncomeType,
  IntakeAnswers,
  MainStruggle,
  MajorGoalTiming,
  MajorGoalType,
  MonthlySituation,
  PastAttempt,
  PathPreference,
  PrimaryHelpGoal,
  ProgressHorizon,
  UpcomingEvent,
  UrgentArea,
} from "@/utils/engine/types";

function pickEnum<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value && allowed.includes(value as T)) {
    return value as T;
  }
  return fallback;
}

function pickEnumArray<T extends string>(
  values: string[] | undefined,
  allowed: readonly T[],
): T[] {
  if (!values) return [];
  return values.filter((value): value is T => allowed.includes(value as T));
}

export function normalizeIntakeAnswers(
  raw: OnboardingState["intake"],
): IntakeAnswers {
  const primaryHelpGoal = pickEnum<PrimaryHelpGoal>(
    raw.primaryHelpGoal,
    [
      "spending_control",
      "debt_payoff",
      "emergency_fund",
      "home_purchase",
      "retirement",
      "clarity",
      "other",
    ],
    "clarity",
  );

  const urgentArea = pickEnum<UrgentArea>(
    raw.urgentArea,
    [
      "monthly_expenses",
      "debt",
      "savings",
      "major_goal",
      "long_term_decisions",
      "clarity",
    ],
    "clarity",
  );

  return {
    primaryHelpGoal,
    primaryHelpGoalOtherText: raw.primaryHelpGoalOtherText?.trim() || undefined,
    urgentArea,
    progressHorizon: pickEnum<ProgressHorizon>(
      raw.progressHorizon,
      ["within_3_months", "within_1_year", "next_few_years", "long_term"],
      "within_1_year",
    ),
    hasMajorGoal: Boolean(raw.hasMajorGoal),
    majorGoalType: raw.hasMajorGoal
      ? pickEnum<MajorGoalType>(
          raw.majorGoalType,
          [
            "home_purchase",
            "retirement",
            "education",
            "career_change",
            "family_children",
            "large_purchase",
            "other",
          ],
          "other",
        )
      : undefined,
    majorGoalTiming: raw.hasMajorGoal
      ? pickEnum<MajorGoalTiming>(
          raw.majorGoalTiming,
          [
            "under_1_year",
            "one_to_three_years",
            "three_to_five_years",
            "five_plus_years",
          ],
          "one_to_three_years",
        )
      : undefined,
    monthlySituation: pickEnum<MonthlySituation>(
      raw.monthlySituation,
      [
        "current_with_breathing_room",
        "current_but_tight",
        "behind_or_juggling",
        "unsure",
      ],
      "unsure",
    ),
    essentialsCoverage: pickEnum<EssentialsCoverage>(
      raw.essentialsCoverage,
      ["comfortable", "tight", "not_consistent", "unsure"],
      "unsure",
    ),
    mainStruggles: pickEnumArray<MainStruggle>(raw.mainStruggles, [
      "prioritization",
      "overspending",
      "debt_stress",
      "inconsistent_income",
      "inconsistent_saving",
      "investing_uncertainty",
      "organization",
      "feeling_behind",
      "other",
    ]),
    pastAttempts: pickEnumArray<PastAttempt>(raw.pastAttempts, [
      "budgeting_apps",
      "spreadsheets",
      "friends_family",
      "financial_advisor",
      "diy",
      "avoidance",
      "other",
    ]),
    attemptWhyNotEnough: pickEnumArray<AttemptWhyNotEnough>(
      raw.attemptWhyNotEnough,
      [
        "too_complicated",
        "too_time_consuming",
        "not_personalized",
        "didnt_trust",
        "hard_to_stay_consistent",
        "still_no_next_step",
        "situation_kept_changing",
      ],
    ),
    householdStatus: pickEnum<HouseholdStatus>(
      raw.householdStatus,
      ["single", "partnered", "married", "prefer_not_to_say"],
      "prefer_not_to_say",
    ),
    dependentsStatus: pickEnum<DependentsStatus>(
      raw.dependentsStatus,
      ["none", "children", "parents_family", "other_dependents"],
      "none",
    ),
    housingStatus: pickEnum<HousingStatus>(
      raw.housingStatus,
      ["rent", "mortgage", "own_outright", "family_other"],
      "rent",
    ),
    incomeType: pickEnum<IncomeType>(
      raw.incomeType,
      ["salaried", "hourly", "self_employed", "multiple_sources", "variable"],
      "salaried",
    ),
    incomePredictability: raw.incomePredictability
      ? pickEnum<IncomePredictability>(
          raw.incomePredictability,
          ["very_predictable", "somewhat_predictable", "not_very_predictable"],
          "somewhat_predictable",
        )
      : undefined,
    employerMatch: pickEnum<EmployerMatchStatus>(
      raw.employerMatch === "not_sure" ? "unknown" : raw.employerMatch,
      ["yes", "no", "unknown"],
      "unknown",
    ),
    fullMatchContribution: raw.fullMatchContribution
      ? pickEnum<FullMatchContributionStatus>(
          raw.fullMatchContribution === "not_sure"
            ? "unknown"
            : raw.fullMatchContribution,
          ["yes", "no", "unknown"],
          "unknown",
        )
      : undefined,
    upcomingEvents: pickEnumArray<UpcomingEvent>(raw.upcomingEvents, [
      "home_purchase",
      "moving",
      "wedding",
      "children",
      "education",
      "career_change",
      "large_purchase",
      "none",
    ]),
    guidanceDirectness: pickEnum<GuidanceDirectness>(
      raw.guidanceDirectness,
      ["recommend_only", "recommend_with_tradeoffs", "show_options"],
      "recommend_with_tradeoffs",
    ),
    pathPreference: pickEnum<PathPreference>(
      raw.pathPreference,
      ["math_first", "stick_with_it", "balanced"],
      "balanced",
    ),
    biggestFear: pickEnum<BiggestFear>(
      raw.biggestFear,
      [
        "wrong_priority",
        "not_saving_enough",
        "delaying_investing",
        "overcommitting_goal",
        "missing_something",
        "not_sure",
      ],
      "missing_something",
    ),
  };
}
