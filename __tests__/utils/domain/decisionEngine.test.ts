import { evaluateNextStep } from "@/utils/domain/decisionEngine";

describe("evaluateNextStep", () => {
  it("should return connect_accounts phase when no accounts are linked", () => {
    const result = evaluateNextStep({
      hasLinkedAccounts: false,
      emergencyFundMonths: 5,
      employerMatchEligible: false,
      hasHighAprDebt: false,
      customGoalCount: 1,
    });

    expect(result.phase).toBe("connect_accounts");
    expect(result.title).toBe("Link your financial accounts");
  });

  it("should return build_emergency_fund phase when emergency fund is below 3 months", () => {
    const result = evaluateNextStep({
      hasLinkedAccounts: true,
      emergencyFundMonths: 2,
      employerMatchEligible: false,
      hasHighAprDebt: false,
      customGoalCount: 1,
    });

    expect(result.phase).toBe("build_emergency_fund");
    expect(result.title).toBe("Boost your emergency savings");
  });

  it("should return invest_employer_match phase when emergency fund is 3 or more and eligible for employer match", () => {
    const result = evaluateNextStep({
      hasLinkedAccounts: true,
      emergencyFundMonths: 3,
      employerMatchEligible: true,
      hasHighAprDebt: false,
      customGoalCount: 1,
    });

    expect(result.phase).toBe("invest_employer_match");
    expect(result.title).toBe("Capture your employer match");
  });

  it("should return focus_debt phase when there is high APR debt", () => {
    const result = evaluateNextStep({
      hasLinkedAccounts: true,
      emergencyFundMonths: 4,
      employerMatchEligible: false,
      hasHighAprDebt: true,
      customGoalCount: 1,
    });

    expect(result.phase).toBe("focus_debt");
    expect(result.title).toBe("Tackle high-interest debt");
  });

  it("should return set_goal phase when there are no custom goals", () => {
    const result = evaluateNextStep({
      hasLinkedAccounts: true,
      emergencyFundMonths: 6,
      employerMatchEligible: false,
      hasHighAprDebt: false,
      customGoalCount: 0,
    });

    expect(result.phase).toBe("set_goal");
    expect(result.title).toBe("Create your next goal");
  });

  it("should return keep momentum going when all financial milestones are met", () => {
    const result = evaluateNextStep({
      hasLinkedAccounts: true,
      emergencyFundMonths: 6,
      employerMatchEligible: false,
      hasHighAprDebt: false,
      customGoalCount: 2,
    });

    expect(result.phase).toBe("set_goal");
    expect(result.title).toBe("Keep momentum going");
  });
});
