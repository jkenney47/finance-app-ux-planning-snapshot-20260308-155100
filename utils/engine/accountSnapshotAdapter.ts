import type { DashboardSummary } from "@/utils/dashboard";
import type {
  LinkedAccountSnapshot,
  LinkedAccountType,
} from "@/utils/engine/types";

function mapAccountType(type: string): LinkedAccountType {
  const normalized = type.toLowerCase();
  if (normalized.includes("checking")) return "checking";
  if (normalized.includes("savings")) return "savings";
  if (normalized.includes("credit")) return "credit_card";
  if (normalized.includes("mortgage")) return "mortgage";
  if (normalized.includes("loan")) return "loan";
  if (normalized.includes("retirement") || normalized.includes("401")) {
    return "retirement";
  }
  if (normalized.includes("brokerage")) return "brokerage";
  return "other";
}

export function mapDashboardSummaryToSnapshot(
  summary: DashboardSummary | undefined,
): LinkedAccountSnapshot {
  if (!summary) {
    return {
      accounts: [],
      transactions: [],
    };
  }

  return {
    accounts: summary.accounts.map((account) => ({
      accountId: account.id,
      institutionId:
        account.institution?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ??
        "linked-institution",
      type: mapAccountType(account.type),
      subtype: account.type,
      name: account.name,
      balanceCurrent: Math.abs(account.balance),
      balanceAvailable: account.balance > 0 ? account.balance : undefined,
      lastUpdatedAt: new Date().toISOString(),
    })),
    transactions: summary.transactions.map((transaction) => ({
      transactionId: transaction.id,
      accountId: transaction.accountId,
      date: transaction.date,
      amount: Math.abs(transaction.amount),
      direction: transaction.amount >= 0 ? "inflow" : "outflow",
      merchantName: transaction.description,
    })),
  };
}
