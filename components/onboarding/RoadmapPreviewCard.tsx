import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type RoadmapPreviewCardProps = {
  stage: string;
  currentFocus: string;
  nextAction: string;
  keyMetric: string;
  whyThisNow: string;
  badgeLabel?: string;
};

export function RoadmapPreviewCard({
  stage,
  currentFocus,
  nextAction,
  keyMetric,
  whyThisNow,
  badgeLabel,
}: RoadmapPreviewCardProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
      {badgeLabel ? (
        <Text variant="labelSmall" style={{ color: colors.info }}>
          {badgeLabel}
        </Text>
      ) : null}
      <Text
        variant="titleSmall"
        style={{ color: colors.text, fontWeight: "700" }}
      >
        {stage}
      </Text>
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
        Why this now: {whyThisNow}
      </Text>
    </SurfaceCard>
  );
}
