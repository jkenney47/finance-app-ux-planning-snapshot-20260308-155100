import { useState } from "react";
import { Pressable } from "react-native";

import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type MilestoneMeasurementDisclosureProps = {
  reason: string;
  testID: string;
};

export function MilestoneMeasurementDisclosure({
  reason,
  testID,
}: MilestoneMeasurementDisclosureProps): JSX.Element {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Pressable
        role="button"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        testID={testID}
      >
        <Text
          variant="bodySmall"
          style={{ color: colors.info, fontWeight: "600" }}
        >
          {expanded ? "Hide how we measure this" : "How we measure this"}
        </Text>
      </Pressable>
      {expanded ? (
        <Text variant="bodySmall" style={{ color: colors.textFaint }}>
          {reason}
        </Text>
      ) : null}
    </>
  );
}
