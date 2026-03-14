import {
  fetchLinkedAccounts,
  isMockDataEnabled,
  type PlaidAccount,
} from "@/utils/account";
import type { Account, Transaction } from "@/utils/contracts/decision";
import {
  makeFact,
  type FactsSnapshot,
  type FinancialDebt,
} from "@/utils/contracts/facts";
import type { FmeEvaluation, Recommendation } from "@/utils/contracts/fme";
import type { PolicyBundle } from "@/utils/contracts/policy";
import { evaluateFinancialMaturity } from "@/utils/domain/fme/engine";
import { deriveMonthlyCashFlowMetrics } from "@/utils/domain/fme/factsDerivation";
import { resolveHasLinkedAccounts } from "@/utils/linkedAccounts";
import {
  getMockDashboardSummaryForScenario,
  getMockScenario,
} from "@/utils/mocks/mockScenarios";
import { supabase } from "@/utils/supabaseClient";

export type PrimaryRecommendation = Recommendation;
export type { Account, Transaction };

export type InstitutionConnectionStatus =
  | "connected"
  | "relink"
  | "syncing"
  | "error";

export type InstitutionStatus = {
  id: string;
  name: string;
  status: InstitutionConnectionStatus;
  lastSynced?: string;
};

export type DashboardSummary = {
  netWorth: number;
  netWorthDelta: number;
  cashFlowPoints: number[];
  accounts: Account[];
  transactions: Transaction[];
  institutionStatuses: InstitutionStatus[];
};

export type FinancialMaturityEvaluationInput = {
  summary: DashboardSummary | undefined;
  hasLinkedAccounts: boolean;
  factOverrides: FactsSnapshot;
};

export type DashboardSummaryInput = {
  hasMockLinkedAccounts: boolean;
  realDataEnabled: boolean;
};

export type DashboardLinkedAccountsInput = {
  summary: DashboardSummary | undefined;
  hasMockLinkedAccounts: boolean;
  realDataEnabled: boolean;
};

function deriveLiquidSavings(accounts: Account[]): number {
  return accounts
    .filter(
      (account) =>
        account.type.toLowerCase().includes("checking") ||
        account.type.toLowerCase().includes("savings"),
    )
    .reduce((sum, account) => sum + Math.max(0, account.balance), 0);
}

function deriveDebts(accounts: Account[]): FinancialDebt[] {
  return accounts
    .filter((account) => account.balance < 0)
    .map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type.toLowerCase().includes("credit")
        ? "credit_card"
        : account.type.toLowerCase().includes("mortgage")
          ? "mortgage"
          : "other",
      apr: account.type.toLowerCase().includes("credit") ? 0.229 : 0.065,
      balance: Math.abs(account.balance),
    }));
}

function getEvaluationFromFacts({
  mergedFacts,
  policyBundle,
}: {
  mergedFacts: FactsSnapshot;
  policyBundle: PolicyBundle | undefined;
}): FmeEvaluation {
  return evaluateFinancialMaturity({
    facts: mergedFacts,
    policyBundle,
  });
}

export function getMergedFinancialFacts({
  summary,
  hasLinkedAccounts,
  factOverrides,
}: FinancialMaturityEvaluationInput): FactsSnapshot {
  const accounts = summary?.accounts ?? [];
  const transactions = summary?.transactions ?? [];
  const cashFlowMetrics = deriveMonthlyCashFlowMetrics(transactions);

  const baseFacts: FactsSnapshot = {
    hasLinkedAccounts: makeFact(
      "hasLinkedAccounts",
      hasLinkedAccounts && accounts.length > 0,
      "derived",
      1,
    ),
    liquidSavings: makeFact(
      "liquidSavings",
      deriveLiquidSavings(accounts),
      "derived",
      0.9,
    ),
    debts: makeFact("debts", deriveDebts(accounts), "derived", 0.75),
    ...(cashFlowMetrics
      ? {
          incomeMonthlyNet: makeFact(
            "incomeMonthlyNet",
            cashFlowMetrics.incomeMonthlyNet,
            "derived",
            0.7,
          ),
          burnRateMonthly: makeFact(
            "burnRateMonthly",
            cashFlowMetrics.burnRateMonthly,
            "derived",
            0.7,
          ),
          cashFlowTight: makeFact(
            "cashFlowTight",
            cashFlowMetrics.cashFlowTight,
            "derived",
            0.65,
          ),
        }
      : {}),
  };

  return {
    ...baseFacts,
    ...factOverrides,
  };
}

