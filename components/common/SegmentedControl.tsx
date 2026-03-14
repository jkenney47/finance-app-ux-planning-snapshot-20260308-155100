import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type SegmentedOption = {
  label: string;
  value: string;
  testID?: string;
};

type SegmentedControlProps = {
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  testID?: string;
};

export function SegmentedControl({
  value,
  options,
  onChange,
  testID,
}: SegmentedControlProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View
      className="flex-row gap-[6px] rounded-[28px] border p-1"
      style={{
        borderRadius: tokens.radius.xl,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surface2,
      }}
      testID={testID}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            testID={
              option.testID ??
              (testID ? `${testID}-${option.value}` : undefined)
            }
            onPress={() => onChange(option.value)}
            className="min-h-hit flex-1 items-center justify-center rounded-[28px] border px-2 py-2.5"
            style={{
              borderRadius: tokens.radius.xl,
              borderColor: active ? colors.accent : "transparent",
              backgroundColor: active ? colors.accentSoft : "transparent",
            }}
            role="button"
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityHint={
              active
                ? "Currently selected."
                : `Double tap to switch to ${option.label}.`
            }
            accessibilityState={{ selected: active }}
            hitSlop={4}
          >
            <Text
              className="text-[13px] font-bold"
              style={{ color: active ? colors.accent : colors.textMuted }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
