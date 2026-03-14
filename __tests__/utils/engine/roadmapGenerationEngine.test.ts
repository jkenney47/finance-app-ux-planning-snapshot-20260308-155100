import { buildRoadmapPayload } from "@/utils/engine/roadmap/roadmapGenerationEngine";
import { derivePlanningSignals } from "@/utils/engine/intake/intakeSignalEngine";
import { normalizeIntakeAnswers } from "@/utils/engine/intake/intakeNormalizer";
import { deriveFinancialFacts } from "@/utils/engine/facts/financialFactEngine";
import { deriveLiquidityTargets } from "@/utils/engine/targets/liquidityTargetEngine";
import type { OnboardingState } from "@/utils/contracts/onboarding";
import type { LinkedAccountSnapshot } from "@/utils/engine/types";

const BASE_RAW_INTAKE: OnboardingState["intake"] = {
  primaryHelpGoal: "clarity",
  urgentArea: "clarity",
  progressHorizon: "within_1_year",
  hasMajorGoal: false,
  monthlySituation: "current_with_breathing_room",
  essentialsCoverage: "comfortable",
  mainStruggles: ["prioritization"],
  pastAttempts: ["budgeting_apps"],
  attemptWhyNotEnough: ["still_no_next_step"],
  householdStatus: "single",
  dependentsStatus: "none",
  housingStatus: "rent",
  incomeType: "salaried",
  employerMatch: "no",
  upcomingEvents: ["none"],
  guidanceDirectness: "recommend_with_tradeoffs",
  pathPreference: "balanced",
  biggestFear: "missing_something",
};

function makeSnapshot(
  snapshot: Partial<LinkedAccountSnapshot>,
): LinkedAccountSnapshot {
  return {
    accounts: snapshot.accounts ?? [],
    transactions: snapshot.transactions ?? [],
  };
}

