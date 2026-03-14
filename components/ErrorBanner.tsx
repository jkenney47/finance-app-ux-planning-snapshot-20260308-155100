import { Portal } from "@rn-primitives/portal";
import { memo, useEffect, useId, useMemo } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useErrorBanner } from "@/hooks/useErrorBanner";

const AUTO_DISMISS_MS = 6000;

function ErrorBannerComponent(): JSX.Element | null {
  const { visible, message, variant, actionLabel, onAction, dismiss } =
    useErrorBanner();
  const { colors: themeColors, tokens } = useAppTheme();
  const portalId = useId();
  const portalName = useMemo(
    () => `error-banner-${portalId.replace(/[:]/g, "")}`,
    [portalId],
  );

  const variantColors =
    variant === "error"
      ? {
          background: themeColors.negative,
          text: themeColors.surface1,
          border: themeColors.negative,
        }
      : variant === "success"
        ? {
            background: themeColors.positive,
            text: themeColors.surface1,
            border: themeColors.positive,
          }
        : {
            background: themeColors.info,
            text: themeColors.surface1,
            border: themeColors.info,
          };

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [dismiss, visible]);

  if (!visible) {
    return null;
  }

  const content = (
    <View
      pointerEvents="box-none"
      className="absolute inset-0 justify-end px-4"
      style={{ paddingBottom: tokens.space.lg + 4 }}
    >
      <View
        className="rounded-[16px] border px-4 py-3"
        style={{
          borderRadius: tokens.radius.md,
          borderColor: variantColors.border,
          backgroundColor: variantColors.background,
        }}
        role="alert"
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <Text
          variant="bodyMedium"
          style={{ color: variantColors.text, fontWeight: "600" }}
        >
          {message}
        </Text>
        <View className="mt-3 flex-row items-center justify-end gap-2">
          {actionLabel && onAction ? (
            <Pressable
              onPress={() => {
                onAction();
                dismiss();
              }}
              role="button"
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              className="rounded-[12px] px-3 py-2"
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text
                variant="labelLarge"
                style={{ color: variantColors.text, fontWeight: "700" }}
              >
                {actionLabel}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={dismiss}
            role="button"
            accessibilityRole="button"
            accessibilityLabel="Dismiss message"
            className="rounded-[12px] px-3 py-2"
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text
              variant="labelLarge"
              style={{ color: variantColors.text, fontWeight: "700" }}
            >
              Dismiss
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (process.env.NODE_ENV === "test") {
    return content;
  }

  return <Portal name={portalName}>{content}</Portal>;
}

export const ErrorBanner = memo(ErrorBannerComponent);
