import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import { getAskFabLabel, getAskHeadline } from "@/utils/askContext";

export function AskFAB(): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const open = useAskStore((state) => state.open);
  const context = useAskStore((state) => state.context);
  const label = getAskFabLabel(context);
  const accessibilityLabel = getAskHeadline(context);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: tokens.space.lg,
        bottom: 88,
      }}
    >
      <Pressable
        testID="ask-fab"
        role="button"
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => open()}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          minHeight: 48,
          borderRadius: tokens.radius.xl,
          paddingHorizontal: tokens.space.md,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: pressed ? colors.surface2 : colors.surface1,
          shadowColor: colors.text,
          shadowOpacity: 0.14,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        })}
      >
        <MaterialCommunityIcons
          name="chat-question-outline"
          size={18}
          color={colors.accent}
        />
        <Text variant="labelLarge" style={{ color: colors.text }}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}
