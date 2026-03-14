import { memo, ReactNode, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { tokens } from "@/theme/tokens";
import { formatCurrency } from "@/utils/format";

type DeltaTone =
  | { readonly prefix: "▲"; readonly label: "Increase" }
  | { readonly prefix: "▼"; readonly label: "Decrease" }
  | { readonly prefix: ""; readonly label: "No change" };

const getDeltaTone = (delta: number): DeltaTone => {
  if (delta > 0) {
    return {
      prefix: "▲",
      label: "Increase",
    } as const;
  }
  if (delta < 0) {
    return {
      prefix: "▼",
      label: "Decrease",
    } as const;
  }
  return {
    prefix: "",
    label: "No change",
  } as const;
};

type HeroMetricProps = {
  label: string;
  value: number;
  currency?: string;
  caption?: string;
  delta?: {
    value: number;
    label?: string;
  };
  accessory?: ReactNode;
};

export const HeroMetric = memo(function HeroMetric({
  label,
  value,
  currency = "USD",
  caption,
  delta,
  accessory,
}: HeroMetricProps): JSX.Element {
  const { colors } = useAppTheme();
  const formattedValue = useMemo(
    () => formatCurrency(value, { currency }),
    [value, currency],
  );

  const deltaChip = useMemo(() => {
    if (!delta) return null;

    const { prefix } = getDeltaTone(delta.value);
    const formattedDelta = formatCurrency(Math.abs(delta.value), {
      currency,
    });

    return (
      <Pill
        tone={delta.value >= 0 ? "positive" : "negative"}
        active
        testID="hero-delta-pill"
      >
        {`${prefix ? `${prefix} ` : ""}${formattedDelta}${delta.label ? ` · ${delta.label}` : ""}`}
      </Pill>
    );
  }, [currency, delta]);

  return (
    <SurfaceCard contentStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text
          variant="labelMedium"
          style={[styles.label, { color: colors.textFaint }]}
        >
          {label.toUpperCase()}
        </Text>
        {accessory ? <View>{accessory}</View> : null}
      </View>
      <Text
        variant="displayMedium"
        maxFontSizeMultiplier={1.3}
        style={[styles.value, { color: colors.text }]}
      >
        {formattedValue}
      </Text>
      {deltaChip}
      {caption ? (
        <Text
          variant="bodySmall"
          style={[styles.caption, { color: colors.textMuted }]}
        >
          {caption}
        </Text>
      ) : null}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: tokens.space.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: {
    fontSize: tokens.type.labelCaps.size,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  value: {
    fontSize: tokens.type.numXXL.size,
    fontWeight: tokens.type.numXXL.weight as
      | "100"
      | "200"
      | "300"
      | "400"
      | "500"
      | "600"
      | "700"
      | "800"
      | "900"
      | "normal"
      | "bold"
      | undefined,
    lineHeight: tokens.type.numXXL.lh,
    fontVariant: ["tabular-nums"],
  },
  caption: {
    marginTop: tokens.space.xs,
  },
});
