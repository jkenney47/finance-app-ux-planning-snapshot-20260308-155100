import { StyleSheet } from "react-native";

import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { getComplianceMode } from "@/utils/complianceMode";

const NOTICE_COPY = {
  education: {
    title: "EDUCATIONAL USE ONLY",
    body: "This experience offers general guidance based on your data. It does not provide individualized investment, tax, or legal advice.",
  },
  advisory: {
    title: "ADVISORY MODE ENABLED",
    body: "Recommendations are generated from your current profile and policy data. Review assumptions and disclosures before acting.",
  },
} as const;

export function AdviceBoundaryNotice(): JSX.Element {
  const { colors } = useAppTheme();
  const mode = getComplianceMode();
  const notice = NOTICE_COPY[mode];

  return (
    <SurfaceCard
      style={{
        backgroundColor: colors.surface2,
        borderColor: colors.borderSubtle,
      }}
      contentStyle={styles.content}
    >
      <Text
        variant="labelMedium"
        style={[styles.title, { color: colors.info }]}
      >
        {notice.title}
      </Text>
      <Text variant="bodySmall" style={{ color: colors.textMuted }}>
        {notice.body}
      </Text>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 6,
  },
  title: {
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: "700",
  },
});
