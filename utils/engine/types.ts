export type PrimaryHelpGoal =
  | "spending_control"
  | "debt_payoff"
  | "emergency_fund"
  | "home_purchase"
  | "retirement"
  | "clarity"
  | "other";

export type UrgentArea =
  | "monthly_expenses"
  | "debt"
  | "savings"
  | "major_goal"
  | "long_term_decisions"
  | "clarity";

export type ProgressHorizon =
  | "within_3_months"
  | "within_1_year"
  | "next_few_years"
  | "long_term";

export type MajorGoalType =
  | "home_purchase"
  | "retirement"
  | "education"
  | "career_change"
  | "family_children"
  | "large_purchase"
  | "other";

export type MajorGoalTiming =
  | "under_1_year"
  | "one_to_three_years"
  | "three_to_five_years"
  | "five_plus_years";

export type MonthlySituation =
  | "current_with_breathing_room"
  | "current_but_tight"
  | "behind_or_juggling"
  | "unsure";

export type EssentialsCoverage =
  | "comfortable"
  | "tight"
  | "not_consistent"
  | "unsure";

export type MainStruggle =
  | "prioritization"
  | "overspending"
  | "debt_stress"
  | "inconsistent_income"
  | "inconsistent_saving"
  | "investing_uncertainty"
  | "organization"
  | "feeling_behind"
  | "other";

export type PastAttempt =
  | "budgeting_apps"
  | "spreadsheets"
  | "friends_family"
  | "financial_advisor"
  | "diy"
  | "avoidance"
  | "other";

export type AttemptWhyNotEnough =
  | "too_complicated"
  | "too_time_consuming"
  | "not_personalized"
  | "didnt_trust"
  | "hard_to_stay_consistent"
  | "still_no_next_step"
  | "situation_kept_changing";

export type HouseholdStatus =
  | "single"
  | "partnered"
  | "married"
  | "prefer_not_to_say";

export type DependentsStatus =
  | "none"
  | "children"
  | "parents_family"
  | "other_dependents";

export type HousingStatus =
  | "rent"
  | "mortgage"
  | "own_outright"
  | "family_other";

export type IncomeType =
  | "salaried"
  | "hourly"
  | "self_employed"
  | "multiple_sources"
  | "variable";

export type IncomePredictability =
  | "very_predictable"
  | "somewhat_predictable"
  | "not_very_predictable";

export type EmployerMatchStatus = "yes" | "no" | "unknown";
export type FullMatchContributionStatus = "yes" | "no" | "unknown";

export type UpcomingEvent =
  | "home_purchase"
  | "moving"
  | "wedding"
  | "children"
  | "education"
  | "career_change"
  | "large_purchase"
  | "none";

export type GuidanceDirectness =
  | "recommend_only"
  | "recommend_with_tradeoffs"
  | "show_options";

export type PathPreference = "math_first" | "stick_with_it" | "balanced";

export type BiggestFear =
  | "wrong_priority"
  | "not_saving_enough"
  | "delaying_investing"
  | "overcommitting_goal"
  | "missing_something"
  | "not_sure";

export type IntakeAnswers = {
  primaryHelpGoal: PrimaryHelpGoal;
  primaryHelpGoalOtherText?: string;
  urgentArea: UrgentArea;
  progressHorizon: ProgressHorizon;
  hasMajorGoal: boolean;
  majorGoalType?: MajorGoalType;
  majorGoalTiming?: MajorGoalTiming;
  monthlySituation: MonthlySituation;
  essentialsCoverage: EssentialsCoverage;
  mainStruggles: MainStruggle[];
  pastAttempts: PastAttempt[];
  attemptWhyNotEnough: AttemptWhyNotEnough[];
  householdStatus: HouseholdStatus;
  dependentsStatus: DependentsStatus;
  housingStatus: HousingStatus;
  incomeType: IncomeType;
  incomePredictability?: IncomePredictability;
  employerMatch: EmployerMatchStatus;
  fullMatchContribution?: FullMatchContributionStatus;
  upcomingEvents: UpcomingEvent[];
  guidanceDirectness: GuidanceDirectness;
  pathPreference: PathPreference;
  biggestFear: BiggestFear;
};

