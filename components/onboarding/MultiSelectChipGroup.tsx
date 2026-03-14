import { View } from "react-native";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

export type MultiSelectOption = {
  label: string;
  value: string;
};

type MultiSelectChipGroupProps = {
  values: string[];
  options: readonly MultiSelectOption[];
  onChange: (values: string[]) => void;
  maxSelections?: number;
};

export function MultiSelectChipGroup({
  values,
  options,
  onChange,
  maxSelections,
}: MultiSelectChipGroupProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  const toggleValue = (value: string): void => {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }

    if (maxSelections && values.length >= maxSelections) {
      return;
    }

    onChange([...values, value]);
  };

  return (
    <View
      style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space.sm }}
    >
      {options.map((option) => {
        const selected = values.includes(option.value);
        return (
          <SurfaceCard
            key={option.value}
            onPress={() => toggleValue(option.value)}
            style={{
              borderColor: selected ? colors.accent : colors.borderSubtle,
              backgroundColor: selected ? colors.surface2 : colors.surface1,
              minWidth: "46%",
            }}
            contentStyle={{ gap: 0 }}
          >
            <Text
              variant="bodyMedium"
              style={{
                color: selected ? colors.text : colors.textMuted,
                fontWeight: selected ? "700" : "600",
              }}
            >
              {option.label}
            </Text>
          </SurfaceCard>
        );
      })}
    </View>
  );
}
