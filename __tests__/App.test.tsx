import React from "react";
import { render, screen } from "@test-utils";
import App from "../App";

test("renders welcome text", () => {
  render(<App />);
  expect(screen.getByText(/baseline app render/i)).toBeTruthy();
});
