import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";

type ProfileUtilityButtonProps = {
  onPress: () => void;
  testID?: string;
};

export function ProfileUtilityButton({
  onPress,
  testID,
}: ProfileUtilityButtonProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open profile and utilities"
      accessibilityHint="Opens the utility hub for accounts, preferences, and support."
      style={({ pressed }) => ({
        width: tokens.hit.min,
        height: tokens.hit.min,
        borderRadius: tokens.radius.xl,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: pressed ? colors.surface3 : colors.surface1,
      })}
    >
      <MaterialCommunityIcons
        name="account-circle-outline"
        size={22}
        color={colors.text}
      />
    </Pressable>
  );
}
