import { SegmentedControl } from "@/components/common/SegmentedControl";
import { fireEvent, render, screen } from "@test-utils";

describe("SegmentedControl", () => {
  it("calls onChange when a different option is pressed", () => {
    const onChange = jest.fn();

    render(
      <SegmentedControl
        value="explain"
        options={[
          { label: "Explain", value: "explain" },
          { label: "Plan", value: "plan" },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("Plan"));
    expect(onChange).toHaveBeenCalledWith("plan");
  });

  it("matches snapshot with accessibility metadata", () => {
    const { toJSON } = render(
      <SegmentedControl
        value="explain"
        options={[
          { label: "Explain", value: "explain" },
          { label: "Plan", value: "plan" },
        ]}
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText("Explain")).toBeTruthy();
    expect(toJSON()).toMatchSnapshot();
  });
});
