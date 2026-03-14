import { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type PillTone = "accent" | "positive" | "negative" | "warning" | "neutral";

type PillProps = {
  children: ReactNode;
  tone?: PillTone;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function Pill({
  children,
  tone = "neutral",
  active = false,
  onPress,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: PillProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? (typeof children === "string" ? children : undefined);

  const toneColor =
    tone === "accent"
      ? colors.accent
      : tone === "positive"
        ? colors.positive
        : tone === "negative"
          ? colors.negative
          : tone === "warning"
            ? colors.warning
            : colors.textMuted;

  const backgroundColor = active
    ? `${toneColor}26`
    : `${colors.borderSubtle}`.length === 9
      ? colors.borderSubtle
      : `${toneColor}14`;
  const borderColor = active ? toneColor : colors.borderStrong;
  const textColor = active ? toneColor : colors.text;

  if (onPress) {
    return (
      <Pressable
        className="self-start rounded-[28px] border px-3 py-2"
        onPress={onPress}
        style={({ pressed }) => ({
          borderRadius: tokens.radius.xl,
          borderColor,
          backgroundColor: pressed ? `${toneColor}30` : backgroundColor,
        })}
        testID={testID}
        role="button"
        accessibilityRole="button"
        accessibilityLabel={resolvedAccessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ selected: active }}
      >
        <Text className="text-[12px] font-bold" style={{ color: textColor }}>
          {children}
        </Text>
      </Pressable>
    );
  }

  return (
    <View
      className="self-start rounded-[28px] border px-3 py-2"
      style={{
        borderRadius: tokens.radius.xl,
        borderColor,
        backgroundColor,
      }}
      testID={testID}
    >
      <Text className="text-[12px] font-bold" style={{ color: textColor }}>
        {children}
      </Text>
    </View>
  );
}
