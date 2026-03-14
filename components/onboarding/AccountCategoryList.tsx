import { View } from "react-native";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

export type AccountCategoryItem = {
  label: string;
  purpose: string;
  status: "Core" | "Recommended" | "If applicable";
  linked?: boolean;
};

type AccountCategoryListProps = {
  items: AccountCategoryItem[];
};

export function AccountCategoryList({
  items,
}: AccountCategoryListProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <View style={{ gap: tokens.space.sm }}>
      {items.map((item) => (
        <SurfaceCard key={item.label}>
          <Text
            variant="titleSmall"
            style={{ color: colors.text, fontWeight: "700" }}
          >
            {item.label}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {item.purpose}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: item.linked ? colors.positive : colors.textFaint }}
          >
            {item.linked ? "Linked" : item.status}
          </Text>
        </SurfaceCard>
      ))}
    </View>
  );
}
