import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type TrustBulletRowProps = {
  bullets: string[];
};

export function TrustBulletRow({
  bullets,
}: TrustBulletRowProps): JSX.Element | null {
  const { colors, tokens } = useAppTheme();
  if (bullets.length === 0) return null;

  return (
    <View style={{ gap: tokens.space.xs }}>
      {bullets.map((bullet) => (
        <Text
          key={bullet}
          variant="bodySmall"
          style={{ color: colors.textFaint }}
        >
          {bullet}
        </Text>
      ))}
    </View>
  );
}
