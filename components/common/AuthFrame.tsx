import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ContourBackdrop } from "@/components/dashboard/ContourBackdrop";
import { useAppTheme } from "@/hooks/useAppTheme";

import { Screen } from "./Screen";
import { ScreenHeader } from "./ScreenHeader";
import { SurfaceCard } from "./SurfaceCard";

type AuthFrameProps = {
  eyebrow?: string;
  title: string;
  description: string;
  titleTestID?: string;
  headerBadge?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthFrame({
  eyebrow,
  title,
  description,
  titleTestID,
  headerBadge,
  footer,
  children,
}: AuthFrameProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <Screen variant="fixed" padHorizontal={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardRoot}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: tokens.space.lg,
              paddingVertical: tokens.space.xl,
              gap: tokens.space.lg,
            },
          ]}
        >
          <View style={styles.root}>
            <ContourBackdrop opacity={0.18} />
            <View
              style={[
                styles.glowPrimary,
                {
                  backgroundColor: colors.accentSoft,
                  borderRadius: tokens.radius.xl,
                },
              ]}
            />
            <View
              style={[
                styles.glowSecondary,
                {
                  backgroundColor: `${colors.info}22`,
                  borderRadius: tokens.radius.xl,
                },
              ]}
            />
            <View style={{ gap: tokens.space.lg }}>
              <ScreenHeader
                eyebrow={eyebrow}
                title={title}
                description={description}
                titleVariant="headlineLarge"
                titleTestID={titleTestID}
              >
                {headerBadge}
              </ScreenHeader>

              <SurfaceCard contentStyle={{ gap: tokens.space.md }}>
                {children}
              </SurfaceCard>

              {footer ? (
                <View style={{ gap: tokens.space.xs }}>{footer}</View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  root: {
    position: "relative",
  },
  glowPrimary: {
    position: "absolute",
    top: -32,
    right: -40,
    width: 180,
    height: 180,
    opacity: 0.6,
  },
  glowSecondary: {
    position: "absolute",
    top: 110,
    left: -56,
    width: 220,
    height: 220,
    opacity: 0.42,
  },
});
