import { memo } from "react";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { Recommendation } from "@/utils/contracts/fme";
import { getRecommendationConfidence } from "@/utils/roadmap/recommendationConfidence";
import { getSecondOrderEffects } from "@/utils/roadmap/stepDetails";
import {
  getRecommendationStepType,
  getStepTypeLabel,
} from "@/utils/roadmap/semantics";

type OptionCardProps = {
  recommendation: Recommendation;
  unlocksLabel?: string;
  onPressViewDetails?: (recommendation: Recommendation) => void;
};

export const OptionCard = memo(function OptionCard({
  recommendation,
  unlocksLabel,
  onPressViewDetails,
}: OptionCardProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const topPros = recommendation.pros.slice(0, 2);
  const topCons = recommendation.cons.slice(0, 2);
  const topAssumptions = recommendation.assumptions.slice(0, 2);
  const stepType = getRecommendationStepType(recommendation.id);
  const effects = getSecondOrderEffects(recommendation.id);
  const confidence = getRecommendationConfidence(recommendation);

  return (
    <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
      <Text variant="labelSmall" style={{ color: colors.textFaint }}>
        {getStepTypeLabel(stepType)}
      </Text>
      <Text
        variant="titleSmall"
        style={{ color: colors.text, fontWeight: "700" }}
      >
        {recommendation.title}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        {recommendation.summary}
      </Text>
      {topPros.length > 0 ? (
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Pros: ${topPros.join(" • ")}`}
        </Text>
      ) : null}
      {topCons.length > 0 ? (
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Tradeoffs: ${topCons.join(" • ")}`}
        </Text>
      ) : null}
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        {`Unlocks next: ${effects.unlocks[0] ?? "Additional roadmap options"}`}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        {`Delays: ${effects.delays[0] ?? "Lower-priority roadmap items"}`}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textFaint }}>
        {`Best for: ${recommendation.phase.replace(/_/g, " ")}`}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textFaint }}>
        {`Confidence: ${confidence.label} \u2014 ${confidence.reason}`}
      </Text>
      {topAssumptions.length > 0 ? (
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Assumptions: ${topAssumptions.join(" • ")}`}
        </Text>
      ) : null}
      {unlocksLabel ? (
        <Text variant="bodySmall" style={{ color: colors.info }}>
          {unlocksLabel}
        </Text>
      ) : null}
      {onPressViewDetails ? (
        <SecondaryButton
          compact
          accessibilityLabel={`View details for ${recommendation.title}`}
          onPress={() => onPressViewDetails(recommendation)}
        >
          View details
        </SecondaryButton>
      ) : null}
    </SurfaceCard>
  );
});
