import { View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Sheet } from "@/components/common/Sheet";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import type { CoverageDisplay } from "@/utils/roadmap/experience";

type DataHealthSheetProps = {
  isOpen: boolean;
  onDismiss: () => void;
  coverage: CoverageDisplay;
  onManageAccounts: () => void;
};

export function DataHealthSheet({
  isOpen,
  onDismiss,
  coverage,
  onManageAccounts,
}: DataHealthSheetProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <Sheet isOpen={isOpen} onDismiss={onDismiss} testID="data-health-sheet">
      <View style={{ gap: tokens.space.md }}>
        <View style={{ gap: tokens.space.xs }}>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            DATA HEALTH
          </Text>
          <Text variant="headlineSmall" style={{ color: colors.text }}>
            {coverage.label}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
            {coverage.summary}
          </Text>
        </View>

        <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
          <View style={{ gap: tokens.space.xs }}>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              WHAT THIS AFFECTS
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.text }}>
              {coverage.impact}
            </Text>
          </View>

          {coverage.staleCategories.length > 0 ? (
            <View style={{ gap: tokens.space.xs }}>
              <Text variant="labelSmall" style={{ color: colors.textFaint }}>
                STALE OR DISCONNECTED
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: tokens.space.xs,
                }}
              >
                {coverage.staleCategories.map((category) => (
                  <Pill key={category} active tone="warning">
                    {category}
                  </Pill>
                ))}
              </View>
            </View>
          ) : null}

          {coverage.recommendedAccountsToLink.length > 0 ? (
            <View style={{ gap: tokens.space.xs }}>
              <Text variant="labelSmall" style={{ color: colors.textFaint }}>
                WHAT WOULD IMPROVE THIS
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: tokens.space.xs,
                }}
              >
                {coverage.recommendedAccountsToLink.map((accountType) => (
                  <Pill key={accountType} active tone="accent">
                    {accountType}
                  </Pill>
                ))}
              </View>
            </View>
          ) : null}
        </SurfaceCard>

        <PrimaryButton onPress={onManageAccounts}>
          {coverage.actionLabel}
        </PrimaryButton>
      </View>
    </Sheet>
  );
}
