import {
  makeFact,
  type FinancialDebt,
  type FactsSnapshot,
} from "@/utils/contracts/facts";
import { evaluateFinancialMaturity } from "@/utils/domain/fme/engine";
import { deriveMonthlyCashFlowMetrics } from "@/utils/domain/fme/factsDerivation";
import {
  buildDefaultPolicyBundle,
  getPolicyStatuses,
} from "@/utils/domain/fme/policies";
import {
  applyMockPolicyScenario,
  getMockDashboardSummaryForScenario,
  getMockScenario,
} from "@/utils/mocks/mockScenarios";

function deriveDebtsFromBalances(
  accounts: ReturnType<typeof getMockDashboardSummaryForScenario>["accounts"],
): FinancialDebt[] {
  return accounts
    .filter((account) => account.balance < 0)
    .map((account) => ({
      id: account.id,
      name: account.name,
      type: "credit_card",
      apr: 0.229,
      balance: Math.abs(account.balance),
    }));
}

function liquidSavingsFromAccounts(
  accounts: ReturnType<typeof getMockDashboardSummaryForScenario>["accounts"],
): number {
  return accounts
    .filter(
      (account) =>
        account.type.toLowerCase().includes("checking") ||
        account.type.toLowerCase().includes("savings"),
    )
    .reduce((sum, account) => sum + Math.max(0, account.balance), 0);
}

function factsFromSummary(
  summary: ReturnType<typeof getMockDashboardSummaryForScenario>,
): FactsSnapshot {
  const cashFlow = deriveMonthlyCashFlowMetrics(summary.transactions);
  return {
    hasLinkedAccounts: makeFact(
      "hasLinkedAccounts",
      summary.accounts.length > 0,
      "derived",
    ),
    liquidSavings: makeFact(
      "liquidSavings",
      liquidSavingsFromAccounts(summary.accounts),
      "derived",
    ),
    debts: makeFact(
      "debts",
      deriveDebtsFromBalances(summary.accounts),
      "derived",
    ),
    ...(cashFlow
      ? {
          incomeMonthlyNet: makeFact(
            "incomeMonthlyNet",
            cashFlow.incomeMonthlyNet,
            "derived",
          ),
          burnRateMonthly: makeFact(
            "burnRateMonthly",
            cashFlow.burnRateMonthly,
            "derived",
          ),
          cashFlowTight: makeFact(
            "cashFlowTight",
            cashFlow.cashFlowTight,
            "derived",
          ),
        }
      : {}),
  };
}