describe("roadmapGenerationEngine", () => {
  it("keeps stage 1 ahead of later opportunities when instability is present", () => {
    const payload = buildRoadmapPayload({
      rawIntake: {
        ...BASE_RAW_INTAKE,
        monthlySituation: "behind_or_juggling",
        essentialsCoverage: "not_consistent",
        urgentArea: "monthly_expenses",
      },
      snapshot: makeSnapshot({
        accounts: [
          {
            accountId: "chk-1",
            institutionId: "bank",
            type: "checking",
            balanceCurrent: 200,
          },
        ],
        transactions: [
          {
            transactionId: "t1",
            accountId: "chk-1",
            date: "2026-01-01T00:00:00.000Z",
            amount: 2000,
            direction: "inflow",
          },
          {
            transactionId: "t2",
            accountId: "chk-1",
            date: "2026-01-03T00:00:00.000Z",
            amount: 2400,
            direction: "outflow",
            categoryPrimary: "housing",
          },
          {
            transactionId: "t3",
            accountId: "chk-1",
            date: "2026-02-01T00:00:00.000Z",
            amount: 2100,
            direction: "inflow",
          },
          {
            transactionId: "t4",
            accountId: "chk-1",
            date: "2026-02-05T00:00:00.000Z",
            amount: 2600,
            direction: "outflow",
            categoryPrimary: "housing",
          },
        ],
      }),
    });

    expect(payload.currentStage.id).toBe("get_stable");
    expect(payload.currentFocus.code).toBe("stabilize_cash_flow");
  });

  it("holds at a conservative verified stage when debt coverage is incomplete", () => {
    const payload = buildRoadmapPayload({
      rawIntake: BASE_RAW_INTAKE,
      snapshot: makeSnapshot({
        accounts: [
          {
            accountId: "chk-1",
            institutionId: "bank",
            type: "checking",
            balanceCurrent: 4500,
          },
        ],
        transactions: [
          {
            transactionId: "t1",
            accountId: "chk-1",
            date: "2025-12-01T00:00:00.000Z",
            amount: 4000,
            direction: "inflow",
          },
          {
            transactionId: "t2",
            accountId: "chk-1",
            date: "2025-12-03T00:00:00.000Z",
            amount: 1400,
            direction: "outflow",
            categoryPrimary: "housing",
          },
          {
            transactionId: "t3",
            accountId: "chk-1",
            date: "2026-02-05T00:00:00.000Z",
            amount: 4100,
            direction: "inflow",
          },
          {
            transactionId: "t4",
            accountId: "chk-1",
            date: "2026-02-09T00:00:00.000Z",
            amount: 1700,
            direction: "outflow",
            categoryPrimary: "housing",
          },
        ],
      }),
    });

    expect(payload.currentStage.id).toBe("build_your_buffer");
    expect(payload.blockedStages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stageId: "clear_expensive_debt",
        }),
      ]),
    );
  });

  it("moves into expensive debt payoff when high-interest balances are confirmed", () => {
    const payload = buildRoadmapPayload({
      rawIntake: {
        ...BASE_RAW_INTAKE,
        primaryHelpGoal: "debt_payoff",
        urgentArea: "debt",
      },
      snapshot: makeSnapshot({
        accounts: [
          {
            accountId: "chk-1",
            institutionId: "bank",
            type: "checking",
            balanceCurrent: 5200,
          },
          {
            accountId: "cc-1",
            institutionId: "card",
            type: "credit_card",
            balanceCurrent: 6800,
            apr: 0.24,
            minimumPayment: 190,
          },
        ],
        transactions: [
          {
            transactionId: "t1",
            accountId: "chk-1",
            date: "2025-12-01T00:00:00.000Z",
            amount: 4200,
            direction: "inflow",
          },
          {
            transactionId: "t2",
            accountId: "chk-1",
            date: "2025-12-05T00:00:00.000Z",
            amount: 1800,
            direction: "outflow",
            categoryPrimary: "housing",
          },
          {
            transactionId: "t3",
            accountId: "chk-1",
            date: "2026-01-05T00:00:00.000Z",
            amount: 4200,
            direction: "inflow",
          },
          {
            transactionId: "t4",
            accountId: "chk-1",
            date: "2026-01-10T00:00:00.000Z",
            amount: 1700,
            direction: "outflow",
            categoryPrimary: "housing",
          },
          {
            transactionId: "t5",
            accountId: "chk-1",
            date: "2026-02-02T00:00:00.000Z",
            amount: 4200,
            direction: "inflow",
          },
          {
            transactionId: "t6",
            accountId: "chk-1",
            date: "2026-02-10T00:00:00.000Z",
            amount: 1800,
            direction: "outflow",
            categoryPrimary: "housing",
          },
        ],
      }),
    });

    expect(payload.currentStage.id).toBe("clear_expensive_debt");
    expect(payload.currentFocus.code).toBe("debt_avalanche");
  });

  it("uses a near-term goal to drive stage 6 focus", () => {
    const payload = buildRoadmapPayload({
      rawIntake: {
        ...BASE_RAW_INTAKE,
        hasMajorGoal: true,
        majorGoalType: "home_purchase",
        majorGoalTiming: "one_to_three_years",
      },
      snapshot: makeSnapshot({
        accounts: [
          {
            accountId: "chk-1",
            institutionId: "bank",
            type: "checking",
            balanceCurrent: 12000,
          },
          {
            accountId: "sav-1",
            institutionId: "bank",
            type: "savings",
            balanceCurrent: 8000,
          },
          {
            accountId: "cc-1",
            institutionId: "card",
            type: "credit_card",
            balanceCurrent: 0,
            apr: 0.049,
            minimumPayment: 0,
          },
          {
            accountId: "ret-1",
            institutionId: "ret",
            type: "retirement",
            balanceCurrent: 24000,
          },
        ],
        transactions: [
          {
            transactionId: "t1",
            accountId: "chk-1",
            date: "2025-12-01T00:00:00.000Z",
            amount: 5000,
            direction: "inflow",
          },
          {
            transactionId: "t2",
            accountId: "chk-1",
            date: "2025-12-05T00:00:00.000Z",
            amount: 1800,
            direction: "outflow",
            categoryPrimary: "housing",
          },
          {
            transactionId: "t3",
            accountId: "chk-1",
            date: "2026-01-08T00:00:00.000Z",
            amount: 5100,
            direction: "inflow",
          },
          {
            transactionId: "t4",
            accountId: "chk-1",
            date: "2026-01-12T00:00:00.000Z",
            amount: 1850,
            direction: "outflow",
            categoryPrimary: "housing",
          },
          {
            transactionId: "t5",
            accountId: "chk-1",
            date: "2026-02-08T00:00:00.000Z",
            amount: 5200,
            direction: "inflow",
          },
          {
            transactionId: "t6",
            accountId: "chk-1",
            date: "2026-02-11T00:00:00.000Z",
            amount: 2100,
            direction: "outflow",
            categoryPrimary: "housing",
          },
        ],
      }),
    });

    expect(payload.currentStage.id).toBe("fund_whats_next");
    expect(payload.currentFocus.code).toBe("near_term_goal_fund");
    expect(payload.explanation.goalImpacts[0]).toContain("home purchase");
  });

  it("raises full emergency-fund targets when income is variable", () => {
    const intake = normalizeIntakeAnswers({
      ...BASE_RAW_INTAKE,
      incomeType: "variable",
      incomePredictability: "not_very_predictable",
    });
    const signals = derivePlanningSignals(intake);
    const facts = deriveFinancialFacts({
      intake,
      signals,
      snapshot: makeSnapshot({
        accounts: [
          {
            accountId: "chk-1",
            institutionId: "bank",
            type: "checking",
            balanceCurrent: 6000,
          },
        ],
        transactions: [
          {
            transactionId: "t1",
            accountId: "chk-1",
            date: "2025-12-01T00:00:00.000Z",
            amount: 3900,
            direction: "inflow",
          },
          {
            transactionId: "t2",
            accountId: "chk-1",
            date: "2026-02-11T00:00:00.000Z",
            amount: 1700,
            direction: "outflow",
            categoryPrimary: "housing",
          },
        ],
      }),
    });
    const liquidityTargets = deriveLiquidityTargets({ facts, signals });

    expect(liquidityTargets.targetEmergencyMonths).toBe(6);
    expect(liquidityTargets.stage2ExitBufferUsd).toBeGreaterThan(1000);
  });
});
