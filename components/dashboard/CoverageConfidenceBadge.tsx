import { memo } from "react";
import { View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { CoverageConfidence } from "@/utils/roadmap/confidence";

type CoverageConfidenceBadgeProps = {
  confidence: CoverageConfidence;
};

export const CoverageConfidenceBadge = memo(function CoverageConfidenceBadge({
  confidence,
}: CoverageConfidenceBadgeProps): JSX.Element {
  const { colors } = useAppTheme();
  const tone = confidence.level === "high" ? "positive" : "warning";

  return (
    <View style={{ gap: 6 }}>
      <Pill tone={tone} active testID="dashboard-coverage-confidence">
        {confidence.summary}
      </Pill>
      {confidence.reasons.slice(0, 2).map((reason) => (
        <Text
          key={reason}
          variant="bodySmall"
          style={{ color: colors.textMuted }}
        >
          {`\u2022 ${reason}`}
        </Text>
      ))}
    </View>
  );
});
