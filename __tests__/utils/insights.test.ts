import { deriveInsightsFromSummary } from "@/utils/insights";
import type { DashboardSummary, Transaction } from "@/utils/dashboard";

describe("deriveInsightsFromSummary", () => {
  it("should return empty array if summary is undefined", () => {
    expect(deriveInsightsFromSummary(undefined)).toEqual([]);
  });

  it("should return empty array if no accounts or transactions exist", () => {
    const summary: DashboardSummary = {
      netWorth: 0,
      netWorthDelta: 0,
      cashFlowPoints: [],
      accounts: [],
      transactions: [],
      institutionStatuses: [],
    };
    expect(deriveInsightsFromSummary(summary)).toEqual([]);
  });

  describe("cash cushion insight", () => {
    it("should generate growing insight for liquid savings < 10000", () => {
      const summary: DashboardSummary = {
        netWorth: 5000,
        netWorthDelta: 0,
        cashFlowPoints: [],
        accounts: [
          {
            id: "1",
            name: "Checking",
            type: "checking",
            balance: 5000,
            institution: "Bank",
          },
        ],
        transactions: [],
        institutionStatuses: [],
      };

      const insights = deriveInsightsFromSummary(summary);
      const cashInsight = insights.find((i) => i.id === "insight-cash-cushion");

      expect(cashInsight).toBeDefined();
      expect(cashInsight?.summary).toContain("growing");
      expect(cashInsight?.summary).toContain("building your emergency reserve");
    });

    it("should generate strong insight for liquid savings >= 10000", () => {
      const summary: DashboardSummary = {
        netWorth: 15000,
        netWorthDelta: 0,
        cashFlowPoints: [],
        accounts: [
          {
            id: "1",
            name: "Savings",
            type: "savings",
            balance: 15000,
            institution: "Bank",
          },
        ],
        transactions: [],
        institutionStatuses: [],
      };

      const insights = deriveInsightsFromSummary(summary);
      const cashInsight = insights.find((i) => i.id === "insight-cash-cushion");

      expect(cashInsight).toBeDefined();
      expect(cashInsight?.summary).toContain("strong enough to split cash");
    });
  });

  describe("debt focus insight", () => {
    it("should generate insight for highest debt account", () => {
      const summary: DashboardSummary = {
        netWorth: -6000,
        netWorthDelta: 0,
        cashFlowPoints: [],
        accounts: [
          {
            id: "1",
            name: "Credit Card A",
            type: "credit card",
            balance: -1000,
            institution: "Bank",
          },
          {
            id: "2",
            name: "Credit Card B",
            type: "credit card",
            balance: -5000,
            institution: "Bank",
          },
        ],
        transactions: [],
        institutionStatuses: [],
      };

      const insights = deriveInsightsFromSummary(summary);
      const debtInsight = insights.find((i) => i.id === "insight-debt-focus");

      expect(debtInsight).toBeDefined();
      expect(debtInsight?.summary).toContain("Credit Card B");
    });
  });

  describe("goal pacing insight", () => {
    it("should generate tight pacing insight when monthly net is <= 0", () => {
      const transactions: Transaction[] = [
        // Simulate income (amount >= 0)
        {
          id: "1",
          accountId: "1",
          amount: 3000,
          date: new Date().toISOString(),
          description: "Test transaction",
        },
        // Simulate expenses (amount < 0) greater than income
        {
          id: "2",
          accountId: "1",
          amount: -4000,
          date: new Date().toISOString(),
          description: "Test transaction",
        },
      ];

      const summary: DashboardSummary = {
        netWorth: 0,
        netWorthDelta: 0,
        cashFlowPoints: [],
        accounts: [],
        transactions,
        institutionStatuses: [],
      };

      const insights = deriveInsightsFromSummary(summary);
      const pacingInsight = insights.find(
        (i) => i.id === "insight-goal-pacing",
      );

      expect(pacingInsight).toBeDefined();
      expect(pacingInsight?.summary).toContain("tight");
    });

    it("should generate room to increase insight when monthly net is > 0", () => {
      const transactions: Transaction[] = [
        // Simulate income
        {
          id: "1",
          accountId: "1",
          amount: 5000,
          date: new Date().toISOString(),
          description: "Test transaction",
        },
        // Simulate expenses less than income
        {
          id: "2",
          accountId: "1",
          amount: -2000,
          date: new Date().toISOString(),
          description: "Test transaction",
        },
      ];

      const summary: DashboardSummary = {
        netWorth: 0,
        netWorthDelta: 0,
        cashFlowPoints: [],
        accounts: [],
        transactions,
        institutionStatuses: [],
      };

      const insights = deriveInsightsFromSummary(summary);
      const pacingInsight = insights.find(
        (i) => i.id === "insight-goal-pacing",
      );

      expect(pacingInsight).toBeDefined();
      expect(pacingInsight?.summary).toContain("room to increase");
    });
  });

  it("should return maximum of 3 insights", () => {
    const transactions: Transaction[] = [
      {
        id: "1",
        accountId: "1",
        amount: 5000,
        date: new Date().toISOString(),
        description: "Test transaction",
      },
      {
        id: "2",
        accountId: "1",
        amount: -2000,
        date: new Date().toISOString(),
        description: "Test transaction",
      },
    ];

    const summary: DashboardSummary = {
      netWorth: 10000,
      netWorthDelta: 0,
      cashFlowPoints: [],
      accounts: [
        {
          id: "1",
          name: "Checking",
          type: "checking",
          balance: 15000,
          institution: "Bank",
        },
        {
          id: "2",
          name: "Credit Card",
          type: "credit card",
          balance: -5000,
          institution: "Bank",
        },
      ],
      transactions,
      institutionStatuses: [],
    };

    const insights = deriveInsightsFromSummary(summary);
    expect(insights.length).toBeLessThanOrEqual(3);

    // We should get all three types since the data matches all conditions
    expect(insights.find((i) => i.id === "insight-cash-cushion")).toBeDefined();
    expect(insights.find((i) => i.id === "insight-debt-focus")).toBeDefined();
    expect(insights.find((i) => i.id === "insight-goal-pacing")).toBeDefined();
  });
});
