import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";

import { AppearView } from "@/components/common/AppearView";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { CoverageConfidenceBadge } from "@/components/dashboard/CoverageConfidenceBadge";
import { TrendLineChart } from "@/components/dashboard/TrendLineChart";
import { AdviceBoundaryNotice } from "@/components/notice/AdviceBoundaryNotice";
import { EmptyHint, ErrorNotice, Skeleton } from "@/components/state";
import { buildDashboardRefreshErrorDescription } from "@/components/state/asyncCopy";
import { Text } from "@/components/ui/text";
import {
  useDashboardSummary,
  useFinancialMaturityEvaluation,
} from "@/hooks/useDashboardData";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import type { Transaction } from "@/utils/contracts/decision";
import { formatCurrency } from "@/utils/format";
import { deriveCoverageConfidence } from "@/utils/roadmap/confidence";

type InsightState = "auto" | "ready" | "loading" | "empty" | "error";
type CashFlowView = "trend" | "actual";

type SpendingCategory = {
  name: string;
  total: number;
};

const STATE_OPTIONS: Array<{
  label: string;
  value: InsightState;
  testID: string;
}> = [
  { label: "Auto", value: "auto", testID: "insights-screen-state-auto" },
  { label: "Ready", value: "ready", testID: "insights-screen-state-ready" },
  {
    label: "Loading",
    value: "loading",
    testID: "insights-screen-state-loading",
  },
  { label: "Empty", value: "empty", testID: "insights-screen-state-empty" },
  { label: "Error", value: "error", testID: "insights-screen-state-error" },
];

const CASHFLOW_VIEW_OPTIONS = [
  { label: "Trend", value: "trend" },
  { label: "Actual", value: "actual" },
] as const;

function smoothSeries(values: number[], windowSize = 3): number[] {
  if (values.length <= 2) {
    return values;
  }

  return values.map((_, index) => {
    const start = Math.max(0, index - (windowSize - 1));
    const slice = values.slice(start, index + 1);
    const total = slice.reduce((sum, value) => sum + value, 0);
    return total / slice.length;
  });
}

function inferSpendingCategory(transaction: Transaction): string {
  const description = transaction.description.toLowerCase();

  if (description.includes("rent") || description.includes("mortgage")) {
    return "Housing";
  }
  if (description.includes("grocery") || description.includes("market")) {
    return "Groceries";
  }
  if (description.includes("utility") || description.includes("electric")) {
    return "Utilities";
  }
  if (
    description.includes("transit") ||
    description.includes("uber") ||
    description.includes("gas")
  ) {
    return "Transportation";
  }
  if (description.includes("insurance")) {
    return "Insurance";
  }
  if (description.includes("credit card") || description.includes("loan")) {
    return "Debt payments";
  }

  return "Other";
}

function deriveSpendingCategories(
  transactions: Transaction[],
): SpendingCategory[] {
  const expenses = transactions.filter((transaction) => transaction.amount < 0);
  const totals = expenses.reduce<Record<string, number>>((acc, transaction) => {
    const category = inferSpendingCategory(transaction);
    const amount = Math.abs(transaction.amount);
    acc[category] = (acc[category] ?? 0) + amount;
    return acc;
  }, {});

  return Object.entries(totals)
    .map(([name, total]) => ({ name, total }))
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);
}

function describeCashFlow(values: number[]): string {
  if (values.length === 0) {
    return "Link at least one account to unlock trend analysis.";
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average < 0) {
    return "Your average cash flow is negative, which can reduce runway if unchanged.";
  }

  return "Your average cash flow is positive, which supports steady roadmap progress.";
}

