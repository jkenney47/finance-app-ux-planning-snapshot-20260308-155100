import { MilestoneMeasurementDisclosure } from "@/components/dashboard/MilestoneMeasurementDisclosure";
import { fireEvent, render, screen } from "@test-utils";

describe("MilestoneMeasurementDisclosure", () => {
  it("reveals and hides measurement details on demand", () => {
    render(
      <MilestoneMeasurementDisclosure
        testID="measurement-toggle"
        reason="Measured using a rolling 30-day median daily balance."
      />,
    );

    expect(screen.getByText("How we measure this")).toBeTruthy();
    expect(
      screen.queryByText(
        "Measured using a rolling 30-day median daily balance.",
      ),
    ).toBeNull();

    fireEvent.click(screen.getByTestId("measurement-toggle"));

    expect(screen.getByText("Hide how we measure this")).toBeTruthy();
    expect(
      screen.getByText("Measured using a rolling 30-day median daily balance."),
    ).toBeTruthy();

    fireEvent.click(screen.getByTestId("measurement-toggle"));

    expect(screen.getByText("How we measure this")).toBeTruthy();
    expect(
      screen.queryByText(
        "Measured using a rolling 30-day median daily balance.",
      ),
    ).toBeNull();
  });
});
