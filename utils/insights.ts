import { deriveMonthlyCashFlowMetrics } from "@/utils/domain/fme/factsDerivation";
import { formatCurrency } from "@/utils/format";
import type { DashboardSummary } from "@/utils/dashboard";

export type DerivedInsight = {
  id: string;
  title: string;
  persona: string;
  summary: string;
  impact: string;
  category: string;
  actionRoute: "/(dashboard)/journey" | "/(dashboard)/goals";
};

export function deriveInsightsFromSummary(
  summary: DashboardSummary | undefined,
): DerivedInsight[] {
  if (!summary) {
    return [];
  }

  const insights: DerivedInsight[] = [];
  const accounts = summary.accounts ?? [];
  const transactions = summary.transactions ?? [];

  const liquidSavings = accounts
    .filter((account) => {
      const type = account.type.toLowerCase();
      return type.includes("checking") || type.includes("savings");
    })
    .reduce((total, account) => total + Math.max(account.balance, 0), 0);

  if (liquidSavings > 0) {
    insights.push({
      id: "insight-cash-cushion",
      title: "Cash cushion opportunity",
      persona: "Safety-first",
      summary:
        liquidSavings >= 10000
          ? "Your liquid balances are strong enough to split cash into emergency reserve and goal acceleration buckets."
          : "Your liquid balances are growing. Continue building your emergency reserve before taking on higher-risk allocations.",
      impact: `${formatCurrency(liquidSavings)} liquid`,
      category: "Cash management",
      actionRoute: "/(dashboard)/journey",
    });
  }

  const highestDebt = accounts
    .filter((account) => account.balance < 0)
    .sort((left, right) => left.balance - right.balance)[0];

  if (highestDebt) {
    insights.push({
      id: "insight-debt-focus",
      title: "Prioritize highest-cost debt",
      persona: "Optimizer",
      summary: `Your largest liability appears on ${highestDebt.name}. Directing extra payments there should improve monthly flexibility faster.`,
      impact: `${formatCurrency(Math.abs(highestDebt.balance))} liability`,
      category: "Debt strategy",
      actionRoute: "/(dashboard)/journey",
    });
  }

  const cashFlow = deriveMonthlyCashFlowMetrics(transactions);
  if (cashFlow) {
    const monthlyNet = cashFlow.incomeMonthlyNet - cashFlow.burnRateMonthly;
    insights.push({
      id: "insight-goal-pacing",
      title: "Goal pacing check",
      persona: "Builder",
      summary:
        monthlyNet > 0
          ? "Recent transaction flow suggests room to increase recurring goal contributions."
          : "Recent transaction flow is tight. Protect core obligations before increasing goal contributions.",
      impact: `${formatCurrency(monthlyNet)} monthly net`,
      category: "Goal progress",
      actionRoute: "/(dashboard)/goals",
    });
  }

  return insights.slice(0, 3);
}
