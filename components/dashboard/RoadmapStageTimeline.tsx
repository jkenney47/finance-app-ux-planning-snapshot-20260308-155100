import { memo } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

export const ROADMAP_STAGES = [
  "Foundation",
  "Stability",
  "Growth",
  "Optimization",
] as const;

export type RoadmapStage = (typeof ROADMAP_STAGES)[number];

const STAGE_DESCRIPTION: Record<RoadmapStage, string> = {
  Foundation: "Build clean inputs and baseline financial visibility.",
  Stability: "Reduce downside risk and stabilize monthly cash flow.",
  Growth: "Increase savings efficiency and compound long-term progress.",
  Optimization: "Fine-tune strategy while maintaining healthy coverage.",
};

type RoadmapStageTimelineProps = {
  currentStage: RoadmapStage;
  testID?: string;
  showDescriptions?: boolean;
};

export const RoadmapStageTimeline = memo(function RoadmapStageTimeline({
  currentStage,
  testID,
  showDescriptions = true,
}: RoadmapStageTimelineProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const activeIndex = Math.max(0, ROADMAP_STAGES.indexOf(currentStage));

  return (
    <View style={{ gap: tokens.space.xs }} testID={testID}>
      {ROADMAP_STAGES.map((stage, index) => {
        const isActive = index === activeIndex;
        const isCompleted = index < activeIndex;
        const isLast = index === ROADMAP_STAGES.length - 1;
        const markerColor =
          isCompleted || isActive ? colors.accent : colors.surface3;
        const connectorColor =
          index < activeIndex ? colors.accent : colors.borderSubtle;

        return (
          <View
            key={stage}
            style={{
              flexDirection: "row",
              gap: tokens.space.sm,
              alignItems: "stretch",
            }}
          >
            <View style={{ width: 12, alignItems: "center" }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  borderWidth: 1,
                  borderColor: markerColor,
                  backgroundColor: markerColor,
                  marginTop: 2,
                }}
              />
              {!isLast ? (
                <View
                  style={{
                    flex: 1,
                    width: 2,
                    marginTop: 4,
                    borderRadius: 999,
                    backgroundColor: connectorColor,
                  }}
                />
              ) : null}
            </View>
            <View
              style={{
                flex: 1,
                paddingBottom: isLast ? 0 : tokens.space.xs,
                gap: 2,
              }}
            >
              <Text
                variant="titleSmall"
                style={{
                  color: isActive ? colors.text : colors.textMuted,
                  fontWeight: isActive ? "700" : "600",
                }}
              >
                {stage}
              </Text>
              {showDescriptions ? (
                <Text variant="bodySmall" style={{ color: colors.textFaint }}>
                  {STAGE_DESCRIPTION[stage]}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
});
