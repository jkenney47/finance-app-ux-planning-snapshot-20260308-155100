import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthFrame } from "@/components/common/AuthFrame";
import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { TextField } from "@/components/common/TextField";
import { Text } from "@/components/ui/text";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { useAppTheme } from "@/hooks/useAppTheme";
import { tokens as designTokens } from "@/theme/tokens";
import { trackError, trackEvent } from "@/utils/analytics";
import { signIn } from "@/utils/auth";
import { formatError } from "@/utils/errors";

export default function SignInScreen(): JSX.Element {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { showError, showSuccess } = useErrorBanner();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (): Promise<void> => {
    if (loading) return;
    setLoading(true);
    trackEvent("sign_in_attempt", {
      email_domain: email.split("@")[1] ?? "unknown",
    });
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      const message = formatError(error);
      showError(`Unable to sign in: ${message}`);
      trackError(error, { context: "sign_in" });
      trackEvent("sign_in_failed", { reason: message });
      return;
    }

    showSuccess("Signed in successfully");
    trackEvent("sign_in_success");
    router.replace("/onboarding");
  };

  return (
    <AuthFrame
      eyebrow="Secure access"
      title="Welcome back"
      description="Sign in to continue your plan and pick up where you left off."
      headerBadge={
        <Pill tone="positive" active>
          Private by default
        </Pill>
      }
      footer={
        <View style={styles.footer}>
          <Text variant="bodySmall" style={{ color: colors.textFaint }}>
            New here?
          </Text>
          <Link href="/(unauth)/sign-up" asChild>
            <SecondaryButton>Create an account</SecondaryButton>
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

        <PrimaryButton
          onPress={handleSignIn}
          loading={loading}
          disabled={loading || !email || !password}
        >
          Sign in
        </PrimaryButton>

        <Link href="/(unauth)/forgot-password" asChild>
          <SecondaryButton>Forgot password?</SecondaryButton>
        </Link>
      </View>
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
