import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { Sheet } from "@/components/common/Sheet";
import { TextField } from "@/components/common/TextField";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { useAskStore } from "@/stores/useAskStore";
import {
  getAskContextSummary,
  getAskHeadline,
  getAskSuggestedPrompts,
  getDefaultAskPrompt,
} from "@/utils/askContext";
import { callGemini, validatePrompt } from "@/utils/chat";

export function AskSheet(): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const { showError } = useErrorBanner();
  const isOpen = useAskStore((state) => state.isOpen);
  const context = useAskStore((state) => state.context);
  const close = useAskStore((state) => state.close);

  const [prompt, setPrompt] = useState(() => getDefaultAskPrompt(context));
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const contextSummary = getAskContextSummary(context);
  const headline = getAskHeadline(context);
  const suggestedPrompts = getAskSuggestedPrompts(context);

  useEffect(() => {
    if (!isOpen) return;
    setPrompt(getDefaultAskPrompt(context));
    setResponse("");
  }, [context, isOpen]);

  const handleAsk = async (): Promise<void> => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      showError("Add a question first.");
      return;
    }

    const safetyError = validatePrompt(trimmedPrompt);
    if (safetyError) {
      showError(safetyError);
      return;
    }

    setLoading(true);
    try {
      const contextualPrompt = `${trimmedPrompt}\n\nContext: ${contextSummary}`;
      const result = await callGemini(contextualPrompt);
      setResponse(result.markdown);
    } catch {
      showError("Unable to get a response right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet isOpen={isOpen} onDismiss={close} testID="ask-sheet">
      <ScrollView
        contentContainerStyle={{
          gap: tokens.space.md,
          paddingBottom: tokens.space.xl,
        }}
      >
        <View style={{ gap: tokens.space.xs }}>
          <Text
            variant="headlineSmall"
            style={{ color: colors.text, fontWeight: "700" }}
          >
            {headline}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {contextSummary}
          </Text>
        </View>

        <View style={{ gap: tokens.space.xs }}>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            QUICK PROMPTS
          </Text>
          {suggestedPrompts.map((suggestion, index) => (
            <SecondaryButton
              key={suggestion}
              testID={`ask-sheet-quick-prompt-${index}`}
              compact
              onPress={() => setPrompt(suggestion)}
            >
              {suggestion}
            </SecondaryButton>
          ))}
        </View>

        <TextField
          label="Question"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          numberOfLines={4}
          testID="ask-sheet-input"
        />

        <PrimaryButton
          testID="ask-sheet-submit"
          loading={loading}
          disabled={loading}
          onPress={() => {
            void handleAsk();
          }}
        >
          Ask advisor
        </PrimaryButton>

        <SecondaryButton onPress={close}>Close</SecondaryButton>

        {response ? (
          <View
            style={{
              gap: tokens.space.xs,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              backgroundColor: colors.surface2,
              borderRadius: tokens.radius.md,
              padding: tokens.space.sm,
            }}
          >
            <Text variant="labelMedium" style={{ color: colors.textFaint }}>
              RESPONSE
            </Text>
            <Text variant="bodySmall" style={{ color: colors.text }}>
              {response}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}
