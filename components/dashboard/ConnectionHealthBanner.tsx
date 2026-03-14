import { memo } from "react";
import { View } from "react-native";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type ConnectionHealthBannerProps = {
  institutionStatuses: Array<{
    name: string;
    status: "connected" | "relink" | "syncing" | "error";
    lastSynced?: string;
  }>;
  onPressReconnect: () => void;
};

function buildReconnectLabel(institutionNames: string[]): string {
  if (institutionNames.length === 0) return "an account";
  if (institutionNames.length === 1) return institutionNames[0];
  if (institutionNames.length === 2) {
    return `${institutionNames[0]} and ${institutionNames[1]}`;
  }
  return `${institutionNames[0]} and ${institutionNames.length - 1} others`;
}

function statusLabel(
  status: "connected" | "relink" | "syncing" | "error",
): string {
  if (status === "relink") return "Needs reconnect";
  if (status === "error") return "Fix needed";
  if (status === "syncing") return "Syncing";
  return "Connected";
}

export const ConnectionHealthBanner = memo(function ConnectionHealthBanner({
  institutionStatuses,
  onPressReconnect,
}: ConnectionHealthBannerProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const disconnectedInstitutions = institutionStatuses.filter(
    (institution) =>
      institution.status === "relink" || institution.status === "error",
  );
  const reconnectLabel = buildReconnectLabel(
    disconnectedInstitutions.map((institution) => institution.name),
  );
  const disconnectedCount = disconnectedInstitutions.length;
  const previewInstitutions = disconnectedInstitutions.slice(0, 2);

  return (
    <SurfaceCard
      style={{
        borderColor: colors.warning,
        backgroundColor: colors.surface2,
      }}
      contentStyle={{ gap: tokens.space.xs }}
      testID="connection-health-banner"
    >
      <Text variant="labelMedium" style={{ color: colors.textFaint }}>
        CONNECTION HEALTH
      </Text>
      <Text
        variant="titleSmall"
        style={{ color: colors.text, fontWeight: "700" }}
      >
        {`Reconnect ${reconnectLabel} to keep your roadmap accurate.`}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        {`Accuracy is reduced while ${disconnectedCount} institution${disconnectedCount === 1 ? "" : "s"} are disconnected.`}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        {
          "What we are using now: your last successful sync plus saved profile inputs."
        }
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        {
          "Missing right now: live balances and transactions from disconnected institutions."
        }
      </Text>
      {previewInstitutions.length > 0 ? (
        <View style={{ gap: 2, marginTop: tokens.space.xs }}>
          {previewInstitutions.map((institution) => (
            <Text
              key={`${institution.name}-${institution.status}`}
              variant="bodySmall"
              style={{ color: colors.textFaint }}
            >
              {`\u2022 ${institution.name}: ${statusLabel(institution.status)}${institution.lastSynced ? ` (${institution.lastSynced})` : ""}`}
            </Text>
          ))}
        </View>
      ) : null}
      <View style={{ alignSelf: "flex-start" }}>
        <PrimaryButton
          compact
          testID="connection-health-reconnect"
          onPress={onPressReconnect}
        >
          Reconnect now
        </PrimaryButton>
      </View>
    </SurfaceCard>
  );
});
