import { memo } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type MetricTileProps = {
  label: string;
  value: string;
  description?: string;
  testID?: string;
};

export const MetricTile = memo(function MetricTile({
  label,
  value,
  description,
  testID,
}: MetricTileProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View
      testID={testID}
      style={{
        flexGrow: 1,
        minWidth: "47%",
        gap: tokens.space.xs,
        borderWidth: 1,
        borderRadius: tokens.radius.md,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surface2,
        paddingHorizontal: tokens.space.md,
        paddingVertical: tokens.space.md,
      }}
    >
      <Text
        variant="labelSmall"
        style={{
          color: colors.textFaint,
          // design-token-lint: allow-next-line
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        variant="titleLarge"
        style={{ color: colors.text, fontWeight: "700" }}
      >
        {value}
      </Text>
      {description ? (
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
});
