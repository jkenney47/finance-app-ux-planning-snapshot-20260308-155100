import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { View } from "react-native";

import { RoadmapStepDetailScreen } from "@/app/_screens/RoadmapStepDetailScreen";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { CoverageConfidenceBadge } from "@/components/dashboard/CoverageConfidenceBadge";
import { MilestoneMeasurementDisclosure } from "@/components/dashboard/MilestoneMeasurementDisclosure";
import { OptionCard } from "@/components/dashboard/OptionCard";
import { Skeleton } from "@/components/state";
import { Text } from "@/components/ui/text";
import {
  useDashboardSummary,
  useFinancialMaturityEvaluation,
} from "@/hooks/useDashboardData";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import type { Recommendation } from "@/utils/contracts/fme";
import { deriveCoverageConfidence } from "@/utils/roadmap/confidence";
import { isRoadmapCoreScreensEnabled } from "@/utils/roadmap/featureFlags";
import {
  getChecklist,
  getMeasurementCopy,
  getSecondOrderEffects,
  inferEffort,
  inferImpact,
} from "@/utils/roadmap/stepDetails";
import {
  getRecommendationStepType,
  getStepTypeLabel,
  type RoadmapStepType,
} from "@/utils/roadmap/semantics";

function formatFactValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(2);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  return String(value);
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function stepTypeBehaviorCopy(stepType: RoadmapStepType): string {
  if (stepType === "setup") {
    return "One-time setup step. After completion it stays complete unless your data changes materially.";
  }

  if (stepType === "threshold") {
    return "Threshold step. Hitting target unlocks downstream actions, then ongoing status is monitored over time.";
  }

  return "Maintain step. This is an ongoing health signal, not a permanently complete task.";
}

function setupMeasurementCopy(): string {
  return "Setup steps are one-time configuration actions. Once the setup condition is confirmed, this step stays complete unless your underlying data changes materially.";
}

type FallbackAlternative = {
  id: string;
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
  unlocks: string;
  delays: string;
  bestFor: string;
  confidence: string;
  assumptions: string;
};

function buildFallbackAlternatives(
  recommendation: Recommendation,
  confidenceLabel: string,
): FallbackAlternative[] {
  return [
    {
      id: `${recommendation.id}-fallback-data-first`,
      title: "Data-first refinement",
      summary:
        "Improve coverage first, then re-rank options before committing to the full step.",
      pros: [
        "Higher confidence before taking irreversible actions",
        "Clearer impact and effort tradeoffs",
      ],
      cons: ["Delays immediate execution by one review cycle"],
      unlocks: "More precise option comparison and step sequencing.",
      delays: "Fastest possible progress on the current step.",
      bestFor: "Best for medium/low coverage plans.",
      confidence: `${confidenceLabel} with current connected data.`,
      assumptions:
        "Assumes you can connect data or complete missing prompts soon.",
    },
    {
      id: `${recommendation.id}-fallback-minimum-viable`,
      title: "Minimum-viable progress",
      summary:
        "Take the lowest-effort action now, then reassess after the next pay cycle.",
      pros: [
        "Keeps momentum without overcommitting",
        "Lower implementation friction this week",
      ],
      cons: ["May unlock downstream milestones more slowly"],
      unlocks: "A stable maintenance signal for the next roadmap update.",
      delays: "Maximum impact from full-step execution.",
      bestFor: "Best for tight schedules or uncertain cash flow.",
      confidence: "Medium when spending and income remain stable.",
      assumptions:
        "Assumes no major income/expense changes before the next review window.",
    },
  ];
}

export default function StepDetailScreen(): JSX.Element {
  if (isRoadmapCoreScreensEnabled()) {
    return <RoadmapStepDetailScreen />;
  }

  return <LegacyStepDetailScreen />;
}

