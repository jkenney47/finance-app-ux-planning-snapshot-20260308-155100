import { StyleSheet, View } from "react-native";

import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { DASHBOARD_RETRY_ACTION_LABEL } from "./asyncCopy";

type ErrorNoticeProps = {
  title?: string;
  description: string;
  actionLabel?: string;
  onRetry?: () => void;
};

export function ErrorNotice({
  title = "We hit a snag",
  description,
  actionLabel = DASHBOARD_RETRY_ACTION_LABEL,
  onRetry,
}: ErrorNoticeProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <SurfaceCard
      style={{
        borderColor: `${colors.negative}8A`,
        backgroundColor: `${colors.negative}14`,
      }}
      contentStyle={styles.content}
      testID="error-notice"
    >
      <Text
        variant="labelMedium"
        style={[styles.eyebrow, { color: colors.negative }]}
      >
        ACTION NEEDED
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
      {onRetry ? (
        <View style={{ marginTop: tokens.space.sm }}>
          <SecondaryButton onPress={onRetry}>{actionLabel}</SecondaryButton>
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
