import { StyleSheet, View } from "react-native";

import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type EmptyHintProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionTestID?: string;
  onActionPress?: () => void;
};

export function EmptyHint({
  title,
  description,
  actionLabel,
  actionTestID,
  onActionPress,
}: EmptyHintProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <SurfaceCard
      style={{ borderColor: colors.borderSubtle }}
      contentStyle={styles.content}
    >
      <Text
        variant="labelMedium"
        style={[styles.eyebrow, { color: colors.textFaint }]}
      >
        NEXT STEP
      </Text>
      <Text
        variant="titleMedium"
        style={[styles.title, { color: colors.text }]}
      >
        {title}
      </Text>
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: colors.textMuted }]}
      >
        {description}
      </Text>
      {actionLabel && onActionPress ? (
        <View style={{ marginTop: tokens.space.sm }}>
          <SecondaryButton testID={actionTestID} onPress={onActionPress}>
            {actionLabel}
          </SecondaryButton>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "flex-start",
  },
  eyebrow: {
    letterSpacing: 1,
    textTransform: "uppercase",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontWeight: "700",
  },
  description: {
    lineHeight: 20,
  },
});
