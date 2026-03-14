export const engineConfig = {
  version: "2026-03-onboarding-engine-v1",
  coverage: {
    minCashflowDaysModerate: 30,
    minCashflowDaysStrong: 60,
  },
  debt: {
    highInterestAprThreshold: 0.1,
    moderateInterestAprThreshold: 0.06,
  },
  buffers: {
    starterBufferHardFloorUsd: 1000,
    starterBufferPreferredFloorUsd: 2000,
    starterBufferPreferredExpenseFraction: 0.5,
    emergencyMonthsBase: 3,
    emergencyMonthsMedium: 4,
    emergencyMonthsHigh: 6,
  },
  cashflow: {
    stage1NegativeMonthsThreshold: 2,
    stage1MinimumSurplusUsd: 0,
  },
  goals: {
    shortTermGoalMaxMonths: 36,
    mediumTermGoalMaxMonths: 60,
  },
  retirement: {
    targetContributionRate: 0.15,
  },
} as const;

export type EngineConfig = typeof engineConfig;
