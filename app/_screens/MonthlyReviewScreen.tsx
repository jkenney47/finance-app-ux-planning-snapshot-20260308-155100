import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { DataHealthSheet } from "@/components/roadmap/DataHealthSheet";
import { ErrorNotice, Skeleton } from "@/components/state";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { trackEvent } from "@/utils/analytics";
import {
  useCurrentRoadmap,
  useFinancialSnapshot,
} from "@/utils/queries/useRoadmapCore";
import {
  buildCoverageDisplay,
  buildMonthlyReviewSummary,
  isRoadmapStressMode,
} from "@/utils/roadmap/experience";

export function MonthlyReviewScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => createStyles(tokens), [tokens]);
  const roadmapQuery = useCurrentRoadmap();
  const snapshotQuery = useFinancialSnapshot();
  const [isDataHealthOpen, setDataHealthOpen] = useState(false);

  useEffect(() => {
    if (!roadmapQuery.data) {
      return;
    }

    trackEvent("monthly_review_viewed", {
      coverage_level: roadmapQuery.data.overallCoverageLevel,
      current_stage_id: roadmapQuery.data.currentStage.id,
      roadmap_engine_version: roadmapQuery.data.engineMeta.version,
    });
  }, [roadmapQuery.data]);

  if (roadmapQuery.isLoading && !roadmapQuery.data) {
    return (
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <SurfaceCard>
          <Skeleton height={16} width={120} delayMs={0} />
          <Skeleton height={24} width="68%" delayMs={40} />
          <Skeleton height={14} width="88%" delayMs={80} />
        </SurfaceCard>
        <SurfaceCard>
          <Skeleton height={72} delayMs={0} />
          <Skeleton height={72} delayMs={40} />
        </SurfaceCard>
      </Screen>
    );
  }

  if (!roadmapQuery.data) {
    return (
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <ErrorNotice
          title="Monthly review unavailable"
          description="We could not load your roadmap review right now. Retry to pull the latest plan."
          onRetry={() => {
            void Promise.all([roadmapQuery.refetch(), snapshotQuery.refetch()]);
          }}
        />
      </Screen>
    );
  }

  const roadmap = roadmapQuery.data;
  const snapshot = snapshotQuery.data;
  const coverage = buildCoverageDisplay({ roadmap, snapshot });
  const review = buildMonthlyReviewSummary({ roadmap, snapshot });
  const stressMode = isRoadmapStressMode(roadmap);

  return (
    <>
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <ScreenHeader
          eyebrow="Monthly review"
          title="Review this month"
          description={
            stressMode
              ? "Keep the review brief: confirm the priority, note what changed, and protect the next move."
              : "A concise check-in on what changed, what progressed, and what to do next."
          }
        >
          <Pill
            active
            tone={coverage.tone}
            onPress={() => setDataHealthOpen(true)}
          >
            {coverage.label}
          </Pill>
        </ScreenHeader>

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

        <SurfaceCard>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            WHAT TO DO NEXT
          </Text>
          <Text variant="headlineSmall" style={styles.cardTitle}>
            {review.nextMove.primary}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {review.advisorUpdate}
          </Text>
          {review.nextMove.secondary && !stressMode ? (
            <Text variant="bodySmall" style={{ color: colors.textFaint }}>
              {`Optional alternative to compare later: ${review.nextMove.secondary}.`}
            </Text>
          ) : null}
          <View style={styles.ctaStack}>
            <PrimaryButton
              onPress={() =>
                router.push({
                  pathname: "/(dashboard)/step/[recommendationId]",
                  params: { recommendationId: roadmap.nextAction.actionId },
                })
              }
            >
              View step detail
            </PrimaryButton>
            <SecondaryButton
              onPress={() => router.push("/(dashboard)/journey")}
            >
              Open roadmap
            </SecondaryButton>
          </View>
        </SurfaceCard>

        {review.snapshot.length > 0 ? (
          <SurfaceCard>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              SNAPSHOT
            </Text>
            <View style={styles.snapshotGrid}>
              {review.snapshot.map((item) => (
                <View
                  key={item.label}
                  style={[
                    styles.snapshotCard,
                    {
                      borderColor: colors.borderSubtle,
                      backgroundColor: colors.surface2,
                    },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={{ color: colors.textFaint }}
                  >
                    {item.label}
                  </Text>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </SurfaceCard>
        ) : null}

        <SurfaceCard>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            WHAT CHANGED
          </Text>
          <View style={styles.bulletList}>
            {review.whatChanged.map((item) => (
              <Text
                key={item}
                variant="bodySmall"
                style={{ color: colors.textMuted }}
              >
                {`\u2022 ${item}`}
              </Text>
            ))}
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            ROADMAP PROGRESS
          </Text>
          <View style={styles.headerRow}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {review.roadmapProgress.currentStage}
            </Text>
            {review.roadmapProgress.nextStage ? (
              <Pill active tone="accent">
                {`Up next: ${review.roadmapProgress.nextStage}`}
              </Pill>
            ) : null}
          </View>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {review.roadmapProgress.summary}
          </Text>
        </SurfaceCard>

        <SurfaceCard>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            DATA HEALTH
          </Text>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {review.dataHealth.label}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {review.dataHealth.summary}
          </Text>
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
    cardTitle: {
      fontWeight: "700",
    },
    ctaStack: {
      gap: tokens.space.xs,
      marginTop: tokens.space.sm,
    },
    snapshotGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: tokens.space.xs,
    },
    snapshotCard: {
      minWidth: 136,
      flexGrow: 1,
      gap: tokens.space.xs,
      borderWidth: 1,
      borderRadius: tokens.radius.md,
      padding: tokens.space.sm,
    },
    bulletList: {
      gap: tokens.space.xs,
      marginTop: tokens.space.xs,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: tokens.space.xs,
    },
  });
}
