import { memo, useMemo } from "react";
import { Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useAppTheme } from "@/hooks/useAppTheme";

type TrendLineChartProps = {
  points: number[];
  height?: number;
  accessibilityLabel?: string;
};

const { width: screenWidth } = Dimensions.get("window");

function buildPath(values: number[], width: number, height: number): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    const y = height / 2;
    return `M0,${y} L${width},${y}`;
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);

  // Bolt: Optimize path generation by reducing array allocations during map/join
  // Expected impact: Faster SVG rendering and less garbage collection
  let path = "";
  for (let index = 0; index < values.length; index++) {
    const value = values[index];
    const x = index * step;
    const y = height - ((value - min) / range) * height;
    path += `${index === 0 ? "M" : " L"}${x},${y}`;
  }
  return path;
}

export const TrendLineChart = memo(function TrendLineChart({
  points,
  height = 96,
  accessibilityLabel,
}: TrendLineChartProps): JSX.Element {
  const { colors } = useAppTheme();
  const width = Math.max(200, screenWidth - 84);

  // Bolt: Memoize expensive array iteration and path building
  const path = useMemo(
    () => buildPath(points, width, height - 12),
    [points, width, height],
  );

  return (
    <Svg
      height={height}
      width="100%"
      accessibilityLabel={accessibilityLabel ?? "Trend chart"}
    >
      <Path
        d={`M0,${height - 8} L${width},${height - 8}`}
        stroke={colors.borderSubtle}
        strokeWidth={1}
        fill="none"
      />
      {path ? (
        <>
          <Path
            d={path}
            stroke={colors.borderStrong}
            strokeWidth={6}
            fill="none"
          />
          <Path d={path} stroke={colors.accent} strokeWidth={2} fill="none" />
        </>
      ) : null}
    </Svg>
  );
});
