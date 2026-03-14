export type FactSource = "manual" | "linked" | "derived" | "inferred";

export type FactPriority = "high" | "medium" | "low";

export type IncomeStability = "stable" | "variable";

export type HouseholdIncomeStructure = "single" | "dual";

export type StressScore = "low" | "medium" | "high";

export type FinancialDebtType =
  | "credit_card"
  | "student_loan"
  | "auto_loan"
  | "mortgage"
  | "personal_loan"
  | "other";

export type FinancialDebt = {
  id: string;
  name: string;
  type: FinancialDebtType;
  apr: number;
  balance: number;
  minimumPayment?: number;
  interestTaxDeductible?: boolean;
};

export type FactKey =
  | "hasLinkedAccounts"
  | "incomeMonthlyNet"
  | "burnRateMonthly"
  | "liquidSavings"
  | "highestInsuranceDeductible"
  | "incomeStability"
  | "householdIncomeStructure"
  | "dependentsCount"
  | "hasHealthInsurance"
  | "hasDisabilityInsurance"
  | "hasTermLifeInsurance"
  | "employerMatchEligible"
  | "employerMatchPercent"
  | "retirementContributionPercent"
  | "stressScore"
  | "cashFlowTight"
  | "debts";

export type FactValueByKey = {
  hasLinkedAccounts: boolean;
  incomeMonthlyNet: number;
  burnRateMonthly: number;
  liquidSavings: number;
  highestInsuranceDeductible: number;
  incomeStability: IncomeStability;
  householdIncomeStructure: HouseholdIncomeStructure;
  dependentsCount: number;
  hasHealthInsurance: boolean;
  hasDisabilityInsurance: boolean;
  hasTermLifeInsurance: boolean;
  employerMatchEligible: boolean;
  employerMatchPercent: number;
  retirementContributionPercent: number;
  stressScore: StressScore;
  cashFlowTight: boolean;
  debts: FinancialDebt[];
};

export type FactRecord<K extends FactKey> = {
  key: K;
  value: FactValueByKey[K];
  source: FactSource;
  asOf: string;
  confidence: number;
};

export type FactsSnapshot = {
  [K in FactKey]?: FactRecord<K>;
};

export type FactRequest = {
  key: FactKey;
  reason: string;
  priority: FactPriority;
};

export function makeFact<K extends FactKey>(
  key: K,
  value: FactValueByKey[K],
  source: FactSource = "manual",
  confidence = 1,
  asOf = new Date().toISOString(),
): FactRecord<K> {
  return {
    key,
    value,
    source,
    asOf,
    confidence,
  };
}
