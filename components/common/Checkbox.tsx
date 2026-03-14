import { Pressable, StyleSheet, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

export type CheckboxProps = {
  checked: boolean;
  onPress: () => void;
  label: string;
};

export function Checkbox({
  checked,
  onPress,
  label,
}: CheckboxProps): JSX.Element {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={styles.checkboxRow}
      role="checkbox"
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.checkboxBox,
          {
            borderColor: checked ? colors.accent : colors.borderStrong,
            backgroundColor: checked ? colors.accentSoft : "transparent",
          },
        ]}
      >
        {checked ? (
          <Text
            variant="labelMedium"
            style={[styles.checkboxCheck, { color: colors.accent }]}
          >
            ✓
          </Text>
        ) : null}
      </View>
      <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCheck: {
    fontWeight: "700",
  },
});
