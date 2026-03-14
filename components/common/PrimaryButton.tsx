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

type PrimaryButtonProps = Omit<
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

export function PrimaryButton({
  children,
  loading = false,
  compact = false,
  icon,
  contentStyle,
  labelStyle,
  className,
  style,
  ...props
}: PrimaryButtonProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const iconColor = colors.bg;
  const resolvedStyle =
    typeof style === "function"
      ? (state: PressableStateCallbackType) => [
          {
            borderRadius: tokens.radius.xl,
            backgroundColor: colors.accent,
          },
          style(state),
        ]
      : [
          {
            borderRadius: tokens.radius.xl,
            backgroundColor: colors.accent,
          },
          style,
        ];

  const renderedIcon = loading ? (
    <ActivityIndicator color={iconColor} size="small" />
  ) : typeof icon === "function" ? (
    icon({ color: iconColor, size: 16 })
  ) : isValidElement(icon) ? (
    icon
  ) : null;

  const isDisabled = Boolean(props.disabled || loading);

  return (
    <Button
      className={cn(
        "bg-accent active:bg-accent/90 rounded-[28px] border-0 shadow-none",
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
          className="text-body font-bold tracking-[0.2px] text-bg"
          style={[{ color: colors.bg }, labelStyle]}
        >
          {children}
        </Text>
      </View>
    </Button>
  );
}
