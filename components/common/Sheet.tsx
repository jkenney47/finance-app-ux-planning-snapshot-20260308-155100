import { ReactNode, useId, useMemo } from "react";
import {
  Platform,
  Pressable,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { Portal } from "@rn-primitives/portal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/theme/tokens";

const SNAP_POINTS = [0.4, 0.7, 0.95] as const;

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return `rgba(0,0,0,${alpha})`;
  }

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type SheetProps = {
  isOpen: boolean;
  onDismiss: () => void;
  children: ReactNode;
  snapPoint?: (typeof SNAP_POINTS)[number];
  testID?: string;
};

export function Sheet({
  isOpen,
  onDismiss,
  children,
  snapPoint = SNAP_POINTS[1],
  testID,
}: SheetProps): JSX.Element | null {
  const { height } = useWindowDimensions();
  const scheme = useColorScheme() ?? "light";
  const insets = useSafeAreaInsets();
  const portalId = useId();
  const portalName = useMemo(
    () => `sheet-${portalId.replace(/[:]/g, "")}`,
    [portalId],
  );

  const sheetHeight = useMemo(() => height * snapPoint, [height, snapPoint]);

  if (!isOpen) return null;

  const surfaceColor =
    scheme === "dark" ? tokens.color.surfaceDark : tokens.color.surfaceLight;
  const textColor =
    scheme === "dark" ? tokens.color.textDark : tokens.color.textLight;
  const backdropColor = hexToRgba(textColor, scheme === "dark" ? 0.56 : 0.45);

  const content = (
    <View className="absolute inset-0" pointerEvents="box-none">
      <Pressable
        role="button"
        accessibilityRole="button"
        accessibilityLabel="Close sheet"
        accessibilityHint="Dismisses this panel and returns to the previous screen."
        className="absolute inset-0"
        style={{ backgroundColor: backdropColor }}
        onPress={onDismiss}
        testID={testID ? `${testID}-backdrop` : undefined}
      />
      <View
        className="mt-auto overflow-hidden rounded-t-[22px]"
        style={[
          {
            height: sheetHeight,
            paddingBottom: Math.max(insets.bottom, tokens.space.md),
            borderTopLeftRadius: tokens.radius.lg,
            borderTopRightRadius: tokens.radius.lg,
            backgroundColor: surfaceColor,
          },
          Platform.select({
            web: {
              boxShadow: "0px -4px 16px rgba(0, 0, 0, 0.25)",
            },
            ios: {
              shadowColor: textColor,
              shadowOpacity: 0.25,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: -4 },
            },
            android: {
              elevation: 12,
            },
            default: {},
          }),
        ]}
        testID={testID}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="my-3 h-1 w-12 self-center rounded-full"
          style={{ backgroundColor: tokens.color.border }}
        />
        <View className="flex-1 px-5 pt-3">{children}</View>
      </View>
    </View>
  );

  if (process.env.NODE_ENV === "test") {
    return content;
  }

  return <Portal name={portalName}>{content}</Portal>;
}
