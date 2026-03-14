import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type OnboardingScaffoldProps = {
  title: string;
  helperText?: string;
  sectionLabel?: string;
  progressCurrent?: number;
  progressTotal?: number;
  showBack?: boolean;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  footerNote?: string;
  onBackPress?: () => void;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  children: ReactNode;
};

export function OnboardingScaffold({
  title,
  helperText,
  sectionLabel,
  progressCurrent,
  progressTotal,
  showBack = false,
  primaryCtaLabel,
  secondaryCtaLabel,
  primaryDisabled = false,
  primaryLoading = false,
  footerNote,
  onBackPress,
  onPrimaryPress,
  onSecondaryPress,
  children,
}: OnboardingScaffoldProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const progress =
    progressCurrent != null && progressTotal
      ? progressCurrent / progressTotal
      : undefined;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: tokens.space.lg,
            paddingTop: tokens.space.lg,
            paddingBottom: tokens.space.xl,
            gap: tokens.space.lg,
          }}
        >
          {showBack || progress != null ? (
            <View style={{ gap: tokens.space.sm }}>
              {showBack && onBackPress ? (
                <SecondaryButton compact onPress={onBackPress}>
                  Back
                </SecondaryButton>
              ) : null}
              {sectionLabel ? (
                <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                  {progressCurrent != null && progressTotal
                    ? `${sectionLabel} · ${progressCurrent} of ${progressTotal}`
                    : sectionLabel}
                </Text>
              ) : null}
              {progress != null ? (
                <ProgressBar
                  progress={progress}
                  accessibilityLabel={`${Math.round(progress * 100)} percent complete`}
                />
              ) : null}
            </View>
          ) : null}

          <View style={{ gap: tokens.space.xs }}>
            <Text
              variant="headlineMedium"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              {title}
            </Text>
            {helperText ? (
              <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
                {helperText}
              </Text>
            ) : null}
          </View>

          <View style={{ flex: 1, gap: tokens.space.md }}>{children}</View>
        </ScrollView>

        {primaryCtaLabel || secondaryCtaLabel || footerNote ? (
          <View
            style={{
              paddingHorizontal: tokens.space.lg,
              paddingTop: tokens.space.md,
              paddingBottom: tokens.space.lg,
              borderTopWidth: 1,
              borderTopColor: colors.borderSubtle,
              backgroundColor: colors.bg,
              gap: tokens.space.sm,
            }}
          >
            {footerNote ? (
              <Text variant="bodySmall" style={{ color: colors.textFaint }}>
                {footerNote}
              </Text>
            ) : null}
            {secondaryCtaLabel && onSecondaryPress ? (
              <SecondaryButton onPress={onSecondaryPress}>
                {secondaryCtaLabel}
              </SecondaryButton>
            ) : null}
            {primaryCtaLabel && onPrimaryPress ? (
              <PrimaryButton
                onPress={onPrimaryPress}
                loading={primaryLoading}
                disabled={primaryDisabled}
              >
                {primaryCtaLabel}
              </PrimaryButton>
            ) : null}
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
