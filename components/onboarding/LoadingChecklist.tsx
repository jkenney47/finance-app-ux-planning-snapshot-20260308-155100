import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type LoadingChecklistProps = {
  items: string[];
  activeIndex: number;
};

export function LoadingChecklist({
  items,
  activeIndex,
}: LoadingChecklistProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View style={{ gap: tokens.space.sm }}>
      {items.map((item, index) => {
        const isActive = index <= activeIndex;
        return (
          <Text
            key={item}
            variant="bodyMedium"
            style={{
              color: isActive ? colors.text : colors.textFaint,
              fontWeight: isActive ? "700" : "500",
            }}
          >
            {isActive ? "•" : "○"} {item}
          </Text>
        );
      })}
    </View>
  );
}
