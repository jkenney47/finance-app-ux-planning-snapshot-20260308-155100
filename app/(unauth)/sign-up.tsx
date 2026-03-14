import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthFrame } from "@/components/common/AuthFrame";
import { Checkbox } from "@/components/common/Checkbox";
import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { TextField } from "@/components/common/TextField";
import { Text } from "@/components/ui/text";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { useAppTheme } from "@/hooks/useAppTheme";
import { tokens as designTokens } from "@/theme/tokens";
import { trackError, trackEvent } from "@/utils/analytics";
import { signUp } from "@/utils/auth";
import { formatError } from "@/utils/errors";

export default function SignUpScreen(): JSX.Element {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { showError, showSuccess } = useErrorBanner();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nudges, setNudges] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (): Promise<void> => {
    if (password !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }
    if (loading) return;

    setLoading(true);
    trackEvent("sign_up_attempt", {
      email_domain: email.split("@")[1] ?? "unknown",
    });
    const { error } = await signUp(email.trim(), password);
    setLoading(false);

    if (error) {
      const message = formatError(error);
      showError(`Unable to sign up: ${message}`);
      trackError(error, { context: "sign_up" });
      trackEvent("sign_up_failed", { reason: message });
      return;
    }

    showSuccess("Account created successfully");
    trackEvent("sign_up_success");
    router.replace({
      pathname: "/onboarding",
      params: { nudges: nudges ? "true" : "false" },
    });
  };

  return (
    <AuthFrame
      eyebrow="New account"
      title="Create your account"
      description="Start with a few basics and we will tailor onboarding from your first answers."
      headerBadge={
        <Pill tone="accent" active>
          Plan in minutes
        </Pill>
      }
      footer={
        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: colors.textFaint }}>
            Already have an account?
          </Text>
          <Link href="/(unauth)/sign-in" asChild>
            <SecondaryButton>Sign in</SecondaryButton>
          </Link>
        </View>
      }
    >
      <View style={styles.form}>
        <TextField
          label="Email"
          required
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextField
          label="Password"
          required
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TextField
          label="Confirm password"
          required
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      <Checkbox
        checked={nudges}
        onPress={() => setNudges((prev) => !prev)}
        label="Send me helpful nudges and reminders"
      />

      <PrimaryButton
        onPress={handleSignUp}
        loading={loading}
        disabled={loading || !email || !password || !confirmPassword}
      >
        Create account
      </PrimaryButton>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: designTokens.space.md,
  },
  footer: {
    gap: designTokens.space.xs,
  },
});
