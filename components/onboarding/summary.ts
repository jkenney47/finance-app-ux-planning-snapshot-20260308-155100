import type { OnboardingState } from "@/utils/contracts/onboarding";

function humanize(value: string | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ");
}

export function buildOnboardingSummaryBullets(
  intake: OnboardingState["intake"],
): string[] {
  const bullets = [
    intake.primaryHelpGoal
      ? `You want the most help with ${humanize(
          intake.primaryHelpGoalOtherText || intake.primaryHelpGoal,
        )}.`
      : undefined,
    intake.urgentArea
      ? `${humanize(intake.urgentArea)} feels more urgent than long-term optimization.`
      : undefined,
    intake.hasMajorGoal && intake.majorGoalType
      ? `${humanize(intake.majorGoalType)} is an important factor in your plan.`
      : undefined,
    intake.guidanceDirectness && intake.pathPreference
      ? `You prefer ${humanize(intake.guidanceDirectness)} with ${humanize(intake.pathPreference)}.`
      : undefined,
  ];

  return bullets.filter((bullet): bullet is string => Boolean(bullet));
}
