import { View } from "react-native";

import { useAppTheme } from "@/hooks/useAppTheme";

type ContourBackdropProps = {
  opacity?: number;
};

export function ContourBackdrop({
  opacity = 0.36,
}: ContourBackdropProps): JSX.Element {
  const { colors } = useAppTheme();

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        inset: 0,
      }}
    >
      {[
        { size: 360, top: -220, left: -170 },
        { size: 320, top: -170, left: -120 },
        { size: 260, top: -130, left: -70 },
        { size: 220, top: -90, left: -20 },
        { size: 180, top: -50, left: 40 },
      ].map((ring, index) => (
        <View
          key={`contour-ring-${ring.size}`}
          style={{
            position: "absolute",
            width: ring.size,
            height: ring.size,
            top: ring.top,
            left: ring.left,
            borderRadius: ring.size / 2,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            opacity: opacity - index * 0.05,
          }}
        />
      ))}
    </View>
  );
}