function cashFlowAction(values: number[]): string {
  if (values.length === 0) {
    return "Connect one checking account first so we can estimate monthly inflows and outflows.";
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (average < 0) {
    const target = Math.ceil(Math.abs(average) / 50) * 50;
    return `Aim to close at least ${formatCurrency(target)} of monthly gap this cycle.`;
  }

  return "Allocate part of your surplus to your current roadmap step this month.";
}

function spendingMeaning(categories: SpendingCategory[]): string {
  if (categories.length === 0) {
    return "No spending transactions are available yet.";
  }

  const total = categories.reduce((sum, category) => sum + category.total, 0);
  const topCategory = categories[0];
  const topShare = topCategory.total / Math.max(total, 1);

  if (topShare >= 0.45) {
    return `${topCategory.name} drives ${Math.round(topShare * 100)}% of observed spending.`;
  }

  return "Your spending is distributed across multiple categories with no single outlier.";
}

function spendingAction(categories: SpendingCategory[]): string {
  if (categories.length === 0) {
    return "Review recent transactions after linking accounts to identify optimization opportunities.";
  }

  const topCategory = categories[0];
  return `Audit ${topCategory.name.toLowerCase()} first for the fastest spending improvement.`;
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export default function InsightsScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const openAsk = useAskStore((state) => state.open);
  const setAskContext = useAskStore((state) => state.setContext);

  const summaryQuery = useDashboardSummary();
  const fme = useFinancialMaturityEvaluation(summaryQuery.data);
  const coverageConfidence = useMemo(
    () =>
      deriveCoverageConfidence(
        fme.evaluation,
        fme.facts,
        summaryQuery.data?.institutionStatuses,
      ),
    [fme.evaluation, fme.facts, summaryQuery.data?.institutionStatuses],
  );
  const connectedAccountCount = summaryQuery.data?.accounts.length ?? 0;
  const disconnectedInstitutionCount = (
    summaryQuery.data?.institutionStatuses ?? []
  ).filter(
    (institution) =>
      institution.status === "relink" || institution.status === "error",
  ).length;

  const [screenState, setScreenState] = useState<InsightState>("auto");
  const [cashFlowView, setCashFlowView] = useState<CashFlowView>("trend");
  const [showNetWorthDetails, setShowNetWorthDetails] = useState(false);

  const cashFlowPoints = useMemo(
    () => summaryQuery.data?.cashFlowPoints ?? [],
    [summaryQuery.data?.cashFlowPoints],
  );
  const cashFlowTrend = useMemo(
    () => smoothSeries(cashFlowPoints),
    [cashFlowPoints],
  );
  const displayedCashFlow =
    cashFlowView === "trend" ? cashFlowTrend : cashFlowPoints;

  const spendingCategories = useMemo(
    () => deriveSpendingCategories(summaryQuery.data?.transactions ?? []),
    [summaryQuery.data?.transactions],
  );

  const netWorthSeries = useMemo(() => {
    const current = summaryQuery.data?.netWorth ?? 0;
    const delta = summaryQuery.data?.netWorthDelta ?? 0;
    return [current - delta, current];
  }, [summaryQuery.data?.netWorth, summaryQuery.data?.netWorthDelta]);

  const roadmapAction = fme.evaluation.primaryRecommendation;
  const activeMetricId = showNetWorthDetails
    ? "net_worth"
    : cashFlowView === "trend"
      ? "cash_flow_trend"
      : "cash_flow_actual";

  const resolvedState = useMemo<InsightState>(() => {
    if (screenState !== "auto") {
      return screenState;
    }

    if (summaryQuery.isLoading || fme.isPolicyLoading) {
      return "loading";
    }

    if (summaryQuery.isError || fme.isPolicyError) {
      return "error";
    }

    if (
      cashFlowPoints.length === 0 &&
      spendingCategories.length === 0 &&
      (summaryQuery.data?.netWorth ?? 0) === 0
    ) {
      return "empty";
    }

    return "ready";
  }, [
    cashFlowPoints.length,
    fme.isPolicyError,
    fme.isPolicyLoading,
    screenState,
    spendingCategories.length,
    summaryQuery.data?.netWorth,
    summaryQuery.isError,
    summaryQuery.isLoading,
  ]);

  useEffect(() => {
    setAskContext({
      screen: "insights",
      metricId: activeMetricId,
      recommendationId: roadmapAction?.id,
      stepId: roadmapAction?.id,
    });
  }, [activeMetricId, roadmapAction?.id, setAskContext]);

  const renderReadyContent = (): JSX.Element => {
    const maxSpending = Math.max(
      ...spendingCategories.map((entry) => entry.total),
      1,
    );
    const netWorthDelta = summaryQuery.data?.netWorthDelta ?? 0;

    return (
      <View style={{ gap: tokens.space.md }}>
        <AppearView delayMs={40}>
          <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text variant="titleMedium" style={{ color: colors.text }}>
                  Cash flow trend
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  Smoothed by default to reduce noise.
                </Text>
              </View>
              <View style={{ width: 170 }}>
                <SegmentedControl
                  value={cashFlowView}
                  onChange={(value) => setCashFlowView(value as CashFlowView)}
                  options={CASHFLOW_VIEW_OPTIONS.map((option) => ({
                    ...option,
                  }))}
                />
              </View>
            </View>

            <TrendLineChart
              points={displayedCashFlow}
              accessibilityLabel="Cash flow trend chart"
            />

            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`What this means: ${describeCashFlow(displayedCashFlow)}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`What to do: ${cashFlowAction(displayedCashFlow)}`}
            </Text>
          </SurfaceCard>
        </AppearView>

        <AppearView delayMs={80}>
          <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Spending by category
            </Text>
            {spendingCategories.length === 0 ? (
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                No expense categories yet.
              </Text>
            ) : (
              spendingCategories.map((category) => (
                <View key={category.name} style={{ gap: 6 }}>
                  <View className="flex-row items-center justify-between gap-3">
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.textMuted }}
                    >
                      {category.name}
                    </Text>
                    <Text
                      variant="labelMedium"
                      style={{ color: colors.text, fontWeight: "700" }}
                    >
                      {formatCurrency(category.total)}
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: colors.surface2,
                    }}
                  >
                    <View
                      style={{
                        height: 8,
                        borderRadius: 999,
                        width: `${Math.max(12, (category.total / maxSpending) * 100)}%`,
                        backgroundColor: colors.accent,
                      }}
                    />
                  </View>
                </View>
              ))
            )}

            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`What this means: ${spendingMeaning(spendingCategories)}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`What to do: ${spendingAction(spendingCategories)}`}
            </Text>
          </SurfaceCard>
        </AppearView>

        <AppearView delayMs={120}>
          <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Net worth
            </Text>
            <Text
              variant="titleSmall"
              style={{
                color: netWorthDelta >= 0 ? colors.positive : colors.warning,
                fontWeight: "700",
              }}
            >
              {netWorthDelta >= 0
                ? `Up ${formatCurrency(netWorthDelta)}`
                : `Down ${formatCurrency(Math.abs(netWorthDelta))}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Net worth is tracked for long-term direction, not day-to-day
              urgency.
            </Text>
            <SecondaryButton
              compact
              onPress={() =>
                setShowNetWorthDetails((currentValue) => !currentValue)
              }
            >
              {showNetWorthDetails
                ? "Hide net worth details"
                : "View net worth details"}
            </SecondaryButton>
            {showNetWorthDetails ? (
              <>
                <TrendLineChart
                  points={netWorthSeries}
                  accessibilityLabel="Net worth trend chart"
                />
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  What this means: Net worth direction helps confirm whether
                  your roadmap sequence is building long-term resilience.
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  What to do: Keep following your roadmap step sequence and
                  review this trend monthly.
                </Text>
              </>
            ) : null}
          </SurfaceCard>
        </AppearView>

        {roadmapAction ? (
          <AppearView delayMs={160}>
            <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                NEXT ROADMAP ACTION
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: colors.text, fontWeight: "700" }}
              >
                {roadmapAction.title}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                {roadmapAction.summary}
              </Text>
            </SurfaceCard>
          </AppearView>
        ) : null}
      </View>
    );
  };

  const renderContent = (): JSX.Element => {
    switch (resolvedState) {
      case "loading":
        return (
          <View style={{ gap: tokens.space.md }}>
            <Skeleton height={220} radius={tokens.radius.md} delayMs={0} />
            <Skeleton height={220} radius={tokens.radius.md} delayMs={60} />
            <Skeleton height={200} radius={tokens.radius.md} delayMs={120} />
          </View>
        );
      case "empty":
        return (
          <EmptyHint
            title="No insights yet"
            description="Connect one account to generate trend explanations and next-step guidance."
            actionLabel="Connect account"
            onActionPress={() => router.push("/(auth)/plaid-link")}
          />
        );
      case "error":
        return (
          <ErrorNotice
            description={buildDashboardRefreshErrorDescription("your insights")}
            onRetry={() => {
              setScreenState("auto");
              void summaryQuery.refetch();
            }}
          />
        );
      case "ready":
      default:
        return renderReadyContent();
    }
  };

  return (
    <Screen
      variant="scroll"
      contentContainerStyle={{
        paddingVertical: tokens.space.lg,
        gap: tokens.space.lg,
      }}
    >
      <ScreenHeader
        eyebrow="Trend review"
        title="Insights"
        titleTestID="insights-screen-title"
        description="Review observed trends, understand the tradeoffs, and decide what to do next."
      >
        <CoverageConfidenceBadge confidence={coverageConfidence} />
      </ScreenHeader>

      <AdviceBoundaryNotice />

      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        Trend-first view with context, tradeoffs, and practical next moves.
      </Text>
      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          WHAT I USED
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Last updated: ${formatTimestamp(fme.evaluation.generatedAt)}`}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Connected accounts: ${connectedAccountCount}`}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Missing inputs: ${fme.evaluation.factRequests.length}`}
        </Text>
        {disconnectedInstitutionCount > 0 ? (
          <Text variant="bodySmall" style={{ color: colors.warning }}>
            {`Live inputs from ${disconnectedInstitutionCount} institution${disconnectedInstitutionCount === 1 ? "" : "s"} are currently missing due to reconnect needs.`}
          </Text>
        ) : null}
      </SurfaceCard>

      <SegmentedControl
        value={screenState}
        onChange={(value) => setScreenState(value as InsightState)}
        options={STATE_OPTIONS}
      />

      {renderContent()}

      <PrimaryButton
        testID="insights-ask-button"
        onPress={() =>
          openAsk({
            screen: "insights",
            metricId: activeMetricId,
            recommendationId: roadmapAction?.id,
            stepId: roadmapAction?.id,
          })
        }
      >
        Ask about these trends
      </PrimaryButton>
    </Screen>
  );
}
