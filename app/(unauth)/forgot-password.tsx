import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AuthFrame } from "@/components/common/AuthFrame";
import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { TextField } from "@/components/common/TextField";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { supabase } from "@/utils/supabaseClient";

const PASSWORD_RESET_REDIRECT_URL =
  process.env.EXPO_PUBLIC_PASSWORD_RESET_REDIRECT_URL;

export default function ForgotPasswordScreen(): JSX.Element {
  const router = useRouter();
  const { showError, showInfo } = useErrorBanner();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (): Promise<void> => {
    if (loading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showError("Please enter your email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL || undefined,
    });
    setLoading(false);

    if (error) {
      showError(`Unable to send reset email: ${error.message}`);
      return;
    }

    showInfo("If that email exists, a reset link has been sent.");
    router.replace("/(unauth)/sign-in");
  };

  return (
    <AuthFrame
      eyebrow="Account recovery"
      title="Reset password"
      description="Enter your account email and we will send a reset link if it exists."
      headerBadge={
        <Pill tone="warning" active>
          Recovery flow
        </Pill>
      }
    >
      <View style={styles.content}>
        <TextField
          label="Email"
          required
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <PrimaryButton
          onPress={handleReset}
          loading={loading}
          disabled={loading || !email.trim()}
        >
          Send reset link
        </PrimaryButton>

        <SecondaryButton onPress={() => router.replace("/(unauth)/sign-in")}>
          Back to sign in
        </SecondaryButton>
      </View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
});
