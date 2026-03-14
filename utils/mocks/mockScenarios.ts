import type { Account, Transaction } from "@/utils/contracts/decision";
import type { PolicyBundle } from "@/utils/contracts/policy";

export type MockScenario =
  | "default"
  | "empty"
  | "linked_no_transactions"
  | "partial_facts"
  | "policy_stale_thresholds"
  | "policy_stale_rates"
  | "crisis_cash_flow";

type MockInstitutionConnectionStatus =
  | "connected"
  | "relink"
  | "syncing"
  | "error";

type MockInstitutionStatus = {
  id: string;
  name: string;
  status: MockInstitutionConnectionStatus;
  lastSynced?: string;
};

type MockDashboardSummary = {
  netWorth: number;
  netWorthDelta: number;
  cashFlowPoints: number[];
  accounts: Account[];
  transactions: Transaction[];
  institutionStatuses: MockInstitutionStatus[];
};

const DEFAULT_SCENARIO: MockScenario = "default";

const SUPPORTED_SCENARIOS = new Set<MockScenario>([
  "default",
  "empty",
  "linked_no_transactions",
  "partial_facts",
  "policy_stale_thresholds",
  "policy_stale_rates",
  "crisis_cash_flow",
]);

const BASE_ACCOUNTS: Account[] = [
  {
    id: "chk-001",
    name: "Chase Total Checking",
    type: "Checking",
    balance: 4825.42,
    institution: "Chase",
    mask: "..2761",
  },
  {
    id: "sav-001",
    name: "Chase Savings",
    type: "Savings",
    balance: 9800.11,
    institution: "Chase",
    mask: "..9024",
  },
  {
    id: "cc-345",
    name: "Venture X Rewards",
    type: "Credit Card",
    balance: -1240.5,
    institution: "Capital One",
    mask: "..8890",
  },
];

const BASE_STATUSES: MockInstitutionStatus[] = [
  {
    id: "chase",
    name: "Chase",
    status: "connected",
    lastSynced: "Updated 2h ago",
  },
  {
    id: "capone",
    name: "Capital One",
    status: "relink",
    lastSynced: "Needs reconnect",
  },
];

function daysAgoIso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

const BASE_TRANSACTIONS: Transaction[] = [
  {
    id: "txn-1",
    date: daysAgoIso(5),
    amount: 3400,
    description: "Payroll",
    accountId: "chk-001",
  },
  {
    id: "txn-2",
    date: daysAgoIso(8),
    amount: -1450,
    description: "Rent",
    accountId: "chk-001",
  },
  {
    id: "txn-3",
    date: daysAgoIso(11),
    amount: -220,
    description: "Groceries",
    accountId: "chk-001",
  },
  {
    id: "txn-4",
    date: daysAgoIso(18),
    amount: -180,
    description: "Utilities",
    accountId: "chk-001",
  },
  {
    id: "txn-5",
    date: daysAgoIso(22),
    amount: -95,
    description: "Transit",
    accountId: "chk-001",
  },
  {
    id: "txn-6",
    date: daysAgoIso(35),
    amount: 3400,
    description: "Payroll",
    accountId: "chk-001",
  },
  {
    id: "txn-7",
    date: daysAgoIso(37),
    amount: -1280,
    description: "Credit card payment",
    accountId: "chk-001",
  },
  {
    id: "txn-8",
    date: daysAgoIso(42),
    amount: -210,
    description: "Groceries",
    accountId: "chk-001",
  },
  {
    id: "txn-9",
    date: daysAgoIso(53),
    amount: -240,
    description: "Auto insurance",
    accountId: "chk-001",
  },
  {
    id: "txn-10",
    date: daysAgoIso(63),
    amount: 3400,
    description: "Payroll",
    accountId: "chk-001",
  },
  {
    id: "txn-11",
    date: daysAgoIso(66),
    amount: -1450,
    description: "Rent",
    accountId: "chk-001",
  },
  {
    id: "txn-12",
    date: daysAgoIso(71),
    amount: -205,
    description: "Groceries",
    accountId: "chk-001",
  },
];

const CRISIS_TRANSACTIONS: Transaction[] = [
  {
    id: "crisis-jan-pay",
    date: daysAgoIso(40),
    amount: 2400,
    description: "Payroll",
    accountId: "chk-001",
  },
  {
    id: "crisis-jan-rent",
    date: daysAgoIso(35),
    amount: -1800,
    description: "Rent",
    accountId: "chk-001",
  },
  {
    id: "crisis-jan-core",
    date: daysAgoIso(33),
    amount: -950,
    description: "Core expenses",
    accountId: "chk-001",
  },
  {
    id: "crisis-feb-pay",
    date: daysAgoIso(12),
    amount: 2400,
    description: "Payroll",
    accountId: "chk-001",
  },
  {
    id: "crisis-feb-rent",
    date: daysAgoIso(9),
    amount: -1850,
    description: "Rent",
    accountId: "chk-001",
  },
  {
    id: "crisis-feb-core",
    date: daysAgoIso(6),
    amount: -1000,
    description: "Core expenses",
    accountId: "chk-001",
  },
];

