import React from "react";
import { render, screen } from "@test-utils";
import { Text } from "react-native";
import { Sheet } from "@/components/common/Sheet";

describe("Sheet", () => {
  it("renders children when visible", () => {
    render(
      <Sheet isOpen={true} onDismiss={() => {}}>
        <Text>Sheet body content</Text>
      </Sheet>,
    );
    expect(screen.getByText("Sheet body content")).toBeTruthy();
  });

  it("does not render children when not visible", () => {
    render(
      <Sheet isOpen={false} onDismiss={() => {}}>
        <Text>Should Not Appear</Text>
      </Sheet>,
    );
    // Sheet is not open, so content should not be in the document
    expect(screen.queryByText("Should Not Appear")).toBeNull();
  });
});
