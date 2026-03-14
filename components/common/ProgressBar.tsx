import { StyleProp, View, ViewStyle } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";

type ProgressBarProps = {
  progress: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
};

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

export function ProgressBar({
  progress,
  color,
  style,
  testID,
  accessibilityLabel,
}: ProgressBarProps): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const normalizedProgress = clampProgress(progress);
  const trackColor = colors.surface3;
  const fillColor = color ?? colors.accent;

  return (
    <View
      className="overflow-hidden rounded-[10px]"
      style={[
        {
          height: 10,
          borderRadius: tokens.radius.sm,
          backgroundColor: trackColor,
        },
        style,
      ]}
      testID={testID}
      role="progressbar"
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(normalizedProgress * 100),
      }}
    >
      <View
        className="h-full rounded-[10px]"
        style={{
          width: `${normalizedProgress * 100}%`,
          borderRadius: tokens.radius.sm,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}