export type DerivedPlanningSignals = {
  priorityWeights: {
    stabilization: number;
    debt: number;
    emergencyFund: number;
    majorGoals: number;
    retirement: number;
    clarity: number;
  };
  urgencyFlags: {
    potentialInstability: boolean;
    likelyCashFlowStress: boolean;
    likelyDebtStress: boolean;
  };
  goalSignals: {
    hasMajorGoal: boolean;
    goalType?: MajorGoalType;
    goalTimingMonths?: number;
    nearTermGoal: boolean;
  };
  householdSignals: {
    hasDependents: boolean;
    housingType: HousingStatus;
  };
  incomeSignals: {
    variableIncome: boolean;
    lowPredictability: boolean;
  };
  guidanceSignals: {
    directness: GuidanceDirectness;
    pathPreference: PathPreference;
    reassuranceFocus: BiggestFear;
  };
  behaviorSignals: {
    simplificationNeeded: boolean;
    consistencyChallenge: boolean;
    organizationChallenge: boolean;
  };
  bufferSignals: {
    recommendedStarterBufferMode: "standard" | "elevated";
    recommendedFullBufferMonths: number;
  };
  linkingSignals: {
    prioritizeCashFlowAccounts: boolean;
    prioritizeDebtAccounts: boolean;
    prioritizeInvestmentAccounts: boolean;
    prioritizeHousingAccounts: boolean;
  };
  stabilizationPriority: "low" | "medium" | "high";
  debtUrgencySignal: "low" | "medium" | "high";
  liquidityNeed: "low" | "medium" | "high";
  goalPressure: "none" | "medium" | "high";
  incomeVolatility: "low" | "medium" | "high";
  behaviorSupportNeed: "low" | "medium" | "high";
  explanationNeed: "low" | "medium" | "high";
  autonomyPreference: "low" | "medium" | "high";
};

export type LinkedAccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "loan"
  | "mortgage"
  | "retirement"
  | "brokerage"
  | "other";

export type LinkedAccount = {
  accountId: string;
  institutionId: string;
  type: LinkedAccountType;
  subtype?: string;
  name?: string;
  balanceCurrent?: number;
  balanceAvailable?: number;
  apr?: number | null;
  minimumPayment?: number | null;
  creditLimit?: number | null;
  lastUpdatedAt?: string;
};

export type Transaction = {
  transactionId: string;
  accountId: string;
  date: string;
  amount: number;
  direction: "inflow" | "outflow";
  merchantName?: string;
  categoryPrimary?: string;
  categoryDetailed?: string;
  isPending?: boolean;
  isRecurring?: boolean;
};

export type LinkedAccountSnapshot = {
  accounts: LinkedAccount[];
  transactions: Transaction[];
};

export type DomainCoverageStatus = "none" | "thin" | "moderate" | "strong";

export type DomainCoverage = {
  cashflow: DomainCoverageStatus;
  debt: DomainCoverageStatus;
  liquidity: DomainCoverageStatus;
  retirement: DomainCoverageStatus;
  goals: DomainCoverageStatus;
  housing: DomainCoverageStatus;
};

export type OverallCoverageLevel = "demo" | "preliminary" | "strong";

export type CoverageAssessment = {
  overall: OverallCoverageLevel;
  domains: DomainCoverage;
  missingDataReasons: string[];
  nextBestLinkingPrompts: string[];
};

export type FinancialFacts = {
  avgMonthlyIncome?: number;
  avgMonthlyEssentialExpenses?: number;
  avgMonthlyDiscretionaryExpenses?: number;
  avgMonthlyNetCashFlow?: number;
  monthsNegativeNetCashFlowLast3?: number;
  monthsEssentialShortfallLast3?: number;
  recentOverdraftSignal?: boolean;
  recentLatePaymentSignal?: boolean;
  liquidCash?: number;
  starterBufferCoverageRatio?: number;
  emergencyFundMonths?: number | null;
  totalDebtBalance?: number;
  totalNonMortgageDebtBalance?: number;
  totalMortgageBalance?: number;
  totalMinimumDebtPayments?: number;
  highestNonMortgageApr?: number;
  highInterestDebtBalance?: number;
  moderateInterestDebtBalance?: number;
  likelyHighInterestDebtBalance?: number;
  retirementAccountBalance?: number;
  estimatedRetirementContributionRate?: number | null;
  employerMatchAvailable?: boolean | null;
  fullEmployerMatchCaptured?: boolean | null;
  activeNearTermGoal?: boolean;
  activeNearTermGoalType?: string | null;
  activeNearTermGoalMonths?: number | null;
  behindOnBills?: boolean;
  negativeMonthlyMargin?: boolean;
  starterEmergencyFundReady?: boolean;
  fullEmergencyFundReady?: boolean;
  hasExpensiveDebt?: boolean;
  hasModerateDebt?: boolean;
  nearTermGoalNeedsFunding?: boolean;
};

