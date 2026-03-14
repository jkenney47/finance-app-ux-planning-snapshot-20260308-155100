import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Sheet } from "@/components/common/Sheet";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { HeroMetric } from "@/components/dashboard/HeroMetric";
import { TrustBar } from "@/components/trust/TrustBar";
import { EmptyHint, ErrorNotice, Skeleton } from "@/components/state";
import { buildDashboardRefreshErrorDescription } from "@/components/state/asyncCopy";
import { Text } from "@/components/ui/text";
import { useDashboardSummary } from "@/hooks/useDashboardData";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import { formatCurrency } from "@/utils/format";

type ScreenState = "auto" | "ready" | "loading" | "empty" | "error";

const STATUS_OPTIONS: Array<{ label: string; value: ScreenState }> = [
  { label: "Auto", value: "auto" },
  { label: "Ready", value: "ready" },
  { label: "Loading", value: "loading" },
  { label: "Empty", value: "empty" },
  { label: "Error", value: "error" },
];

type AccountDetail = {
  id: string;
  name: string;
  type: string;
  balance: number;
  institution: string;
  mask?: string;
};

function buildReconnectLabel(institutionNames: string[]): string {
  if (institutionNames.length === 0) return "an institution";
  if (institutionNames.length === 1) return institutionNames[0];
  if (institutionNames.length === 2) {
    return `${institutionNames[0]} and ${institutionNames[1]}`;
  }
  return `${institutionNames[0]} and ${institutionNames.length - 1} others`;
}

