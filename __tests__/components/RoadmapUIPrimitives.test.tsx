import { ContourBackdrop } from "@/components/dashboard/ContourBackdrop";
import { DynamicFocusTile } from "@/components/dashboard/DynamicFocusTile";
import { MetricTile } from "@/components/dashboard/MetricTile";
import { RoadmapStageTimeline } from "@/components/dashboard/RoadmapStageTimeline";
import { StepListItem } from "@/components/dashboard/StepListItem";
import { fireEvent, render, screen } from "@test-utils";

describe("Roadmap UI primitives", () => {
  it("renders roadmap stages and descriptions by default", () => {
    render(<RoadmapStageTimeline currentStage="Growth" />);

    expect(screen.getByText("Foundation")).toBeTruthy();
    expect(screen.getByText("Stability")).toBeTruthy();
    expect(screen.getByText("Growth")).toBeTruthy();
    expect(screen.getByText("Optimization")).toBeTruthy();
    expect(
      screen.getByText(
        "Increase savings efficiency and compound long-term progress.",
      ),
    ).toBeTruthy();
  });

  it("can hide roadmap stage descriptions", () => {
    render(
      <RoadmapStageTimeline
        currentStage="Stability"
        showDescriptions={false}
      />,
    );

    expect(
      screen.queryByText(
        "Reduce downside risk and stabilize monthly cash flow.",
      ),
    ).toBeNull();
  });

  it("renders metric tile content including optional description", () => {
    render(
      <MetricTile
        label="Cash runway"
        value="5.2 months"
        description="Resilience against income disruption."
      />,
    );

    expect(screen.getByText("Cash runway")).toBeTruthy();
    expect(screen.getByText("5.2 months")).toBeTruthy();
    expect(
      screen.getByText("Resilience against income disruption."),
    ).toBeTruthy();
  });

  it("toggles pin CTA text in dynamic focus tile and triggers callback", () => {
    const onTogglePin = jest.fn();
    const metric = {
      label: "Monthly cash flow",
      value: "$1,200",
      description: "Tracks surplus after fixed expenses.",
    };

    const { rerender } = render(
      <DynamicFocusTile
        metric={metric}
        isPinned={false}
        onTogglePin={onTogglePin}
      />,
    );

    fireEvent.click(screen.getByText("Pin this metric"));
    expect(onTogglePin).toHaveBeenCalledTimes(1);

    rerender(
      <DynamicFocusTile metric={metric} isPinned onTogglePin={onTogglePin} />,
    );
    expect(screen.getByText("Use dynamic focus")).toBeTruthy();
  });

  it("renders primary step list item with start action", () => {
    const onPress = jest.fn();
    render(
      <StepListItem
        title="Build emergency reserve"
        summary="Grow reserves to improve runway coverage."
        impact="High"
        effort="Medium"
        confidence="Medium"
        statusLabel="Suggested"
        isPrimary
        onPress={onPress}
      />,
    );

    fireEvent.click(screen.getByText("Start this step"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders secondary step list item with compare action", () => {
    const onPress = jest.fn();
    render(
      <StepListItem
        title="Accelerate debt payoff"
        summary="Use surplus toward highest APR debt first."
        impact="Medium"
        effort="Low"
        confidence="High"
        statusLabel="Alternative"
        sourceNote="Source: Strategy fallback (non-modeled)"
        onPress={onPress}
      />,
    );

    expect(
      screen.getByText("Source: Strategy fallback (non-modeled)"),
    ).toBeTruthy();
    fireEvent.click(screen.getByText("Compare option"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders contour backdrop rings without crashing", () => {
    const { toJSON } = render(<ContourBackdrop />);
    expect(toJSON()).toBeTruthy();
  });
});
