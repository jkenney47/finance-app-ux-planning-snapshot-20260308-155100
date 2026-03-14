import { type ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import { Text } from "@/components/ui/text";

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  titleVariant?: React.ComponentProps<typeof Text>["variant"];
  titleTestID?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  trailingAccessory?: ReactNode;
};

export function ScreenHeader({
  eyebrow,
  title,
  description,
  align = "left",
  titleVariant = "headlineMedium",
  titleTestID,
  testID,
  style,
  children,
  trailingAccessory,
}: ScreenHeaderProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const isCentered = align === "center";

  return (
    <View
      testID={testID}
      style={[
        {
          gap: tokens.space.sm,
          alignItems: isCentered ? "center" : "flex-start",
        },
        style,
      ]}
    >
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: tokens.space.sm,
        }}
      >
        <View
          style={{
            flex: 1,
            gap: tokens.space.xs,
            alignItems: isCentered ? "center" : "flex-start",
          }}
        >
          {eyebrow ? (
            <Text
              variant="labelMedium"
              style={{
                color: colors.textFaint,
                fontWeight: "700",
                // design-token-lint: allow-next-line
                letterSpacing: 1.1,
                textTransform: "uppercase",
                textAlign: isCentered ? "center" : "left",
              }}
            >
              {eyebrow}
            </Text>
          ) : null}
          <Text
            testID={titleTestID}
            variant={titleVariant}
            style={{
              color: colors.text,
              fontWeight: "700",
              textAlign: isCentered ? "center" : "left",
            }}
          >
            {title}
          </Text>
          {description ? (
            <Text
              variant="bodyMedium"
              style={{
                color: colors.textMuted,
                textAlign: isCentered ? "center" : "left",
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>
        {trailingAccessory ? (
          <View
            style={{
              alignSelf: isCentered ? "center" : "flex-start",
            }}
          >
            {trailingAccessory}
          </View>
        ) : null}
      </View>
      {children ? (
        <View
          style={{
            gap: tokens.space.xs,
            alignItems: isCentered ? "center" : "flex-start",
            alignSelf: isCentered ? "center" : "stretch",
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
