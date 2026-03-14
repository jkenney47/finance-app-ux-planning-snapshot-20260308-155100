// Shared test/mock utilities for cross-platform (web/mobile) development

import type { ManualAccount, PlaidAccount } from "./account";
import type { Account, Transaction } from "./dashboard";

export function makeMockManualAccount(
  overrides: Partial<ManualAccount> = {},
): ManualAccount {
  return {
    name: "Mock Manual Account",
    balance: "1000",
    ...overrides,
  };
}

export function makeMockPlaidAccount(
  overrides: Partial<PlaidAccount> = {},
): PlaidAccount {
  return {
    account_id: "acc_mock",
    name: "Mock Plaid Checking",
    type: "depository",
    subtype: "checking",
    balances: { available: 1000, current: 1000, iso_currency_code: "USD" },
    ...overrides,
  };
}

export function makeMockAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "mock_acc",
    name: "Mock Account",
    type: "checking",
    balance: 1000,
    ...overrides,
  };
}

export function makeMockTransaction(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: "mock_txn",
    date: new Date().toISOString().slice(0, 10),
    amount: -50,
    description: "Mock Transaction",
    accountId: "mock_acc",
    ...overrides,
  };
}

export function makeMockAccounts(count = 2): Account[] {
  return Array.from({ length: count }, (_, i) =>
    makeMockAccount({ id: `mock_acc_${i + 1}` }),
  );
}

export function makeMockTransactions(count = 5): Transaction[] {
  return Array.from({ length: count }, (_, i) =>
    makeMockTransaction({ id: `mock_txn_${i + 1}` }),
  );
}
