import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { RoadmapHomeScreen } from "@/app/_screens/RoadmapHomeScreen";
import { AppearView } from "@/components/common/AppearView";
import { Pill } from "@/components/common/Pill";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { CoverageConfidenceBadge } from "@/components/dashboard/CoverageConfidenceBadge";
import { ContourBackdrop } from "@/components/dashboard/ContourBackdrop";
import { DynamicFocusTile } from "@/components/dashboard/DynamicFocusTile";
import { MetricTile } from "@/components/dashboard/MetricTile";
import { NextStepCard } from "@/components/dashboard/NextStepCard";
import {
  RoadmapStageTimeline,
  type RoadmapStage,
} from "@/components/dashboard/RoadmapStageTimeline";
import { StepListItem } from "@/components/dashboard/StepListItem";
import { ErrorNotice, Skeleton } from "@/components/state";
import { buildDashboardRefreshErrorDescription } from "@/components/state/asyncCopy";
import { Text } from "@/components/ui/text";
import {
  useDashboardSummary,
  useFinancialMaturityEvaluation,
} from "@/hooks/useDashboardData";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import {
  type FocusMetricPreference,
  usePreferencesStore,
} from "@/stores/usePreferencesStore";
import { trackEvent, trackScreen } from "@/utils/analytics";
import type { Recommendation } from "@/utils/contracts/fme";
import { formatCurrency } from "@/utils/format";
import { deriveCoverageConfidence } from "@/utils/roadmap/confidence";
import { isRoadmapCoreScreensEnabled } from "@/utils/roadmap/featureFlags";
import {
  buildFallbackNowActions,
  type FallbackNowAction,
} from "@/utils/roadmap/homeNowActions";
import { getRecommendationConfidence } from "@/utils/roadmap/recommendationConfidence";
import { inferEffort, inferImpact } from "@/utils/roadmap/stepDetails";
import { homeStageSubtext } from "@/utils/roadmap/voiceCopy";

type FocusMetricKey = Exclude<FocusMetricPreference, "dynamic">;

type FocusMetric = {
  key: FocusMetricKey;
  label: string;
  value: string;
  description: string;
};

const HOME_FAB_CLEARANCE = 96;

function getHomeGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function mapModeToStage(mode: string): RoadmapStage {
  if (mode === "crisis" || mode === "stabilize") return "Stability";
  if (mode === "build") return "Growth";
  if (mode === "optimize") return "Optimization";
  return "Foundation";
}

function toRoadmapProgressLabel(
  completedMilestones: number,
  totalMilestones: number,
): string {
  if (totalMilestones === 0) return "No milestones yet";
  return `${completedMilestones}/${totalMilestones} complete`;
}

function formatRunwayMonths(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return "Needs data";
  }

  if (value >= 99) {
    return "99+ months";
  }

  return `${value.toFixed(1)} months`;
}

export default function DashboardScreen(): JSX.Element {
  if (isRoadmapCoreScreensEnabled()) {
    return <RoadmapHomeScreen />;
  }

  return <LegacyDashboardScreen />;
}

function LegacyDashboardScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const setAskContext = useAskStore((state) => state.setContext);
  const openAsk = useAskStore((state) => state.open);
  const advisorVoice = usePreferencesStore((state) => state.advisorVoice);
  const pinnedFocusMetric = usePreferencesStore(
    (state) => state.pinnedFocusMetric,
  );
  const setPinnedFocusMetric = usePreferencesStore(
    (state) => state.setPinnedFocusMetric,
  );

  const summaryQuery = useDashboardSummary();
  const summary = summaryQuery.data;
  const greeting = useMemo(() => getHomeGreeting(new Date()), []);
  const fme = useFinancialMaturityEvaluation(summary);
  const isLoading = summaryQuery.isLoading || fme.isPolicyLoading;
  const showDataError = summaryQuery.isError || fme.isPolicyError;
  const showSectionSkeletons = (isLoading || showDataError) && !summary;
  const primaryRecommendation = fme.evaluation.primaryRecommendation;
  const alternatives = fme.evaluation.alternatives;

  const stage = useMemo(
    () => mapModeToStage(fme.evaluation.mode),
    [fme.evaluation.mode],
  );
  const confidence = useMemo(
    () =>
      deriveCoverageConfidence(
        fme.evaluation,
        fme.facts,
        summary?.institutionStatuses,
      ),
    [fme.evaluation, fme.facts, summary?.institutionStatuses],
  );
  const coverageGaps = useMemo(
    () =>
      confidence.reasons.filter(
        (reason) => !reason.startsWith("Connected and current inputs support"),
      ),
    [confidence.reasons],
  );

  const completedMilestones = useMemo(
    () =>
      fme.evaluation.milestones.filter(
        (milestone) => milestone.status === "complete",
      ).length,
    [fme.evaluation.milestones],
  );
  const roadmapProgressLabel = useMemo(
    () =>
      toRoadmapProgressLabel(
        completedMilestones,
        fme.evaluation.milestones.length,
      ),
    [completedMilestones, fme.evaluation.milestones.length],
  );

  const monthlyIncome = fme.facts.incomeMonthlyNet?.value;
  const monthlyBurn = fme.facts.burnRateMonthly?.value;
  const liquidSavings = fme.facts.liquidSavings?.value ?? 0;
  const monthlyCashFlow =
    typeof monthlyIncome === "number" && typeof monthlyBurn === "number"
      ? monthlyIncome - monthlyBurn
      : null;
  const runwayMonths =
    typeof monthlyBurn === "number" && monthlyBurn > 0
      ? liquidSavings / monthlyBurn
      : null;
  const monthlyCashFlowLabel =
    typeof monthlyCashFlow === "number" && Number.isFinite(monthlyCashFlow)
      ? formatCurrency(monthlyCashFlow)
      : "Needs data";
  const runwayLabel = formatRunwayMonths(runwayMonths);
  const accountsLinkedCount = summary?.accounts.length ?? 0;

  const nowActions = useMemo(
    () =>
      [primaryRecommendation, ...alternatives]
        .filter((recommendation): recommendation is Recommendation =>
          Boolean(recommendation),
        )
        .slice(0, 3),
    [alternatives, primaryRecommendation],
  );
  const fallbackNowActions = useMemo<FallbackNowAction[]>(() => {
    return buildFallbackNowActions({
      modeledCount: nowActions.length,
      accountsLinkedCount,
      coverageLabel: confidence.label,
    });
  }, [accountsLinkedCount, confidence.label, nowActions.length]);

  const nextMilestone = useMemo(
    () =>
      fme.evaluation.milestones.find((milestone) =>
        ["in_progress", "needs_info", "blocked_policy_stale"].includes(
          milestone.status,
        ),
      ),
    [fme.evaluation.milestones],
  );

  useEffect(() => {
    setAskContext({
      screen: "home",
      recommendationId: primaryRecommendation?.id,
      stepId: primaryRecommendation?.id,
    });
  }, [primaryRecommendation?.id, setAskContext]);

  useEffect(() => {
    trackScreen("dashboard_home_advisor", {
      mode: fme.evaluation.mode,
      stage,
      confidence: confidence.label,
      primary_recommendation: primaryRecommendation?.id ?? "none",
    });
  }, [confidence.label, fme.evaluation.mode, primaryRecommendation?.id, stage]);

  const handleOpenRecommendation = (recommendation: Recommendation): void => {
    trackEvent("dashboard_next_step_action", {
      recommendation_id: recommendation.id,
      event: recommendation.analyticsEvent,
    });
    if (recommendation.actionRoute) {
      router.push(recommendation.actionRoute as never);
      return;
    }
    router.push("/(dashboard)/journey");
  };

  const handleOpenStepDetails = (recommendation: Recommendation): void => {
    router.push({
      pathname: "/(dashboard)/step/[recommendationId]",
      params: { recommendationId: recommendation.id },
    });
  };

  const dynamicFocusMetricKey = useMemo<FocusMetricKey>(() => {
    switch (stage) {
      case "Foundation":
        return "accounts_linked";
      case "Stability":
        return "cash_flow";
      case "Growth":
        return "cash_runway";
      case "Optimization":
      default:
        return "roadmap_progress";
    }
  }, [stage]);

  const focusMetrics = useMemo<Record<FocusMetricKey, FocusMetric>>(
    () => ({
      accounts_linked: {
        key: "accounts_linked",
        label: "Connected accounts",
        value: `${accountsLinkedCount} linked`,
        description:
          accountsLinkedCount > 0
            ? "Linked data improves recommendation accuracy and confidence."
            : "Connect one account to upgrade this from assumed to observed data.",
      },
      cash_flow: {
        key: "cash_flow",
        label: "Monthly cash flow",
        value: monthlyCashFlowLabel,
        description:
          "Stabilizing monthly surplus gives your roadmap room to execute.",
      },
      cash_runway: {
        key: "cash_runway",
        label: "Cash runway",
        value: runwayLabel,
        description:
          "Runway shows how many months of essentials your current reserves can cover.",
      },
      roadmap_progress: {
        key: "roadmap_progress",
        label: "Roadmap progress",
        value: roadmapProgressLabel,
        description:
          "Progress reflects completed milestones and what remains to unlock next.",
      },
      next_step: {
        key: "next_step",
        label: "Suggested next step",
        value: primaryRecommendation?.title ?? "Collect key inputs",
        description:
          "This is your highest-leverage action based on current connected data.",
      },
    }),
    [
      accountsLinkedCount,
      monthlyCashFlowLabel,
      primaryRecommendation?.title,
      roadmapProgressLabel,
      runwayLabel,
    ],
  );

  const selectedFocusMetricKey: FocusMetricKey =
    pinnedFocusMetric === "dynamic" ? dynamicFocusMetricKey : pinnedFocusMetric;
  const selectedFocusMetric =
    focusMetrics[selectedFocusMetricKey] ?? focusMetrics[dynamicFocusMetricKey];
  const isFocusPinned = pinnedFocusMetric !== "dynamic";
  const screenContentContainerStyle = useMemo(
    () => [
      styles.container,
      { paddingBottom: tokens.space.xxl + HOME_FAB_CLEARANCE },
    ],
    [tokens.space.xxl],
  );

  return (
    <Screen
      variant="scroll"
      contentContainerStyle={screenContentContainerStyle}
    >
      <ScreenHeader
        eyebrow="Advisor view"
        title={greeting}
        titleVariant="headlineLarge"
        titleTestID="dashboard-screen-title"
        description={homeStageSubtext(advisorVoice, stage)}
        style={styles.header}
      >
        <Pill tone="accent" active>
          {`Current stage: ${stage}`}
        </Pill>
        <CoverageConfidenceBadge confidence={confidence} />
      </ScreenHeader>

      {showDataError ? (
        <AppearView delayMs={20}>
          <ErrorNotice
            title="Data refresh needed"
            description={buildDashboardRefreshErrorDescription(
              "your home view",
            )}
            onRetry={() => {
              void summaryQuery.refetch();
              void fme.refetchPolicyBundle();
            }}
          />
        </AppearView>
      ) : null}

      <AppearView delayMs={40}>
        <NextStepCard
          evaluation={fme.evaluation}
          isLoading={isLoading}
          evidence={{
            connectedAccounts: accountsLinkedCount,
            confidenceSummary: confidence.summary,
            lastUpdated: fme.evaluation.generatedAt,
            coverageGaps,
          }}
          onPressPrimaryAction={handleOpenRecommendation}
          onPressPolicyStatus={() => {
            trackEvent("dashboard_next_step_policy_status_action");
            router.push("/(dashboard)/journey");
          }}
          onPressViewDetails={handleOpenStepDetails}
          onAskAboutStep={(recommendation) => {
            openAsk({
              screen: "home",
              recommendationId: recommendation.id,
              stepId: recommendation.id,
            });
          }}
        />
      </AppearView>

      {showSectionSkeletons ? (
        <>
          <AppearView delayMs={80}>
            <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
              <Skeleton height={12} width={120} delayMs={0} />
              <Skeleton height={20} width={180} delayMs={40} />
              <Skeleton height={14} width="90%" delayMs={80} />
              <Skeleton height={34} width={130} delayMs={120} />
            </SurfaceCard>
          </AppearView>
          <AppearView delayMs={120}>
            <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
              <Skeleton height={12} width={80} delayMs={0} />
              <View style={styles.metricsGrid}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <View
                    key={`metric-skeleton-${index}`}
                    style={styles.metricCell}
                  >
                    <Skeleton height={12} width="60%" delayMs={index * 40} />
                    <Skeleton
                      height={18}
                      width="80%"
                      delayMs={index * 40 + 20}
                    />
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </AppearView>
          <AppearView delayMs={160}>
            <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
              <Skeleton height={12} width={100} delayMs={0} />
              <Skeleton height={44} delayMs={40} />
              <Skeleton height={44} delayMs={80} />
              <Skeleton height={44} delayMs={120} />
            </SurfaceCard>
          </AppearView>
        </>
      ) : (
        <>
          <AppearView delayMs={80}>
            <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
              <ContourBackdrop />
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                ROADMAP SNAPSHOT
              </Text>
              <RoadmapStageTimeline
                currentStage={stage}
                showDescriptions={false}
                testID="dashboard-stage-timeline"
              />
              <Text
                variant="titleSmall"
                style={{ color: colors.text, fontWeight: "700" }}
              >
                {roadmapProgressLabel}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                {nextMilestone
                  ? `Next milestone: ${nextMilestone.title}`
                  : "All current milestones are complete."}
              </Text>
              <SecondaryButton
                compact
                onPress={() => router.push("/(dashboard)/journey")}
                testID="dashboard-open-roadmap"
              >
                Open roadmap
              </SecondaryButton>
            </SurfaceCard>
          </AppearView>

          <AppearView delayMs={120}>
            <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                ALWAYS-ON METRICS
              </Text>
              <View style={styles.metricsGrid}>
                <MetricTile
                  label="Monthly cash flow"
                  value={monthlyCashFlowLabel}
                  testID="dashboard-metric-cash-flow"
                />
                <MetricTile
                  label="Cash runway"
                  value={runwayLabel}
                  testID="dashboard-metric-cash-runway"
                />
                <MetricTile
                  label="Roadmap progress"
                  value={roadmapProgressLabel}
                  testID="dashboard-metric-roadmap-progress"
                />
              </View>
              <DynamicFocusTile
                metric={{
                  label: selectedFocusMetric.label,
                  value: selectedFocusMetric.value,
                  description: selectedFocusMetric.description,
                }}
                isPinned={isFocusPinned}
                onTogglePin={() => {
                  setPinnedFocusMetric(
                    isFocusPinned ? "dynamic" : selectedFocusMetric.key,
                  );
                }}
              />
              <Text variant="bodySmall" style={{ color: colors.textFaint }}>
                {isFocusPinned
                  ? "Pinned metric stays fixed until you switch back to dynamic focus."
                  : "Dynamic focus updates by stage so your attention stays on what matters most now."}
              </Text>
            </SurfaceCard>
          </AppearView>

          <AppearView delayMs={160}>
            <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                NOW ACTIONS
              </Text>
              {nowActions.length === 0 && fallbackNowActions.length === 0 ? (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  Add a few more details to unlock your top actions.
                </Text>
              ) : (
                <>
                  {nowActions.map((action, index) => (
                    <View
                      key={action.id}
                      style={[
                        styles.actionRow,
                        {
                          borderTopWidth: index === 0 ? 0 : 1,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <StepListItem
                        title={action.title}
                        summary={action.summary}
                        impact={inferImpact(action)}
                        effort={inferEffort(action)}
                        confidence={getRecommendationConfidence(action).label}
                        statusLabel={index === 0 ? "Suggested" : "Alternative"}
                        isPrimary={index === 0}
                        onPress={() =>
                          index === 0
                            ? handleOpenRecommendation(action)
                            : handleOpenStepDetails(action)
                        }
                      />
                    </View>
                  ))}
                  {fallbackNowActions.map((fallback, index) => (
                    <View
                      key={fallback.id}
                      style={[
                        styles.actionRow,
                        {
                          borderTopWidth: 1,
                          borderTopColor: colors.borderSubtle,
                        },
                      ]}
                    >
                      <StepListItem
                        title={fallback.title}
                        summary={fallback.summary}
                        impact={fallback.impact}
                        effort={fallback.effort}
                        confidence={fallback.confidence}
                        statusLabel={`Alternative (strategy) ${nowActions.length + index + 1}`}
                        sourceNote="Source: Strategy fallback (non-modeled)"
                        onPress={() => {
                          if (fallback.action === "accounts") {
                            router.push("/(dashboard)/accounts");
                            return;
                          }
                          if (fallback.action === "roadmap") {
                            router.push("/(dashboard)/journey");
                            return;
                          }
                          router.push("/onboarding");
                        }}
                      />
                    </View>
                  ))}
                </>
              )}
            </SurfaceCard>
          </AppearView>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  header: {
    marginTop: 2,
    gap: 6,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCell: {
    minWidth: "47%",
    flexGrow: 1,
    gap: 4,
  },
  actionRow: {
    gap: 10,
    paddingTop: 10,
  },
});
