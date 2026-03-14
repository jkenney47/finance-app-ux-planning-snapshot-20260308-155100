import type { OnboardingState } from "@/utils/contracts/onboarding";
import type { DashboardSummary } from "@/utils/dashboard";
import { mapDashboardSummaryToSnapshot } from "@/utils/engine/accountSnapshotAdapter";
import { buildRoadmapPayload } from "@/utils/engine/roadmap/roadmapGenerationEngine";
import type {
  FinancialSnapshotPayload,
  LinkedAccountSnapshot,
  NumericMetric,
  RoadmapPayload,
} from "@/utils/engine/types";
import { getMockLinkedAccountSnapshot } from "@/utils/onboarding/mockLinking";

const RECENT_TRANSACTION_WINDOW_DAYS = 45;
const TRANSACTION_LOOKBACK_DAYS = 90;

function formatCurrency(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildNumericMetric(
  label: string,
  value: number | null | undefined,
): NumericMetric | undefined {
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }

  return {
    label,
    value: formatCurrency(value),
    rawValue: value,
  };
}

function latestIsoDate(values: Array<string | undefined>): string {
  const latest = values.reduce<number>((currentLatest, value) => {
    if (!value) return currentLatest;
    const parsed = new Date(value).getTime();
    if (!Number.isFinite(parsed)) return currentLatest;
    return Math.max(currentLatest, parsed);
  }, 0);

  return latest > 0 ? new Date(latest).toISOString() : new Date().toISOString();
}

function getMonthlyTransactionMetrics(snapshot: LinkedAccountSnapshot): {
  monthlyIncome?: number;
  monthlySpending?: number;
  monthlySurplus?: number;
  hasRecentTransactions: boolean;
} {
  if (snapshot.transactions.length === 0) {
    return {
      hasRecentTransactions: false,
    };
  }

  const cutoff = Date.now() - TRANSACTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const recentCutoff =
    Date.now() - RECENT_TRANSACTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const monthBuckets = new Map<string, { income: number; spending: number }>();
  let hasRecentTransactions = false;

  for (const transaction of snapshot.transactions) {
    const timestamp = new Date(transaction.date).getTime();
    if (!Number.isFinite(timestamp)) {
      continue;
    }

    if (timestamp >= recentCutoff) {
      hasRecentTransactions = true;
    }

    if (timestamp < cutoff || transaction.isPending) {
      continue;
    }

    const parsed = new Date(transaction.date);
    const monthKey = `${parsed.getUTCFullYear()}-${parsed.getUTCMonth() + 1}`;
    const bucket = monthBuckets.get(monthKey) ?? { income: 0, spending: 0 };

    if (transaction.direction === "inflow") {
      bucket.income += transaction.amount;
    } else {
      bucket.spending += transaction.amount;
    }

    monthBuckets.set(monthKey, bucket);
  }

  if (monthBuckets.size === 0) {
    return {
      hasRecentTransactions,
    };
  }

  const buckets = [...monthBuckets.values()];
  const monthCount = Math.max(1, buckets.length);
  const monthlyIncome =
    buckets.reduce((sum, bucket) => sum + bucket.income, 0) / monthCount;
  const monthlySpending =
    buckets.reduce((sum, bucket) => sum + bucket.spending, 0) / monthCount;

  return {
    monthlyIncome,
    monthlySpending,
    monthlySurplus: monthlyIncome - monthlySpending,
    hasRecentTransactions,
  };
}

export function resolveRoadmapSourceSnapshot(input: {
  linking: OnboardingState["linking"];
  summary?: DashboardSummary;
}): LinkedAccountSnapshot | null {
  if (input.linking.mockScenario !== "none") {
    return getMockLinkedAccountSnapshot(input.linking.mockScenario);
  }

  if (input.summary) {
    return mapDashboardSummaryToSnapshot(input.summary);
  }

  return null;
}

export function resolveCurrentRoadmapPayload(input: {
  intake: OnboardingState["intake"];
  linking: OnboardingState["linking"];
  summary?: DashboardSummary;
  fallbackRoadmap?: RoadmapPayload | null;
}): RoadmapPayload | null {
  if (!input.linking.coreTransactionalLinked) {
    return input.fallbackRoadmap ?? null;
  }

  const snapshot = resolveRoadmapSourceSnapshot({
    linking: input.linking,
    summary: input.summary,
  });

  if (!snapshot) {
    return input.fallbackRoadmap ?? null;
  }

  return buildRoadmapPayload({
    rawIntake: input.intake,
    snapshot,
  });
}

export function resolveFinancialSnapshotPayload(input: {
  linking: OnboardingState["linking"];
  summary?: DashboardSummary;
}): FinancialSnapshotPayload | null {
  const snapshot = resolveRoadmapSourceSnapshot({
    linking: input.linking,
    summary: input.summary,
  });

  if (
    !snapshot ||
    (snapshot.accounts.length === 0 && snapshot.transactions.length === 0)
  ) {
    return null;
  }

  const liquidCash = snapshot.accounts
    .filter(
      (account) => account.type === "checking" || account.type === "savings",
    )
    .reduce(
      (sum, account) => sum + Math.max(0, account.balanceCurrent ?? 0),
      0,
    );
  const debtBalance = snapshot.accounts
    .filter(
      (account) =>
        account.type === "credit_card" ||
        account.type === "loan" ||
        account.type === "mortgage",
    )
    .reduce(
      (sum, account) => sum + Math.max(0, account.balanceCurrent ?? 0),
      0,
    );
  const assetBalance = snapshot.accounts
    .filter(
      (account) =>
        account.type !== "credit_card" &&
        account.type !== "loan" &&
        account.type !== "mortgage",
    )
    .reduce(
      (sum, account) => sum + Math.max(0, account.balanceCurrent ?? 0),
      0,
    );
  const monthlyMetrics = getMonthlyTransactionMetrics(snapshot);
  const staleCategories = Array.from(
    new Set(
      (input.summary?.institutionStatuses ?? [])
        .filter((status) => status.status !== "connected")
        .map((status) => status.name),
    ),
  );

  return {
    asOf: latestIsoDate([
      ...snapshot.accounts.map((account) => account.lastUpdatedAt),
      ...snapshot.transactions.map((transaction) => transaction.date),
    ]),
    netWorth: buildNumericMetric("Net worth", assetBalance - debtBalance),
    liquidCash: buildNumericMetric("Liquid cash", liquidCash),
    monthlyIncome: buildNumericMetric(
      "Monthly income",
      monthlyMetrics.monthlyIncome,
    ),
    monthlySpending: buildNumericMetric(
      "Monthly spending",
      monthlyMetrics.monthlySpending,
    ),
    monthlySurplus: buildNumericMetric(
      "Monthly surplus / shortfall",
      monthlyMetrics.monthlySurplus,
    ),
    totalDebt: buildNumericMetric("Total debt", debtBalance),
    accountFreshness: {
      hasRecentTransactions: monthlyMetrics.hasRecentTransactions,
      staleCategories,
    },
  };
}

export function createRoadmapPayloadSignature(
  payload: RoadmapPayload | null | undefined,
): string {
  if (!payload) return "";

  return JSON.stringify({
    ...payload,
    engineMeta: {
      ...payload.engineMeta,
      generatedAt: "<normalized>",
    },
  });
}
