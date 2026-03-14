import type { Transaction } from "@/utils/contracts/decision";

export type MonthlyCashFlowMetrics = {
  incomeMonthlyNet: number;
  burnRateMonthly: number;
  cashFlowTight: boolean;
};

export function deriveMonthlyCashFlowMetrics(
  transactions: Transaction[],
  lookbackDays = 90,
): MonthlyCashFlowMetrics | null {
  if (transactions.length === 0) return null;
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const recentTransactions = transactions.filter((transaction) => {
    const parsedDate = new Date(transaction.date).getTime();
    return Number.isFinite(parsedDate) && parsedDate >= cutoff;
  });

  if (recentTransactions.length === 0) return null;

  const monthSet = new Set<string>();
  let incomeTotal = 0;
  let burnTotal = 0;

  for (const transaction of recentTransactions) {
    const parsed = new Date(transaction.date);
    const monthKey = `${parsed.getUTCFullYear()}-${parsed.getUTCMonth() + 1}`;
    monthSet.add(monthKey);
    if (transaction.amount >= 0) {
      incomeTotal += transaction.amount;
    } else {
      burnTotal += Math.abs(transaction.amount);
    }
  }

  const monthCount = Math.max(1, monthSet.size);
  const incomeMonthlyNet = incomeTotal / monthCount;
  const burnRateMonthly = burnTotal / monthCount;

  return {
    incomeMonthlyNet,
    burnRateMonthly,
    cashFlowTight:
      incomeMonthlyNet > 0 ? burnRateMonthly / incomeMonthlyNet >= 0.9 : true,
  };
}
