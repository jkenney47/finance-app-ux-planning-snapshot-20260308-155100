import { memo } from "react";
import { StyleSheet, View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { tokens } from "@/theme/tokens";

export type InstitutionStatus = {
  id: string;
  name: string;
  status: "connected" | "relink" | "syncing" | "error";
  lastSynced?: string;
};

type TrustBarProps = {
  institutionStatuses: InstitutionStatus[];
  onManageConnections: () => void;
};

const statusToCopy = (
  status: InstitutionStatus["status"],
):
  | { label: string; tone: "positive" }
  | { label: string; tone: "warning" }
  | { label: string; tone: "accent" }
  | { label: string; tone: "negative" }
  | { label: string; tone: "neutral" } => {
  switch (status) {
    case "connected":
      return { label: "Synced", tone: "positive" as const };
    case "relink":
      return { label: "Reconnect", tone: "warning" as const };
    case "syncing":
      return { label: "Syncing", tone: "accent" as const };
    case "error":
      return { label: "Fix needed", tone: "negative" as const };
    default:
      return { label: "Unknown", tone: "neutral" as const };
  }
};

export const TrustBar = memo(
  ({ institutionStatuses, onManageConnections }: TrustBarProps) => {
    const { colors } = useAppTheme();

    return (
      <SurfaceCard>
        <View style={styles.headerRow}>
          <Text
            variant="labelMedium"
            style={[styles.title, { color: colors.textFaint }]}
          >
            LINKED INSTITUTIONS
          </Text>
          <SecondaryButton compact onPress={onManageConnections}>
            Manage
          </SecondaryButton>
        </View>

        {institutionStatuses.length === 0 ? (
          <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
            No institutions linked yet.
          </Text>
        ) : (
          <View style={styles.badgeRow}>
            {institutionStatuses.map((institution) => {
              const status = statusToCopy(institution.status);
              return (
                <View
                  key={institution.id}
                  style={[
                    styles.badge,
                    {
                      borderColor: colors.borderSubtle,
                      backgroundColor: colors.surface2,
                    },
                  ]}
                >
                  <View style={styles.badgeHeader}>
                    <Text variant="labelLarge" style={{ color: colors.text }}>
                      {institution.name}
                    </Text>
                    <Pill tone={status.tone} active>
                      {status.label}
                    </Pill>
                  </View>
                  {institution.lastSynced ? (
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.textMuted }}
                    >
                      {institution.lastSynced}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </SurfaceCard>
    );
  },
);

TrustBar.displayName = "TrustBar";

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: {
    letterSpacing: 1,
    textTransform: "uppercase",
    fontSize: 11,
    fontWeight: "700",
  },
  badgeRow: {
    gap: tokens.space.sm,
  },
  badge: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.sm,
    gap: 6,
  },
  badgeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
});
