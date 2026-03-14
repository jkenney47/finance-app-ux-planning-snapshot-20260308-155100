import { memo } from "react";
import { View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type DynamicFocusMetric = {
  label: string;
  value: string;
  description: string;
};

type DynamicFocusTileProps = {
  metric: DynamicFocusMetric;
  isPinned: boolean;
  onTogglePin: () => void;
};

export const DynamicFocusTile = memo(function DynamicFocusTile({
  metric,
  isPinned,
  onTogglePin,
}: DynamicFocusTileProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View
      style={{
        gap: tokens.space.sm,
        borderWidth: 1,
        borderRadius: tokens.radius.md,
        borderColor: isPinned ? colors.borderStrong : colors.borderSubtle,
        backgroundColor: isPinned ? colors.accentSoft : colors.surface2,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: tokens.space.sm,
        }}
      >
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          CURRENT FOCUS
        </Text>
        <Pill tone={isPinned ? "accent" : "neutral"} active>
          {isPinned ? "Pinned" : "Dynamic"}
        </Pill>
      </View>
      <Text variant="titleSmall" style={{ color: colors.text }}>
        {metric.label}
      </Text>
      <Text
        variant="titleMedium"
        style={{ color: colors.text, fontWeight: "700" }}
      >
        {metric.value}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        {metric.description}
      </Text>
      <View style={{ marginTop: 2 }}>
        <SecondaryButton compact onPress={onTogglePin}>
          {isPinned ? "Use dynamic focus" : "Pin this metric"}
        </SecondaryButton>
      </View>
    </View>
  );
});
