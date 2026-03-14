import {
  makeFact,
  type FactsSnapshot,
  type FinancialDebt,
} from "@/utils/contracts/facts";
import { evaluateFinancialMaturity } from "@/utils/domain/fme/engine";
import {
  buildEvaluationSignature,
  buildFactsHash,
  buildFmeEvaluationLogPayload,
} from "@/utils/domain/fme/logging";
import { buildDefaultPolicyBundle } from "@/utils/domain/fme/policies";

function createFacts(overrides: FactsSnapshot = {}): FactsSnapshot {
  const debts: FinancialDebt[] = [
    {
      id: "debt-1",
      name: "Credit card",
      type: "credit_card",
      apr: 0.229,
      balance: 4200,
    },
  ];

  return {
    hasLinkedAccounts: makeFact("hasLinkedAccounts", true, "manual"),
    incomeMonthlyNet: makeFact("incomeMonthlyNet", 6500, "manual"),
    burnRateMonthly: makeFact("burnRateMonthly", 4200, "manual"),
    liquidSavings: makeFact("liquidSavings", 9000, "manual"),
    debts: makeFact("debts", debts, "manual"),
    ...overrides,
  };
}

describe("fme logging utilities", () => {
  it("builds a stable facts hash independent of object key insertion order", () => {
    const asOf = "2026-02-16T00:00:00.000Z";
    const factsA: FactsSnapshot = {
      incomeMonthlyNet: makeFact("incomeMonthlyNet", 5000, "manual", 1, asOf),
      burnRateMonthly: makeFact("burnRateMonthly", 3000, "manual", 1, asOf),
    };
    const factsB: FactsSnapshot = {
      burnRateMonthly: makeFact("burnRateMonthly", 3000, "manual", 1, asOf),
      incomeMonthlyNet: makeFact("incomeMonthlyNet", 5000, "manual", 1, asOf),
    };

    expect(buildFactsHash(factsA)).toBe(buildFactsHash(factsB));
  });

  it("builds a payload with policy and rule versions", () => {
    const policyBundle = buildDefaultPolicyBundle("2026-02-16T00:00:00.000Z");
    if (policyBundle.domains.rates) {
      policyBundle.domains.rates = {
        ...policyBundle.domains.rates,
        version: 7,
      };
    }

    const facts = createFacts();
    const evaluation = evaluateFinancialMaturity({
      facts,
      policyBundle,
      nowIso: "2026-02-16T00:00:00.000Z",
    });

    const payload = buildFmeEvaluationLogPayload({
      userId: "00000000-0000-0000-0000-000000000001",
      facts,
      evaluation,
      policyBundle,
      rulePack: {
        version: 3,
        region: "US",
        effectiveFrom: "2026-01-01T00:00:00.000Z",
        publishedAt: "2026-01-01T00:00:00.000Z",
        templates: [],
        milestones: [],
      },
    });

    expect(payload.user_id).toBe("00000000-0000-0000-0000-000000000001");
    expect(payload.policy_versions.rates).toBe(7);
    expect(payload.rule_version).toBe(3);
    expect(payload.output_summary.mode).toBe(evaluation.mode);
    expect(payload.output_summary.primaryRecommendationId).toBe(
      evaluation.primaryRecommendation?.id ?? null,
    );
    expect(payload.trace).toHaveLength(evaluation.trace.length);
  });

  it("changes signature when recommendation output changes", () => {
    const policyBundle = buildDefaultPolicyBundle("2026-02-16T00:00:00.000Z");
    const factsStable = createFacts();
    const factsCrisis = createFacts({
      incomeMonthlyNet: makeFact("incomeMonthlyNet", 2000, "manual"),
      burnRateMonthly: makeFact("burnRateMonthly", 4200, "manual"),
    });

    const stablePayload = buildFmeEvaluationLogPayload({
      userId: "00000000-0000-0000-0000-000000000001",
      facts: factsStable,
      evaluation: evaluateFinancialMaturity({
        facts: factsStable,
        policyBundle,
        nowIso: "2026-02-16T00:00:00.000Z",
      }),
      policyBundle,
      rulePack: null,
    });
    const crisisPayload = buildFmeEvaluationLogPayload({
      userId: "00000000-0000-0000-0000-000000000001",
      facts: factsCrisis,
      evaluation: evaluateFinancialMaturity({
        facts: factsCrisis,
        policyBundle,
        nowIso: "2026-02-16T00:00:00.000Z",
      }),
      policyBundle,
      rulePack: null,
    });

    expect(buildEvaluationSignature(stablePayload)).not.toBe(
      buildEvaluationSignature(crisisPayload),
    );
  });
});
