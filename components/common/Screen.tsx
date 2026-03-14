import { ReactNode } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";

type ScreenProps = {
  children: ReactNode;
  variant?: "scroll" | "fixed";
  padHorizontal?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Screen({
  children,
  variant = "scroll",
  padHorizontal = true,
  style,
  contentContainerStyle,
  testID,
}: ScreenProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const horizontalPadding = padHorizontal ? tokens.space.lg : 0;

  if (variant === "fixed") {
    return (
      <SafeAreaView
        className="flex-1 bg-bg"
        style={[{ backgroundColor: colors.bg }, style]}
        testID={testID}
      >
        <View
          className="flex-1"
          style={[
            { paddingHorizontal: horizontalPadding },
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-bg"
      style={[{ backgroundColor: colors.bg }, style]}
      testID={testID}
    >
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          {
            flexGrow: 1,
            paddingBottom: 28,
            paddingHorizontal: horizontalPadding,
          },
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
