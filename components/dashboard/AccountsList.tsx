import { memo } from "react";
import { View } from "react-native";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { buildDashboardLoadingLabel } from "@/components/state/asyncCopy";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { formatCurrency } from "@/utils/format";

type AccountRow = {
  id: string;
  name: string;
  balance: number;
  institution: string;
};

type AccountsListProps = {
  accounts: AccountRow[];
  currency?: string;
  isLoading?: boolean;
};

export const AccountsList = memo(function AccountsList({
  accounts,
  currency = "USD",
  isLoading,
}: AccountsListProps): JSX.Element {
  const { colors } = useAppTheme();
  const secondaryText = colors.textMuted;
  const balanceColor = colors.text;

  if (isLoading) {
    return (
      <SurfaceCard testID="accounts-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          ACCOUNTS
        </Text>
        <Text variant="titleMedium" style={{ color: colors.text }}>
          Accounts
        </Text>
        <View style={{ marginTop: 4 }}>
          <Text>{buildDashboardLoadingLabel("your accounts")}</Text>
        </View>
      </SurfaceCard>
    );
  }

  if (!accounts.length) {
    return (
      <SurfaceCard testID="accounts-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          ACCOUNTS
        </Text>
        <Text variant="titleMedium" style={{ color: colors.text }}>
          Accounts
        </Text>
        <View style={{ marginTop: 4 }}>
          <Text testID="accounts-empty-state">No accounts linked yet.</Text>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard testID="accounts-section">
      <Text variant="labelMedium" style={{ color: colors.textFaint }}>
        ACCOUNTS
      </Text>
      <Text variant="titleMedium" style={{ color: colors.text }}>
        Accounts
      </Text>
      <View style={{ marginTop: 8 }}>
        <View testID="accounts-list">
          {accounts.map((item, index) => (
            <View key={item.id}>
              <View
                testID={`accounts-row-${item.id}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                accessibilityLabel={`${item.name} balance ${formatCurrency(item.balance, { currency })}`}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      marginRight: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.accentSoft,
                      borderWidth: 1,
                      borderColor: colors.borderStrong,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.accent,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {item.institution.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View>
                    <Text variant="bodyLarge" style={{ color: colors.text }}>
                      {item.name}
                    </Text>
                    <Text variant="bodySmall" style={{ color: secondaryText }}>
                      {item.institution}
                    </Text>
                  </View>
                </View>
                <Text
                  variant="bodyLarge"
                  style={{
                    color: balanceColor,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "600",
                  }}
                >
                  {formatCurrency(item.balance, { currency })}
                </Text>
              </View>
              {index < accounts.length - 1 ? (
                <View style={{ height: 12 }} />
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </SurfaceCard>
  );
});
