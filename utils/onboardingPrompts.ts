import type { FactKey } from "@/utils/contracts/facts";

type FactPrompt = {
  title: string;
  description: string;
};

const FACT_PROMPTS: Record<FactKey, FactPrompt> = {
  incomeMonthlyNet: {
    title: "Monthly net income",
    description: "Enter after-tax monthly take-home income.",
  },
  burnRateMonthly: {
    title: "Monthly burn rate",
    description: "Estimate essential monthly spending.",
  },
  liquidSavings: {
    title: "Liquid savings",
    description: "Total cash you can access quickly.",
  },
  highestInsuranceDeductible: {
    title: "Highest deductible",
    description: "Largest deductible across your active policies.",
  },
  incomeStability: {
    title: "Income stability",
    description: "Choose the income pattern that best fits you.",
  },
  householdIncomeStructure: {
    title: "Household income",
    description: "How many incomes support this household?",
  },
  dependentsCount: {
    title: "Dependents",
    description: "How many people depend on your income?",
  },
  hasHealthInsurance: {
    title: "Health insurance",
    description: "Do you currently have health coverage?",
  },
  hasDisabilityInsurance: {
    title: "Disability coverage",
    description: "Do you have disability insurance coverage?",
  },
  hasTermLifeInsurance: {
    title: "Term life insurance",
    description: "Do you currently have term life coverage?",
  },
  employerMatchEligible: {
    title: "Employer match eligibility",
    description: "Are you eligible for employer retirement match?",
  },
  employerMatchPercent: {
    title: "Employer match percent",
    description: "What percent of pay is matched by your employer?",
  },
  retirementContributionPercent: {
    title: "Current retirement contribution",
    description: "Percent of pay currently contributed.",
  },
  stressScore: {
    title: "Financial stress score",
    description: "How stressed do your finances feel right now?",
  },
  cashFlowTight: {
    title: "Cash flow tightness",
    description: "Is cash flow tight month to month?",
  },
  debts: {
    title: "Debt details",
    description: "Add at least one debt with APR and balance.",
  },
  hasLinkedAccounts: {
    title: "Linked accounts",
    description: "Have you linked your financial accounts?",
  },
};

export function promptForFact(key: FactKey): FactPrompt {
  return FACT_PROMPTS[key];
}

export function summarizeRemainingFactTitles(
  keys: FactKey[],
  limit = 3,
): string[] {
  const uniqueKeys: FactKey[] = [];
  for (const key of keys) {
    if (!uniqueKeys.includes(key)) {
      uniqueKeys.push(key);
    }
    if (uniqueKeys.length >= limit) {
      break;
    }
  }
  return uniqueKeys.map((key) => FACT_PROMPTS[key].title);
}

export function buildPartialCompletionLabel(remainingCount: number): string {
  if (remainingCount <= 0) {
    return "Finish onboarding";
  }
  return `Finish now (${remainingCount} input${remainingCount === 1 ? "" : "s"} remaining)`;
}
