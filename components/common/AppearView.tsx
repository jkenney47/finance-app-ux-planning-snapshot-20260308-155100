import { ReactNode, useEffect, useMemo } from "react";
import { Animated, type StyleProp, type ViewStyle } from "react-native";

type AppearViewProps = {
  children: ReactNode;
  delayMs?: number;
  durationMs?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
};

export function AppearView({
  children,
  delayMs = 0,
  durationMs = 220,
  distance = 8,
  style,
}: AppearViewProps): JSX.Element {
  const progress = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    progress.setValue(0);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      delay: delayMs,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delayMs, durationMs, progress]);

  const animatedStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [distance, 0],
          }),
        },
      ],
    }),
    [distance, progress],
  );

  return (
    <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
  );
}
