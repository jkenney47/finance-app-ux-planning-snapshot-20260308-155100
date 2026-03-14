import { assessCoverage } from "@/utils/engine/coverage/coverageEngine";
import type {
  IntakeAnswers,
  LinkedAccountSnapshot,
} from "@/utils/engine/types";

const BASE_INTAKE: IntakeAnswers = {
  primaryHelpGoal: "clarity",
  urgentArea: "clarity",
  progressHorizon: "within_1_year",
  hasMajorGoal: false,
  monthlySituation: "current_but_tight",
  essentialsCoverage: "tight",
  mainStruggles: ["prioritization"],
  pastAttempts: ["budgeting_apps"],
  attemptWhyNotEnough: ["still_no_next_step"],
  householdStatus: "single",
  dependentsStatus: "none",
  housingStatus: "rent",
  incomeType: "salaried",
  employerMatch: "unknown",
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

describe("coverageEngine", () => {
  it("returns demo coverage when no core transactional accounts are linked", () => {
    const result = assessCoverage(makeSnapshot({}), BASE_INTAKE);

    expect(result.overall).toBe("demo");
    expect(result.domains.cashflow).toBe("none");
  });

  it("treats savings-only coverage as liquidity-only and cashflow missing", () => {
    const result = assessCoverage(
      makeSnapshot({
        accounts: [
          {
            accountId: "sav-1",
            institutionId: "bank",
            type: "savings",
            balanceCurrent: 2400,
          },
        ],
      }),
      BASE_INTAKE,
    );

    expect(result.overall).toBe("demo");
    expect(result.domains.cashflow).toBe("none");
    expect(result.domains.liquidity).toBe("thin");
  });

  it("marks strong cashflow coverage with 60+ days of transactional history", () => {
    const result = assessCoverage(
      makeSnapshot({
        accounts: [
          {
            accountId: "chk-1",
            institutionId: "bank",
            type: "checking",
            balanceCurrent: 4100,
          },
        ],
        transactions: [
          {
            transactionId: "t1",
            accountId: "chk-1",
            date: "2025-12-01T00:00:00.000Z",
            amount: 3200,
            direction: "inflow",
          },
          {
            transactionId: "t2",
            accountId: "chk-1",
            date: "2025-12-12T00:00:00.000Z",
            amount: 1400,
            direction: "outflow",
            categoryPrimary: "housing",
          },
          {
            transactionId: "t3",
            accountId: "chk-1",
            date: "2026-02-05T00:00:00.000Z",
            amount: 3300,
            direction: "inflow",
          },
          {
            transactionId: "t4",
            accountId: "chk-1",
            date: "2026-02-08T00:00:00.000Z",
            amount: 620,
            direction: "outflow",
            categoryPrimary: "food",
          },
        ],
      }),
      BASE_INTAKE,
    );

    expect(result.overall).toBe("strong");
    expect(result.domains.cashflow).toBe("strong");
    expect(result.domains.liquidity).toBe("strong");
  });

  it("keeps debt coverage conservative when APR fields are missing", () => {
    const result = assessCoverage(
      makeSnapshot({
        accounts: [
          {
            accountId: "chk-1",
            institutionId: "bank",
            type: "checking",
            balanceCurrent: 1200,
          },
          {
            accountId: "cc-1",
            institutionId: "card",
            type: "credit_card",
            balanceCurrent: 3200,
          },
        ],
        transactions: [
          {
            transactionId: "t1",
            accountId: "chk-1",
            date: "2025-12-01T00:00:00.000Z",
            amount: 2400,
            direction: "inflow",
          },
          {
            transactionId: "t2",
            accountId: "chk-1",
            date: "2026-02-10T00:00:00.000Z",
            amount: 1900,
            direction: "outflow",
            categoryPrimary: "housing",
          },
        ],
      }),
      BASE_INTAKE,
    );

    expect(result.overall).toBe("strong");
    expect(result.domains.debt).toBe("moderate");
  });
});
