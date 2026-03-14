import { useEffect, useMemo } from "react";
import { Animated, StyleSheet } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";
import { tokens } from "@/theme/tokens";

type SkeletonProps = {
  width?: number | `${number}%` | "auto";
  height?: number;
  radius?: number;
  delayMs?: number;
  animated?: boolean;
};

function useSkeletonAnimation(
  delayMs: number,
  animated: boolean,
): Animated.Value {
  const animatedValue = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (!animated) {
      animatedValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ]),
    );

    const timeout = setTimeout(() => {
      animation.start();
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      animation.stop();
    };
  }, [animated, animatedValue, delayMs]);

  return animatedValue;
}

export function Skeleton({
  width = "100%",
  height = 16,
  radius = tokens.radius.sm,
  delayMs = 0,
  animated = true,
}: SkeletonProps): JSX.Element {
  const { colors, isDark } = useAppTheme();
  const animatedValue = useSkeletonAnimation(delayMs, animated);

  const animatedStyle = useMemo(() => {
    const gradient = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [
        isDark ? `${colors.surface3}66` : colors.surface2,
        isDark ? `${colors.surface3}B3` : colors.surface3,
      ],
    });

    return { backgroundColor: gradient };
  }, [animatedValue, colors.surface2, colors.surface3, isDark]);

  return (
    <Animated.View
      style={[
        styles.base,
        animatedStyle,
        { width, height, borderRadius: radius },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
});
