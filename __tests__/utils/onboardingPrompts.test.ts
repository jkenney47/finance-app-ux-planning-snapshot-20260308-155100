import {
  buildPartialCompletionLabel,
  promptForFact,
  summarizeRemainingFactTitles,
} from "@/utils/onboardingPrompts";

describe("onboarding prompts", () => {
  it("returns prompt copy for a known fact key", () => {
    expect(promptForFact("incomeMonthlyNet")).toEqual({
      title: "Monthly net income",
      description: "Enter after-tax monthly take-home income.",
    });
  });

  it("summarizes remaining titles with unique keys and default limit", () => {
    const titles = summarizeRemainingFactTitles([
      "incomeMonthlyNet",
      "burnRateMonthly",
      "incomeMonthlyNet",
      "liquidSavings",
      "debts",
    ]);
    expect(titles).toEqual([
      "Monthly net income",
      "Monthly burn rate",
      "Liquid savings",
    ]);
  });

  it("builds a partial completion label from remaining count", () => {
    expect(buildPartialCompletionLabel(1)).toBe(
      "Finish now (1 input remaining)",
    );
    expect(buildPartialCompletionLabel(3)).toBe(
      "Finish now (3 inputs remaining)",
    );
    expect(buildPartialCompletionLabel(0)).toBe("Finish onboarding");
  });
});
