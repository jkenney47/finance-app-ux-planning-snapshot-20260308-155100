import {
  getAskContextSummary,
  getAskFabLabel,
  getAskHeadline,
  getAskSuggestedPrompts,
} from "@/utils/askContext";

describe("askContext helpers", () => {
  it("prioritizes step context for headline and fab label", () => {
    const context = {
      screen: "step_detail",
      recommendationId: "build_fortress_fund",
      stepId: "build_fortress_fund",
    };

    expect(getAskHeadline(context)).toBe("Ask about this step");
    expect(getAskFabLabel(context)).toBe("Ask Step");
    expect(getAskContextSummary(context)).toContain(
      "Step: build fortress fund",
    );
  });

  it("describes metric context for insights", () => {
    const context = {
      screen: "insights",
      metricId: "cash_flow_trend",
    };

    expect(getAskHeadline(context)).toBe("Ask about cash flow trend");
    expect(getAskFabLabel(context)).toBe("Ask Metric");
    expect(getAskContextSummary(context)).toBe(
      "Screen: Insights · Metric: cash flow trend",
    );
  });

  it("returns roadmap-specific suggested prompts", () => {
    const context = { screen: "roadmap" };
    const prompts = getAskSuggestedPrompts(context);

    expect(prompts.length).toBeGreaterThanOrEqual(3);
    expect(prompts[0]).toContain("milestone");
  });

  it("returns accounts-specific suggested prompts", () => {
    const context = { screen: "accounts" };
    const prompts = getAskSuggestedPrompts(context);

    expect(prompts.length).toBeGreaterThanOrEqual(3);
    expect(prompts[0]).toContain("reconnect");
    expect(prompts[1]).toContain("confidence");
  });

  it("returns profile-specific suggested prompts", () => {
    const context = { screen: "profile" };
    const prompts = getAskSuggestedPrompts(context);

    expect(prompts.length).toBeGreaterThanOrEqual(3);
    expect(prompts[0]).toContain("data coverage");
    expect(prompts[1]).toContain("confidence");
  });

  it("returns goals-specific suggested prompts", () => {
    const context = { screen: "goals" };
    const prompts = getAskSuggestedPrompts(context);

    expect(prompts.length).toBeGreaterThanOrEqual(3);
    expect(prompts[0]).toContain("contribute");
    expect(prompts[1]).toContain("prioritize");
  });

  it("uses friendly metric labels for connection and goals context", () => {
    const accountsContext = {
      screen: "accounts",
      metricId: "connection_health",
    };
    const goalsContext = {
      screen: "goals",
      metricId: "goal_funding_progress",
    };

    expect(getAskHeadline(accountsContext)).toBe("Ask about connection health");
    expect(getAskHeadline(goalsContext)).toBe(
      "Ask about goal funding progress",
    );
  });
});