function LegacyStepDetailScreen(): JSX.Element {
  const router = useRouter();
  const { recommendationId } = useLocalSearchParams<{
    recommendationId?: string;
  }>();
  const { colors, tokens } = useAppTheme();
  const openAsk = useAskStore((state) => state.open);
  const setAskContext = useAskStore((state) => state.setContext);

  const summaryQuery = useDashboardSummary();
  const summary = summaryQuery.data;
  const fme = useFinancialMaturityEvaluation(summary);
  const confidence = useMemo(
    () =>
      deriveCoverageConfidence(
        fme.evaluation,
        fme.facts,
        summary?.institutionStatuses,
      ),
    [fme.evaluation, fme.facts, summary?.institutionStatuses],
  );
  const disconnectedInstitutions = useMemo(
    () =>
      (summary?.institutionStatuses ?? []).filter(
        (institution) =>
          institution.status === "relink" || institution.status === "error",
      ),
    [summary?.institutionStatuses],
  );

  const allRecommendations = useMemo<Recommendation[]>(
    () =>
      [
        fme.evaluation.primaryRecommendation,
        ...fme.evaluation.alternatives,
      ].filter((recommendation): recommendation is Recommendation =>
        Boolean(recommendation),
      ),
    [fme.evaluation.alternatives, fme.evaluation.primaryRecommendation],
  );

  const selectedRecommendation = useMemo(
    () =>
      allRecommendations.find(
        (recommendation) => recommendation.id === recommendationId,
      ) ?? allRecommendations[0],
    [allRecommendations, recommendationId],
  );

  const alternativeRecommendations = useMemo(
    () =>
      allRecommendations.filter(
        (recommendation) => recommendation.id !== selectedRecommendation?.id,
      ),
    [allRecommendations, selectedRecommendation?.id],
  );
  const additionalAlternativesNeeded = selectedRecommendation
    ? Math.max(0, 2 - alternativeRecommendations.length)
    : 0;
  const fallbackAlternatives = useMemo(() => {
    if (!selectedRecommendation || additionalAlternativesNeeded === 0) {
      return [];
    }

    return buildFallbackAlternatives(
      selectedRecommendation,
      confidence.label,
    ).slice(0, additionalAlternativesNeeded);
  }, [additionalAlternativesNeeded, confidence.label, selectedRecommendation]);

  const selectedTrace = useMemo(() => {
    if (!selectedRecommendation) return null;
    const firstTraceRef = selectedRecommendation.traceRefs[0];
    if (!firstTraceRef) return null;
    return (
      fme.evaluation.trace.find((trace) => trace.traceId === firstTraceRef) ??
      null
    );
  }, [fme.evaluation.trace, selectedRecommendation]);
  const isStepLoading =
    (summaryQuery.isLoading || fme.isPolicyLoading) && !selectedRecommendation;

  useEffect(() => {
    if (!selectedRecommendation) return;
    setAskContext({
      screen: "step_detail",
      recommendationId: selectedRecommendation.id,
      stepId: selectedRecommendation.id,
      metricId: undefined,
    });
  }, [selectedRecommendation, setAskContext]);

  if (isStepLoading) {
    return (
      <Screen variant="scroll">
        <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
          <Skeleton height={12} width={110} delayMs={0} />
          <Skeleton height={24} width="80%" delayMs={40} />
          <Skeleton height={14} width="92%" delayMs={80} />
          <Skeleton height={14} width="88%" delayMs={120} />
          <Skeleton height={42} delayMs={160} />
        </SurfaceCard>
      </Screen>
    );
  }

  if (!selectedRecommendation) {
    return (
      <Screen variant="scroll">
        <SurfaceCard>
          <Text
            variant="titleMedium"
            style={{ color: colors.text, fontWeight: "700" }}
          >
            Step unavailable
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            We could not find details for this step yet.
          </Text>
          <SecondaryButton onPress={() => router.back()}>Back</SecondaryButton>
        </SurfaceCard>
      </Screen>
    );
  }

  const secondOrderEffects = getSecondOrderEffects(selectedRecommendation.id);
  const checklist = getChecklist(selectedRecommendation.id);
  const measurementCopy = getMeasurementCopy(selectedRecommendation.id);
  const stepType = getRecommendationStepType(selectedRecommendation.id);

  return (
    <Screen
      variant="scroll"
      contentContainerStyle={{
        gap: tokens.space.md,
        paddingBottom: tokens.space.xxl,
      }}
    >
      <View style={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          STEP DETAIL
        </Text>
        <Text
          variant="headlineMedium"
          style={{ color: colors.text, fontWeight: "700" }}
        >
          {selectedRecommendation.title}
        </Text>
      </View>

      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          SUMMARY
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Status: ${fme.evaluation.mode}`}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Type: ${getStepTypeLabel(stepType)}`}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Impact: ${inferImpact(selectedRecommendation)} · Effort: ${inferEffort(selectedRecommendation)}`}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {stepTypeBehaviorCopy(stepType)}
        </Text>
        <CoverageConfidenceBadge confidence={confidence} />
      </SurfaceCard>

      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          SUGGESTED OPTION
        </Text>
        <OptionCard recommendation={selectedRecommendation} />
      </SurfaceCard>

      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          OPTIONS + TRADEOFFS
        </Text>
        {alternativeRecommendations.length > 0 ? (
          alternativeRecommendations.map((option, index) => (
            <OptionCard
              key={option.id}
              recommendation={option}
              unlocksLabel={`Unlocks next: option ${index + 1}`}
              onPressViewDetails={(recommendation) =>
                router.replace({
                  pathname: "/(dashboard)/step/[recommendationId]",
                  params: { recommendationId: recommendation.id },
                })
              }
            />
          ))
        ) : (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            No alternatives available for this step right now.
          </Text>
        )}
        {fallbackAlternatives.map((option) => (
          <SurfaceCard key={option.id} contentStyle={{ gap: tokens.space.xs }}>
            <Text variant="labelSmall" style={{ color: colors.textFaint }}>
              STRATEGY ALTERNATIVE
            </Text>
            <Text
              variant="titleSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              {option.title}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {option.summary}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textFaint }}>
              Source: Strategy fallback (non-modeled)
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Pros: ${option.pros.join(" • ")}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Tradeoffs: ${option.cons.join(" • ")}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Unlocks next: ${option.unlocks}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Delays: ${option.delays}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textFaint }}>
              {`Best for: ${option.bestFor}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textFaint }}>
              {`Confidence: ${option.confidence}`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Assumptions: ${option.assumptions}`}
            </Text>
          </SurfaceCard>
        ))}
        {additionalAlternativesNeeded > 0 ? (
          <Text variant="bodySmall" style={{ color: colors.textFaint }}>
            {`Based on current coverage, ${alternativeRecommendations.length} modeled alternative option${alternativeRecommendations.length === 1 ? "" : "s"} ${alternativeRecommendations.length === 1 ? "is" : "are"} available. Connect more account data to unlock deeper option comparisons.`}
          </Text>
        ) : null}
      </SurfaceCard>

      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          WHY THIS IS NEXT
        </Text>
        {selectedRecommendation.pros.length > 0 ? (
          selectedRecommendation.pros.map((pro) => (
            <Text
              key={pro}
              variant="bodySmall"
              style={{ color: colors.textMuted }}
            >
              {`\u2022 ${pro}`}
            </Text>
          ))
        ) : (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            This step is prioritized by your current facts and policy status.
          </Text>
        )}
      </SurfaceCard>

      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          SECOND-ORDER EFFECTS
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: colors.textMuted, fontWeight: "700" }}
        >
          Unlocks next
        </Text>
        {secondOrderEffects.unlocks.map((unlock) => (
          <Text
            key={unlock}
            variant="bodySmall"
            style={{ color: colors.textMuted }}
          >
            {`\u2022 ${unlock}`}
          </Text>
        ))}
        <Text
          variant="bodySmall"
          style={{
            color: colors.textMuted,
            fontWeight: "700",
            marginTop: tokens.space.xs,
          }}
        >
          Delays
        </Text>
        {secondOrderEffects.delays.map((delay) => (
          <Text
            key={delay}
            variant="bodySmall"
            style={{ color: colors.textMuted }}
          >
            {`\u2022 ${delay}`}
          </Text>
        ))}
      </SurfaceCard>

      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          WHAT I USED
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Last updated: ${formatTimestamp(fme.evaluation.generatedAt)}`}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Confidence: ${confidence.summary}`}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Accounts connected: ${fme.facts.hasLinkedAccounts?.value === true ? "Yes" : "No"}`}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Institutions needing reconnect: ${disconnectedInstitutions.length}`}
        </Text>
        {fme.evaluation.factRequests.length > 0 ? (
          <Text variant="bodySmall" style={{ color: colors.warning }}>
            {`Missing inputs right now: ${fme.evaluation.factRequests.length} key item${fme.evaluation.factRequests.length === 1 ? "" : "s"}.`}
          </Text>
        ) : null}
        {disconnectedInstitutions.length > 0 ? (
          <>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {
                "Missing right now: live balances and transactions from disconnected institutions."
              }
            </Text>
            {disconnectedInstitutions.slice(0, 2).map((institution) => (
              <Text
                key={institution.id}
                variant="bodySmall"
                style={{ color: colors.textFaint }}
              >
                {`\u2022 ${institution.name}${institution.lastSynced ? ` (${institution.lastSynced})` : ""}`}
              </Text>
            ))}
          </>
        ) : null}
        {selectedRecommendation.assumptions.length > 0
          ? selectedRecommendation.assumptions.map((assumption) => (
              <Text
                key={assumption}
                variant="bodySmall"
                style={{ color: colors.textMuted }}
              >
                {`\u2022 Assumption: ${assumption}`}
              </Text>
            ))
          : null}
        {selectedRecommendation.requiredFacts.length > 0
          ? selectedRecommendation.requiredFacts.map((factKey) => {
              const fact = fme.facts[factKey];
              if (!fact) {
                return (
                  <Text
                    key={factKey}
                    variant="bodySmall"
                    style={{ color: colors.warning }}
                  >
                    {`\u2022 ${factKey}: missing`}
                  </Text>
                );
              }
              return (
                <Text
                  key={factKey}
                  variant="bodySmall"
                  style={{ color: colors.textMuted }}
                >
                  {`\u2022 ${factKey}: ${formatFactValue(fact.value)} (${fact.source}, confidence ${Math.round(fact.confidence * 100)}%)`}
                </Text>
              );
            })
          : null}
        {selectedTrace ? (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Trace rule: ${selectedTrace.ruleId}`}
          </Text>
        ) : null}
      </SurfaceCard>

      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          HOW WE MEASURE THIS
        </Text>
        {stepType === "setup" ? (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {setupMeasurementCopy()}
          </Text>
        ) : (
          <MilestoneMeasurementDisclosure
            testID="step-detail-measurement-toggle"
            reason={measurementCopy}
          />
        )}
      </SurfaceCard>

      <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          HOW TO DO IT
        </Text>
        {checklist.map((item) => (
          <Text
            key={item}
            variant="bodySmall"
            style={{ color: colors.textMuted }}
          >
            {`\u2022 ${item}`}
          </Text>
        ))}
      </SurfaceCard>

      <View style={{ gap: tokens.space.xs }}>
        <PrimaryButton
          testID="step-detail-start"
          onPress={() => {
            if (selectedRecommendation.actionRoute) {
              router.push(selectedRecommendation.actionRoute as never);
              return;
            }
            router.push("/(dashboard)/journey");
          }}
        >
          Start this step
        </PrimaryButton>
        <SecondaryButton
          testID="step-detail-ask"
          onPress={() =>
            openAsk({
              screen: "step_detail",
              recommendationId: selectedRecommendation.id,
              stepId: selectedRecommendation.id,
            })
          }
        >
          Ask about this step
        </SecondaryButton>
      </View>
    </Screen>
  );
}
