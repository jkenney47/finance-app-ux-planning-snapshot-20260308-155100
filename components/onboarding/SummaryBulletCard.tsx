import { SurfaceCard } from "@/components/common/SurfaceCard";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";

type SummaryBulletCardProps = {
  bullets: string[];
};

export function SummaryBulletCard({
  bullets,
}: SummaryBulletCardProps): JSX.Element {
  const { colors, tokens } = useAppTheme();

  return (
    <SurfaceCard contentStyle={{ gap: tokens.space.sm }}>
      {bullets.map((bullet) => (
        <Text key={bullet} variant="bodyMedium" style={{ color: colors.text }}>
          • {bullet}
        </Text>
      ))}
    </SurfaceCard>
  );
}
