import type { Transaction } from "@/utils/contracts/decision";
import { deriveMonthlyCashFlowMetrics } from "@/utils/domain/fme/factsDerivation";

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

describe("deriveMonthlyCashFlowMetrics", () => {
  const originalNow = Date.now;

  beforeAll(() => {
    Date.now = jest.fn(() => Date.parse("2026-02-17T12:00:00.000Z"));
  });

  afterAll(() => {
    Date.now = originalNow;
  });

  it("returns null when no recent transactions are available", () => {
    const transactions: Transaction[] = [
      {
        id: "old-1",
        date: isoDate(2025, 5, 1),
        amount: 1200,
        description: "Old payroll",
        accountId: "acc-1",
      },
    ];

    expect(deriveMonthlyCashFlowMetrics(transactions, 60)).toBeNull();
  });

  it("derives monthly income and burn from recent transactions", () => {
    const transactions: Transaction[] = [
      {
        id: "jan-pay",
        date: isoDate(2026, 1, 5),
        amount: 3000,
        description: "Payroll",
        accountId: "acc-1",
      },
      {
        id: "jan-rent",
        date: isoDate(2026, 1, 7),
        amount: -1500,
        description: "Rent",
        accountId: "acc-1",
      },
      {
        id: "feb-pay",
        date: isoDate(2026, 2, 5),
        amount: 3200,
        description: "Payroll",
        accountId: "acc-1",
      },
      {
        id: "feb-grocery",
        date: isoDate(2026, 2, 8),
        amount: -900,
        description: "Groceries",
        accountId: "acc-1",
      },
    ];

    const metrics = deriveMonthlyCashFlowMetrics(transactions, 90);
    expect(metrics).not.toBeNull();
    expect(metrics?.incomeMonthlyNet).toBeCloseTo(3100, 6);
    expect(metrics?.burnRateMonthly).toBeCloseTo(1200, 6);
    expect(metrics?.cashFlowTight).toBe(false);
  });
});
