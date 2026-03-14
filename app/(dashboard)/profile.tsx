import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Switch, View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Sheet } from "@/components/common/Sheet";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { CoverageConfidenceBadge } from "@/components/dashboard/CoverageConfidenceBadge";
import { AdviceBoundaryNotice } from "@/components/notice/AdviceBoundaryNotice";
import { EmptyHint } from "@/components/state";
import { Text } from "@/components/ui/text";
import {
  useDashboardSummary,
  useFinancialMaturityEvaluation,
} from "@/hooks/useDashboardData";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import {
  type AdvisorVoice,
  type DensityMode,
  type ThemePreference,
  usePreferencesStore,
} from "@/stores/usePreferencesStore";
import {
  useCurrentRoadmap,
  useFinancialSnapshot,
} from "@/utils/queries/useRoadmapCore";
import { buildCoverageDisplay } from "@/utils/roadmap/experience";
import { deriveCoverageConfidence } from "@/utils/roadmap/confidence";

type SheetView = "security" | "data" | "legal" | "privacy" | null;

export default function ProfileScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const [activeSheet, setActiveSheet] = useState<SheetView>(null);

  const themePreference = usePreferencesStore((state) => state.themePreference);
  const setThemePreference = usePreferencesStore(
    (state) => state.setThemePreference,
  );
  const advisorVoice = usePreferencesStore((state) => state.advisorVoice);
  const setAdvisorVoice = usePreferencesStore((state) => state.setAdvisorVoice);
  const enableHaptics = usePreferencesStore((state) => state.enableHaptics);
  const toggleHaptics = usePreferencesStore((state) => state.toggleHaptics);
  const densityMode = usePreferencesStore((state) => state.densityMode);
  const setDensityMode = usePreferencesStore((state) => state.setDensityMode);
  const setAskContext = useAskStore((state) => state.setContext);
  const summaryQuery = useDashboardSummary();
  const roadmapQuery = useCurrentRoadmap();
  const snapshotQuery = useFinancialSnapshot();
  const fme = useFinancialMaturityEvaluation(summaryQuery.data);
  const coverageConfidence = useMemo(
    () =>
      deriveCoverageConfidence(
        fme.evaluation,
        fme.facts,
        summaryQuery.data?.institutionStatuses,
      ),
    [fme.evaluation, fme.facts, summaryQuery.data?.institutionStatuses],
  );
  const connectedAccountCount = summaryQuery.data?.accounts.length ?? 0;
  const institutionStatuses = summaryQuery.data?.institutionStatuses ?? [];
  const healthyInstitutionCount = institutionStatuses.filter(
    (institution) => institution.status === "connected",
  ).length;
  const reconnectInstitutions = institutionStatuses.filter(
    (institution) =>
      institution.status === "relink" || institution.status === "error",
  );
  const syncingInstitutionCount = institutionStatuses.filter(
    (institution) => institution.status === "syncing",
  ).length;
  const totalInstitutionCount = institutionStatuses.length;
  const primaryRecommendationId = fme.evaluation.primaryRecommendation?.id;
  const roadmapCoverage = useMemo(
    () =>
      roadmapQuery.data
        ? buildCoverageDisplay({
            roadmap: roadmapQuery.data,
            snapshot: snapshotQuery.data,
          })
        : null,
    [roadmapQuery.data, snapshotQuery.data],
  );

  useEffect(() => {
    setAskContext({
      screen: "profile",
      recommendationId: primaryRecommendationId,
      stepId: primaryRecommendationId,
      metricId:
        reconnectInstitutions.length > 0
          ? "connection_health"
          : "coverage_confidence",
    });
  }, [primaryRecommendationId, reconnectInstitutions.length, setAskContext]);

  return (
    <>
      <Screen
        variant="scroll"
        contentContainerStyle={{
          paddingVertical: tokens.space.lg,
          gap: tokens.space.lg,
        }}
      >
        <ScreenHeader
          eyebrow="Utilities"
          title="Profile & utilities"
          titleTestID="profile-screen-title"
          description="Keep the main navigation focused. Use this hub for accounts, preferences, privacy, and support."
          trailingAccessory={
            <SecondaryButton
              compact
              onPress={() => router.push("/(dashboard)")}
            >
              Done
            </SecondaryButton>
          }
        />
        <AdviceBoundaryNotice />

        <SurfaceCard contentStyle={{ gap: tokens.space.md }}>
          <View className="gap-1">
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Utility hub
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Quick jumps back into the three primary planning surfaces.
            </Text>
          </View>
          <PrimaryButton onPress={() => router.push("/(dashboard)")}>
            Return to Home
          </PrimaryButton>
          <SecondaryButton onPress={() => router.push("/(dashboard)/journey")}>
            Open roadmap
          </SecondaryButton>
          <SecondaryButton
            testID="profile-open-goals"
            onPress={() => router.push("/(dashboard)/goals")}
          >
            Review goals
          </SecondaryButton>
        </SurfaceCard>

        <SurfaceCard contentStyle={{ gap: tokens.space.md }}>
          <View className="gap-1">
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Data coverage & accuracy
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Confidence adapts to what is connected, how fresh it is, and which
              inputs are still assumed.
            </Text>
          </View>
          {roadmapCoverage ? (
            <>
              <Pill active tone={roadmapCoverage.tone}>
                {roadmapCoverage.label}
              </Pill>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                {roadmapCoverage.summary}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textFaint }}>
                {roadmapCoverage.impact}
              </Text>
              {roadmapCoverage.staleCategories.length > 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: tokens.space.xs,
                  }}
                >
                  {roadmapCoverage.staleCategories.map((category) => (
                    <Pill key={category} active tone="warning">
                      {category}
                    </Pill>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <CoverageConfidenceBadge confidence={coverageConfidence} />
          )}
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Connected accounts: ${connectedAccountCount}`}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Institutions healthy: ${healthyInstitutionCount}/${totalInstitutionCount || 0}`}
          </Text>
          {reconnectInstitutions.length > 0 ? (
            <>
              <Text variant="bodySmall" style={{ color: colors.warning }}>
                {`Accuracy is reduced while ${reconnectInstitutions.length} institution${reconnectInstitutions.length === 1 ? "" : "s"} need reconnect.`}
              </Text>
              {reconnectInstitutions.slice(0, 2).map((institution) => (
                <Text
                  key={institution.id}
                  variant="bodySmall"
                  style={{ color: colors.textFaint }}
                >
                  {`\u2022 ${institution.name}${institution.lastSynced ? ` (${institution.lastSynced})` : ""}`}
                </Text>
              ))}
            </>
          ) : syncingInstitutionCount > 0 ? (
            <Text variant="bodySmall" style={{ color: colors.textFaint }}>
              {`${syncingInstitutionCount} institution${syncingInstitutionCount === 1 ? "" : "s"} currently syncing.`}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`What we are using now: ${
              totalInstitutionCount > 0
                ? "live data from connected institutions plus any saved profile inputs."
                : "saved profile inputs and assumptions until an account is linked."
            }`}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textFaint }}>
            Improve accuracy by linking your primary checking account first,
            then reconnecting any institution marked stale or errored.
          </Text>
          <SecondaryButton
            testID="profile-open-accounts"
            onPress={() => router.push("/(dashboard)/accounts")}
          >
            {roadmapCoverage?.actionLabel ??
              (reconnectInstitutions.length > 0
                ? "Reconnect accounts"
                : "Improve coverage")}
          </SecondaryButton>
        </SurfaceCard>

        <SurfaceCard
          style={{
            backgroundColor: colors.accentSoft,
            borderColor: colors.accentSoft,
          }}
          contentStyle={{ gap: tokens.space.md }}
        >
          <Text
            variant="titleLarge"
            style={{ color: colors.text, fontWeight: "700" }}
          >
            Personalize your experience
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
            Adjust theme, haptics, and interface density. Your choices sync
            across devices.
          </Text>
          <PrimaryButton onPress={() => setActiveSheet("security")}>
            Manage account security
          </PrimaryButton>
        </SurfaceCard>

        <SurfaceCard contentStyle={{ gap: tokens.space.lg }}>
          <View className="gap-1">
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Appearance
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Control look and feel
            </Text>
          </View>

          <View className="gap-2">
            <Text variant="labelLarge" style={{ color: colors.textFaint }}>
              Theme
            </Text>
            <SegmentedControl
              value={themePreference}
              onChange={(value) => {
                setThemePreference(value as ThemePreference);
                if (enableHaptics) {
                  void Haptics.selectionAsync();
                }
              }}
              options={[
                { label: "System", value: "system" },
                { label: "Light", value: "light" },
                { label: "Dark", value: "dark" },
              ]}
            />
          </View>

          <View className="gap-2">
            <Text variant="labelLarge" style={{ color: colors.textFaint }}>
              Interface density
            </Text>
            <SegmentedControl
              value={densityMode}
              onChange={(value) => {
                setDensityMode(value as DensityMode);
                if (enableHaptics) {
                  void Haptics.selectionAsync();
                }
              }}
              options={[
                { label: "Comfortable", value: "comfortable" },
                { label: "Compact", value: "compact" },
              ]}
            />
          </View>
        </SurfaceCard>

        <SurfaceCard contentStyle={{ gap: tokens.space.md }}>
          <View className="gap-1">
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Advisor voice
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Choose how direct your roadmap guidance feels.
            </Text>
          </View>
          <SegmentedControl
            value={advisorVoice}
            onChange={(value) => {
              setAdvisorVoice(value as AdvisorVoice);
              if (enableHaptics) {
                void Haptics.selectionAsync();
              }
            }}
            options={[
              { label: "Neutral", value: "neutral" },
              { label: "Encouraging", value: "encouraging" },
              { label: "Direct", value: "direct" },
            ]}
          />
        </SurfaceCard>

        <SurfaceCard contentStyle={{ gap: tokens.space.md }}>
          <View className="gap-1">
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Feedback
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Device-level cues
            </Text>
          </View>
          <View
            className="flex-row items-center justify-between gap-3 rounded-[16px] border p-3"
            style={{
              borderRadius: tokens.radius.md,
              borderColor: colors.borderSubtle,
              backgroundColor: colors.surface2,
            }}
          >
            <View className="flex-1 gap-1">
              <Text variant="titleSmall" style={{ color: colors.text }}>
                Haptic feedback
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                Gentle taps for confirmations and alerts.
              </Text>
            </View>
            <Switch
              value={enableHaptics}
              onValueChange={() => {
                toggleHaptics();
                if (!enableHaptics) {
                  void Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                  );
                } else {
                  void Haptics.selectionAsync();
                }
              }}
              accessibilityLabel="Toggle haptic feedback"
              trackColor={{
                false: colors.borderStrong,
                true: colors.accentSoft,
              }}
              thumbColor={enableHaptics ? colors.accent : colors.surface1}
              ios_backgroundColor={colors.borderStrong}
            />
          </View>
        </SurfaceCard>

        <SurfaceCard contentStyle={{ gap: tokens.space.md }}>
          <View className="gap-1">
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Security & data
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Manage trusted devices
            </Text>
          </View>

          <View
            className="rounded-[16px] border p-3"
            style={{
              borderRadius: tokens.radius.md,
              borderColor: colors.borderSubtle,
              backgroundColor: colors.surface2,
            }}
          >
            <View className="gap-1">
              <Text variant="titleSmall" style={{ color: colors.text }}>
                Face ID / biometrics
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                Enabled on this device
              </Text>
            </View>
            <Text
              variant="labelLarge"
              style={{ color: colors.positive, marginTop: tokens.space.xs }}
            >
              Enabled
            </Text>
          </View>

          <View
            className="rounded-[16px] border p-3"
            style={{
              borderRadius: tokens.radius.md,
              borderColor: colors.borderSubtle,
              backgroundColor: colors.surface2,
            }}
          >
            <View className="gap-1">
              <Text variant="titleSmall" style={{ color: colors.text }}>
                Two-factor authentication
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                Active · Authenticator app
              </Text>
            </View>
            <Text
              variant="labelLarge"
              style={{ color: colors.positive, marginTop: tokens.space.xs }}
            >
              Active
            </Text>
          </View>

          <View
            className="rounded-[16px] border p-3"
            style={{
              borderRadius: tokens.radius.md,
              borderColor: colors.borderSubtle,
              backgroundColor: colors.surface2,
            }}
          >
            <View className="gap-1">
              <Text variant="titleSmall" style={{ color: colors.text }}>
                Connected institutions
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                Manage linked banks and cards
              </Text>
            </View>
            <View className="mt-3">
              <SecondaryButton compact onPress={() => setActiveSheet("data")}>
                Review
              </SecondaryButton>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard contentStyle={{ gap: tokens.space.md }}>
          <View className="gap-1">
            <Text variant="titleMedium" style={{ color: colors.text }}>
              Legal & privacy
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Guidance is educational and roadmap-based. It is not a
              personalized securities recommendation.
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: tokens.space.xs,
              flexWrap: "wrap",
            }}
          >
            <SecondaryButton compact onPress={() => setActiveSheet("legal")}>
              View disclosures
            </SecondaryButton>
            <SecondaryButton compact onPress={() => setActiveSheet("privacy")}>
              View privacy
            </SecondaryButton>
          </View>
        </SurfaceCard>

        {__DEV__ ? (
          <SurfaceCard contentStyle={{ gap: tokens.space.md }}>
            <View className="gap-1">
              <Text variant="titleMedium" style={{ color: colors.text }}>
                Developer tools
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                Internal testing surfaces
              </Text>
            </View>
            <View
              className="rounded-[16px] border p-3"
              style={{
                borderRadius: tokens.radius.md,
                borderColor: colors.borderSubtle,
                backgroundColor: colors.surface2,
              }}
            >
              <View className="gap-1">
                <Text variant="titleSmall" style={{ color: colors.text }}>
                  UI Lab
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  Preview shared components and state presentations.
                </Text>
              </View>
              <View className="mt-3">
                <SecondaryButton
                  compact
                  onPress={() => router.push("/(internal)/ui-lab")}
                >
                  Open
                </SecondaryButton>
              </View>
            </View>
          </SurfaceCard>
        ) : null}

        <EmptyHint
          title="Need adjustments?"
          description="You can revisit onboarding to recalibrate your guidance anytime."
          actionLabel="Launch onboarding"
          onActionPress={() => {
            if (enableHaptics) {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.push("/onboarding");
          }}
        />
      </Screen>

      <Sheet
        isOpen={activeSheet !== null}
        onDismiss={() => setActiveSheet(null)}
        testID="profile-detail-sheet"
      >
        {activeSheet === "security" ? (
          <View style={{ gap: tokens.space.md }}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              Account security
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              Session timeouts, biometric requirements, and device approvals
              live here. Deeper controls arrive in Phase 1.
            </Text>
            <PrimaryButton onPress={() => setActiveSheet(null)}>
              Done
            </PrimaryButton>
          </View>
        ) : null}

        {activeSheet === "data" ? (
          <View style={{ gap: tokens.space.md }}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              Linked institutions
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              Manage connections, relink accounts, and remove outdated
              institutions from one place.
            </Text>
            <PrimaryButton
              onPress={() => {
                if (enableHaptics) {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setActiveSheet(null);
                router.push("/(auth)/plaid-link");
              }}
            >
              Open manager
            </PrimaryButton>
            <SecondaryButton onPress={() => setActiveSheet(null)}>
              Close
            </SecondaryButton>
          </View>
        ) : null}

        {activeSheet === "legal" ? (
          <View style={{ gap: tokens.space.md }}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              Legal disclosures
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              This advisor provides educational guidance based on connected
              account data and selected assumptions. It does not provide
              security-specific recommendations or guaranteed outcomes.
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              Always review major financial decisions against your full context,
              including risk tolerance, tax implications, and professional
              advice when needed.
            </Text>
            <PrimaryButton onPress={() => setActiveSheet(null)}>
              Done
            </PrimaryButton>
          </View>
        ) : null}

        {activeSheet === "privacy" ? (
          <View style={{ gap: tokens.space.md }}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              Privacy controls
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              Your roadmap uses connected account data, selected preferences,
              and onboarding inputs to calculate next steps and confidence.
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              You can disconnect institutions at any time. Disconnecting reduces
              coverage and may lower recommendation confidence.
            </Text>
            <PrimaryButton
              onPress={() => {
                setActiveSheet(null);
                router.push("/(dashboard)/accounts");
              }}
            >
              Manage connected data
            </PrimaryButton>
            <SecondaryButton onPress={() => setActiveSheet(null)}>
              Close
            </SecondaryButton>
          </View>
        ) : null}
      </Sheet>
    </>
  );
}
