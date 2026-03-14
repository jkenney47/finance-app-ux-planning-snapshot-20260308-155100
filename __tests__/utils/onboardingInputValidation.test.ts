import {
  onboardingInputSchema,
  parseCountInput,
  parseCurrencyInput,
  parsePercentInput,
} from "@/utils/validation/onboardingInput";

const BASE_VALUES = {
  factKey: "" as const,
  textInput: "",
  choiceInput: "",
  debtName: "",
  debtApr: "",
  debtBalance: "",
};

describe("onboarding input validation", () => {
  describe("parseCurrencyInput", () => {
    it("parses valid currency values", () => {
      expect(parseCurrencyInput("1250.40")).toBeCloseTo(1250.4, 5);
      expect(parseCurrencyInput("$1,250.40")).toBeCloseTo(1250.4, 5);
      expect(parseCurrencyInput("1,250")).toBe(1250);
      expect(parseCurrencyInput("0")).toBe(0);
    });

    it("returns null for invalid inputs", () => {
      expect(parseCurrencyInput("abc")).toBeNull();
      expect(parseCurrencyInput("")).toBeNull();
    });
  });

  describe("parseCountInput", () => {
    it("parses and rounds down positive valid counts", () => {
      expect(parseCountInput("3.8")).toBe(3);
      expect(parseCountInput("2")).toBe(2);
      expect(parseCountInput("0")).toBe(0);
    });

    it("returns null for invalid or negative inputs", () => {
      expect(parseCountInput("-2")).toBeNull();
      expect(parseCountInput("-0.5")).toBeNull();
      expect(parseCountInput("abc")).toBeNull();
      expect(parseCountInput("")).toBeNull();
    });
  });

  describe("parsePercentInput", () => {
    it("parses valid percentages > 1 as fractions", () => {
      expect(parsePercentInput("22.9")).toBeCloseTo(0.229, 5);
      expect(parsePercentInput("100")).toBe(1);
      expect(parsePercentInput("5.5")).toBeCloseTo(0.055, 5);
      expect(parsePercentInput("1.5")).toBeCloseTo(0.015, 5);
    });

    it("handles percentages with percent signs", () => {
      expect(parsePercentInput("22.9%")).toBeCloseTo(0.229, 5);
      expect(parsePercentInput("%5")).toBeCloseTo(0.05, 5);
    });

    it("parses values <= 1 as is", () => {
      expect(parsePercentInput("0.15")).toBeCloseTo(0.15, 5);
      expect(parsePercentInput("1")).toBe(1);
      expect(parsePercentInput("0.99")).toBeCloseTo(0.99, 5);
      expect(parsePercentInput("0")).toBe(0);
      expect(parsePercentInput("-0.5")).toBe(-0.5);
    });

    it("returns null for invalid inputs", () => {
      expect(parsePercentInput("n/a")).toBeNull();
      expect(parsePercentInput("")).toBeNull();
      expect(parsePercentInput("abc")).toBeNull();
    });
  });

  it("accepts empty fact key state", () => {
    const result = onboardingInputSchema.safeParse(BASE_VALUES);
    expect(result.success).toBe(true);
  });

  it("validates currency fact inputs", () => {
    const invalid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "incomeMonthlyNet",
      textInput: "abc",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe("Enter a valid number.");
    }

    const valid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "incomeMonthlyNet",
      textInput: "5400",
    });
    expect(valid.success).toBe(true);
  });

  it("validates dependent count inputs", () => {
    const invalid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "dependentsCount",
      textInput: "-1",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe(
        "Enter a valid dependent count.",
      );
    }

    const valid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "dependentsCount",
      textInput: "2",
    });
    expect(valid.success).toBe(true);
  });

  it("validates percent inputs", () => {
    const invalid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "employerMatchPercent",
      textInput: "nope",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe("Enter a valid percent.");
    }

    const valid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "retirementContributionPercent",
      textInput: "8",
    });
    expect(valid.success).toBe(true);
  });

  it("validates boolean yes/no choices", () => {
    const invalid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "hasLinkedAccounts",
      choiceInput: "maybe",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe(
        "Select Yes or No to continue.",
      );
    }

    const valid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "hasLinkedAccounts",
      choiceInput: "yes",
    });
    expect(valid.success).toBe(true);
  });

  it("validates income stability choices", () => {
    const invalid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "incomeStability",
      choiceInput: "steady",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe(
        "Select Stable or Variable to continue.",
      );
    }

    const valid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "incomeStability",
      choiceInput: "stable",
    });
    expect(valid.success).toBe(true);
  });

  it("validates household income structure choices", () => {
    const invalid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "householdIncomeStructure",
      choiceInput: "team",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe(
        "Select Single income or Dual income to continue.",
      );
    }

    const valid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "householdIncomeStructure",
      choiceInput: "dual",
    });
    expect(valid.success).toBe(true);
  });

  it("validates stress score choices", () => {
    const invalid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "stressScore",
      choiceInput: "urgent",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe(
        "Select Low, Medium, or High to continue.",
      );
    }

    const valid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "stressScore",
      choiceInput: "high",
    });
    expect(valid.success).toBe(true);
  });

  it("validates debt payload requirements", () => {
    const invalid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "debts",
      debtName: "",
      debtApr: "22.9",
      debtBalance: "5400",
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe(
        "Add debt name, APR, and balance.",
      );
    }

    const valid = onboardingInputSchema.safeParse({
      ...BASE_VALUES,
      factKey: "debts",
      debtName: "Credit Card",
      debtApr: "22.9",
      debtBalance: "5400",
    });
    expect(valid.success).toBe(true);
  });
});