export type LiquidityTargets = {
  starterBufferHardFloorUsd: number;
  starterBufferPreferredUsd: number;
  stage2ExitBufferUsd: number;
  targetEmergencyMonths: number;
};

export type RetirementTargets = {
  targetContributionRate: number;
  isBelowTargetRate: boolean;
};

export type GoalTargets = {
  hasNearTermGoal: boolean;
  goalTimingMonths?: number;
};

export type RoadmapStageId =
  | "get_stable"
  | "build_your_buffer"
  | "capture_free_money"
  | "clear_expensive_debt"
  | "strengthen_your_safety_net"
  | "fund_whats_next"
  | "grow_and_optimize";

export type CurrentFocusCode =
  | "cover_essentials"
  | "catch_up_bills"
  | "stop_overdrafts"
  | "stabilize_cash_flow"
  | "starter_buffer"
  | "cash_reserve_habit"
  | "increase_to_match"
  | "debt_avalanche"
  | "debt_snowball"
  | "debt_consolidation_review"
  | "full_emergency_fund"
  | "moderate_debt_paydown"
  | "moderate_debt_vs_saving_tradeoff"
  | "near_term_goal_fund"
  | "goal_bucket_build"
  | "retirement_rate_ramp"
  | "increase_retirement_savings"
  | "hsa_funding"
  | "education_savings"
  | "taxable_investing"
  | "advanced_tax_optimization";

export type RoadmapNextAction = {
  actionId: string;
  actionType:
    | "cashflow"
    | "buffer"
    | "retirement_match"
    | "debt"
    | "goal_funding"
    | "retirement"
    | "optimization";
  title: string;
  recommendation: string;
  rationale: string;
  confidence: "low" | "medium" | "high";
  requiredCoverageDomains: string[];
  alternativeOptions?: Array<{
    title: string;
    tradeoff: string;
  }>;
};

export type KeyMetric = {
  label: string;
  value: string;
  rawValue?: number | null;
};

export type NumericMetric = {
  label: string;
  value: string;
  rawValue?: number | null;
  deltaLabel?: string;
  deltaRawValue?: number | null;
};

export type FinancialSnapshotPayload = {
  asOf: string;
  netWorth?: NumericMetric;
  liquidCash?: NumericMetric;
  monthlyIncome?: NumericMetric;
  monthlySpending?: NumericMetric;
  monthlySurplus?: NumericMetric;
  totalDebt?: NumericMetric;
  accountFreshness: {
    hasRecentTransactions: boolean;
    staleCategories: string[];
  };
};

export type RoadmapExplanation = {
  whyPlacedHere: string;
  reasoningBullets: string[];
  limitations: string[];
  goalImpacts: string[];
};

export type BlockedStage = {
  stageId: RoadmapStageId;
  reason: string;
};

export type RoadmapPayload = {
  overallCoverageLevel: OverallCoverageLevel;
  domainCoverage: DomainCoverage;
  currentStage: {
    id: RoadmapStageId;
    label: string;
    description: string;
  };
  currentFocus: {
    code: CurrentFocusCode;
    label: string;
    description: string;
  };
  nextAction: RoadmapNextAction;
  keyMetric: KeyMetric;
  explanation: RoadmapExplanation;
  completedStages: RoadmapStageId[];
  upcomingStages: RoadmapStageId[];
  blockedStages: BlockedStage[];
  recommendedAccountsToLink: string[];
  engineMeta: {
    generatedAt: string;
    version: string;
    thresholdsUsed: {
      highInterestAprThreshold: number;
      moderateInterestAprThreshold: number;
      targetEmergencyMonths: number;
      targetRetirementRate: number;
    };
  };
};

export type StageAssignmentResult = {
  currentStage: RoadmapStageId;
  completedStages: RoadmapStageId[];
  upcomingStages: RoadmapStageId[];
  blockedStages: BlockedStage[];
};
