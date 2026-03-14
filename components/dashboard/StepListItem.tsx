import { memo } from "react";
import { View } from "react-native";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type StepListItemProps = {
  title: string;
  summary: string;
  impact: string;
  effort: string;
  confidence: string;
  statusLabel: string;
  sourceNote?: string;
  isPrimary?: boolean;
  onPress: () => void;
};

export const StepListItem = memo(function StepListItem({
  title,
  summary,
  impact,
  effort,
  confidence,
  statusLabel,
  sourceNote,
  isPrimary = false,
  onPress,
}: StepListItemProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View style={{ gap: tokens.space.xs }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: isPrimary ? colors.accent : colors.textFaint,
          }}
        />
        <Text variant="labelSmall" style={{ color: colors.textFaint }}>
          {statusLabel}
        </Text>
      </View>
      {sourceNote ? (
        <Text variant="bodySmall" style={{ color: colors.textFaint }}>
          {sourceNote}
        </Text>
      ) : null}
      <Text
        variant="titleSmall"
        style={{ color: colors.text, fontWeight: "700" }}
      >
        {title}
      </Text>
      <Text
        numberOfLines={3}
        variant="bodySmall"
        style={{ color: colors.textMuted }}
      >
        {summary}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textFaint }}>
        {`Impact: ${impact} · Effort: ${effort} · Confidence: ${confidence}`}
      </Text>
      {isPrimary ? (
        <PrimaryButton compact onPress={onPress}>
          Start this step
        </PrimaryButton>
      ) : (
        <SecondaryButton compact onPress={onPress}>
          Compare option
        </SecondaryButton>
      )}
    </View>
  );
});
