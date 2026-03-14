import { View } from "react-native";

import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { cn } from "@/lib/utils";

type TextFieldProps = React.ComponentProps<typeof Input> & {
  label?: string;
  containerClassName?: string;
  required?: boolean;
};

export function TextField({
  label,
  containerClassName,
  className,
  style,
  multiline,
  numberOfLines,
  required,
  ...props
}: TextFieldProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const { accessibilityLabel, ...inputProps } = props;

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label ? (
        <Text
          className="text-[13px] font-semibold"
          style={{ color: colors.textMuted }}
        >
          {label}
          {required ? <Text style={{ color: colors.negative }}> *</Text> : null}
        </Text>
      ) : null}
      <Input
        className={cn(
          "min-h-12 rounded-[16px] border bg-surface2 px-3 py-2 text-body text-text shadow-none",
          multiline ? "h-auto py-3" : "",
          className,
        )}
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[
          {
            borderRadius: tokens.radius.md,
            borderColor: colors.borderSubtle,
            backgroundColor: colors.surface2,
            color: colors.text,
            minHeight: 48,
          },
          multiline
            ? {
                minHeight: Math.max((numberOfLines ?? 4) * 20 + 24, 88),
                textAlignVertical: "top",
              }
            : null,
          style,
        ]}
        {...inputProps}
        accessibilityLabel={accessibilityLabel ?? label}
      />
    </View>
  );
}
