export type FallbackNowAction = {
  id: string;
  title: string;
  summary: string;
  impact: "Low" | "Medium" | "High";
  effort: "Low" | "Medium" | "High";
  confidence: "Low" | "Medium" | "High";
  action: "accounts" | "onboarding" | "roadmap";
};

type BuildFallbackNowActionsParams = {
  modeledCount: number;
  accountsLinkedCount: number;
  coverageLabel: "Low" | "Medium" | "High";
};

export function buildFallbackNowActions({
  modeledCount,
  accountsLinkedCount,
  coverageLabel,
}: BuildFallbackNowActionsParams): FallbackNowAction[] {
  const missingCount = Math.max(0, 3 - modeledCount);
  if (missingCount === 0) {
    return [];
  }

  const baseOptions: FallbackNowAction[] = [
    {
      id: "fallback-connect-primary-account",
      title: "Connect your primary checking account",
      summary:
        "Adding one connected account upgrades this roadmap from assumptions to observed cash-flow signals.",
      impact: "High",
      effort: "Low",
      confidence: "Medium",
      action: "accounts",
    },
    {
      id: "fallback-complete-missing-inputs",
      title: "Complete the highest-priority missing input",
      summary:
        "Finishing one missing fact sharpens tradeoffs and improves confidence for the next decision cycle.",
      impact: "Medium",
      effort: "Low",
      confidence: coverageLabel,
      action: "onboarding",
    },
    {
      id: "fallback-review-roadmap-sequence",
      title: "Review your roadmap sequence",
      summary:
        "Confirm now, next, and later ordering so this week’s action stays aligned with your current stage.",
      impact: "Medium",
      effort: "Low",
      confidence: coverageLabel,
      action: "roadmap",
    },
  ];

  if (accountsLinkedCount > 0) {
    baseOptions[0] = {
      ...baseOptions[0],
      id: "fallback-refresh-account-health",
      title: "Review account connection health",
      summary:
        "Verify your linked institutions are current so recommendations stay accurate between pay cycles.",
      impact: "Medium",
      confidence: coverageLabel,
    };
  }

  return baseOptions.slice(0, missingCount);
}
