import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { ProfileUtilityButton } from "@/components/dashboard/ProfileUtilityButton";
import { DataHealthSheet } from "@/components/roadmap/DataHealthSheet";
import { ErrorNotice, Skeleton } from "@/components/state";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import { trackEvent } from "@/utils/analytics";
import { ROADMAP_STAGE_METADATA } from "@/utils/engine/roadmap/roadmapGenerationEngine";
import { useRoadmapViewModel } from "@/utils/queries/useRoadmapCore";
import { buildCoverageDisplay } from "@/utils/roadmap/experience";

function stageTone(
  status: "completed" | "current" | "upcoming" | "blocked",
): "positive" | "accent" | "neutral" | "warning" {
  switch (status) {
    case "completed":
      return "positive";
    case "current":
      return "accent";
    case "blocked":
      return "warning";
    case "upcoming":
    default:
      return "neutral";
  }
}

export function RoadmapJourneyScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const setAskContext = useAskStore((state) => state.setContext);
  const viewModel = useRoadmapViewModel();
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [isDataHealthOpen, setDataHealthOpen] = useState(false);

  useEffect(() => {
    if (!viewModel.roadmap || !viewModel.data) {
      return;
    }

    setAskContext({
      screen: "roadmap",
      recommendationId: viewModel.data.nextAction.actionId,
      stepId: viewModel.data.nextAction.actionId,
    });

    trackEvent("roadmap_viewed", {
      coverage_level: viewModel.roadmap.overallCoverageLevel,
      current_stage_id: viewModel.roadmap.currentStage.id,
      has_snapshot_data: Boolean(viewModel.snapshot),
      blocked_stage_count: viewModel.roadmap.blockedStages.length,
      roadmap_engine_version: viewModel.roadmap.engineMeta.version,
    });
  }, [setAskContext, viewModel.data, viewModel.roadmap, viewModel.snapshot]);

  useEffect(() => {
    if (!viewModel.isError) {
      return;
    }

    trackEvent("roadmap_error_viewed", {
      coverage_level: viewModel.roadmap?.overallCoverageLevel ?? "unknown",
      current_stage_id: viewModel.roadmap?.currentStage.id ?? "unknown",
      has_snapshot_data: Boolean(viewModel.snapshot),
      blocked_stage_count: viewModel.roadmap?.blockedStages.length ?? 0,
      roadmap_engine_version:
        viewModel.roadmap?.engineMeta.version ?? "unknown",
    });
  }, [viewModel.isError, viewModel.roadmap, viewModel.snapshot]);

  if (viewModel.isLoading && !viewModel.data) {
    return (
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <View style={styles.loadingStack}>
          <SurfaceCard>
            <Skeleton height={18} width={160} delayMs={0} />
            <Skeleton height={24} width="75%" delayMs={40} />
            <Skeleton height={14} width="90%" delayMs={80} />
          </SurfaceCard>
          <SurfaceCard>
            <Skeleton height={12} width={120} delayMs={0} />
            <Skeleton height={96} delayMs={40} />
          </SurfaceCard>
          <SurfaceCard>
            <Skeleton height={64} delayMs={0} />
            <Skeleton height={64} delayMs={40} />
            <Skeleton height={64} delayMs={80} />
          </SurfaceCard>
        </View>
      </Screen>
    );
  }

  if (!viewModel.data || !viewModel.roadmap) {
    return (
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <ErrorNotice
          title="Roadmap unavailable"
          description="We could not load your roadmap sequence right now. Retry to pull the latest plan."
          onRetry={() => {
            void viewModel.refetch();
          }}
        />
      </Screen>
    );
  }

  const data = viewModel.data;
  const roadmap = viewModel.roadmap;
  const coverage = buildCoverageDisplay({
    roadmap,
    snapshot: viewModel.snapshot,
  });
  const currentStage = data.stageCards.find((stage) => stage.isCurrent);
  const stageTimeline = data.stageCards.filter((stage) => !stage.isCurrent);
  const nextStageLabel =
    roadmap.upcomingStages[0] != null
      ? (ROADMAP_STAGE_METADATA[roadmap.upcomingStages[0]]?.label ?? null)
      : null;

  return (
    <>
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <ScreenHeader
          eyebrow="Roadmap"
          title="How the plan fits together"
          description="See the current stage, what comes next, and what is shaping the sequence."
          titleTestID="journey-screen-title"
          trailingAccessory={
            <ProfileUtilityButton
              onPress={() => router.push("/(dashboard)/profile")}
              testID="roadmap-utility-button"
            />
          }
        >
          <Pill
            active
            tone={coverage.tone}
            onPress={() => setDataHealthOpen(true)}
            testID="roadmap-coverage-chip"
          >
            {coverage.label}
          </Pill>
        </ScreenHeader>

        {viewModel.hasRefreshError ? (
          <SurfaceCard
            style={{
              borderColor: `${colors.warning}44`,
              backgroundColor: `${colors.warning}14`,
            }}
          >
            <Text variant="labelMedium" style={{ color: colors.warning }}>
              ROADMAP REFRESH NEEDED
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              We are showing your last known roadmap while account data
              refreshes.
            </Text>
            <View style={{ marginTop: tokens.space.xs }}>
              <SecondaryButton onPress={() => void viewModel.refetch()}>
                Retry refresh
              </SecondaryButton>
            </View>
          </SurfaceCard>
        ) : null}

        {coverage.banner ? (
          <SurfaceCard
            style={{
              borderColor: `${colors.warning}44`,
              backgroundColor: `${colors.warning}14`,
            }}
            testID="roadmap-coverage-banner"
          >
            <Text variant="labelMedium" style={{ color: colors.warning }}>
              {coverage.banner.title.toUpperCase()}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {coverage.banner.description}
            </Text>
            <View style={{ marginTop: tokens.space.xs }}>
              <SecondaryButton
                onPress={() => router.push("/(dashboard)/accounts")}
              >
                {coverage.actionLabel}
              </SecondaryButton>
            </View>
          </SurfaceCard>
        ) : null}

        {currentStage ? (
          <SurfaceCard
            testID="roadmap-current-stage-card"
            style={styles.currentStageCard}
          >
            <Pill active tone="accent">
              Current stage
            </Pill>
            <Text variant="headlineSmall" style={styles.cardTitle}>
              {currentStage.label}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              {currentStage.description}
            </Text>

            <View style={styles.detailBlock}>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                CURRENT FOCUS
              </Text>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {data.currentFocus.label}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                {data.currentFocus.description}
              </Text>
            </View>

            <View style={styles.detailBlock}>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                NEXT ACTION
              </Text>
              <Text variant="titleMedium" style={styles.cardTitle}>
                {data.nextAction.title}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                {data.nextAction.recommendation}
              </Text>
            </View>

            <View style={styles.detailBlock}>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                WHY THIS STAGE IS CURRENT
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                {data.whyPlacedHere}
              </Text>
            </View>

            {nextStageLabel ? (
              <View style={styles.detailBlock}>
                <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                  WHAT UNLOCKS NEXT
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {`${currentStage.label} sets up the move into ${nextStageLabel}.`}
                </Text>
              </View>
            ) : null}

            <PrimaryButton
              testID="roadmap-step-detail-cta"
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/step/[recommendationId]",
                  params: { recommendationId: data.nextAction.actionId },
                })
              }
            >
              View step detail
            </PrimaryButton>
          </SurfaceCard>
        ) : null}

        <SurfaceCard testID="roadmap-stage-list">
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            STAGE TIMELINE
          </Text>
          <View style={styles.stageList}>
            {stageTimeline.map((stageCard) => {
              const isExpanded = expandedStageId === stageCard.stageId;
              return (
                <Pressable
                  key={stageCard.stageId}
                  onPress={() =>
                    setExpandedStageId((current) =>
                      current === stageCard.stageId ? null : stageCard.stageId,
                    )
                  }
                  style={({ pressed }) => [
                    styles.stageRow,
                    {
                      borderColor: colors.borderSubtle,
                      backgroundColor: pressed
                        ? colors.surface3
                        : colors.surface2,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${stageCard.label} ${stageCard.status}`}
                  accessibilityHint="Expands or collapses this stage."
                >
                  <View style={styles.stageHeader}>
                    <Text variant="titleSmall" style={styles.cardTitle}>
                      {stageCard.label}
                    </Text>
                    <Pill active tone={stageTone(stageCard.status)}>
                      {stageCard.status}
                    </Pill>
                  </View>
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {stageCard.description}
                  </Text>
                  {isExpanded ? (
                    <View style={styles.stageExpanded}>
                      <Text
                        variant="bodySmall"
                        style={{ color: colors.textMuted }}
                      >
                        {stageCard.blockedReason
                          ? stageCard.blockedReason
                          : stageCard.status === "completed"
                            ? "This stage is complete enough for the roadmap to move on."
                            : "This stage stays collapsed until the current priority is complete."}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </SurfaceCard>

        {data.goalImpacts.length > 0 ? (
          <SurfaceCard>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              GOAL IMPACTS
            </Text>
            {data.goalImpacts.map((impact) => (
              <Text
                key={impact}
                variant="bodySmall"
                style={{ color: colors.textMuted }}
              >
                {`\u2022 ${impact}`}
              </Text>
            ))}
          </SurfaceCard>
        ) : null}

        {data.recommendedAccountsToLink.length > 0 ? (
          <SurfaceCard testID="roadmap-linking-guidance">
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              IMPROVE COVERAGE
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Link these account types to sharpen the roadmap where it is still
              limited.
            </Text>
            <View style={styles.pillWrap}>
              {data.recommendedAccountsToLink.map((accountType) => (
                <Pill key={accountType} active tone="warning">
                  {accountType}
                </Pill>
              ))}
            </View>
            <View style={{ marginTop: tokens.space.xs }}>
              <SecondaryButton
                onPress={() => router.push("/(dashboard)/accounts")}
              >
                Improve coverage
              </SecondaryButton>
            </View>
          </SurfaceCard>
        ) : null}
      </Screen>

      <DataHealthSheet
        isOpen={isDataHealthOpen}
        onDismiss={() => setDataHealthOpen(false)}
        coverage={coverage}
        onManageAccounts={() => {
          setDataHealthOpen(false);
          router.push("/(dashboard)/accounts");
        }}
      />
    </>
  );
}

function createStyles(
  tokens: ReturnType<typeof useAppTheme>["tokens"],
): ReturnType<typeof StyleSheet.create> {
  return StyleSheet.create({
    container: {
      gap: tokens.space.md,
      paddingBottom: tokens.space.lg + tokens.space.sm,
    },
    loadingStack: {
      gap: tokens.space.md,
    },
    currentStageCard: {
      gap: tokens.space.sm,
    },
    cardTitle: {
      fontWeight: "700",
    },
    detailBlock: {
      gap: tokens.space.xs,
    },
    stageList: {
      gap: tokens.space.sm,
    },
    stageRow: {
      gap: tokens.space.xs,
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      padding: tokens.space.sm,
    },
    stageHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: tokens.space.xs,
    },
    stageExpanded: {
      paddingTop: tokens.space.xs,
    },
    pillWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.xs,
      marginTop: tokens.space.xs,
    },
  });
}
