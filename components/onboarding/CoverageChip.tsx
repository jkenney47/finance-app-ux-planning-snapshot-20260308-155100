import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type CoverageChipProps = {
  label: "Preliminary coverage" | "Coverage strong" | "Coverage limited";
};

export function CoverageChip({ label }: CoverageChipProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const backgroundColor =
    label === "Coverage strong"
      ? colors.positive
      : label === "Coverage limited"
        ? colors.warning
        : colors.info;

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: tokens.radius.xl,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.xs,
        backgroundColor,
      }}
    >
      <Text variant="labelSmall" style={{ color: colors.bg }}>
        {label}
      </Text>
    </View>
  );
}