function netWorthOf(accounts: Account[]): number {
  return accounts.reduce((sum, account) => sum + account.balance, 0);
}

function emptySummary(): MockDashboardSummary {
  return {
    netWorth: 0,
    netWorthDelta: 0,
    cashFlowPoints: [],
    accounts: [],
    transactions: [],
    institutionStatuses: [],
  };
}

export function getMockScenario(
  rawValue = process.env.EXPO_PUBLIC_MOCK_SCENARIO,
): MockScenario {
  const normalized = rawValue?.trim().toLowerCase();
  if (!normalized) {
    return DEFAULT_SCENARIO;
  }
  if (SUPPORTED_SCENARIOS.has(normalized as MockScenario)) {
    return normalized as MockScenario;
  }
  return DEFAULT_SCENARIO;
}

export function getMockDashboardSummaryForScenario(input: {
  hasLinkedAccounts: boolean;
  scenario?: MockScenario;
}): MockDashboardSummary {
  const scenario = input.scenario ?? getMockScenario();
  if (scenario === "empty" || !input.hasLinkedAccounts) {
    return emptySummary();
  }

  switch (scenario) {
    case "linked_no_transactions":
      return {
        netWorth: netWorthOf(BASE_ACCOUNTS),
        netWorthDelta: 0,
        cashFlowPoints: [],
        accounts: BASE_ACCOUNTS,
        transactions: [],
        institutionStatuses: BASE_STATUSES,
      };
    case "partial_facts":
      return {
        netWorth: netWorthOf([
          {
            id: "partial-savings-1",
            name: "Emergency Savings",
            type: "Savings",
            balance: 3200,
            institution: "Mock Credit Union",
            mask: "..5511",
          },
        ]),
        netWorthDelta: 40,
        cashFlowPoints: [],
        accounts: [
          {
            id: "partial-savings-1",
            name: "Emergency Savings",
            type: "Savings",
            balance: 3200,
            institution: "Mock Credit Union",
            mask: "..5511",
          },
        ],
        transactions: [],
        institutionStatuses: [
          {
            id: "mock-credit-union",
            name: "Mock Credit Union",
            status: "connected",
            lastSynced: "Updated 5m ago",
          },
        ],
      };
    case "crisis_cash_flow":
      return {
        netWorth: netWorthOf(BASE_ACCOUNTS),
        netWorthDelta: -280,
        cashFlowPoints: [-220, -180, -260, -140, -210, -250, -190],
        accounts: BASE_ACCOUNTS,
        transactions: CRISIS_TRANSACTIONS,
        institutionStatuses: BASE_STATUSES,
      };
    case "policy_stale_thresholds":
    case "policy_stale_rates":
    case "default":
    default:
      return {
        netWorth: netWorthOf(BASE_ACCOUNTS),
        netWorthDelta: 420,
        cashFlowPoints: [320, -150, 220, -50, 400, -120, 310],
        accounts: BASE_ACCOUNTS,
        transactions: BASE_TRANSACTIONS,
        institutionStatuses: BASE_STATUSES,
      };
  }
}

function staleByDays(nowIso: string, daysAgo: number): string {
  const now = new Date(nowIso).getTime();
  return new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

export function applyMockPolicyScenario(
  policyBundle: PolicyBundle,
  input?: {
    scenario?: MockScenario;
    nowIso?: string;
  },
): PolicyBundle {
  const scenario = input?.scenario ?? getMockScenario();
  const nowIso = input?.nowIso ?? new Date().toISOString();
  const nextBundle: PolicyBundle = {
    ...policyBundle,
    domains: {
      ...policyBundle.domains,
    },
  };

  if (scenario === "policy_stale_thresholds" && nextBundle.domains.thresholds) {
    nextBundle.domains.thresholds = {
      ...nextBundle.domains.thresholds,
      publishedAt: staleByDays(nowIso, 200),
    };
  }

  if (scenario === "policy_stale_rates" && nextBundle.domains.rates) {
    nextBundle.domains.rates = {
      ...nextBundle.domains.rates,
      publishedAt: staleByDays(nowIso, 45),
    };
  }

  return nextBundle;
}
