import { memo, useMemo } from "react";
import { Dimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { formatCurrency } from "@/utils/format";

type CashFlowSparklineProps = {
  points: number[];
  currency?: string;
  isLoading?: boolean;
};

const { width: screenWidth } = Dimensions.get("window");

const buildPath = (values: number[], width: number, height: number): string => {
  if (values.length === 0) return "";
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);

  // Bolt: Optimize path generation by reducing array allocations during map/join
  // Expected impact: Faster SVG rendering and less garbage collection during scrolling
  let path = "";
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    const x = index * step;
    const y = height - ((value - min) / range) * height;
    path += `${index === 0 ? "M" : " L"}${x},${y}`;
  }
  return path;
};

export const CashFlowSparkline = memo(
  ({ points, currency = "USD", isLoading }: CashFlowSparklineProps) => {
    const { colors } = useAppTheme();

    // Bolt: Memoize expensive array iteration and path building
    const { total, formattedTotal } = useMemo(() => {
      const sum = points.reduce((acc, val) => acc + val, 0);
      return {
        total: sum,
        formattedTotal: formatCurrency(sum, { currency }),
      };
    }, [points, currency]);

    const path = useMemo(
      () => buildPath(points, screenWidth - 64, 80),
      [points],
    );

    const strokeColor = total >= 0 ? colors.positive : colors.negative;
    const subduedColor = colors.borderStrong;

    return (
      <SurfaceCard>
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          30-DAY CASH FLOW
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          Income minus spending
        </Text>
        <View style={{ marginTop: 4 }}>
          {isLoading ? (
            <Text accessibilityLabel="Loading cash flow">…</Text>
          ) : (
            <Text
              accessibilityLabel={`Cash flow ${formattedTotal}`}
              style={{
                color: strokeColor,
                fontVariant: ["tabular-nums"],
                fontWeight: "600",
              }}
            >
              {formatCurrency(total, { currency })}
            </Text>
          )}
        </View>
        <Svg
          height={84}
          width="100%"
          style={{ marginTop: 10 }}
          accessibilityLabel="Cash flow sparkline chart"
        >
          <Path d={path} stroke={subduedColor} strokeWidth={6} fill="none" />
          <Path d={path} stroke={strokeColor} strokeWidth={2} fill="none" />
        </Svg>
      </SurfaceCard>
    );
  },
);

CashFlowSparkline.displayName = "CashFlowSparkline";
