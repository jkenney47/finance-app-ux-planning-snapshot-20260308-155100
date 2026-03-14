import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type InlineFollowupBlockProps = {
  title: string;
  children: ReactNode;
};

export function InlineFollowupBlock({
  title,
  children,
}: InlineFollowupBlockProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View
      style={{
        gap: tokens.space.sm,
        borderLeftWidth: 2,
        borderLeftColor: colors.borderStrong,
        paddingLeft: tokens.space.md,
      }}
    >
      <Text variant="titleSmall" style={{ color: colors.text }}>
        {title}
      </Text>
      {children}
    </View>
  );
}
