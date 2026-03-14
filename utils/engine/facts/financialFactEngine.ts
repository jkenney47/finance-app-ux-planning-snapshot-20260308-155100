import { engineConfig } from "@/utils/engine/config/engineConfig";
import type {
  DerivedPlanningSignals,
  FinancialFacts,
  IntakeAnswers,
  LinkedAccount,
  LinkedAccountSnapshot,
  Transaction,
} from "@/utils/engine/types";

type MonthlyBucket = {
  income: number;
  essential: number;
  discretionary: number;
};

function monthKey(date: string): string {
  const parsed = new Date(date);
  return `${parsed.getUTCFullYear()}-${parsed.getUTCMonth() + 1}`;
}

function isEssentialTransaction(transaction: Transaction): boolean {
  const category =
    transaction.categoryPrimary?.toLowerCase() ??
    transaction.categoryDetailed?.toLowerCase() ??
    transaction.merchantName?.toLowerCase() ??
    "";
  return [
    "housing",
    "rent",
    "mortgage",
    "utility",
    "utilities",
    "food",
    "groceries",
    "insurance",
    "health",
    "medical",
    "transport",
    "childcare",
    "essentials",
    "debt",
  ].some((token) => category.includes(token));
}

function getMonthlyBuckets(
  transactions: Transaction[],
): Map<string, MonthlyBucket> {
  const buckets = new Map<string, MonthlyBucket>();

  for (const transaction of transactions) {
    if (transaction.isPending) continue;
    const key = monthKey(transaction.date);
    const current = buckets.get(key) ?? {
      income: 0,
      essential: 0,
      discretionary: 0,
    };

    if (transaction.direction === "inflow") {
      current.income += transaction.amount;
    } else if (isEssentialTransaction(transaction)) {
      current.essential += transaction.amount;
    } else {
      current.discretionary += transaction.amount;
    }

    buckets.set(key, current);
  }

  return buckets;
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function balanceOf(account: LinkedAccount): number {
  if (typeof account.balanceCurrent === "number") {
    return account.balanceCurrent;
  }
  if (typeof account.balanceAvailable === "number") {
    return account.balanceAvailable;
  }
  return 0;
}

export function deriveFinancialFacts(args: {
  snapshot: LinkedAccountSnapshot;
  intake: IntakeAnswers;
  signals: DerivedPlanningSignals;
}): FinancialFacts {
  const { snapshot, intake, signals } = args;
  const monthlyBuckets = getMonthlyBuckets(snapshot.transactions);
  const bucketValues = [...monthlyBuckets.values()];

  const avgMonthlyIncome = average(bucketValues.map((bucket) => bucket.income));
  const avgMonthlyEssentialExpenses = average(
    bucketValues.map((bucket) => bucket.essential),
  );
  const avgMonthlyDiscretionaryExpenses = average(
    bucketValues.map((bucket) => bucket.discretionary),
  );
  const avgMonthlyNetCashFlow =
    avgMonthlyIncome != null &&
    avgMonthlyEssentialExpenses != null &&
    avgMonthlyDiscretionaryExpenses != null
      ? avgMonthlyIncome -
        avgMonthlyEssentialExpenses -
        avgMonthlyDiscretionaryExpenses
      : undefined;

  const monthsNegativeNetCashFlowLast3 = bucketValues.filter((bucket) => {
    const net = bucket.income - bucket.essential - bucket.discretionary;
    return net < engineConfig.cashflow.stage1MinimumSurplusUsd;
  }).length;

  const monthsEssentialShortfallLast3 = bucketValues.filter(
    (bucket) => bucket.income < bucket.essential,
  ).length;

  const liquidAccounts = snapshot.accounts.filter(
    (account) => account.type === "checking" || account.type === "savings",
  );
  const debtAccounts = snapshot.accounts.filter(
    (account) => account.type === "credit_card" || account.type === "loan",
  );
  const mortgageAccounts = snapshot.accounts.filter(
    (account) => account.type === "mortgage",
  );
  const retirementAccounts = snapshot.accounts.filter(
    (account) => account.type === "retirement" || account.type === "brokerage",
  );

  const liquidCash = liquidAccounts.reduce(
    (sum, account) => sum + Math.max(0, balanceOf(account)),
    0,
  );

  const totalDebtBalance = debtAccounts.reduce(
    (sum, account) => sum + Math.max(0, balanceOf(account)),
    0,
  );
  const totalMortgageBalance = mortgageAccounts.reduce(
    (sum, account) => sum + Math.max(0, balanceOf(account)),
    0,
  );
  const highestNonMortgageApr = debtAccounts.reduce<number | undefined>(
    (highest, account) => {
      if (typeof account.apr !== "number") return highest;
      return highest == null ? account.apr : Math.max(highest, account.apr);
    },
    undefined,
  );
  const highInterestDebtBalance = debtAccounts.reduce((sum, account) => {
    if (
      typeof account.apr === "number" &&
      account.apr >= engineConfig.debt.highInterestAprThreshold
    ) {
      return sum + Math.max(0, balanceOf(account));
    }
    return sum;
  }, 0);
  const moderateInterestDebtBalance = debtAccounts.reduce((sum, account) => {
    if (
      typeof account.apr === "number" &&
      account.apr >= engineConfig.debt.moderateInterestAprThreshold &&
      account.apr < engineConfig.debt.highInterestAprThreshold
    ) {
      return sum + Math.max(0, balanceOf(account));
    }
    return sum;
  }, 0);
  const likelyHighInterestDebtBalance = debtAccounts.reduce((sum, account) => {
    if (account.type === "credit_card" && typeof account.apr !== "number") {
      return sum + Math.max(0, balanceOf(account));
    }
    return sum;
  }, 0);
  const totalMinimumDebtPayments = debtAccounts.reduce(
    (sum, account) => sum + Math.max(0, account.minimumPayment ?? 0),
    0,
  );

  const emergencyFundMonths =
    avgMonthlyEssentialExpenses && avgMonthlyEssentialExpenses > 0
      ? liquidCash / avgMonthlyEssentialExpenses
      : null;

  const retirementAccountBalance = retirementAccounts.reduce(
    (sum, account) => sum + Math.max(0, balanceOf(account)),
    0,
  );

  const recentOverdraftSignal = snapshot.transactions.some((transaction) =>
    (transaction.merchantName ?? "").toLowerCase().includes("overdraft"),
  );
  const recentLatePaymentSignal = snapshot.transactions.some((transaction) =>
    (transaction.merchantName ?? transaction.categoryPrimary ?? "")
      .toLowerCase()
      .includes("late"),
  );

  return {
    avgMonthlyIncome,
    avgMonthlyEssentialExpenses,
    avgMonthlyDiscretionaryExpenses,
    avgMonthlyNetCashFlow,
    monthsNegativeNetCashFlowLast3,
    monthsEssentialShortfallLast3,
    recentOverdraftSignal,
    recentLatePaymentSignal,
    liquidCash,
    starterBufferCoverageRatio:
      liquidCash > 0
        ? liquidCash /
          Math.max(engineConfig.buffers.starterBufferHardFloorUsd, 1)
        : 0,
    emergencyFundMonths,
    totalDebtBalance: totalDebtBalance + totalMortgageBalance,
    totalNonMortgageDebtBalance: totalDebtBalance,
    totalMortgageBalance,
    totalMinimumDebtPayments,
    highestNonMortgageApr,
    highInterestDebtBalance,
    moderateInterestDebtBalance,
    likelyHighInterestDebtBalance,
    retirementAccountBalance,
    estimatedRetirementContributionRate: null,
    employerMatchAvailable:
      intake.employerMatch === "unknown"
        ? null
        : intake.employerMatch === "yes",
    fullEmployerMatchCaptured:
      intake.fullMatchContribution == null ||
      intake.fullMatchContribution === "unknown"
        ? null
        : intake.fullMatchContribution === "yes",
    activeNearTermGoal: signals.goalSignals.nearTermGoal,
    activeNearTermGoalType: intake.majorGoalType ?? null,
    activeNearTermGoalMonths: signals.goalSignals.goalTimingMonths ?? null,
    behindOnBills:
      intake.monthlySituation === "behind_or_juggling" ||
      monthsEssentialShortfallLast3 >= 1 ||
      recentLatePaymentSignal,
    negativeMonthlyMargin:
      intake.essentialsCoverage === "not_consistent" ||
      (avgMonthlyNetCashFlow ?? 0) <
        engineConfig.cashflow.stage1MinimumSurplusUsd,
    starterEmergencyFundReady: undefined,
    fullEmergencyFundReady: undefined,
    hasExpensiveDebt:
      highInterestDebtBalance > 0 ||
      (likelyHighInterestDebtBalance > 0 &&
        signals.debtUrgencySignal === "high"),
    hasModerateDebt: moderateInterestDebtBalance > 0,
    nearTermGoalNeedsFunding: signals.goalSignals.nearTermGoal,
  };
}
