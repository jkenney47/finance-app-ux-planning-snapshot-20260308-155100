import { View } from "react-native";
import { useState } from "react";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { OptionCard } from "@/components/dashboard/OptionCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import type { FmeEvaluation, Recommendation } from "@/utils/contracts/fme";
import { getRecommendationConfidence } from "@/utils/roadmap/recommendationConfidence";
import { getSecondOrderEffects } from "@/utils/roadmap/stepDetails";
import { nextStepContextLine } from "@/utils/roadmap/voiceCopy";

type NextStepCardProps = {
  evaluation: FmeEvaluation;
  isLoading?: boolean;
  onPressPrimaryAction: (recommendation: Recommendation) => void;
  onPressPolicyStatus?: () => void;
  onAskAboutStep?: (recommendation: Recommendation) => void;
  onPressViewDetails?: (recommendation: Recommendation) => void;
  evidence?: {
    connectedAccounts?: number;
    confidenceSummary?: string;
    lastUpdated?: string;
    coverageGaps?: string[];
  };
};

function formatEvidenceTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

export function NextStepCard({
  evaluation,
  isLoading,
  onPressPrimaryAction,
  onPressPolicyStatus,
  onAskAboutStep,
  onPressViewDetails,
  evidence,
}: NextStepCardProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const advisorVoice = usePreferencesStore((state) => state.advisorVoice);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const primaryRecommendation = evaluation.primaryRecommendation;
  const staleDomains = evaluation.policyStatus.filter(
    (domain) => domain.isStale,
  );
  const staleDomainLabel = staleDomains
    .map((domain) =>
      typeof domain.ageDays === "number"
        ? `${domain.domain} (${domain.ageDays}d)`
        : domain.domain,
    )
    .join(", ");
  const showPolicyFallbackAction =
    !isLoading &&
    !primaryRecommendation &&
    staleDomains.length > 0 &&
    Boolean(onPressPolicyStatus);
  const primaryEffects = primaryRecommendation
    ? getSecondOrderEffects(primaryRecommendation.id)
    : null;
  const primaryConfidence = primaryRecommendation
    ? getRecommendationConfidence(primaryRecommendation)
    : null;

  return (
    <SurfaceCard>
      <Text variant="labelMedium" style={{ color: colors.textFaint }}>
        SUGGESTED NEXT STEP
      </Text>
      <Text
        testID={`dashboard-primary-recommendation-${
          primaryRecommendation?.id ?? "none"
        }`}
        variant="titleMedium"
        style={{ color: colors.text, fontWeight: "700" }}
      >
        {isLoading
          ? "Preparing your next step"
          : (primaryRecommendation?.title ?? "No recommendation available")}
      </Text>
      <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
        {nextStepContextLine(advisorVoice, Boolean(isLoading))}
      </Text>
      <Text style={{ color: colors.text }}>
        {isLoading
          ? "Refreshing your data and policy inputs so we can recommend the most relevant action."
          : (primaryRecommendation?.summary ??
            "Add a few more details so we can suggest your next step.")}
      </Text>
      {!isLoading && primaryRecommendation?.pros.length ? (
        <View style={{ marginTop: tokens.space.xs, gap: tokens.space.xs }}>
          <Text variant="labelSmall" style={{ color: colors.textFaint }}>
            WHY THIS IS NEXT
          </Text>
          {primaryRecommendation.pros.slice(0, 3).map((reason) => (
            <Text
              key={reason}
              variant="bodySmall"
              style={{ color: colors.textMuted }}
            >
              {`\u2022 ${reason}`}
            </Text>
          ))}
        </View>
      ) : null}
      {!isLoading && primaryRecommendation?.cons[0] ? (
        <Text variant="bodySmall" style={{ color: colors.warning }}>
          {`Tradeoff preview: ${primaryRecommendation.cons[0]}`}
        </Text>
      ) : null}
      {!isLoading && primaryRecommendation && primaryEffects ? (
        <View style={{ marginTop: tokens.space.xs, gap: 4 }}>
          <Text variant="labelSmall" style={{ color: colors.textFaint }}>
            SECOND-ORDER EFFECTS
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Unlocks next: ${primaryEffects.unlocks[0] ?? "Additional roadmap options"}`}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Delays: ${primaryEffects.delays[0] ?? "Lower-priority roadmap items"}`}
          </Text>
        </View>
      ) : null}
      {!isLoading && primaryRecommendation ? (
        <View style={{ marginTop: tokens.space.xs, gap: 4 }}>
          <Text variant="labelSmall" style={{ color: colors.textFaint }}>
            WHAT I USED
          </Text>
          {primaryConfidence ? (
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Decision confidence: ${primaryConfidence.label} \u2014 ${primaryConfidence.reason}`}
            </Text>
          ) : null}
          {typeof evidence?.connectedAccounts === "number" ? (
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Connected accounts: ${evidence.connectedAccounts}`}
            </Text>
          ) : null}
          {evidence?.confidenceSummary ? (
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Coverage confidence: ${evidence.confidenceSummary}`}
            </Text>
          ) : null}
          {evidence?.lastUpdated ? (
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Last updated: ${formatEvidenceTimestamp(evidence.lastUpdated)}`}
            </Text>
          ) : null}
          {evidence?.coverageGaps && evidence.coverageGaps.length > 0 ? (
            <View style={{ gap: 2 }}>
              {evidence.coverageGaps.slice(0, 2).map((gap) => (
                <Text
                  key={gap}
                  variant="bodySmall"
                  style={{ color: colors.textMuted }}
                >
                  {`\u2022 Coverage gap: ${gap}`}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      {!isLoading && staleDomains.length > 0 ? (
        <>
          <Text
            testID="dashboard-policy-stale-warning"
            variant="bodySmall"
            style={{ color: colors.warning }}
          >
            {evaluation.mode === "blocked_policy_stale"
              ? "Some policy inputs are out of date and are currently blocking recommendations."
              : "Some policy inputs are out of date, so recommendation coverage may be limited."}
          </Text>
          <Text
            testID="dashboard-policy-stale-domains"
            variant="bodySmall"
            style={{ color: colors.textMuted }}
          >
            {`Stale domains: ${staleDomainLabel}`}
          </Text>
        </>
      ) : null}
      {!isLoading && primaryRecommendation ? (
        <View style={{ marginTop: tokens.space.sm, gap: tokens.space.xs }}>
          <PrimaryButton
            testID="dashboard-next-step-action"
            onPress={() => onPressPrimaryAction(primaryRecommendation)}
          >
            {primaryRecommendation.actionLabel}
          </PrimaryButton>
          {onPressViewDetails ? (
            <SecondaryButton
              testID="dashboard-next-step-view-details"
              onPress={() => onPressViewDetails(primaryRecommendation)}
            >
              View step details
            </SecondaryButton>
          ) : null}
          <SecondaryButton
            testID="dashboard-next-step-compare-options"
            onPress={() => setShowAlternatives((current) => !current)}
          >
            {showAlternatives ? "Hide options" : "Compare options"}
          </SecondaryButton>
          {onAskAboutStep ? (
            <SecondaryButton
              testID="dashboard-next-step-ask"
              onPress={() => onAskAboutStep(primaryRecommendation)}
            >
              Ask about this step
            </SecondaryButton>
          ) : null}
        </View>
      ) : null}
      {showPolicyFallbackAction ? (
        <View style={{ marginTop: tokens.space.sm }}>
          <PrimaryButton
            testID="dashboard-next-step-policy-status-action"
            onPress={() => {
              onPressPolicyStatus?.();
            }}
          >
            Review policy status
          </PrimaryButton>
        </View>
      ) : null}

      {!isLoading && evaluation.alternatives.length > 0 ? (
        <View style={{ marginTop: tokens.space.sm, gap: tokens.space.xs }}>
          <Text variant="labelSmall" style={{ color: colors.textFaint }}>
            OTHER OPTIONS
          </Text>
          {showAlternatives
            ? evaluation.alternatives.map((alternative, index) => (
                <OptionCard
                  key={alternative.id}
                  recommendation={alternative}
                  unlocksLabel={`Unlocks next: option ${index + 1}`}
                  onPressViewDetails={onPressViewDetails}
                />
              ))
            : null}
        </View>
      ) : null}
    </SurfaceCard>
  );
}
