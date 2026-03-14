import { OptionCard } from "@/components/dashboard/OptionCard";
import type { Recommendation } from "@/utils/contracts/fme";
import { fireEvent, render, screen } from "@test-utils";

const baseRecommendation: Recommendation = {
  id: "build_fortress_fund",
  phase: "fortress_fund",
  title: "Build your fortress fund",
  summary: "Grow reserves toward your target runway.",
  actionLabel: "Open journey",
  actionRoute: "/(dashboard)/journey",
  analyticsEvent: "fme_build_fortress_fund",
  pros: ["Builds resilience"],
  cons: ["Requires higher near-term savings"],
  assumptions: ["Income remains stable", "Monthly burn stays predictable"],
  requiredFacts: [],
  policyDomains: ["thresholds"],
  priority: 10,
  traceRefs: [],
};

describe("OptionCard", () => {
  it("renders assumptions and high confidence when required facts are complete", () => {
    render(<OptionCard recommendation={baseRecommendation} />);

    expect(
      screen.getByText(
        "Confidence: High \u2014 All required inputs are currently available.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Assumptions: Income remains stable • Monthly burn stays predictable",
      ),
    ).toBeTruthy();
  });

  it("keeps normal recommendations high and downgrades collect-missing-facts confidence", () => {
    const { rerender } = render(
      <OptionCard
        recommendation={{
          ...baseRecommendation,
          requiredFacts: ["incomeMonthlyNet"],
        }}
      />,
    );

    expect(
      screen.getByText(
        "Confidence: High \u2014 All required inputs are currently available.",
      ),
    ).toBeTruthy();

    rerender(
      <OptionCard
        recommendation={{
          ...baseRecommendation,
          id: "collect_missing_facts",
          phase: "cash_flow_truth",
          requiredFacts: ["incomeMonthlyNet"],
        }}
      />,
    );

    expect(
      screen.getByText(
        "Confidence: Medium \u2014 1 required input still missing.",
      ),
    ).toBeTruthy();

    rerender(
      <OptionCard
        recommendation={{
          ...baseRecommendation,
          id: "collect_missing_facts",
          phase: "cash_flow_truth",
          requiredFacts: [
            "incomeMonthlyNet",
            "burnRateMonthly",
            "liquidSavings",
          ],
        }}
      />,
    );

    expect(
      screen.getByText(
        "Confidence: Low \u2014 3 required inputs still missing.",
      ),
    ).toBeTruthy();
  });

  it("opens details when View details is pressed", () => {
    const onPressViewDetails = jest.fn();
    render(
      <OptionCard
        recommendation={baseRecommendation}
        onPressViewDetails={onPressViewDetails}
      />,
    );

    fireEvent.click(screen.getByText("View details"));
    expect(onPressViewDetails).toHaveBeenCalledWith(baseRecommendation);
  });
});
