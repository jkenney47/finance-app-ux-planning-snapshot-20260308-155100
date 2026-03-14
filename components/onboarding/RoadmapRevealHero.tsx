import { View } from "react-native";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { CoverageChip } from "@/components/onboarding/CoverageChip";

type RoadmapRevealHeroProps = {
  coverageLabel:
    | "Preliminary coverage"
    | "Coverage strong"
    | "Coverage limited";
  title: string;
  body: string;
  currentFocus: string;
  nextAction: string;
  keyMetric: string;
  coverageSummary: string;
  whyPlacedHere: string;
};

export function RoadmapRevealHero({
  coverageLabel,
  title,
  body,
  currentFocus,
  nextAction,
  keyMetric,
  coverageSummary,
  whyPlacedHere,
}: RoadmapRevealHeroProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View style={{ gap: tokens.space.md }}>
      <CoverageChip label={coverageLabel} />
      <View style={{ gap: tokens.space.xs }}>
        <Text
          variant="headlineMedium"
          style={{ color: colors.text, fontWeight: "700" }}
        >
          {title}
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
          {body}
        </Text>
      </View>
      <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          Current focus: {currentFocus}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          Next action: {nextAction}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          Key metric: {keyMetric}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textFaint }}>
          Coverage: {coverageSummary}
        </Text>
      </SurfaceCard>
      <View style={{ gap: tokens.space.xs }}>
        <Text
          variant="titleSmall"
          style={{ color: colors.text, fontWeight: "700" }}
        >
          Why we put you here
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
          {whyPlacedHere}
        </Text>
      </View>
    </View>
  );
}
