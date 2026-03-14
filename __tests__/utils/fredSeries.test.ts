import {
  computeYearOverYearInflation,
  parseFredSeries,
  parseLatestFredValue,
  toDecimalPercent,
} from "@/supabase/functions/_shared/fred";

describe("fred series helpers", () => {
  it("parses series and skips missing rows", () => {
    const csv = [
      "DATE,CPIAUCSL",
      "2025-01-01,310.0",
      "2025-02-01,.",
      "2025-03-01,312.5",
    ].join("\n");

    const points = parseFredSeries(csv);
    expect(points).toEqual([
      { date: "2025-01-01", value: 310 },
      { date: "2025-03-01", value: 312.5 },
    ]);
  });

  it("returns latest value from csv", () => {
    const csv = ["DATE,DFF", "2026-01-01,4.33", "2026-02-01,4.25"].join("\n");

    expect(parseLatestFredValue(csv)).toBe(4.25);
  });

  it("computes year-over-year inflation from monthly points", () => {
    const points = [
      { date: "2025-01-01", value: 300 },
      { date: "2025-02-01", value: 301 },
      { date: "2025-03-01", value: 302 },
      { date: "2025-04-01", value: 303 },
      { date: "2025-05-01", value: 304 },
      { date: "2025-06-01", value: 305 },
      { date: "2025-07-01", value: 306 },
      { date: "2025-08-01", value: 307 },
      { date: "2025-09-01", value: 308 },
      { date: "2025-10-01", value: 309 },
      { date: "2025-11-01", value: 310 },
      { date: "2025-12-01", value: 311 },
      { date: "2026-01-01", value: 315 },
    ];

    expect(computeYearOverYearInflation(points)).toBeCloseTo(0.05, 6);
  });

  describe("toDecimalPercent", () => {
    it("converts positive percent values into decimal percent", () => {
      expect(toDecimalPercent(4.25)).toBe(0.0425);
      expect(toDecimalPercent(100)).toBe(1);
      expect(toDecimalPercent(0.5)).toBe(0.005);
    });

    it("converts negative percent values into decimal percent", () => {
      expect(toDecimalPercent(-2.5)).toBe(-0.025);
      expect(toDecimalPercent(-100)).toBe(-1);
    });

    it("handles zero correctly", () => {
      expect(toDecimalPercent(0)).toBe(0);
      expect(toDecimalPercent(-0)).toBe(-0);
    });

    it("rounds to 6 decimal places", () => {
      // 1 / 3 = 0.333333333... -> percent is 33.333333333... -> decimal is 0.333333
      expect(toDecimalPercent(33.333333333)).toBe(0.333333);
      // 0.1234567 -> 0.001235
      expect(toDecimalPercent(0.1234567)).toBe(0.001235);
    });
  });
});
