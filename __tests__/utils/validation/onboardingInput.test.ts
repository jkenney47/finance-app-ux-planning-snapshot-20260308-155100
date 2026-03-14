import { parseCurrencyInput } from "@/utils/validation/onboardingInput";

describe("parseCurrencyInput", () => {
  describe("valid inputs", () => {
    it("parses whole numbers correctly", () => {
      expect(parseCurrencyInput("1000")).toBe(1000);
      expect(parseCurrencyInput("0")).toBe(0);
      expect(parseCurrencyInput("42")).toBe(42);
    });

    it("parses numbers with decimals correctly", () => {
      expect(parseCurrencyInput("1000.50")).toBe(1000.5);
      expect(parseCurrencyInput("0.99")).toBe(0.99);
      expect(parseCurrencyInput(".5")).toBe(0.5);
    });

    it("strips currency symbols and formatting characters", () => {
      expect(parseCurrencyInput("$1,000")).toBe(1000);
      expect(parseCurrencyInput("€1,000.50")).toBe(1000.5);
      expect(parseCurrencyInput("1,234,567.89")).toBe(1234567.89);
      expect(parseCurrencyInput("  $1,234  ")).toBe(1234);
      expect(parseCurrencyInput("£ 42")).toBe(42);
    });

    it("handles negative numbers", () => {
      expect(parseCurrencyInput("-1000")).toBe(-1000);
      expect(parseCurrencyInput("-$500")).toBe(-500);
      expect(parseCurrencyInput("-1,234.56")).toBe(-1234.56);
    });
  });

  describe("invalid inputs", () => {
    it("returns null for empty strings", () => {
      expect(parseCurrencyInput("")).toBeNull();
      expect(parseCurrencyInput("   ")).toBeNull();
    });

    it("returns null for strings without numbers", () => {
      expect(parseCurrencyInput("abc")).toBeNull();
      expect(parseCurrencyInput("$")).toBeNull();
      expect(parseCurrencyInput("-")).toBeNull();
      expect(parseCurrencyInput(".")).toBeNull();
      expect(parseCurrencyInput("$,.")).toBeNull();
    });

    it("handles multiple decimal points gracefully (JS Number parsing behavior)", () => {
      // In JavaScript, Number("1.2.3") is NaN. Our function returns null for NaN (since !Number.isFinite(NaN)).
      expect(parseCurrencyInput("1.2.3")).toBeNull();
      expect(parseCurrencyInput("1..5")).toBeNull();
    });

    it("handles multiple negative signs gracefully", () => {
      expect(parseCurrencyInput("--5")).toBeNull();
      expect(parseCurrencyInput("-5-")).toBeNull();
    });
  });
});
