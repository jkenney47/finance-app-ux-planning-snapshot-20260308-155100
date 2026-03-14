import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { TextField } from "@/components/common/TextField";
import { Text } from "@/components/ui/text";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useMockLinkedAccountsStore } from "@/stores/useMockLinkedAccountsStore";
import {
  exchangePlaidPublicToken,
  fetchLinkedAccountsForLinkVerification,
  getPlaidLinkToken,
  isLivePlaidLinkEnabled,
} from "@/utils/account";
import { trackConversionEvent, trackEvent } from "@/utils/analytics";
import {
  parseBackendError,
  withRequestId,
} from "@/utils/services/backendErrors";
import { supabase } from "@/utils/supabaseClient";

export default function PlaidLinkScreen(): JSX.Element {
  const queryClient = useQueryClient();
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string }>();
  const { colors } = useAppTheme();
  const livePlaidLinkEnabled = isLivePlaidLinkEnabled();
  const { showInfo, showError } = useErrorBanner();
  const linkMockAccounts = useMockLinkedAccountsStore(
    (state) => state.linkMockAccounts,
  );
  const [loading, setLoading] = useState(false);
  const [manualPublicToken, setManualPublicToken] = useState("");
  const [linkMode, setLinkMode] = useState<string | null>(null);

  const resolvedReturnRoute =
    typeof params.returnTo === "string" && params.returnTo.trim().length > 0
      ? decodeURIComponent(params.returnTo)
      : "/(dashboard)";

  const resolveUserId = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    const sessionUserId = data?.session?.user?.id ?? null;
    return sessionUserId;
  };

  const handleMockLink = async (): Promise<void> => {
    setLoading(true);
    trackEvent("plaid_link_mock_start");
    await new Promise((resolve) => setTimeout(resolve, 800));
    linkMockAccounts();
    trackConversionEvent("plaid_linked", {
      mode: "mock",
      accounts_linked_count: 1,
    });
    trackEvent("plaid_link_mock_success");
    showInfo("Mock account linked");
    router.replace(resolvedReturnRoute as never);
    setLoading(false);
  };

  const handleLiveLink = async (): Promise<void> => {
    setLoading(true);
    trackEvent("plaid_link_live_start");
    try {
      const userId = await resolveUserId();
      if (!userId) {
        showError("Sign in is required to link live accounts.");
        return;
      }

      const linkTokenPayload = await getPlaidLinkToken(userId, {
        sandboxAutoLink: true,
      });
      setLinkMode(linkTokenPayload.mode ?? null);
      trackEvent("plaid_link_token_created", {
        mode: linkTokenPayload.mode ?? "unknown",
        requestId: linkTokenPayload.request_id ?? null,
      });

      const sandboxPublicToken =
        linkTokenPayload.sandbox_public_token ?? manualPublicToken.trim();
      if (!sandboxPublicToken) {
        trackEvent("plaid_link_manual_token_required", {
          mode: linkTokenPayload.mode ?? "unknown",
          requestId: linkTokenPayload.request_id ?? null,
        });
        showInfo(
          "Sandbox link token created. Paste a sandbox public token and retry to finish account linking.",
        );
        return;
      }

      const exchangeResult = await exchangePlaidPublicToken(
        sandboxPublicToken,
        userId,
      );
      const linkedAccountsResponse =
        await fetchLinkedAccountsForLinkVerification(userId);
      const linkedAccounts = linkedAccountsResponse.accounts;

      if (linkedAccounts.length > 0) {
        linkMockAccounts();
      }

      await queryClient.invalidateQueries({
        queryKey: ["dashboard", "summary"],
      });

      trackEvent("plaid_link_live_success", {
        accountsLinked: linkedAccounts.length,
        itemId: exchangeResult.item_id,
        linkRequestId: linkTokenPayload.request_id ?? null,
        exchangeRequestId: exchangeResult.request_id ?? null,
        accountsRequestId: linkedAccountsResponse.requestId,
      });
      trackConversionEvent("plaid_linked", {
        mode: "live",
        accounts_linked_count: linkedAccounts.length,
      });
      showInfo(
        `Linked ${linkedAccounts.length} account${linkedAccounts.length === 1 ? "" : "s"}.`,
      );
      router.replace(resolvedReturnRoute as never);
    } catch (error) {
      const parsedError = parseBackendError(
        error,
        "Unable to start Plaid Link",
      );
      showError(withRequestId(parsedError.message, parsedError.requestId));
      trackEvent(
        "plaid_link_live_failure",
        {
          error: parsedError.message,
          requestId: parsedError.requestId,
        },
        { level: "error" },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen variant="fixed">
      <View style={styles.root}>
        <SurfaceCard contentStyle={styles.cardContent}>
          <Text
            variant="labelMedium"
            style={[styles.eyebrow, { color: colors.textFaint }]}
          >
            ACCOUNT LINKING
          </Text>
          <Text
            testID="plaid-link-screen-title"
            variant="headlineSmall"
            style={[styles.heading, { color: colors.text }]}
          >
            Securely link your accounts
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
            We use Plaid to connect your financial institutions. Your
            credentials are never stored on our servers.
          </Text>

          {livePlaidLinkEnabled ? (
            <TextField
              label="Sandbox public token (optional)"
              value={manualPublicToken}
              onChangeText={setManualPublicToken}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="public-sandbox-..."
              testID="sandbox-public-token-input"
            />
          ) : null}

          <PrimaryButton
            testID="plaid-link-primary"
            onPress={livePlaidLinkEnabled ? handleLiveLink : handleMockLink}
            loading={loading}
            disabled={loading}
          >
            {livePlaidLinkEnabled
              ? "Connect with Plaid Sandbox"
              : "Simulate Plaid Link"}
          </PrimaryButton>

          <Text
            testID={
              livePlaidLinkEnabled
                ? "plaid-link-mode-live"
                : "plaid-link-mode-mock"
            }
            variant="bodySmall"
            style={{ color: colors.textFaint }}
          >
            {livePlaidLinkEnabled
              ? "Sandbox linking is enabled. The app will create a sandbox token and exchange it through secure edge functions."
              : "Mock mode is enabled. Use the button above to simulate linking and continue testing."}
          </Text>

          {linkMode ? (
            <Text variant="bodySmall" style={{ color: colors.textFaint }}>
              Plaid mode: {linkMode}
            </Text>
          ) : null}

          <Text variant="bodySmall" style={{ color: colors.textFaint }}>
            {livePlaidLinkEnabled
              ? "If auto-link fails, paste a sandbox public token above and retry."
              : "Mock mode is enabled. Use the button above to simulate linking and continue testing."}
          </Text>
        </SurfaceCard>

        <SecondaryButton
          testID="plaid-link-skip"
          onPress={() => router.replace(resolvedReturnRoute as never)}
        >
          Skip for now
        </SecondaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 20,
    gap: 20,
  },
  cardContent: {
    gap: 12,
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
});
