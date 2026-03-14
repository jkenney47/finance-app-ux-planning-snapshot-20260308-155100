import { formatCurrency, formatDate, formatPercent } from "@/utils/format";

describe("format utilities", () => {
  it("formats currency defaults for small and large values", () => {
    expect(formatCurrency(12.34)).toBe(
      Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
      }).format(12.34),
    );

    expect(formatCurrency(1234)).toBe(
      Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(1234),
    );
  });

  it("formats currency with explicit options", () => {
    expect(
      formatCurrency(1234.56, {
        currency: "EUR",
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
        useGrouping: false,
      }),
    ).toBe(
      Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
        useGrouping: false,
      }).format(1234.56),
    );
  });

  it("formats dates from Date instances and primitive values", () => {
    const inputDate = new Date("2024-06-01T12:00:00.000Z");
    expect(formatDate(inputDate)).toBe(
      Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
        inputDate,
      ),
    );

    const inputString = "2024-06-01T12:00:00.000Z";
    expect(
      formatDate(inputString, {
        month: "long",
        day: "2-digit",
        year: "2-digit",
      }),
    ).toBe(
      Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "2-digit",
        year: "2-digit",
      }).format(new Date(inputString)),
    );
  });

  it("formats percentages with default and explicit precision", () => {
    expect(formatPercent(0.1234)).toBe("12.3%");
    expect(formatPercent(0.1234, 2)).toBe("12.34%");
  });

  it("formats percentages for 0 and negative values", () => {
    expect(formatPercent(0)).toBe("0.0%");
    expect(formatPercent(-0.1234)).toBe("-12.3%");
  });

  it("formats percentages with exact rounding parameters", () => {
    expect(formatPercent(0.12345, 2)).toBe("12.35%");
  });
});
