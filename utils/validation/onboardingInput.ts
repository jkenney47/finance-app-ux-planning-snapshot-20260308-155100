import { z } from "zod";

import type { FactKey } from "@/utils/contracts/facts";

const FACT_KEYS = [
  "hasLinkedAccounts",
  "incomeMonthlyNet",
  "burnRateMonthly",
  "liquidSavings",
  "highestInsuranceDeductible",
  "incomeStability",
  "householdIncomeStructure",
  "dependentsCount",
  "hasHealthInsurance",
  "hasDisabilityInsurance",
  "hasTermLifeInsurance",
  "employerMatchEligible",
  "employerMatchPercent",
  "retirementContributionPercent",
  "stressScore",
  "cashFlowTight",
  "debts",
] as const satisfies readonly FactKey[];

const CURRENCY_FACT_KEYS = [
  "incomeMonthlyNet",
  "burnRateMonthly",
  "liquidSavings",
  "highestInsuranceDeductible",
] as const satisfies readonly FactKey[];

const PERCENT_FACT_KEYS = [
  "employerMatchPercent",
  "retirementContributionPercent",
] as const satisfies readonly FactKey[];

const BOOLEAN_FACT_KEYS = [
  "hasHealthInsurance",
  "hasDisabilityInsurance",
  "hasTermLifeInsurance",
  "employerMatchEligible",
  "cashFlowTight",
  "hasLinkedAccounts",
] as const satisfies readonly FactKey[];

export function parseCurrencyInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!/[0-9]/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCountInput(value: string): number | null {
  const parsed = parseCurrencyInput(value);
  if (parsed === null) return null;
  const rounded = Math.floor(parsed);
  if (rounded < 0) return null;
  return rounded;
}

export function parsePercentInput(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!/[0-9]/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed > 1 ? parsed / 100 : parsed;
}

export const onboardingInputSchema = z
  .object({
    factKey: z.union([z.enum(FACT_KEYS), z.literal("")]),
    textInput: z.string(),
    choiceInput: z.string(),
    debtName: z.string(),
    debtApr: z.string(),
    debtBalance: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.factKey) return;

    if ((CURRENCY_FACT_KEYS as readonly string[]).includes(values.factKey)) {
      if (parseCurrencyInput(values.textInput) === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["textInput"],
          message: "Enter a valid number.",
        });
      }
      return;
    }

    if (values.factKey === "dependentsCount") {
      if (parseCountInput(values.textInput) === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["textInput"],
          message: "Enter a valid dependent count.",
        });
      }
      return;
    }

    if ((PERCENT_FACT_KEYS as readonly string[]).includes(values.factKey)) {
      if (parsePercentInput(values.textInput) === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["textInput"],
          message: "Enter a valid percent.",
        });
      }
      return;
    }

    if ((BOOLEAN_FACT_KEYS as readonly string[]).includes(values.factKey)) {
      if (values.choiceInput !== "yes" && values.choiceInput !== "no") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choiceInput"],
          message: "Select Yes or No to continue.",
        });
      }
      return;
    }

    if (values.factKey === "incomeStability") {
      if (
        values.choiceInput !== "stable" &&
        values.choiceInput !== "variable"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choiceInput"],
          message: "Select Stable or Variable to continue.",
        });
      }
      return;
    }

    if (values.factKey === "householdIncomeStructure") {
      if (values.choiceInput !== "single" && values.choiceInput !== "dual") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choiceInput"],
          message: "Select Single income or Dual income to continue.",
        });
      }
      return;
    }

    if (values.factKey === "stressScore") {
      if (
        values.choiceInput !== "low" &&
        values.choiceInput !== "medium" &&
        values.choiceInput !== "high"
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["choiceInput"],
          message: "Select Low, Medium, or High to continue.",
        });
      }
      return;
    }

    if (values.factKey === "debts") {
      const debtName = values.debtName.trim();
      const apr = parsePercentInput(values.debtApr);
      const balance = parseCurrencyInput(values.debtBalance);
      if (!debtName || apr === null || balance === null) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["debtName"],
          message: "Add debt name, APR, and balance.",
        });
      }
    }
  });

export type OnboardingInputFormValues = z.infer<typeof onboardingInputSchema>;
