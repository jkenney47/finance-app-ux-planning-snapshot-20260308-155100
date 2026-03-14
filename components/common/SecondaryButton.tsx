import { ReactNode, isValidElement } from "react";
import {
  ActivityIndicator,
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { cn } from "@/lib/utils";

type ButtonIconRenderProps = {
  color: string;
  size: number;
};

type SecondaryButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children"
> & {
  children: ReactNode;
  loading?: boolean;
  compact?: boolean;
  icon?: ReactNode | string | ((props: ButtonIconRenderProps) => ReactNode);
  contentStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function SecondaryButton({
  children,
  loading = false,
  compact = false,
  icon,
  contentStyle,
  labelStyle,
  className,
  style,
  ...props
}: SecondaryButtonProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const isDisabled = Boolean(props.disabled || loading);
  const resolvedStyle =
    typeof style === "function"
      ? (state: PressableStateCallbackType) => [
          {
            borderRadius: tokens.radius.xl,
            borderColor: colors.borderStrong,
            backgroundColor: "transparent",
          },
          style(state),
        ]
      : [
          {
            borderRadius: tokens.radius.xl,
            borderColor: colors.borderStrong,
            backgroundColor: "transparent",
          },
          style,
        ];

  const renderedIcon = loading ? (
    <ActivityIndicator color={colors.text} size="small" />
  ) : typeof icon === "function" ? (
    icon({ color: colors.text, size: 16 })
  ) : isValidElement(icon) ? (
    icon
  ) : null;

  return (
    <Button
      variant="outline"
      className={cn(
        "rounded-[28px] border bg-transparent shadow-none active:bg-surface2",
        compact ? "min-h-10 px-3 py-2" : "min-h-12 px-4 py-2",
        className,
      )}
      style={resolvedStyle}
      {...props}
      disabled={isDisabled}
      accessibilityState={{
        busy: loading,
        disabled: isDisabled,
        ...props.accessibilityState,
      }}
    >
      <View
        className="flex-row items-center justify-center gap-2"
        style={contentStyle}
      >
        {renderedIcon}
        <Text
          className="text-body font-semibold tracking-[0.1px] text-text"
          style={[{ color: colors.text }, labelStyle]}
        >
          {children}
        </Text>
      </View>
    </Button>
  );
}
