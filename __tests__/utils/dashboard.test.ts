import { makeFact } from "@/utils/contracts/facts";
import {
  getDashboardSummary,
  getMergedFinancialFacts,
  getMockDashboardSummary,
  getResolvedDashboardLinkedAccounts,
  type DashboardSummary,
} from "@/utils/dashboard";

jest.mock("@/utils/account", () => ({
  fetchLinkedAccounts: jest.fn(),
  isMockDataEnabled: () => true,
}));

jest.mock("@/utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString();
}

describe("dashboard utilities", () => {
  const originalNow = Date.now;

  beforeAll(() => {
    Date.now = jest.fn(() => Date.parse("2026-03-08T12:00:00.000Z"));
  });

  afterAll(() => {
    Date.now = originalNow;
  });

  it("returns the mock dashboard summary when real data is disabled", async () => {
    await expect(
      getDashboardSummary({
        hasMockLinkedAccounts: true,
        realDataEnabled: false,
      }),
    ).resolves.toEqual(getMockDashboardSummary(true));
  });

  it("resolves linked-account state from the summary and rollout flags", () => {
    const emptySummary: DashboardSummary = {
      netWorth: 0,
      netWorthDelta: 0,
      cashFlowPoints: [],
      accounts: [],
      transactions: [],
      institutionStatuses: [],
    };

    expect(
      getResolvedDashboardLinkedAccounts({
        summary: {
          ...emptySummary,
          accounts: [
            {
              id: "mock-acct-1",
              name: "Mock checking",
              type: "Checking",
              balance: 1800,
            },
          ],
        },
        hasMockLinkedAccounts: true,
        realDataEnabled: false,
      }),
    ).toBe(true);

    expect(
      getResolvedDashboardLinkedAccounts({
        summary: {
          ...emptySummary,
          accounts: [
            {
              id: "acct-1",
              name: "Primary checking",
              type: "Checking",
              balance: 2400,
            },
          ],
        },
        hasMockLinkedAccounts: false,
        realDataEnabled: true,
      }),
    ).toBe(true);
  });

  it("merges derived facts with explicit overrides", () => {
    const summary: DashboardSummary = {
      netWorth: 2600,
      netWorthDelta: 150,
      cashFlowPoints: [1200, 900],
      accounts: [
        {
          id: "checking-1",
          name: "Primary checking",
          type: "Checking",
          balance: 3200,
        },
        {
          id: "card-1",
          name: "Rewards card",
          type: "Credit Card",
          balance: -600,
        },
      ],
      transactions: [
        {
          id: "income-1",
          accountId: "checking-1",
          amount: 3200,
          date: isoDate(2026, 2, 20),
          description: "Payroll",
        },
        {
          id: "expense-1",
          accountId: "checking-1",
          amount: -2500,
          date: isoDate(2026, 2, 24),
          description: "Bills",
        },
      ],
      institutionStatuses: [],
    };

    const facts = getMergedFinancialFacts({
      summary,
      hasLinkedAccounts: true,
      factOverrides: {
        liquidSavings: makeFact("liquidSavings", 9999, "manual", 1),
      },
    });

    expect(facts.hasLinkedAccounts?.value).toBe(true);
    expect(facts.liquidSavings?.value).toBe(9999);
    expect(facts.debts?.value).toEqual([
      expect.objectContaining({
        id: "card-1",
        balance: 600,
        type: "credit_card",
      }),
    ]);
    expect(facts.incomeMonthlyNet?.value).toBeGreaterThan(0);
    expect(facts.burnRateMonthly?.value).toBeGreaterThan(0);
    expect(facts.cashFlowTight?.value).toBe(false);
  });
});
