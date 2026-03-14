import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { RoadmapJourneyScreen } from "@/app/_screens/RoadmapJourneyScreen";
import { AppearView } from "@/components/common/AppearView";
import { Pill } from "@/components/common/Pill";
import { OptionCard } from "@/components/dashboard/OptionCard";
import { ContourBackdrop } from "@/components/dashboard/ContourBackdrop";
import { MilestoneMeasurementDisclosure } from "@/components/dashboard/MilestoneMeasurementDisclosure";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { CoverageConfidenceBadge } from "@/components/dashboard/CoverageConfidenceBadge";
import {
  RoadmapStageTimeline,
  type RoadmapStage,
} from "@/components/dashboard/RoadmapStageTimeline";
import { EmptyHint, ErrorNotice, Skeleton } from "@/components/state";
import { buildDashboardRefreshErrorDescription } from "@/components/state/asyncCopy";
import { Text } from "@/components/ui/text";
import {
  useDashboardSummary,
  useFinancialMaturityEvaluation,
} from "@/hooks/useDashboardData";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { useAskStore } from "@/stores/useAskStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { tokens as designTokens } from "@/theme/tokens";
import { useRunAgentWorkflow } from "@/utils/queries/useAgentInterop";
import { useFmeEvaluationLogHistory } from "@/utils/queries/useFmeEvaluationLogs";
import { usePolicyGovernance } from "@/utils/queries/usePolicyGovernance";
import {
  buildFmeExplanationWorkflow,
  isFmeAgentExplanationEnabled,
} from "@/utils/services/fmeAgentWorkflows";
import {
  type RoadmapStepType,
  getMilestoneMeasurementReason,
  getMilestoneStatusPresentation,
  getMilestoneStepType,
  getStepTypeLabel,
  sortRecommendationsByRoadmapHorizon,
} from "@/utils/roadmap/semantics";
import { deriveCoverageConfidence } from "@/utils/roadmap/confidence";
import { isRoadmapCoreScreensEnabled } from "@/utils/roadmap/featureFlags";

type RoadmapFilter = "now" | "all" | "completed";

const ROADMAP_FILTER_OPTIONS = [
  { label: "Now", value: "now", testID: "journey-filter-now" },
  { label: "All", value: "all", testID: "journey-filter-all" },
  {
    label: "Completed",
    value: "completed",
    testID: "journey-filter-completed",
  },
] as const;

function mapModeToStage(mode: string): RoadmapStage {
  if (mode === "crisis" || mode === "stabilize") return "Stability";
  if (mode === "build") return "Growth";
  if (mode === "optimize") return "Optimization";
  return "Foundation";
}

function milestoneStatusPalette(
  status: string,
  stepType: RoadmapStepType,
  colors: ReturnType<typeof useAppTheme>["colors"],
): { background: string; text: string } {
  if (status === "blocked_policy_stale") {
    return { background: colors.warning, text: colors.surface1 };
  }

  if (status === "needs_info") {
    return { background: colors.surface2, text: colors.textMuted };
  }

  switch (status) {
    case "complete":
      return { background: colors.accentSoft, text: colors.positive };
    case "in_progress":
      if (stepType === "maintain") {
        return { background: colors.surface3, text: colors.warning };
      }
      return { background: colors.surface3, text: colors.accent };
    default:
      return { background: colors.surface2, text: colors.textMuted };
  }
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatComputedValue(value: string | number | boolean): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return String(value);
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded)
      ? rounded.toLocaleString()
      : rounded.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
  }
  return String(value);
}

export default function JourneyScreen(): JSX.Element {
  if (isRoadmapCoreScreensEnabled()) {
    return <RoadmapJourneyScreen />;
  }

  return <LegacyJourneyScreen />;
}

function LegacyJourneyScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const { showError } = useErrorBanner();
  const setAskContext = useAskStore((state) => state.setContext);
  const [roadmapFilter, setRoadmapFilter] = useState<RoadmapFilter>("all");
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
  const isJourneyLoading = summaryQuery.isLoading || fme.isPolicyLoading;
  const showJourneySkeleton =
    (isJourneyLoading || summaryQuery.isError) && !summaryQuery.data;
  const runAgentWorkflowMutation = useRunAgentWorkflow();
  const governanceQuery = usePolicyGovernance();
  const userId = useSessionStore((state) => state.session?.user?.id);
  const historyQuery = useFmeEvaluationLogHistory(5);
  const primaryRecommendation = fme.evaluation.primaryRecommendation;
  const roadmapStage = useMemo(
    () => mapModeToStage(fme.evaluation.mode),
    [fme.evaluation.mode],
  );
  const recommendationSequence = useMemo(
    () =>
      [primaryRecommendation, ...fme.evaluation.alternatives].filter(
        (
          recommendation,
        ): recommendation is NonNullable<typeof recommendation> =>
          Boolean(recommendation),
      ),
    [fme.evaluation.alternatives, primaryRecommendation],
  );
  const recommendationHorizon = useMemo(
    () => sortRecommendationsByRoadmapHorizon(recommendationSequence),
    [recommendationSequence],
  );
  const filteredRecommendationHorizon = useMemo(() => {
    if (roadmapFilter === "now") {
      return {
        now: recommendationHorizon.now,
        next: [],
        later: [],
      };
    }

    if (roadmapFilter === "completed") {
      return {
        now: [],
        next: [],
        later: [],
      };
    }

    return recommendationHorizon;
  }, [recommendationHorizon, roadmapFilter]);
  const agentExplanationEnabled = isFmeAgentExplanationEnabled();
  const primaryTrace = useMemo(() => {
    if (!primaryRecommendation) return null;
    const firstRef = primaryRecommendation.traceRefs[0];
    if (!firstRef) {
      return fme.evaluation.trace[0] ?? null;
    }
    return (
      fme.evaluation.trace.find(
        (traceItem) => traceItem.traceId === firstRef,
      ) ?? null
    );
  }, [fme.evaluation.trace, primaryRecommendation]);
  const primaryComputedEntries = useMemo(
    () =>
      primaryTrace ? Object.entries(primaryTrace.computed).slice(0, 6) : [],
    [primaryTrace],
  );

  const staleDomains = useMemo(
    () => fme.evaluation.policyStatus.filter((domain) => domain.isStale),
    [fme.evaluation.policyStatus],
  );
  const currentModeLabel = fme.isPolicyLoading
    ? "loading"
    : fme.evaluation.mode;
  const pendingPolicyDrafts = useMemo(
    () =>
      (governanceQuery.data?.snapshots ?? []).filter((snapshot) => {
        if (!snapshot.latestDraft) return false;
        const approvedVersion = snapshot.latestApproved?.version ?? 0;
        return snapshot.latestDraft.version > approvedVersion;
      }),
    [governanceQuery.data?.snapshots],
  );
  const filteredMilestones = useMemo(() => {
    if (roadmapFilter === "completed") {
      return fme.evaluation.milestones.filter(
        (milestone) => milestone.status === "complete",
      );
    }

    if (roadmapFilter === "now") {
      return fme.evaluation.milestones.filter((milestone) =>
        ["in_progress", "needs_info", "blocked_policy_stale"].includes(
          milestone.status,
        ),
      );
    }

    return fme.evaluation.milestones;
  }, [fme.evaluation.milestones, roadmapFilter]);

  useEffect(() => {
    setAskContext({
      screen: "roadmap",
      recommendationId: primaryRecommendation?.id,
      stepId: primaryRecommendation?.id,
      metricId: roadmapFilter === "completed" ? "roadmap_progress" : undefined,
    });
  }, [primaryRecommendation?.id, roadmapFilter, setAskContext]);

  return (
    <Screen variant="scroll" contentContainerStyle={styles.container}>
      <ScreenHeader
        eyebrow="Roadmap"
        title="Financial Roadmap"
        titleTestID="journey-screen-title"
        description="Your maturity roadmap updates automatically from profile facts and policy packs."
        style={styles.header}
      >
        <View style={styles.headerPills}>
          <Pill tone="accent" active>
            {`Current stage: ${roadmapStage}`}
          </Pill>
          <Pill
            testID={`journey-current-mode-${currentModeLabel}`}
            tone={fme.isPolicyLoading ? "neutral" : "positive"}
            active={!fme.isPolicyLoading}
          >
            {fme.isPolicyLoading
              ? "Refreshing policy packs..."
              : `Current mode: ${currentModeLabel}`}
          </Pill>
        </View>
        <CoverageConfidenceBadge confidence={coverageConfidence} />
      </ScreenHeader>

      {summaryQuery.isError ? (
        <ErrorNotice
          description={buildDashboardRefreshErrorDescription(
            "your journey data",
          )}
          onRetry={() => {
            void summaryQuery.refetch();
          }}
        />
      ) : null}

      {showJourneySkeleton ? (
        <View style={styles.loadingStack}>
          <SurfaceCard>
            <Skeleton height={12} width={180} delayMs={0} />
            <Skeleton height={20} width="75%" delayMs={40} />
            <Skeleton height={14} width="90%" delayMs={80} />
            <Skeleton height={34} width={160} delayMs={120} />
          </SurfaceCard>
          <SurfaceCard>
            <Skeleton height={12} width={120} delayMs={0} />
            <Skeleton height={44} delayMs={40} />
            <Skeleton height={44} delayMs={80} />
            <Skeleton height={44} delayMs={120} />
          </SurfaceCard>
          <SurfaceCard>
            <Skeleton height={12} width={120} delayMs={0} />
            <Skeleton height={80} delayMs={40} />
            <Skeleton height={80} delayMs={80} />
          </SurfaceCard>
        </View>
      ) : null}

      {!showJourneySkeleton ? (
        <>
          <AppearView delayMs={20}>
            <SurfaceCard testID="journey-stage-timeline-section">
              <ContourBackdrop opacity={0.28} />
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                STAGE TIMELINE
              </Text>
              <RoadmapStageTimeline currentStage={roadmapStage} />
            </SurfaceCard>
          </AppearView>

          <AppearView delayMs={40}>
            <SurfaceCard>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                PRIMARY RECOMMENDATION
              </Text>
              <Text
                testID={`journey-primary-recommendation-${
                  primaryRecommendation?.id ?? "none"
                }`}
                variant="titleMedium"
                style={{ color: colors.text, fontWeight: "700" }}
              >
                {primaryRecommendation?.title ?? "No recommendation available"}
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
                {primaryRecommendation?.summary ??
                  "Complete more profile inputs to generate a recommendation."}
              </Text>
              {primaryRecommendation ? (
                <View
                  style={{ marginTop: tokens.space.xs, gap: tokens.space.xs }}
                >
                  <Text
                    variant="labelSmall"
                    style={{ color: colors.textFaint }}
                  >
                    WHAT I USED
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {`Last updated: ${formatTimestamp(fme.evaluation.generatedAt)}`}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {`Confidence: ${coverageConfidence.summary}`}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {`Connected accounts: ${connectedAccountCount}`}
                  </Text>
                  {coverageConfidence.reasons.slice(0, 2).map((reason) => (
                    <Text
                      key={reason}
                      variant="bodySmall"
                      style={{ color: colors.textFaint }}
                    >
                      {`\u2022 ${reason}`}
                    </Text>
                  ))}
                </View>
              ) : null}
              {primaryRecommendation ? (
                <View style={{ marginTop: tokens.space.xs }}>
                  <SecondaryButton
                    testID="journey-primary-view-details"
                    onPress={() =>
                      router.push({
                        pathname: "/(dashboard)/step/[recommendationId]",
                        params: { recommendationId: primaryRecommendation.id },
                      })
                    }
                  >
                    View step details
                  </SecondaryButton>
                </View>
              ) : null}
              {agentExplanationEnabled ? (
                <View style={{ marginTop: tokens.space.sm }}>
                  <PrimaryButton
                    disabled={runAgentWorkflowMutation.isPending}
                    onPress={() => {
                      runAgentWorkflowMutation.mutate(
                        buildFmeExplanationWorkflow(fme.evaluation),
                        {
                          onError: () => {
                            showError("Unable to generate agent explanation.");
                          },
                        },
                      );
                    }}
                  >
                    {runAgentWorkflowMutation.isPending
                      ? "Generating explanation..."
                      : "Generate agent explanation"}
                  </PrimaryButton>
                </View>
              ) : null}
            </SurfaceCard>
          </AppearView>

          {agentExplanationEnabled && runAgentWorkflowMutation.data ? (
            <SurfaceCard>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                AGENT EXPLANATION
              </Text>
              <Text variant="titleSmall" style={{ color: colors.text }}>
                {runAgentWorkflowMutation.data.status}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                {runAgentWorkflowMutation.data.finalOutput}
              </Text>
            </SurfaceCard>
          ) : null}

          {primaryRecommendation ? (
            <SurfaceCard>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                WHY THIS RECOMMENDATION
              </Text>
              {primaryTrace ? (
                <>
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {`Rule: ${primaryTrace.ruleId}`}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {`Facts used: ${
                      primaryTrace.factsUsed.length > 0
                        ? primaryTrace.factsUsed.join(", ")
                        : "none"
                    }`}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {`Policy refs: ${
                      primaryTrace.policyRefs.length > 0
                        ? primaryTrace.policyRefs.join(", ")
                        : "none"
                    }`}
                  </Text>
                  {primaryComputedEntries.length > 0
                    ? primaryComputedEntries.map(([key, value]) => (
                        <Text
                          key={key}
                          variant="bodySmall"
                          style={{ color: colors.textMuted }}
                        >
                          {`${key}: ${formatComputedValue(value)}`}
                        </Text>
                      ))
                    : null}
                </>
              ) : (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  Trace details are not available yet for this recommendation.
                </Text>
              )}
              {primaryRecommendation.assumptions.length > 0 ? (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {`Assumptions: ${primaryRecommendation.assumptions.join(" | ")}`}
                </Text>
              ) : null}
            </SurfaceCard>
          ) : null}

          {fme.evaluation.alternatives.length > 0 ? (
            <SurfaceCard>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                ALTERNATIVES
              </Text>
              {fme.evaluation.alternatives.map((option) => (
                <View key={option.id} style={styles.row}>
                  <Text variant="titleSmall" style={{ color: colors.text }}>
                    {option.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {option.summary}
                  </Text>
                  <SecondaryButton
                    compact
                    onPress={() =>
                      router.push({
                        pathname: "/(dashboard)/step/[recommendationId]",
                        params: { recommendationId: option.id },
                      })
                    }
                  >
                    View details
                  </SecondaryButton>
                </View>
              ))}
            </SurfaceCard>
          ) : null}

          <AppearView delayMs={80}>
            <SurfaceCard testID="journey-roadmap-flow-section">
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                ROADMAP FLOW
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                Steps are ordered by horizon so you can focus on now, preview
                what is next, and defer later items.
              </Text>
              <SegmentedControl
                value={roadmapFilter}
                onChange={(value) => setRoadmapFilter(value as RoadmapFilter)}
                options={ROADMAP_FILTER_OPTIONS.map((option) => ({
                  ...option,
                }))}
                testID="journey-roadmap-filter"
              />

              <View style={styles.sectionBlock}>
                <Text variant="titleSmall" style={{ color: colors.text }}>
                  Now
                </Text>
                {filteredRecommendationHorizon.now.length > 0 ? (
                  filteredRecommendationHorizon.now.map((recommendation) => (
                    <OptionCard
                      key={`now-${recommendation.id}`}
                      recommendation={recommendation}
                      onPressViewDetails={(target) =>
                        router.push({
                          pathname: "/(dashboard)/step/[recommendationId]",
                          params: { recommendationId: target.id },
                        })
                      }
                    />
                  ))
                ) : (
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {roadmapFilter === "completed"
                      ? "Completed filter focuses on finished milestones below."
                      : "No immediate steps yet."}
                  </Text>
                )}
              </View>

              {roadmapFilter === "all" ? (
                <View style={styles.sectionBlock}>
                  <Text variant="titleSmall" style={{ color: colors.text }}>
                    Next
                  </Text>
                  {filteredRecommendationHorizon.next.length > 0 ? (
                    filteredRecommendationHorizon.next.map((recommendation) => (
                      <OptionCard
                        key={`next-${recommendation.id}`}
                        recommendation={recommendation}
                        onPressViewDetails={(target) =>
                          router.push({
                            pathname: "/(dashboard)/step/[recommendationId]",
                            params: { recommendationId: target.id },
                          })
                        }
                      />
                    ))
                  ) : (
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.textMuted }}
                    >
                      No queued next step yet.
                    </Text>
                  )}
                </View>
              ) : null}

              {roadmapFilter === "all" ? (
                <View style={styles.sectionBlock}>
                  <Text variant="titleSmall" style={{ color: colors.text }}>
                    Later
                  </Text>
                  {filteredRecommendationHorizon.later.length > 0 ? (
                    filteredRecommendationHorizon.later.map(
                      (recommendation) => (
                        <OptionCard
                          key={`later-${recommendation.id}`}
                          recommendation={recommendation}
                          onPressViewDetails={(target) =>
                            router.push({
                              pathname: "/(dashboard)/step/[recommendationId]",
                              params: { recommendationId: target.id },
                            })
                          }
                        />
                      ),
                    )
                  ) : (
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.textMuted }}
                    >
                      Later items unlock as you complete now and next steps.
                    </Text>
                  )}
                </View>
              ) : null}
            </SurfaceCard>
          </AppearView>

          <AppearView delayMs={120}>
            <SurfaceCard testID="journey-milestones-section">
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                MILESTONES
              </Text>
              {filteredMilestones.length === 0 ? (
                <EmptyHint
                  title={
                    roadmapFilter === "completed"
                      ? "No completed milestones yet"
                      : "No milestones in this view yet"
                  }
                  description={
                    roadmapFilter === "completed"
                      ? "Keep working your now steps to unlock and complete milestones."
                      : "Connect at least one account or complete onboarding inputs to generate milestone tracking."
                  }
                  actionLabel="Open onboarding"
                  onActionPress={() => router.push("/onboarding")}
                />
              ) : (
                filteredMilestones.map((milestone) =>
                  (() => {
                    const stepType = getMilestoneStepType(milestone.id);
                    const presentation =
                      getMilestoneStatusPresentation(milestone);
                    const palette = milestoneStatusPalette(
                      milestone.status,
                      stepType,
                      colors,
                    );

                    return (
                      <View
                        key={milestone.id}
                        testID={`journey-milestone-${milestone.id}-status-${milestone.status}`}
                        style={styles.row}
                      >
                        <View style={styles.badgeRow}>
                          <View
                            style={[
                              styles.badge,
                              {
                                backgroundColor: palette.background,
                                borderColor: colors.borderSubtle,
                                borderRadius: tokens.radius.sm,
                              },
                            ]}
                          >
                            <Text
                              variant="labelSmall"
                              style={{
                                color: palette.text,
                              }}
                            >
                              {presentation.label}
                            </Text>
                          </View>
                          <Text
                            variant="labelSmall"
                            style={{ color: colors.textFaint }}
                          >
                            {getStepTypeLabel(stepType)}
                          </Text>
                        </View>

                        <Text
                          variant="titleSmall"
                          style={{ color: colors.text }}
                        >
                          {milestone.title}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: colors.textMuted }}
                        >
                          {milestone.detail}
                        </Text>
                        {presentation.ongoingStatus ? (
                          <Text
                            variant="bodySmall"
                            style={{ color: colors.textMuted }}
                          >
                            {`Ongoing status: ${presentation.ongoingStatus}`}
                          </Text>
                        ) : null}
                        <MilestoneMeasurementDisclosure
                          testID={`journey-milestone-${milestone.id}-measurement-toggle`}
                          reason={getMilestoneMeasurementReason(milestone.id)}
                        />
                      </View>
                    );
                  })(),
                )
              )}
            </SurfaceCard>
          </AppearView>

          <AppearView delayMs={160}>
            <SurfaceCard testID="journey-policy-status-section">
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                POLICY STATUS
              </Text>
              {staleDomains.length === 0 ? (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  All policy domains are current.
                </Text>
              ) : (
                staleDomains.map((domain) => (
                  <Text
                    key={domain.domain}
                    testID={`journey-policy-domain-${domain.domain}-stale`}
                    variant="bodySmall"
                    style={{ color: colors.warning }}
                  >
                    {`${domain.domain}: needs refresh (${domain.ageDays ?? "unknown"} days old)`}
                  </Text>
                ))
              )}
              {governanceQuery.isError ? (
                <Text variant="bodySmall" style={{ color: colors.negative }}>
                  Unable to load staged policy drafts.
                </Text>
              ) : governanceQuery.isLoading ? (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  Checking staged policy drafts...
                </Text>
              ) : pendingPolicyDrafts.length > 0 ? (
                pendingPolicyDrafts.map((snapshot) => (
                  <Text
                    key={snapshot.domain}
                    variant="bodySmall"
                    style={{ color: colors.warning }}
                  >
                    {`${snapshot.domain}: draft v${snapshot.latestDraft?.version ?? "?"} pending approval`}
                  </Text>
                ))
              ) : (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  No staged policy drafts pending approval.
                </Text>
              )}
              <View style={{ marginTop: tokens.space.sm }}>
                <PrimaryButton
                  testID="journey-open-policy-ops"
                  onPress={() => {
                    router.push("/(ops)/policy-ops");
                  }}
                >
                  Open Policy Ops
                </PrimaryButton>
              </View>
            </SurfaceCard>
          </AppearView>

          <AppearView delayMs={200}>
            <SurfaceCard>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                RECENT DECISIONS
              </Text>
              {!userId ? (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  Sign in to persist your evaluation history.
                </Text>
              ) : historyQuery.isLoading ? (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  Loading recent evaluations...
                </Text>
              ) : historyQuery.isError ? (
                <Text variant="bodySmall" style={{ color: colors.negative }}>
                  Unable to load recent evaluation history.
                </Text>
              ) : historyQuery.data && historyQuery.data.length > 0 ? (
                historyQuery.data.map((logRow) => (
                  <View key={logRow.id} style={styles.row}>
                    <Text variant="titleSmall" style={{ color: colors.text }}>
                      {logRow.output_summary?.primaryRecommendationId ??
                        "No primary recommendation"}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.textMuted }}
                    >
                      {`${logRow.output_summary?.mode ?? "unknown"} · ${formatTimestamp(logRow.created_at)}`}
                    </Text>
                  </View>
                ))
              ) : (
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  No persisted evaluation history yet.
                </Text>
              )}
            </SurfaceCard>
          </AppearView>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 32,
  },
  header: {
    marginTop: 2,
    gap: designTokens.space.xs,
  },
  headerPills: {
    flexDirection: "row",
    alignItems: "center",
    gap: designTokens.space.xs,
    flexWrap: "wrap",
  },
  row: {
    gap: 4,
    marginTop: 8,
  },
  sectionBlock: {
    gap: 6,
    marginTop: 8,
  },
  loadingStack: {
    gap: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    borderWidth: 1,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
