import { useState, type ReactElement } from "react";
import { View } from "react-native";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { EmptyHint, ErrorNotice, Skeleton } from "@/components/state";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function UiLabScreen(): ReactElement {
  const { colors, tokens } = useAppTheme();
  const [retryCount, setRetryCount] = useState(0);
  const [pressCount, setPressCount] = useState(0);
  const styles = {
    container: {
      gap: tokens.space.md,
      paddingBottom: tokens.space.xxl,
    },
    header: {
      gap: tokens.space.xs,
    },
    eyebrow: {
      textTransform: "uppercase" as const,
      fontWeight: "700" as const,
    },
    title: {
      fontWeight: "700" as const,
    },
    sectionLabel: {
      textTransform: "uppercase" as const,
      fontWeight: "700" as const,
    },
    row: {
      gap: tokens.space.xs,
    },
    retryCount: {
      marginBottom: tokens.space.xs,
    },
  };

  return (
    <Screen
      variant="scroll"
      contentContainerStyle={styles.container}
      testID="ui-lab-screen"
    >
      <View style={styles.header}>
        <Text
          variant="labelLarge"
          style={[styles.eyebrow, { color: colors.textFaint }]}
        >
          SANDBOX
        </Text>
        <Text
          variant="headlineSmall"
          style={[styles.title, { color: colors.text }]}
        >
          UI Lab
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
          Preview shared components and states in one route.
        </Text>
      </View>

      <SurfaceCard>
        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: colors.textFaint }]}
        >
          BUTTONS
        </Text>
        <View style={[styles.row, { marginTop: tokens.space.xs }]}>
          <PrimaryButton
            testID="ui-lab-primary-button"
            onPress={() => setPressCount((count) => count + 1)}
          >
            Primary action
          </PrimaryButton>
          <SecondaryButton
            testID="ui-lab-secondary-button"
            onPress={() => setPressCount(0)}
          >
            Reset counter
          </SecondaryButton>
        </View>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          Primary pressed {pressCount} time{pressCount === 1 ? "" : "s"}.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: colors.textFaint }]}
        >
          SKELETONS
        </Text>
        <View style={[styles.row, { marginTop: tokens.space.xs }]}>
          <Skeleton height={20} width="42%" />
          <Skeleton height={14} width="100%" />
          <Skeleton height={14} width="82%" />
          <Skeleton height={14} width="64%" />
        </View>
      </SurfaceCard>

      <ErrorNotice
        description="This is a reusable error state. Use it to verify spacing, copy, and action behavior."
        onRetry={() => setRetryCount((count) => count + 1)}
      />

      <Text
        variant="bodySmall"
        style={[styles.retryCount, { color: colors.textMuted }]}
      >
        Retry tapped {retryCount} time{retryCount === 1 ? "" : "s"}.
      </Text>

      <EmptyHint
        title="Empty state sample"
        description="Use this card for empty sections that should still guide the next user action."
        actionLabel="Try sample action"
        actionTestID="ui-lab-empty-hint-action"
        onActionPress={() => setPressCount((count) => count + 1)}
      />
    </Screen>
  );
}