export default function AccountsScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const setAskContext = useAskStore((state) => state.setContext);
  const summaryQuery = useDashboardSummary();
  const [screenState, setScreenState] = useState<ScreenState>("auto");
  const [selectedAccount, setSelectedAccount] = useState<AccountDetail | null>(
    null,
  );

  const flattenedAccounts = useMemo<AccountDetail[]>(
    () =>
      (summaryQuery.data?.accounts ?? []).map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        institution: account.institution ?? "Linked account",
        mask: account.mask,
      })),
    [summaryQuery.data?.accounts],
  );

  const groupedAccounts = useMemo(
    () =>
      flattenedAccounts.reduce<
        Array<{ institution: string; accounts: AccountDetail[] }>
      >((groups, account) => {
        // Bolt: Optimizied array spread inside reduce to use .push() instead.
        // Array spreads `[...groups, newGroup]` create allocations per item yielding O(N^2) complexity.
        // Using `.push()` keeps it O(N) and significantly reduces garbage collection overhead on large lists.
        const existing = groups.find(
          (group) => group.institution === account.institution,
        );

        if (existing) {
          existing.accounts.push(account);
        } else {
          groups.push({
            institution: account.institution,
            accounts: [account],
          });
        }

        return groups;
      }, []),
    [flattenedAccounts],
  );

  const totalBalance = useMemo(
    () =>
      flattenedAccounts.reduce((sum, account) => {
        return sum + account.balance;
      }, 0),
    [flattenedAccounts],
  );
  const institutionStatuses = summaryQuery.data?.institutionStatuses ?? [];
  const reconnectInstitutions = institutionStatuses.filter(
    (institution) =>
      institution.status === "relink" || institution.status === "error",
  );
  const reconnectLabel = buildReconnectLabel(
    reconnectInstitutions.map((institution) => institution.name),
  );
  const askMetricId =
    reconnectInstitutions.length > 0
      ? "connection_health"
      : flattenedAccounts.length > 0
        ? "accounts_linked"
        : "coverage_confidence";

  const resolvedState = useMemo(() => {
    if (screenState !== "auto") {
      return screenState;
    }

    if (summaryQuery.isLoading) {
      return "loading";
    }

    if (summaryQuery.isError) {
      return "error";
    }

    if (flattenedAccounts.length === 0) {
      return "empty";
    }

    return "ready";
  }, [
    flattenedAccounts.length,
    screenState,
    summaryQuery.isError,
    summaryQuery.isLoading,
  ]);

  useEffect(() => {
    setAskContext({
      screen: "accounts",
      metricId: askMetricId,
    });
  }, [askMetricId, setAskContext]);

  const handleLinkAccounts = (): void => {
    router.push("/(auth)/plaid-link");
  };

  const hero = (
    <HeroMetric
      label="Total balances"
      value={totalBalance}
      caption="Across linked institutions"
    />
  );

  const renderContent = (): JSX.Element | JSX.Element[] => {
    switch (resolvedState) {
      case "loading":
        return (
          <View style={styles.loadingBlock}>
            <Skeleton height={48} radius={tokens.radius.md} />
            <Skeleton height={120} radius={tokens.radius.md} />
            <Skeleton height={180} radius={tokens.radius.md} />
          </View>
        );
      case "empty":
        return (
          <EmptyHint
            title="No accounts yet"
            description="Link a financial institution to see balances, credit lines, and trends in one place."
            actionLabel="Link account"
            onActionPress={handleLinkAccounts}
          />
        );
      case "error":
        return (
          <ErrorNotice
            description={buildDashboardRefreshErrorDescription("your accounts")}
            onRetry={() => {
              void summaryQuery.refetch();
            }}
          />
        );
      case "ready":
      default:
        return groupedAccounts.map((group) => (
          <SurfaceCard key={group.institution}>
            <Text
              variant="labelMedium"
              style={[styles.groupTitle, { color: colors.textFaint }]}
            >
              {group.institution.toUpperCase()}
            </Text>
            <View style={styles.groupRows}>
              {group.accounts.map((account, index) => {
                const isLast = index === group.accounts.length - 1;
                return (
                  <View key={account.id}>
                    <Pressable
                      onPress={() => setSelectedAccount(account)}
                      testID={`accounts-row-${account.id}`}
                      style={({ pressed }) => [
                        styles.row,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      role="button"
                      accessibilityRole="button"
                      accessibilityLabel={`${account.name}, ${account.type}${account.mask ? ` ending in ${account.mask}` : ""}, ${formatCurrency(account.balance)}`}
                      accessibilityHint="Opens account details."
                    >
                      <View style={styles.rowLeft}>
                        <Text
                          variant="bodyLarge"
                          style={{ color: colors.text }}
                        >
                          {account.name}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={{ color: colors.textMuted }}
                        >
                          {account.type}
                          {account.mask ? ` · ${account.mask}` : ""}
                        </Text>
                      </View>
                      <View style={styles.rowRight}>
                        <Text
                          style={[
                            styles.balance,
                            {
                              color:
                                account.balance >= 0
                                  ? colors.positive
                                  : colors.negative,
                            },
                          ]}
                        >
                          {formatCurrency(account.balance)}
                        </Text>
                        <Text style={{ color: colors.textFaint, fontSize: 16 }}>
                          ›
                        </Text>
                      </View>
                    </Pressable>
                    {isLast ? null : (
                      <View
                        style={[
                          styles.rowDivider,
                          { backgroundColor: colors.borderSubtle },
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </SurfaceCard>
        ));
    }
  };

  return (
    <>
      <Screen variant="scroll" contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text
            variant="labelLarge"
            style={[styles.eyebrow, { color: colors.textFaint }]}
          >
            Portfolio
          </Text>
          <Text
            testID="accounts-screen-title"
            variant="headlineLarge"
            style={[styles.heading, { color: colors.text }]}
          >
            Accounts
          </Text>
        </View>

        {hero}

        {institutionStatuses.length > 0 ? (
          <TrustBar
            institutionStatuses={institutionStatuses}
            onManageConnections={handleLinkAccounts}
          />
        ) : null}

        {reconnectInstitutions.length > 0 ? (
          <SurfaceCard contentStyle={{ gap: tokens.space.xs }}>
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              PLAN ACCURACY
            </Text>
            <Text
              variant="titleSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              {`Reconnect ${reconnectLabel} to restore full accuracy.`}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Your roadmap still works using your last successful sync plus
              saved profile inputs.
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Missing right now: live balances and transactions from
              disconnected institutions.
            </Text>
            <View style={{ alignSelf: "flex-start" }}>
              <PrimaryButton
                compact
                testID="accounts-reconnect-button"
                onPress={handleLinkAccounts}
              >
                Reconnect now
              </PrimaryButton>
            </View>
          </SurfaceCard>
        ) : null}

        <SegmentedControl
          testID="accounts-screen-state-toggle"
          value={screenState}
          onChange={(value) => setScreenState(value as ScreenState)}
          options={STATUS_OPTIONS.map(({ label, value }) => ({ label, value }))}
        />

        {renderContent()}

        <SecondaryButton onPress={handleLinkAccounts}>
          Link another institution
        </SecondaryButton>
      </Screen>

      <Sheet
        isOpen={Boolean(selectedAccount)}
        onDismiss={() => setSelectedAccount(null)}
        testID="account-detail-sheet"
      >
        {selectedAccount ? (
          <View style={styles.sheetContent}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              {selectedAccount.name}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              {selectedAccount.type}
              {selectedAccount.mask ? ` · ${selectedAccount.mask}` : ""}
            </Text>
            <Text
              variant="titleLarge"
              style={{
                color: colors.text,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatCurrency(selectedAccount.balance)}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textFaint }}>
              {selectedAccount.institution}
            </Text>
            <SecondaryButton onPress={() => setSelectedAccount(null)}>
              Close
            </SecondaryButton>
          </View>
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    paddingBottom: 32,
  },
  header: {
    gap: 4,
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  heading: {
    fontWeight: "700",
  },
  loadingBlock: {
    gap: 12,
  },
  groupTitle: {
    letterSpacing: 1,
    fontWeight: "700",
  },
  groupRows: {
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  rowLeft: {
    flex: 1,
    gap: 3,
  },
  rowRight: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
  },
  rowDivider: {
    height: 1,
  },
  balance: {
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  sheetContent: {
    gap: 12,
  },
});
