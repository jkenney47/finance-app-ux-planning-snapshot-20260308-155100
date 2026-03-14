import type { Recommendation } from "@/utils/contracts/fme";
import { getRecommendationConfidence } from "@/utils/roadmap/recommendationConfidence";

const baseRecommendation: Recommendation = {
  id: "build_fortress_fund",
  phase: "fortress_fund",
  title: "Build your fortress fund",
  summary: "Grow reserves toward your target runway.",
  actionLabel: "Open journey",
  actionRoute: "/(dashboard)/journey",
  analyticsEvent: "fme_build_fortress_fund",
  pros: [],
  cons: [],
  assumptions: [],
  requiredFacts: [],
  policyDomains: ["thresholds"],
  priority: 10,
  traceRefs: [],
};

describe("getRecommendationConfidence", () => {
  it("returns high confidence when all required facts are present", () => {
    expect(getRecommendationConfidence(baseRecommendation)).toEqual({
      label: "High",
      reason: "All required inputs are currently available.",
    });
  });

  it("keeps non-missing-facts recommendations at high confidence", () => {
    expect(
      getRecommendationConfidence({
        ...baseRecommendation,
        requiredFacts: ["incomeMonthlyNet"],
      }),
    ).toEqual({
      label: "High",
      reason: "All required inputs are currently available.",
    });

    expect(
      getRecommendationConfidence({
        ...baseRecommendation,
        requiredFacts: ["incomeMonthlyNet", "burnRateMonthly"],
      }),
    ).toEqual({
      label: "High",
      reason: "All required inputs are currently available.",
    });
  });

  it("returns low confidence for collect-missing-facts with more than two missing facts", () => {
    expect(
      getRecommendationConfidence({
        ...baseRecommendation,
        id: "collect_missing_facts",
        phase: "cash_flow_truth",
        requiredFacts: ["incomeMonthlyNet", "burnRateMonthly", "liquidSavings"],
      }),
    ).toEqual({
      label: "Low",
      reason: "3 required inputs still missing.",
    });
  });

  it("returns medium confidence for collect-missing-facts with one or two missing facts", () => {
    expect(
      getRecommendationConfidence({
        ...baseRecommendation,
        id: "collect_missing_facts",
        phase: "cash_flow_truth",
        requiredFacts: ["incomeMonthlyNet"],
      }),
    ).toEqual({
      label: "Medium",
      reason: "1 required input still missing.",
    });

    expect(
      getRecommendationConfidence({
        ...baseRecommendation,
        id: "collect_missing_facts",
        phase: "cash_flow_truth",
        requiredFacts: ["incomeMonthlyNet", "burnRateMonthly"],
      }),
    ).toEqual({
      label: "Medium",
      reason: "2 required inputs still missing.",
    });
  });
});
