import { View } from "react-native";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

export type SingleSelectOption = {
  label: string;
  value: string;
  description?: string;
};

type SingleSelectCardGroupProps = {
  value?: string;
  options: readonly SingleSelectOption[];
  onChange: (value: string) => void;
};

export function SingleSelectCardGroup({
  value,
  options,
  onChange,
}: SingleSelectCardGroupProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View style={{ gap: tokens.space.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <SurfaceCard
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              borderColor: selected ? colors.accent : colors.borderSubtle,
              backgroundColor: selected ? colors.surface2 : colors.surface1,
            }}
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
          >
            <Text
              variant="titleSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              {option.label}
            </Text>
            {option.description ? (
              <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                {option.description}
              </Text>
            ) : null}
          </SurfaceCard>
        );
      })}
    </View>
  );
}
