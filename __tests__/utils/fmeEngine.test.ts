import { makeFact, type FactsSnapshot } from "@/utils/contracts/facts";
import { evaluateFinancialMaturity } from "@/utils/domain/fme/engine";
import { buildDefaultPolicyBundle } from "@/utils/domain/fme/policies";

function withBaseFacts(overrides: FactsSnapshot = {}): FactsSnapshot {
  return {
    hasLinkedAccounts: makeFact("hasLinkedAccounts", true, "manual"),
    ...overrides,
  };
}

describe("evaluateFinancialMaturity", () => {
  it("returns needs_info with prioritized fact requests when key facts are missing", () => {
    const evaluation = evaluateFinancialMaturity({
      facts: withBaseFacts(),
    });

    expect(evaluation.mode).toBe("needs_info");
    expect(evaluation.decision.mode).toBe("hold_steady");
    expect(evaluation.decision.triggerConditions.length).toBeGreaterThan(0);
    expect(
      evaluation.factRequests.some((item) => item.key === "incomeMonthlyNet"),
    ).toBe(true);
    expect(
      evaluation.factRequests.some((item) => item.key === "burnRateMonthly"),
    ).toBe(true);
  });

  it("enters crisis mode when burn exceeds income", () => {
    const evaluation = evaluateFinancialMaturity({
      facts: withBaseFacts({
        incomeMonthlyNet: makeFact("incomeMonthlyNet", 2500, "manual"),
        burnRateMonthly: makeFact("burnRateMonthly", 3200, "manual"),
      }),
    });

    expect(evaluation.mode).toBe("crisis");
    expect(evaluation.decision.mode).toBe("act_now");
    expect(evaluation.decision.confidence).toBeGreaterThanOrEqual(0.72);
    expect(evaluation.primaryRecommendation?.id).toBe("stabilize_cash_flow");
  });

  it("blocks toxic debt recommendation when rates policy is stale", () => {
    const staleBundle = buildDefaultPolicyBundle("2026-02-16T00:00:00.000Z");
    staleBundle.domains.rates = staleBundle.domains.rates
      ? {
          ...staleBundle.domains.rates,
          publishedAt: "2025-01-01T00:00:00.000Z",
        }
      : undefined;

    const evaluation = evaluateFinancialMaturity({
      facts: withBaseFacts({
        debts: makeFact(
          "debts",
          [
            {
              id: "debt-1",
              name: "Credit card",
              type: "credit_card",
              apr: 0.229,
              balance: 4200,
            },
          ],
          "manual",
        ),
      }),
      policyBundle: staleBundle,
      nowIso: "2026-02-16T00:00:00.000Z",
    });

    const debtMilestone = evaluation.milestones.find(
      (milestone) => milestone.id === "toxic_debt_purge",
    );

    expect(debtMilestone?.status).toBe("blocked_policy_stale");
    expect(evaluation.decision.mode).toBe("hold_steady");
    expect(evaluation.decision.stalePolicyDomains).toContain("rates");
    expect(
      evaluation.primaryRecommendation?.id === "tackle_toxic_debt",
    ).toBeFalsy();
  });

  it("changes toxic debt classification when rates policy changes", () => {
    const conservativeBundle = buildDefaultPolicyBundle();
    if (conservativeBundle.domains.rates) {
      conservativeBundle.domains.rates = {
        ...conservativeBundle.domains.rates,
        data: {
          ...conservativeBundle.domains.rates.data,
          toxicAprFloor: 0.1,
          debtRiskPremiumApr: 0.04,
          riskFreeRateApy: 0.05,
        },
      };
    }

    const aggressiveBundle = buildDefaultPolicyBundle();
    if (aggressiveBundle.domains.rates) {
      aggressiveBundle.domains.rates = {
        ...aggressiveBundle.domains.rates,
        data: {
          ...aggressiveBundle.domains.rates.data,
          toxicAprFloor: 0.08,
          debtRiskPremiumApr: 0.02,
          riskFreeRateApy: 0.03,
        },
      };
    }

    const facts = withBaseFacts({
      debts: makeFact(
        "debts",
        [
          {
            id: "debt-1",
            name: "Personal loan",
            type: "personal_loan",
            apr: 0.085,
            balance: 9000,
          },
        ],
        "manual",
      ),
    });

    const conservativeEvaluation = evaluateFinancialMaturity({
      facts,
      policyBundle: conservativeBundle,
    });
    const aggressiveEvaluation = evaluateFinancialMaturity({
      facts,
      policyBundle: aggressiveBundle,
    });

    const conservativeHasDebtRecommendation =
      conservativeEvaluation.alternatives
        .concat(
          conservativeEvaluation.primaryRecommendation
            ? [conservativeEvaluation.primaryRecommendation]
            : [],
        )
        .some((recommendation) => recommendation.id === "tackle_toxic_debt");

    const aggressiveHasDebtRecommendation = aggressiveEvaluation.alternatives
      .concat(
        aggressiveEvaluation.primaryRecommendation
          ? [aggressiveEvaluation.primaryRecommendation]
          : [],
      )
      .some((recommendation) => recommendation.id === "tackle_toxic_debt");

    expect(conservativeHasDebtRecommendation).toBe(false);
    expect(aggressiveHasDebtRecommendation).toBe(true);
  });

  it("uses snowball framing when stress score is high", () => {
    const evaluation = evaluateFinancialMaturity({
      facts: withBaseFacts({
        stressScore: makeFact("stressScore", "high", "manual"),
        debts: makeFact(
          "debts",
          [
            {
              id: "debt-1",
              name: "Card A",
              type: "credit_card",
              apr: 0.249,
              balance: 1500,
            },
            {
              id: "debt-2",
              name: "Card B",
              type: "credit_card",
              apr: 0.199,
              balance: 500,
            },
          ],
          "manual",
        ),
      }),
    });

    expect(evaluation.primaryRecommendation?.id).toBe("tackle_toxic_debt");
    expect(evaluation.primaryRecommendation?.actionLabel).toBe(
      "Start snowball payoff plan",
    );
    expect(evaluation.primaryRecommendation?.summary).toContain(
      "Start with Card B.",
    );
  });
});
