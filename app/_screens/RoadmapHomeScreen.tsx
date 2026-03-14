import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

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
import { useHomeViewModel } from "@/utils/queries/useRoadmapCore";
import {
  buildCoverageDisplay,
  isRoadmapStressMode,
} from "@/utils/roadmap/experience";
import type { HomeViewModel } from "@/utils/roadmap/viewModels";

function formatAsOf(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString();
}

function snapshotCardTone(
  key: NonNullable<HomeViewModel["snapshotCards"]>[number]["key"],
): "accent" | "positive" | "warning" | "neutral" {
  switch (key) {
    case "monthlySurplus":
      return "positive";
    case "totalDebt":
      return "warning";
    case "liquidCash":
      return "accent";
    default:
      return "neutral";
  }
}

export function RoadmapHomeScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const setAskContext = useAskStore((state) => state.setContext);
  const viewModel = useHomeViewModel();
  const [isDataHealthOpen, setDataHealthOpen] = useState(false);

  useEffect(() => {
    if (!viewModel.roadmap || !viewModel.data) {
      return;
    }

    setAskContext({
      screen: "home",
      recommendationId: viewModel.data.nextAction.actionId,
      stepId: viewModel.data.nextAction.actionId,
    });

    trackEvent("home_viewed", {
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

  const handleCta = (cta: HomeViewModel["ctas"][number] | undefined): void => {
    if (!viewModel.data || !viewModel.roadmap || !cta) {
      return;
    }

    trackEvent("home_primary_cta_clicked", {
      cta_type: cta.type,
      coverage_level: viewModel.roadmap.overallCoverageLevel,
      current_stage_id: viewModel.roadmap.currentStage.id,
      roadmap_engine_version: viewModel.roadmap.engineMeta.version,
    });

    if (cta.type === "view_step_detail") {
      router.push({
        pathname: "/(dashboard)/step/[recommendationId]",
        params: { recommendationId: viewModel.data.nextAction.actionId },
      });
      return;
    }

    if (cta.type === "see_full_roadmap") {
      router.push("/(dashboard)/journey");
      return;
    }

    router.push("/(dashboard)/accounts");
  };

  if (viewModel.isLoading && !viewModel.data) {
    return (
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <View style={styles.loadingStack}>
          <SurfaceCard>
            <Skeleton height={18} width={150} delayMs={0} />
            <Skeleton height={30} width="72%" delayMs={40} />
            <Skeleton height={18} width="86%" delayMs={80} />
          </SurfaceCard>
          <SurfaceCard>
            <Skeleton height={16} width={110} delayMs={0} />
            <Skeleton height={96} delayMs={40} />
          </SurfaceCard>
          <SurfaceCard>
            <Skeleton height={64} delayMs={0} />
            <Skeleton height={44} delayMs={40} />
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
          description="We could not load your roadmap right now. Retry to pull the latest plan."
          onRetry={() => {
            void viewModel.refetch();
          }}
        />
      </Screen>
    );
  }

  const data = viewModel.data;
  const roadmap = viewModel.roadmap;
  const snapshot = viewModel.snapshot;
  const asOfLabel = formatAsOf(snapshot?.asOf);
  const stressMode = isRoadmapStressMode(roadmap);
  const coverage = buildCoverageDisplay({ roadmap, snapshot });
  const snapshotCards =
    stressMode && data.snapshotCards
      ? data.snapshotCards.slice(0, 2)
      : data.snapshotCards;

  return (
    <>
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <ScreenHeader
          eyebrow="Home"
          title="Where you are now"
          description={
            stressMode
              ? "Focus first on staying current and creating breathing room."
              : "A calm planning snapshot built around your current stage."
          }
          titleTestID="home-roadmap-stage-title"
          style={styles.header}
          trailingAccessory={
            <ProfileUtilityButton
              onPress={() => router.push("/(dashboard)/profile")}
              testID="home-utility-button"
            />
          }
        />

        <SurfaceCard
          testID="home-stage-hero"
          style={{
            borderColor: stressMode ? `${colors.warning}33` : undefined,
            backgroundColor: stressMode
              ? `${colors.warning}12`
              : colors.surface1,
          }}
        >
          <View style={styles.heroHeader}>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              CURRENT STAGE
            </Text>
            <Pill
              active
              tone={coverage.tone}
              onPress={() => setDataHealthOpen(true)}
              testID="home-coverage-chip"
            >
              {coverage.label}
            </Pill>
          </View>
          <Text variant="headlineMedium" style={styles.heroTitle}>
            {data.stage.label}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
            {data.stage.description}
          </Text>
          <View style={styles.focusBlock}>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              CURRENT FOCUS
            </Text>
            <Text variant="titleLarge" style={styles.cardTitle}>
              {data.currentFocus.label}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              {data.currentFocus.description}
            </Text>
          </View>
        </SurfaceCard>

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
            testID="home-coverage-banner"
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

        <SurfaceCard testID="home-next-action-card" style={styles.featureCard}>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            NEXT ACTION
          </Text>
          <Text variant="headlineSmall" style={styles.cardTitle}>
            {data.nextAction.title}
          </Text>
          <Text variant="bodyLarge" style={{ color: colors.text }}>
            {data.nextAction.recommendation}
          </Text>
          {data.reasoningPreview[0] ? (
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {data.reasoningPreview[0]}
            </Text>
          ) : null}
          <View style={styles.ctaStack}>
            <PrimaryButton
              testID="home-primary-cta"
              onPress={() => handleCta(data.ctas[0])}
            >
              {data.ctas[0]?.label ?? "View step detail"}
            </PrimaryButton>
            <SecondaryButton
              testID="home-roadmap-cta"
              onPress={() => handleCta(data.ctas[1])}
            >
              {data.ctas[1]?.label ?? "See full roadmap"}
            </SecondaryButton>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.metricCard} testID="home-key-metric-card">
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            KEY METRIC
          </Text>
          <Text variant="headlineSmall" style={styles.cardTitle}>
            {data.keyMetric.value}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {data.keyMetric.label}
          </Text>
        </SurfaceCard>

        {snapshotCards && snapshotCards.length > 0 ? (
          <SurfaceCard testID="home-financial-snapshot">
            <View style={styles.heroHeader}>
              <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                FINANCIAL SNAPSHOT
              </Text>
              {asOfLabel ? (
                <Text variant="bodySmall" style={{ color: colors.textFaint }}>
                  {`As of ${asOfLabel}`}
                </Text>
              ) : null}
            </View>
            <View style={styles.snapshotGrid}>
              {snapshotCards.map((card) => (
                <View
                  key={card.key}
                  style={[
                    styles.snapshotCard,
                    {
                      borderColor: colors.borderSubtle,
                      backgroundColor: colors.surface2,
                    },
                  ]}
                >
                  <Pill active tone={snapshotCardTone(card.key)}>
                    {card.label}
                  </Pill>
                  <Text variant="titleSmall" style={styles.cardTitle}>
                    {card.value}
                  </Text>
                </View>
              ))}
            </View>
          </SurfaceCard>
        ) : null}

        {!stressMode && roadmap.explanation.goalImpacts.length > 0 ? (
          <SurfaceCard testID="home-goal-impact-card">
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              GOAL IMPACT
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              {roadmap.explanation.goalImpacts[0]}
            </Text>
            <View style={{ marginTop: tokens.space.xs }}>
              <SecondaryButton
                onPress={() => router.push("/(dashboard)/goals")}
              >
                Review goals
              </SecondaryButton>
            </View>
          </SurfaceCard>
        ) : null}

        <SurfaceCard testID="home-monthly-review-card">
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            MONTHLY REVIEW
          </Text>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Review this month
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            See what changed, how your roadmap moved, and what deserves
            attention next.
          </Text>
          <View style={{ marginTop: tokens.space.xs }}>
            <SecondaryButton
              onPress={() => router.push("/(dashboard)/monthly-review")}
            >
              Open monthly review
            </SecondaryButton>
          </View>
        </SurfaceCard>
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
    header: {
      gap: tokens.space.sm,
    },
    loadingStack: {
      gap: tokens.space.md,
    },
    heroHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: tokens.space.sm,
    },
    heroTitle: {
      fontWeight: "700",
    },
    focusBlock: {
      gap: tokens.space.xs,
      marginTop: tokens.space.lg,
    },
    featureCard: {
      gap: tokens.space.sm,
    },
    cardTitle: {
      fontWeight: "700",
    },
    ctaStack: {
      gap: tokens.space.xs,
      marginTop: tokens.space.xs,
    },
    metricCard: {
      gap: tokens.space.xs,
    },
    snapshotGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.xs,
    },
    snapshotCard: {
      flexGrow: 1,
      minWidth: 132,
      gap: tokens.space.sm,
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      padding: tokens.space.sm,
    },
  });
}
