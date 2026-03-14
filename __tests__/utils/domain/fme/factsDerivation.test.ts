import { deriveMonthlyCashFlowMetrics } from "../../../../utils/domain/fme/factsDerivation";
import type { Transaction } from "../../../../utils/contracts/decision";

describe("deriveMonthlyCashFlowMetrics", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2023-10-15T12:00:00Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const createTransaction = (
    override: Partial<Transaction> = {},
  ): Transaction => ({
    id: "tx-1",
    date: "2023-10-01T10:00:00Z",
    amount: 100,
    description: "Test",
    accountId: "acc-1",
    ...override,
  });

  it("returns null if transactions array is empty", () => {
    expect(deriveMonthlyCashFlowMetrics([])).toBeNull();
  });

  it("returns null if no recent transactions", () => {
    const oldTransaction = createTransaction({
      date: "2022-01-01T10:00:00Z",
      amount: 1000,
    });
    expect(deriveMonthlyCashFlowMetrics([oldTransaction])).toBeNull();
  });

  it("calculates metrics for a single month", () => {
    const transactions = [
      createTransaction({ date: "2023-10-01T10:00:00Z", amount: 3000 }), // income
      createTransaction({ date: "2023-10-02T10:00:00Z", amount: -1500 }), // burn
      createTransaction({ date: "2023-10-05T10:00:00Z", amount: -500 }), // burn
    ];

    const result = deriveMonthlyCashFlowMetrics(transactions);
    expect(result).toEqual({
      incomeMonthlyNet: 3000,
      burnRateMonthly: 2000,
      cashFlowTight: false, // 2000 / 3000 = 0.66 < 0.9
    });
  });

  it("calculates metrics across multiple months", () => {
    const transactions = [
      createTransaction({ date: "2023-09-15T10:00:00Z", amount: 3000 }), // Sept income
      createTransaction({ date: "2023-09-20T10:00:00Z", amount: -1000 }), // Sept burn
      createTransaction({ date: "2023-10-01T10:00:00Z", amount: 4000 }), // Oct income
      createTransaction({ date: "2023-10-05T10:00:00Z", amount: -2000 }), // Oct burn
    ];

    const result = deriveMonthlyCashFlowMetrics(transactions);
    // Two months: Sept and Oct
    // Total income: 7000, monthly net: 3500
    // Total burn: 3000, monthly burn: 1500
    expect(result).toEqual({
      incomeMonthlyNet: 3500,
      burnRateMonthly: 1500,
      cashFlowTight: false, // 1500 / 3500 = 0.42 < 0.9
    });
  });

  it("identifies tight cash flow when burn rate is >= 90% of income", () => {
    const transactions = [
      createTransaction({ date: "2023-10-01T10:00:00Z", amount: 1000 }), // income
      createTransaction({ date: "2023-10-05T10:00:00Z", amount: -950 }), // burn
    ];

    const result = deriveMonthlyCashFlowMetrics(transactions);
    expect(result).toEqual({
      incomeMonthlyNet: 1000,
      burnRateMonthly: 950,
      cashFlowTight: true, // 950 / 1000 = 0.95 >= 0.9
    });
  });

  it("identifies tight cash flow when income is 0", () => {
    const transactions = [
      createTransaction({ date: "2023-10-05T10:00:00Z", amount: -500 }), // burn only
    ];

    const result = deriveMonthlyCashFlowMetrics(transactions);
    expect(result).toEqual({
      incomeMonthlyNet: 0,
      burnRateMonthly: 500,
      cashFlowTight: true,
    });
  });

  it("ignores transactions with invalid dates", () => {
    const transactions = [
      createTransaction({ date: "invalid-date", amount: 1000 }), // invalid
      createTransaction({ date: "2023-10-01T10:00:00Z", amount: 2000 }), // valid
    ];

    const result = deriveMonthlyCashFlowMetrics(transactions);
    expect(result).toEqual({
      incomeMonthlyNet: 2000,
      burnRateMonthly: 0,
      cashFlowTight: false,
    });
  });

  it("handles custom lookbackDays", () => {
    const transactions = [
      createTransaction({ date: "2023-09-01T10:00:00Z", amount: 1000 }), // 44 days ago
    ];

    // Using 30 days lookback should exclude the transaction
    expect(deriveMonthlyCashFlowMetrics(transactions, 30)).toBeNull();

    // Using 60 days lookback should include the transaction
    const result = deriveMonthlyCashFlowMetrics(transactions, 60);
    expect(result).toEqual({
      incomeMonthlyNet: 1000,
      burnRateMonthly: 0,
      cashFlowTight: false,
    });
  });
});
