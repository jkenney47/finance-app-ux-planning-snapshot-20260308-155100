import { engineConfig } from "@/utils/engine/config/engineConfig";
import type {
  DerivedPlanningSignals,
  FinancialFacts,
  LiquidityTargets,
} from "@/utils/engine/types";

export function deriveLiquidityTargets(args: {
  facts: FinancialFacts;
  signals: DerivedPlanningSignals;
}): LiquidityTargets {
  const { facts, signals } = args;
  const avgMonthlyEssentialExpenses = facts.avgMonthlyEssentialExpenses ?? 0;
  const starterBufferPreferredUsd = Math.max(
    engineConfig.buffers.starterBufferPreferredFloorUsd,
    avgMonthlyEssentialExpenses *
      engineConfig.buffers.starterBufferPreferredExpenseFraction,
  );
  const stage2ExitBufferUsd =
    signals.bufferSignals.recommendedStarterBufferMode === "elevated"
      ? starterBufferPreferredUsd
      : engineConfig.buffers.starterBufferHardFloorUsd;

  return {
    starterBufferHardFloorUsd: engineConfig.buffers.starterBufferHardFloorUsd,
    starterBufferPreferredUsd,
    stage2ExitBufferUsd,
    targetEmergencyMonths: signals.bufferSignals.recommendedFullBufferMonths,
  };
}
