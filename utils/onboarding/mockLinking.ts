import type {
  OnboardingLinkCategory,
  OnboardingMockLinkScenario,
} from "@/utils/contracts/onboarding";
import type { LinkedAccountSnapshot } from "@/utils/engine/types";

type MockLinkingState = {
  linkedInstitutionsCount: number;
  linkedAccountsCount: number;
  coreTransactionalLinked: boolean;
  linkedCategories: OnboardingLinkCategory[];
};

const nowIso = (): string => new Date().toISOString();

export function getMockLinkingState(
  scenario: OnboardingMockLinkScenario,
): MockLinkingState {
  switch (scenario) {
    case "core_transactional":
      return {
        linkedInstitutionsCount: 1,
        linkedAccountsCount: 1,
        coreTransactionalLinked: true,
        linkedCategories: ["checking_savings"],
      };
    case "core_plus_debt":
      return {
        linkedInstitutionsCount: 2,
        linkedAccountsCount: 2,
        coreTransactionalLinked: true,
        linkedCategories: ["checking_savings", "credit_cards"],
      };
    case "full_coverage":
      return {
        linkedInstitutionsCount: 4,
        linkedAccountsCount: 5,
        coreTransactionalLinked: true,
        linkedCategories: [
          "checking_savings",
          "credit_cards",
          "loans",
          "retirement_investments",
        ],
      };
    case "none":
    default:
      return {
        linkedInstitutionsCount: 0,
        linkedAccountsCount: 0,
        coreTransactionalLinked: false,
        linkedCategories: [],
      };
  }
}

export function getNextMockLinkScenario(
  scenario: OnboardingMockLinkScenario,
): OnboardingMockLinkScenario {
  switch (scenario) {
    case "none":
      return "core_transactional";
    case "core_transactional":
      return "core_plus_debt";
    case "core_plus_debt":
      return "full_coverage";
    case "full_coverage":
    default:
      return "full_coverage";
  }
}

export function getMockLinkedAccountSnapshot(
  scenario: OnboardingMockLinkScenario,
): LinkedAccountSnapshot {
  if (scenario === "none") {
    return {
      accounts: [],
      transactions: [],
    };
  }

  const checkingAccount = {
    accountId: "mock-checking-1",
    institutionId: "mock-chase",
    type: "checking" as const,
    name: "Mock Checking",
    balanceCurrent: scenario === "full_coverage" ? 4200 : 450,
    balanceAvailable: scenario === "full_coverage" ? 3900 : 380,
    lastUpdatedAt: nowIso(),
  };

  const checkingTransactions =
    scenario === "full_coverage"
      ? [
          {
            transactionId: "txn-1",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 3600,
            direction: "inflow" as const,
            merchantName: "Payroll",
            categoryPrimary: "income",
            isRecurring: true,
          },
          {
            transactionId: "txn-2",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 64 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 1450,
            direction: "outflow" as const,
            merchantName: "Rent",
            categoryPrimary: "housing",
            isRecurring: true,
          },
          {
            transactionId: "txn-3",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 520,
            direction: "outflow" as const,
            merchantName: "Groceries",
            categoryPrimary: "food",
          },
          {
            transactionId: "txn-4",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 3600,
            direction: "inflow" as const,
            merchantName: "Payroll",
            categoryPrimary: "income",
            isRecurring: true,
          },
          {
            transactionId: "txn-5",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 1450,
            direction: "outflow" as const,
            merchantName: "Rent",
            categoryPrimary: "housing",
            isRecurring: true,
          },
          {
            transactionId: "txn-6",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 3600,
            direction: "inflow" as const,
            merchantName: "Payroll",
            categoryPrimary: "income",
            isRecurring: true,
          },
          {
            transactionId: "txn-7",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 1450,
            direction: "outflow" as const,
            merchantName: "Rent",
            categoryPrimary: "housing",
            isRecurring: true,
          },
          {
            transactionId: "txn-8",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 460,
            direction: "outflow" as const,
            merchantName: "Groceries",
            categoryPrimary: "food",
          },
        ]
      : [
          {
            transactionId: "txn-core-1",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 2400,
            direction: "inflow" as const,
            merchantName: "Payroll",
            categoryPrimary: "income",
            isRecurring: true,
          },
          {
            transactionId: "txn-core-2",
            accountId: "mock-checking-1",
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            amount: 2250,
            direction: "outflow" as const,
            merchantName: "Core spending",
            categoryPrimary: "essentials",
          },
        ];

  const debtAccounts =
    scenario === "core_plus_debt" || scenario === "full_coverage"
      ? [
          {
            accountId: "mock-credit-1",
            institutionId: "mock-capital-one",
            type: "credit_card" as const,
            name: "Mock Credit Card",
            balanceCurrent: 2400,
            apr: scenario === "full_coverage" ? 0.239 : null,
            minimumPayment: scenario === "full_coverage" ? 85 : null,
            creditLimit: 8000,
            lastUpdatedAt: nowIso(),
          },
        ]
      : [];

  const loanAccounts =
    scenario === "full_coverage"
      ? [
          {
            accountId: "mock-auto-1",
            institutionId: "mock-auto-loan",
            type: "loan" as const,
            name: "Mock Auto Loan",
            balanceCurrent: 9200,
            apr: 0.068,
            minimumPayment: 310,
            lastUpdatedAt: nowIso(),
          },
        ]
      : [];

  const retirementAccounts =
    scenario === "full_coverage"
      ? [
          {
            accountId: "mock-401k-1",
            institutionId: "mock-fidelity",
            type: "retirement" as const,
            name: "Mock 401(k)",
            balanceCurrent: 18250,
            lastUpdatedAt: nowIso(),
          },
        ]
      : [];

  const savingsAccounts =
    scenario === "full_coverage"
      ? [
          {
            accountId: "mock-savings-1",
            institutionId: "mock-chase",
            type: "savings" as const,
            name: "Mock Savings",
            balanceCurrent: 5200,
            balanceAvailable: 5200,
            lastUpdatedAt: nowIso(),
          },
        ]
      : [];

  return {
    accounts: [
      checkingAccount,
      ...savingsAccounts,
      ...debtAccounts,
      ...loanAccounts,
      ...retirementAccounts,
    ],
    transactions: checkingTransactions,
  };
}
