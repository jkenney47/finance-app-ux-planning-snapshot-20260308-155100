import { memo } from "react";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { formatCurrency } from "@/utils/format";

type NetWorthTileProps = {
  netWorth: number;
  currency?: string;
  isLoading?: boolean;
};

export const NetWorthTile = memo(function NetWorthTile({
  netWorth,
  currency = "USD",
  isLoading,
}: NetWorthTileProps): JSX.Element {
  const { colors } = useAppTheme();
  const formatted = formatCurrency(netWorth, { currency });

  return (
    <SurfaceCard accessibilityRole="summary">
      <Text variant="labelMedium" style={{ color: colors.textFaint }}>
        NET WORTH
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        All linked accounts
      </Text>
      {isLoading ? (
        <Text variant="headlineLarge" accessibilityLabel="Loading net worth">
          …
        </Text>
      ) : (
        <Text
          variant="headlineLarge"
          accessibilityLabel={`Net worth ${formatted}`}
        >
          {formatted}
        </Text>
      )}
    </SurfaceCard>
  );
});
