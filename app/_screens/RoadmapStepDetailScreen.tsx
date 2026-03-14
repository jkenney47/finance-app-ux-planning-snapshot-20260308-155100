import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { Sheet } from "@/components/common/Sheet";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { DataHealthSheet } from "@/components/roadmap/DataHealthSheet";
import { ErrorNotice, Skeleton } from "@/components/state";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import { trackEvent } from "@/utils/analytics";
import { useStepDetailViewModel } from "@/utils/queries/useRoadmapCore";
import {
  buildCoverageDisplay,
  isRoadmapStressMode,
} from "@/utils/roadmap/experience";
import type { StepDetailViewModel } from "@/utils/roadmap/viewModels";

function domainTone(
  level: StepDetailViewModel["domainCoverage"][number]["level"],
): "positive" | "warning" | "neutral" {
  switch (level) {
    case "strong":
      return "positive";
    case "limited":
      return "warning";
    case "none":
    default:
      return "neutral";
  }
}

function confidenceTone(
  confidence: StepDetailViewModel["nextAction"]["confidence"],
): "positive" | "accent" | "warning" {
  switch (confidence) {
    case "high":
      return "positive";
    case "medium":
      return "accent";
    case "low":
    default:
      return "warning";
  }
}

export function RoadmapStepDetailScreen(): JSX.Element {
  const router = useRouter();
  const { recommendationId } = useLocalSearchParams<{
    recommendationId?: string;
  }>();
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const setAskContext = useAskStore((state) => state.setContext);
  const openAsk = useAskStore((state) => state.open);
  const viewModel = useStepDetailViewModel(recommendationId);
  const [isDataHealthOpen, setDataHealthOpen] = useState(false);
  const [isCompareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    if (!viewModel.roadmap || !viewModel.data) {
      return;
    }

    setAskContext({
      screen: "step_detail",
      recommendationId: viewModel.data.nextAction.actionId,
      stepId: viewModel.data.nextAction.actionId,
    });

    trackEvent("step_detail_viewed", {
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

  const handleCta = (cta: StepDetailViewModel["ctas"][number]): void => {
    if (!viewModel.roadmap) {
      return;
    }

    if (cta.type === "link_more_accounts") {
      trackEvent("link_more_accounts_clicked", {
        coverage_level: viewModel.roadmap.overallCoverageLevel,
        current_stage_id: viewModel.roadmap.currentStage.id,
        roadmap_engine_version: viewModel.roadmap.engineMeta.version,
      });
      router.push("/(dashboard)/accounts");
      return;
    }

    if (cta.type === "manage_accounts") {
      router.push("/(dashboard)/accounts");
      return;
    }

    router.push("/(dashboard)/journey");
  };

  if (viewModel.isLoading && !viewModel.data) {
    return (
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <SurfaceCard>
          <Skeleton height={12} width={120} delayMs={0} />
          <Skeleton height={26} width="72%" delayMs={40} />
          <Skeleton height={14} width="90%" delayMs={80} />
          <Skeleton height={72} delayMs={120} />
        </SurfaceCard>
      </Screen>
    );
  }

  if (!viewModel.data || !viewModel.roadmap) {
    return (
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <ErrorNotice
          title="Step unavailable"
          description="We could not load the current roadmap recommendation. Retry to refresh the roadmap."
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
  const stressMode = isRoadmapStressMode(roadmap);
  const reasoningBullets = stressMode
    ? data.reasoningBullets.slice(0, 2)
    : data.reasoningBullets;
  const alternatives = data.nextAction.alternativeOptions ?? [];

  return (
    <>
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <ScreenHeader
          eyebrow="Step detail"
          title={data.nextAction.title}
          description={
            stressMode
              ? "Keep the scope narrow. This is the one move to focus on right now."
              : `${data.stage.label} stage · ${data.focus.label}`
          }
        >
          <Pill
            active
            tone={coverage.tone}
            onPress={() => setDataHealthOpen(true)}
            testID="step-detail-coverage-chip"
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
              We are showing your last known recommendation while the roadmap
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

        <SurfaceCard
          testID="step-detail-action-card"
          style={{
            borderColor: stressMode ? `${colors.warning}44` : undefined,
            backgroundColor: stressMode
              ? `${colors.warning}12`
              : colors.surface1,
          }}
        >
          <View style={styles.headerRow}>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              PRIMARY MOVE
            </Text>
            <Pill active tone={confidenceTone(data.nextAction.confidence)}>
              {`Confidence: ${data.nextAction.confidence}`}
            </Pill>
          </View>
          <Text variant="headlineSmall" style={styles.cardTitle}>
            {data.nextAction.recommendation}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.text }}>
            {data.nextAction.rationale}
          </Text>
          <View style={styles.detailBlock}>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              WHY THIS IS NEXT
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {data.whyNow}
            </Text>
          </View>
          {alternatives.length > 0 ? (
            <View style={{ marginTop: tokens.space.xs }}>
              <SecondaryButton
                compact
                testID="step-detail-compare-cta"
                onPress={() => setCompareOpen(true)}
              >
                Compare options
              </SecondaryButton>
            </View>
          ) : null}
        </SurfaceCard>

        <SurfaceCard testID="step-detail-reasoning">
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            WHAT SUPPORTS THIS
          </Text>
          <View style={styles.detailBlock}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {data.focus.label}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {data.focus.description}
            </Text>
          </View>
          <View style={styles.bulletList}>
            {reasoningBullets.map((reason) => (
              <Text
                key={reason}
                variant="bodySmall"
                style={{ color: colors.textMuted }}
              >
                {`\u2022 ${reason}`}
              </Text>
            ))}
          </View>
          {data.requiredCoverageDomains.length > 0 ? (
            <View style={styles.detailBlock}>
              <Text variant="labelSmall" style={{ color: colors.textFaint }}>
                MOST RELEVANT DATA
              </Text>
              <View style={styles.requiredCoverageList}>
                {data.requiredCoverageDomains.map((domain) => (
                  <Pill key={domain} active tone="accent">
                    {domain}
                  </Pill>
                ))}
              </View>
            </View>
          ) : null}
        </SurfaceCard>

        {!stressMode && data.goalImpacts.length > 0 ? (
          <SurfaceCard>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              GOAL IMPACT
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

        <SurfaceCard testID="step-detail-domain-coverage">
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            DATA SUPPORT
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            The recommendation is strongest where these domains are current and
            connected.
          </Text>
          <View style={styles.domainGrid}>
            {data.domainCoverage.map((domain) => (
              <View
                key={domain.domain}
                style={[
                  styles.domainCard,
                  {
                    borderColor: colors.borderSubtle,
                    backgroundColor: colors.surface2,
                  },
                ]}
              >
                <Text variant="titleSmall" style={styles.cardTitle}>
                  {domain.domain}
                </Text>
                <Pill active tone={domainTone(domain.level)}>
                  {domain.level}
                </Pill>
              </View>
            ))}
          </View>
        </SurfaceCard>

        {!stressMode && data.limitations.length > 0 ? (
          <SurfaceCard testID="step-detail-limitations">
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              WHAT COULD CHANGE THIS
            </Text>
            {data.limitations.map((limitation) => (
              <Text
                key={limitation}
                variant="bodySmall"
                style={{ color: colors.textMuted }}
              >
                {`\u2022 ${limitation}`}
              </Text>
            ))}
          </SurfaceCard>
        ) : null}

        <View style={styles.ctaStack}>
          <PrimaryButton
            testID="step-detail-primary-cta"
            onPress={() => handleCta(data.ctas[0])}
          >
            {data.ctas[0]?.label ?? "Manage accounts"}
          </PrimaryButton>
          <SecondaryButton
            testID="step-detail-roadmap-cta"
            onPress={() => handleCta(data.ctas[1])}
          >
            {data.ctas[1]?.label ?? "See full roadmap"}
          </SecondaryButton>
          {!stressMode ? (
            <SecondaryButton
              onPress={() =>
                openAsk({
                  screen: "step_detail",
                  recommendationId: data.nextAction.actionId,
                  stepId: data.nextAction.actionId,
                })
              }
            >
              Ask about this step
            </SecondaryButton>
          ) : null}
        </View>
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

      <Sheet
        isOpen={isCompareOpen}
        onDismiss={() => setCompareOpen(false)}
        testID="step-detail-compare-sheet"
      >
        <View style={{ gap: tokens.space.md }}>
          <View style={{ gap: tokens.space.xs }}>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              COMPARE OPTIONS
            </Text>
            <Text variant="headlineSmall" style={{ color: colors.text }}>
              Alternative paths and tradeoffs
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Keep the primary move as the default unless one of these tradeoffs
              fits your constraints better.
            </Text>
          </View>
          {alternatives.map((option) => (
            <SurfaceCard key={option.title}>
              <View style={styles.detailBlock}>
                <Text variant="titleSmall" style={styles.cardTitle}>
                  {option.title}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {option.tradeoff}
                </Text>
              </View>
            </SurfaceCard>
          ))}
          <PrimaryButton onPress={() => setCompareOpen(false)}>
            Keep current recommendation
          </PrimaryButton>
        </View>
      </Sheet>
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
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: tokens.space.xs,
    },
    cardTitle: {
      fontWeight: "700",
    },
    detailBlock: {
      gap: tokens.space.xs,
    },
    bulletList: {
      gap: tokens.space.xs,
      marginTop: tokens.space.sm,
    },
    domainGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.xs,
    },
    domainCard: {
      minWidth: 140,
      gap: tokens.space.xs,
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      padding: tokens.space.sm,
    },
    requiredCoverageList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.xs,
    },
    ctaStack: {
      gap: tokens.space.sm,
    },
  });
}
