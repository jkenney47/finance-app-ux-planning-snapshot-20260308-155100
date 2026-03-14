import { NextStepCard } from "@/components/dashboard/NextStepCard";
import type { FmeEvaluation, Recommendation } from "@/utils/contracts/fme";
import { fireEvent, render, screen } from "@test-utils";

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

function buildEvaluation(overrides?: Partial<FmeEvaluation>): FmeEvaluation {
  return {
    mode: "build",
    decision: {
      mode: "hold_steady",
      confidence: 0.66,
      confidenceThreshold: 0.72,
      assumptions: [],
      triggerConditions: [
        "Raise decision confidence to at least 72% before taking a new action.",
      ],
      nextMilestoneGate: null,
      criticalMissingFacts: [],
      stalePolicyDomains: [],
      recommendedActionId: baseRecommendation.id,
    },
    primaryRecommendation: baseRecommendation,
    alternatives: [],
    milestones: [],
    factRequests: [],
    policyStatus: [
      {
        domain: "thresholds",
        isStale: false,
        ageDays: 2,
        maxAgeDays: 30,
      },
    ],
    trace: [],
    generatedAt: "2026-02-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("NextStepCard", () => {
  it("shows stale-policy fallback action when recommendation is blocked", () => {
    const onPressPolicyStatus = jest.fn();
    render(
      <NextStepCard
        evaluation={buildEvaluation({
          mode: "blocked_policy_stale",
          primaryRecommendation: null,
          policyStatus: [
            {
              domain: "thresholds",
              isStale: true,
              ageDays: 95,
              maxAgeDays: 30,
            },
          ],
        })}
        onPressPrimaryAction={jest.fn()}
        onPressPolicyStatus={onPressPolicyStatus}
      />,
    );

    expect(
      screen.getByText(
        "Some policy inputs are out of date and are currently blocking recommendations.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByTestId("dashboard-primary-recommendation-none"),
    ).toBeTruthy();
    expect(screen.getByText("Stale domains: thresholds (95d)")).toBeTruthy();
    expect(screen.getByTestId("dashboard-policy-stale-warning")).toBeTruthy();
    expect(screen.getByTestId("dashboard-policy-stale-domains")).toBeTruthy();

    fireEvent.click(
      screen.getByTestId("dashboard-next-step-policy-status-action"),
    );
    expect(onPressPolicyStatus).toHaveBeenCalledTimes(1);
  });

  it("keeps primary action visible when recommendation exists", () => {
    render(
      <NextStepCard
        evaluation={buildEvaluation({
          policyStatus: [
            {
              domain: "rates",
              isStale: true,
              ageDays: null,
              maxAgeDays: 30,
            },
          ],
        })}
        onPressPrimaryAction={jest.fn()}
        onPressPolicyStatus={jest.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Some policy inputs are out of date, so recommendation coverage may be limited.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByTestId(
        "dashboard-primary-recommendation-build_fortress_fund",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Stale domains: rates")).toBeTruthy();
    expect(screen.getByTestId("dashboard-policy-stale-warning")).toBeTruthy();
    expect(screen.getByTestId("dashboard-policy-stale-domains")).toBeTruthy();
    expect(screen.getByTestId("dashboard-next-step-action")).toBeTruthy();
    expect(
      screen.queryByTestId("dashboard-next-step-policy-status-action"),
    ).toBeNull();
  });

  it("shows effects and evidence when recommendation is available", () => {
    render(
      <NextStepCard
        evaluation={buildEvaluation()}
        evidence={{
          connectedAccounts: 3,
          confidenceSummary: "Medium confidence",
          lastUpdated: "2026-03-01T10:30:00.000Z",
          coverageGaps: [
            "2 key inputs still missing",
            "1 institution needs reconnect",
            "Several facts are low-confidence or inferred",
          ],
        }}
        onPressPrimaryAction={jest.fn()}
      />,
    );

    expect(screen.getByText("SECOND-ORDER EFFECTS")).toBeTruthy();
    expect(screen.getByText(/Unlocks next:/)).toBeTruthy();
    expect(screen.getByText(/Delays:/)).toBeTruthy();
    expect(screen.getByText("WHAT I USED")).toBeTruthy();
    expect(
      screen.getByText(
        "Decision confidence: High \u2014 All required inputs are currently available.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Connected accounts: 3")).toBeTruthy();
    expect(
      screen.getByText("Coverage confidence: Medium confidence"),
    ).toBeTruthy();
    expect(screen.getByText(/Last updated:/)).toBeTruthy();
    expect(
      screen.getByText("\u2022 Coverage gap: 2 key inputs still missing"),
    ).toBeTruthy();
    expect(
      screen.getByText("\u2022 Coverage gap: 1 institution needs reconnect"),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        "\u2022 Coverage gap: Several facts are low-confidence or inferred",
      ),
    ).toBeNull();
  });

  it("expands alternatives after compare options is pressed", () => {
    const alternative: Recommendation = {
      ...baseRecommendation,
      id: "tackle_toxic_debt",
      title: "Tackle toxic debt",
      summary: "Pay down highest APR debt first.",
      analyticsEvent: "fme_tackle_toxic_debt",
      actionLabel: "Open debt plan",
    };

    render(
      <NextStepCard
        evaluation={buildEvaluation({
          alternatives: [alternative],
        })}
        onPressPrimaryAction={jest.fn()}
      />,
    );

    expect(screen.getByText("OTHER OPTIONS")).toBeTruthy();
    expect(screen.queryByText("Tackle toxic debt")).toBeNull();

    fireEvent.click(screen.getByTestId("dashboard-next-step-compare-options"));

    expect(screen.getByText("Tackle toxic debt")).toBeTruthy();
  });
});