describe("mock scenarios", () => {
  it("defaults unknown scenario values to default", () => {
    expect(getMockScenario("unknown-value")).toBe("default");
  });

  it("keeps default scenario in stabilize mode", () => {
    const summary = getMockDashboardSummaryForScenario({
      hasLinkedAccounts: true,
      scenario: "default",
    });

    const evaluation = evaluateFinancialMaturity({
      facts: factsFromSummary(summary),
    });

    expect(evaluation.mode).toBe("stabilize");
    expect(evaluation.primaryRecommendation?.id).toBe("tackle_toxic_debt");
    const cashFlowMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "cash_flow_truth",
    );
    const toxicDebtMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "toxic_debt_purge",
    );
    expect(cashFlowMilestone?.status).toBe("complete");
    expect(toxicDebtMilestone?.status).toBe("in_progress");
  });

  it("returns empty summary for empty scenario", () => {
    const summary = getMockDashboardSummaryForScenario({
      hasLinkedAccounts: true,
      scenario: "empty",
    });
    expect(summary.accounts).toHaveLength(0);
    expect(summary.transactions).toHaveLength(0);
    expect(summary.cashFlowPoints).toHaveLength(0);

    const evaluation = evaluateFinancialMaturity({
      facts: factsFromSummary(summary),
    });
    expect(evaluation.mode).toBe("needs_info");
    expect(evaluation.primaryRecommendation?.id).toBe("connect_accounts");
    const cashFlowMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "cash_flow_truth",
    );
    expect(cashFlowMilestone?.status).toBe("needs_info");
  });

  it("creates linked accounts with no transactions for linked_no_transactions", () => {
    const summary = getMockDashboardSummaryForScenario({
      hasLinkedAccounts: true,
      scenario: "linked_no_transactions",
    });
    expect(summary.accounts.length).toBeGreaterThan(0);
    expect(summary.transactions).toHaveLength(0);

    const evaluation = evaluateFinancialMaturity({
      facts: factsFromSummary(summary),
    });

    const requestedKeys = evaluation.factRequests.map((request) => request.key);
    expect(requestedKeys).toContain("incomeMonthlyNet");
    expect(requestedKeys).toContain("burnRateMonthly");
    expect(evaluation.mode).toBe("stabilize");
    expect(evaluation.primaryRecommendation?.id).toBe("tackle_toxic_debt");
    const cashFlowMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "cash_flow_truth",
    );
    const toxicDebtMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "toxic_debt_purge",
    );
    expect(cashFlowMilestone?.status).toBe("needs_info");
    expect(toxicDebtMilestone?.status).toBe("in_progress");
  });

  it("keeps onboarding in partial-facts mode for partial_facts", () => {
    const summary = getMockDashboardSummaryForScenario({
      hasLinkedAccounts: true,
      scenario: "partial_facts",
    });
    expect(summary.accounts).toHaveLength(1);
    expect(summary.transactions).toHaveLength(0);

    const evaluation = evaluateFinancialMaturity({
      facts: factsFromSummary(summary),
    });
    const requestedKeys = evaluation.factRequests.map((request) => request.key);
    expect(requestedKeys).toContain("incomeMonthlyNet");
    expect(requestedKeys).toContain("burnRateMonthly");
    expect(evaluation.mode).toBe("needs_info");
    expect(evaluation.primaryRecommendation?.id).toBe("collect_missing_facts");
  });

  it("forces threshold policy stale status for policy_stale_thresholds", () => {
    const policyBundle = applyMockPolicyScenario(buildDefaultPolicyBundle(), {
      scenario: "policy_stale_thresholds",
      nowIso: "2026-02-23T00:00:00.000Z",
    });
    const statuses = getPolicyStatuses(
      policyBundle,
      "2026-02-23T00:00:00.000Z",
    );
    const thresholdStatus = statuses.find(
      (status) => status.domain === "thresholds",
    );
    expect(thresholdStatus?.isStale).toBe(true);

    const evaluation = evaluateFinancialMaturity({
      facts: {
        hasLinkedAccounts: makeFact("hasLinkedAccounts", true, "manual"),
      },
      policyBundle,
      nowIso: "2026-02-23T00:00:00.000Z",
    });

    const deductibleMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "deductible_shield",
    );
    const fortressMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "fortress_fund",
    );
    expect(deductibleMilestone?.status).toBe("blocked_policy_stale");
    expect(fortressMilestone?.status).toBe("blocked_policy_stale");
    expect(evaluation.mode).toBe("needs_info");
    expect(evaluation.primaryRecommendation?.id).toBe("collect_missing_facts");
  });

  it("keeps toxic debt recommendation active when only thresholds are stale", () => {
    const summary = getMockDashboardSummaryForScenario({
      hasLinkedAccounts: true,
      scenario: "policy_stale_thresholds",
    });
    const policyBundle = applyMockPolicyScenario(buildDefaultPolicyBundle(), {
      scenario: "policy_stale_thresholds",
      nowIso: "2026-02-23T00:00:00.000Z",
    });

    const evaluation = evaluateFinancialMaturity({
      facts: factsFromSummary(summary),
      policyBundle,
      nowIso: "2026-02-23T00:00:00.000Z",
    });

    expect(evaluation.mode).toBe("stabilize");
    expect(evaluation.primaryRecommendation?.id).toBe("tackle_toxic_debt");
  });

  it("forces rates policy stale and blocks toxic debt recommendation", () => {
    const policyBundle = applyMockPolicyScenario(buildDefaultPolicyBundle(), {
      scenario: "policy_stale_rates",
      nowIso: "2026-02-23T00:00:00.000Z",
    });
    const statuses = getPolicyStatuses(
      policyBundle,
      "2026-02-23T00:00:00.000Z",
    );
    const ratesStatus = statuses.find((status) => status.domain === "rates");
    expect(ratesStatus?.isStale).toBe(true);

    const evaluation = evaluateFinancialMaturity({
      facts: {
        hasLinkedAccounts: makeFact("hasLinkedAccounts", true, "manual"),
        debts: makeFact(
          "debts",
          [
            {
              id: "debt-1",
              name: "Card debt",
              type: "credit_card",
              apr: 0.239,
              balance: 4200,
            },
          ],
          "manual",
        ),
      },
      policyBundle,
      nowIso: "2026-02-23T00:00:00.000Z",
    });

    const debtMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "toxic_debt_purge",
    );
    expect(debtMilestone?.status).toBe("blocked_policy_stale");
    expect(
      evaluation.primaryRecommendation?.id === "tackle_toxic_debt",
    ).toBeFalsy();
    expect(evaluation.mode).toBe("needs_info");
    expect(evaluation.primaryRecommendation?.id).toBe("collect_missing_facts");
  });

  it("keeps debt payoff blocked in policy_stale_rates even with full summary facts", () => {
    const summary = getMockDashboardSummaryForScenario({
      hasLinkedAccounts: true,
      scenario: "policy_stale_rates",
    });
    const policyBundle = applyMockPolicyScenario(buildDefaultPolicyBundle(), {
      scenario: "policy_stale_rates",
      nowIso: "2026-02-23T00:00:00.000Z",
    });

    const evaluation = evaluateFinancialMaturity({
      facts: factsFromSummary(summary),
      policyBundle,
      nowIso: "2026-02-23T00:00:00.000Z",
    });

    const debtMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "toxic_debt_purge",
    );
    expect(debtMilestone?.status).toBe("blocked_policy_stale");
    expect(evaluation.primaryRecommendation?.id).not.toBe("tackle_toxic_debt");
    expect(
      evaluation.alternatives.some(
        (recommendation) => recommendation.id === "tackle_toxic_debt",
      ),
    ).toBeFalsy();
  });

  it("drives crisis mode in crisis_cash_flow scenario", () => {
    const summary = getMockDashboardSummaryForScenario({
      hasLinkedAccounts: true,
      scenario: "crisis_cash_flow",
    });
    const evaluation = evaluateFinancialMaturity({
      facts: factsFromSummary(summary),
    });
    expect(evaluation.mode).toBe("crisis");
    expect(evaluation.primaryRecommendation?.id).toBe("stabilize_cash_flow");
  });
});
