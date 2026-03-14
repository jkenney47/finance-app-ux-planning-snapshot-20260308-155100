import type { Recommendation, RecommendationId } from "@/utils/contracts/fme";
import {
  getChecklist,
  getMeasurementCopy,
  getSecondOrderEffects,
  inferEffort,
  inferImpact,
} from "@/utils/roadmap/stepDetails";

function makeRecommendation(input: {
  id: RecommendationId;
  priority: number;
  requiredFacts: Recommendation["requiredFacts"];
}): Recommendation {
  return {
    id: input.id,
    phase: "cash_flow_truth",
    title: input.id,
    summary: "summary",
    actionLabel: "action",
    analyticsEvent: `event_${input.id}`,
    pros: ["pro"],
    cons: ["con"],
    assumptions: ["assumption"],
    requiredFacts: input.requiredFacts,
    policyDomains: [],
    priority: input.priority,
    traceRefs: ["trace_1"],
  };
}

describe("roadmap step details", () => {
  it("returns effects, measurement copy, and checklist", () => {
    const effects = getSecondOrderEffects("connect_accounts");
    expect(effects.unlocks[0]).toContain("Higher-confidence");
    expect(effects.delays[0]).toContain("optimization guidance");

    expect(getMeasurementCopy("tackle_toxic_debt")).toContain("APR");
    expect(getChecklist("keep_momentum")).toHaveLength(3);
  });

  it("infers impact from recommendation priority", () => {
    const high = makeRecommendation({
      id: "build_deductible_shield",
      priority: 95,
      requiredFacts: [],
    });
    const medium = makeRecommendation({
      id: "build_fortress_fund",
      priority: 70,
      requiredFacts: [],
    });
    const low = makeRecommendation({
      id: "keep_momentum",
      priority: 10,
      requiredFacts: [],
    });

    expect(inferImpact(high)).toBe("High");
    expect(inferImpact(medium)).toBe("Medium");
    expect(inferImpact(low)).toBe("Low");
  });

  it("infers effort from required fact count", () => {
    const high = makeRecommendation({
      id: "collect_missing_facts",
      priority: 50,
      requiredFacts: [
        "incomeMonthlyNet",
        "burnRateMonthly",
        "liquidSavings",
        "debts",
      ],
    });
    const medium = makeRecommendation({
      id: "close_protection_gap",
      priority: 50,
      requiredFacts: ["hasHealthInsurance", "dependentsCount"],
    });
    const low = makeRecommendation({
      id: "keep_momentum",
      priority: 50,
      requiredFacts: ["burnRateMonthly"],
    });

    expect(inferEffort(high)).toBe("High");
    expect(inferEffort(medium)).toBe("Medium");
    expect(inferEffort(low)).toBe("Low");
  });
});