export function getFinancialMaturityEvaluation({
  summary,
  hasLinkedAccounts,
  factOverrides,
  policyBundle,
}: FinancialMaturityEvaluationInput & {
  policyBundle: PolicyBundle | undefined;
}): FmeEvaluation {
  const mergedFacts = getMergedFinancialFacts({
    summary,
    hasLinkedAccounts,
    factOverrides,
  });

  return getEvaluationFromFacts({
    mergedFacts,
    policyBundle,
  });
}

export function getMockDashboardSummary(
  hasLinkedAccounts: boolean,
): DashboardSummary {
  return getMockDashboardSummaryForScenario({
    hasLinkedAccounts,
    scenario: getMockScenario(),
  });
}

export function getResolvedDashboardLinkedAccounts({
  summary,
  hasMockLinkedAccounts,
  realDataEnabled,
}: DashboardLinkedAccountsInput): boolean {
  return resolveHasLinkedAccounts({
    linkedAccountCount: summary?.accounts.length ?? 0,
    hasMockLinkedAccounts,
    realDataEnabled,
  });
}

function parseBalance(account: PlaidAccount): number {
  const current = account.balances?.current;
  const available = account.balances?.available;
  if (typeof current === "number") return current;
  if (typeof available === "number") return available;
  return 0;
}

function mapPlaidAccountsToDashboardAccounts(
  plaidAccounts: PlaidAccount[],
): Account[] {
  return plaidAccounts.map((account) => ({
    id: account.account_id,
    name: account.name || account.official_name || "Linked account",
    type: [account.type, account.subtype].filter(Boolean).join(" · "),
    balance: parseBalance(account),
    institution: account.institution_name ?? "Linked institution",
    mask: account.mask ? `..${account.mask}` : undefined,
  }));
}

function deriveInstitutionStatuses(accounts: Account[]): InstitutionStatus[] {
  const institutions = new Set(
    accounts
      .map((account) => account.institution)
      .filter((institution): institution is string => Boolean(institution)),
  );
  return Array.from(institutions).map((institution, index) => ({
    id: `real-${institution.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    name: institution,
    status: "connected" as const,
    lastSynced: "Live account sync",
  }));
}

async function getRealDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) {
    return getMockDashboardSummary(false);
  }

  const linkedAccounts = await fetchLinkedAccounts(userId);
  const accounts = mapPlaidAccountsToDashboardAccounts(linkedAccounts);

  if (accounts.length === 0) {
    return {
      netWorth: 0,
      netWorthDelta: 0,
      cashFlowPoints: [],
      accounts: [],
      transactions: [],
      institutionStatuses: [],
    };
  }

  const netWorth = accounts.reduce((sum, account) => sum + account.balance, 0);
  return {
    netWorth,
    netWorthDelta: 0,
    cashFlowPoints: [],
    accounts,
    transactions: [],
    institutionStatuses: deriveInstitutionStatuses(accounts),
  };
}

export async function getDashboardSummary({
  hasMockLinkedAccounts,
  realDataEnabled,
}: DashboardSummaryInput): Promise<DashboardSummary> {
  if (!realDataEnabled) {
    return getMockDashboardSummary(hasMockLinkedAccounts);
  }

  try {
    return await getRealDashboardSummary();
  } catch (error) {
    if (isMockDataEnabled()) {
      return getMockDashboardSummary(hasMockLinkedAccounts);
    }
    throw error;
  }
}
