import type {
  JourneyMilestone,
  Recommendation,
  RecommendationId,
} from "@/utils/contracts/fme";
import {
  getMilestoneMeasurementReason,
  getMilestoneStatusPresentation,
  getMilestoneStepType,
  getRecommendationStepType,
  getStepTypeLabel,
  sortRecommendationsByRoadmapHorizon,
} from "@/utils/roadmap/semantics";

function makeRecommendation(id: RecommendationId): Recommendation {
  return {
    id,
    phase: "cash_flow_truth",
    title: id,
    summary: "summary",
    actionLabel: "action",
    analyticsEvent: `event_${id}`,
    pros: ["pro"],
    cons: ["con"],
    assumptions: ["assumption"],
    requiredFacts: [],
    policyDomains: [],
    priority: 50,
    traceRefs: ["trace_1"],
  };
}

describe("roadmap semantics", () => {
  it("maps recommendation IDs to step types", () => {
    expect(getRecommendationStepType("connect_accounts")).toBe("setup");
    expect(getRecommendationStepType("build_deductible_shield")).toBe(
      "threshold",
    );
    expect(getRecommendationStepType("keep_momentum")).toBe("maintain");
  });

  it("maps milestone IDs to step types and measurement reasons", () => {
    expect(getMilestoneStepType("match_arbitrage")).toBe("setup");
    expect(getMilestoneStepType("fortress_fund")).toBe("threshold");
    expect(getMilestoneStepType("cash_flow_truth")).toBe("maintain");
    expect(getMilestoneMeasurementReason("toxic_debt_purge")).toContain(
      "principal and APR",
    );
  });

  it("formats step-type labels", () => {
    expect(getStepTypeLabel("setup")).toBe("Setup");
    expect(getStepTypeLabel("threshold")).toBe("Threshold");
    expect(getStepTypeLabel("maintain")).toBe("Maintain");
  });

  it("returns setup status presentation", () => {
    const baseMilestone: JourneyMilestone = {
      id: "match_arbitrage",
      title: "Employer match",
      status: "complete",
      detail: "detail",
    };

    expect(getMilestoneStatusPresentation(baseMilestone).label).toBe(
      "Completed",
    );

    expect(
      getMilestoneStatusPresentation({
        ...baseMilestone,
        status: "in_progress",
      }).label,
    ).toBe("In setup");

    expect(
      getMilestoneStatusPresentation({
        ...baseMilestone,
        status: "needs_info",
      }).label,
    ).toBe("Needs input");

    expect(
      getMilestoneStatusPresentation({
        ...baseMilestone,
        status: "blocked_policy_stale",
      }).label,
    ).toBe("Blocked");

    expect(
      getMilestoneStatusPresentation({
        ...baseMilestone,
        status: "not_relevant",
      }).label,
    ).toBe("Not needed");
  });

  it("returns threshold status presentation with ongoing status", () => {
    const milestone: JourneyMilestone = {
      id: "deductible_shield",
      title: "Deductible shield",
      status: "complete",
      detail: "detail",
    };

    expect(getMilestoneStatusPresentation(milestone)).toEqual({
      label: "Unlocked",
      ongoingStatus: "On track",
    });

    expect(
      getMilestoneStatusPresentation({
        ...milestone,
        status: "in_progress",
      }),
    ).toEqual({
      label: "Building",
      ongoingStatus: "Below threshold",
    });
  });

  it("returns maintain status presentation", () => {
    const milestone: JourneyMilestone = {
      id: "cash_flow_truth",
      title: "Cash flow truth",
      status: "complete",
      detail: "detail",
    };

    expect(getMilestoneStatusPresentation(milestone)).toEqual({
      label: "On track",
      ongoingStatus: "Stable",
    });

    expect(
      getMilestoneStatusPresentation({ ...milestone, status: "in_progress" }),
    ).toEqual({
      label: "Needs attention",
      ongoingStatus: "Drifting",
    });
  });

  it("sorts recommendations into now/next/later horizon", () => {
    const recommendations = [
      makeRecommendation("connect_accounts"),
      makeRecommendation("build_deductible_shield"),
      makeRecommendation("build_fortress_fund"),
      makeRecommendation("keep_momentum"),
    ];

    const result = sortRecommendationsByRoadmapHorizon(recommendations);

    expect(result.now.map((item) => item.id)).toEqual(["connect_accounts"]);
    expect(result.next.map((item) => item.id)).toEqual([
      "build_deductible_shield",
    ]);
    expect(result.later.map((item) => item.id)).toEqual([
      "build_fortress_fund",
      "keep_momentum",
    ]);
  });
});
