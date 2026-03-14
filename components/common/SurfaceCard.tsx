import { ReactNode } from "react";
import {
  AccessibilityRole,
  Pressable,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";

import { Card } from "@/components/ui/card";
import { useAppTheme } from "@/hooks/useAppTheme";
import { cn } from "@/lib/utils";

type SurfaceCardProps = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function SurfaceCard({
  children,
  onPress,
  style,
  contentStyle,
  testID,
  accessibilityRole = "button",
  accessibilityLabel,
  accessibilityHint,
}: SurfaceCardProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  const baseStyle: ViewStyle = {
    borderRadius: tokens.radius.lg,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface1,
  };

  if (!onPress) {
    return (
      <Card
        className={cn(
          "rounded-[22px] border border-borderSubtle bg-surface1 py-0 shadow-none",
          "gap-0 overflow-hidden",
        )}
        style={[baseStyle, style]}
        testID={testID}
      >
        <View className="gap-2 p-4" style={contentStyle}>
          {children}
        </View>
      </Card>
    );
  }

  return (
    <Pressable
      className="overflow-hidden rounded-[22px] border border-borderSubtle bg-surface1"
      onPress={onPress}
      style={({ pressed }) => [
        baseStyle,
        pressed ? { backgroundColor: colors.surface2 } : null,
        style,
      ]}
      testID={testID}
      role={accessibilityRole as React.ComponentProps<typeof Pressable>["role"]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <View className="gap-2 p-4" style={contentStyle}>
        {children}
      </View>
    </Pressable>
  );
}
