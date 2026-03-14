import { Link } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AuthFrame } from "@/components/common/AuthFrame";
import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { tokens as designTokens } from "@/theme/tokens";

const VALUE_LINES = [
  "See the next best step without guessing.",
  "Understand what each recommendation unlocks next.",
  "Keep control of your data and decision pace.",
] as const;

export default function WelcomeScreen(): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <AuthFrame
      eyebrow="Aurora Finance"
      title="See your money clearly"
      description="Move faster on next steps, understand the tradeoffs, and stay in control."
      headerBadge={
        <Pill tone="accent" active>
          Deterministic guidance
        </Pill>
      }
    >
      <View style={styles.cardContent}>
        <View style={styles.highlights}>
          {VALUE_LINES.map((line) => (
            <View key={line} style={styles.highlightRow}>
              <View
                style={[
                  styles.highlightDot,
                  {
                    backgroundColor: colors.accent,
                    borderRadius: tokens.radius.xs,
                  },
                ]}
              />
              <Text variant="bodyMedium" style={{ color: colors.text }}>
                {line}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Link href="/(unauth)/sign-in" asChild>
            <PrimaryButton testID="welcome-sign-in">Sign in</PrimaryButton>
          </Link>
          <Link href="/(unauth)/sign-up" asChild>
            <SecondaryButton testID="welcome-sign-up">
              Create an account
            </SecondaryButton>
          </Link>
        </View>
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    gap: designTokens.space.lg,
  },
  highlights: {
    gap: 12,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: designTokens.space.xs,
  },
  highlightDot: {
    width: 10,
    height: 10,
    marginTop: designTokens.radius.xs,
  },
  actions: {
    gap: 12,
  },
});
