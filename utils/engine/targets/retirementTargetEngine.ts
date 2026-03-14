import { engineConfig } from "@/utils/engine/config/engineConfig";
import type { FinancialFacts, RetirementTargets } from "@/utils/engine/types";

export function deriveRetirementTargets(
  facts: FinancialFacts,
): RetirementTargets {
  const estimatedRate = facts.estimatedRetirementContributionRate ?? 0;
  return {
    targetContributionRate: engineConfig.retirement.targetContributionRate,
    isBelowTargetRate:
      facts.fullEmployerMatchCaptured === false ||
      estimatedRate < engineConfig.retirement.targetContributionRate,
  };
}
