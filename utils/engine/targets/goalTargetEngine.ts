import type { DerivedPlanningSignals, GoalTargets } from "@/utils/engine/types";

export function deriveGoalTargets(
  signals: DerivedPlanningSignals,
): GoalTargets {
  return {
    hasNearTermGoal: signals.goalSignals.nearTermGoal,
    goalTimingMonths: signals.goalSignals.goalTimingMonths,
  };
}
