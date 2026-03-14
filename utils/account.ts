// Shared types for account linking (manual and Plaid)
import { backendClient } from "@/utils/services/backendClient";

function parseFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

const LIVE_PLAID_LINK_DISABLED_ERROR =
  "Live Plaid sandbox linking is disabled. Enable EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK=true.";
const REAL_ACCOUNT_DATA_DISABLED_ERROR =
  "Real account data is disabled. Enable EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA=true.";

type LiveFlagOverrides = {
  sandboxFlag?: string;
  realDataFlag?: string;
};

export function isMockDataEnabled(
  rawValue = process.env.EXPO_PUBLIC_USE_MOCK_DATA,
): boolean {
  return parseFlag(rawValue);
}

export function isPlaidSandboxLinkEnabled(
  rawValue = process.env.EXPO_PUBLIC_ENABLE_PLAID_SANDBOX_LINK,
): boolean {
  return parseFlag(rawValue);
}

export function isRealAccountDataEnabled(
  rawValue = process.env.EXPO_PUBLIC_ENABLE_REAL_ACCOUNT_DATA,
): boolean {
  return parseFlag(rawValue);
}

export function isLivePlaidLinkEnabled(input?: {
  sandboxFlag?: string;
}): boolean {
  return isPlaidSandboxLinkEnabled(input?.sandboxFlag);
}

function ensureLivePlaidLinkEnabled(overrides?: LiveFlagOverrides): void {
  if (!isLivePlaidLinkEnabled(overrides)) {
    throw new Error(LIVE_PLAID_LINK_DISABLED_ERROR);
  }
}

function ensureRealAccountDataEnabled(realDataFlagOverride?: string): void {
  if (!isRealAccountDataEnabled(realDataFlagOverride)) {
    throw new Error(REAL_ACCOUNT_DATA_DISABLED_ERROR);
  }
}

export interface ManualAccount {
  name: string;
  balance: string;
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  type: string;
  subtype: string;
  mask?: string;
  official_name?: string;
  institution_name?: string;
  balances?: {
    available?: number;
    current?: number;
    iso_currency_code?: string;
    [key: string]: unknown;
  };
}

export type LinkedAccount = ManualAccount | PlaidAccount;

export type PlaidAccountsResponse = {
  accounts?: PlaidAccount[];
  request_id?: string;
};

export type PlaidLinkTokenResponse = {
  link_token: string;
  sandbox_public_token?: string;
  mode?: "sandbox" | "development" | "production";
  request_id?: string;
};

// Supabase edge function: plaidLinkToken
export async function getPlaidLinkToken(
  userId: string,
  options?: {
    sandboxAutoLink?: boolean;
  },
  flags?: LiveFlagOverrides,
): Promise<PlaidLinkTokenResponse> {
  ensureLivePlaidLinkEnabled(flags);
  return backendClient.post<PlaidLinkTokenResponse>("/plaidLinkToken", {
    userId,
    sandbox_auto_link: options?.sandboxAutoLink ?? true,
  });
}

export type PlaidExchangeTokenResponse = {
  item_id: string;
  accounts_linked: number;
  mode?: "sandbox" | "development" | "production";
  request_id?: string;
};

// Supabase edge function: plaidExchangeToken
export async function exchangePlaidPublicToken(
  publicToken: string,
  userId?: string,
  flags?: LiveFlagOverrides,
): Promise<PlaidExchangeTokenResponse> {
  ensureLivePlaidLinkEnabled(flags);
  return backendClient.post<PlaidExchangeTokenResponse>("/plaidExchangeToken", {
    public_token: publicToken,
    ...(userId ? { userId } : {}),
  });
}

async function requestLinkedAccounts(
  userId?: string,
): Promise<{ accounts: PlaidAccount[]; requestId: string | null }> {
  const response = await backendClient.postWithMeta<
    PlaidAccountsResponse | PlaidAccount[]
  >("/plaidAccounts", {
    ...(userId ? { userId } : {}),
  });

  if (Array.isArray(response.data)) {
    return {
      accounts: response.data,
      requestId: response.requestId,
    };
  }

  return {
    accounts: Array.isArray(response.data.accounts)
      ? response.data.accounts
      : [],
    requestId:
      typeof response.data.request_id === "string"
        ? response.data.request_id
        : response.requestId,
  };
}

// Supabase edge function: plaidAccounts
export async function fetchLinkedAccounts(
  userId?: string,
  realDataFlagOverride?: string,
): Promise<PlaidAccount[]> {
  ensureRealAccountDataEnabled(realDataFlagOverride);
  const response = await requestLinkedAccounts(userId);
  return response.accounts;
}

export async function fetchLinkedAccountsWithMeta(
  userId?: string,
  realDataFlagOverride?: string,
): Promise<{ accounts: PlaidAccount[]; requestId: string | null }> {
  ensureRealAccountDataEnabled(realDataFlagOverride);
  return requestLinkedAccounts(userId);
}

export async function fetchLinkedAccountsForLinkVerification(
  userId?: string,
  flags?: Pick<LiveFlagOverrides, "sandboxFlag">,
): Promise<{ accounts: PlaidAccount[]; requestId: string | null }> {
  ensureLivePlaidLinkEnabled(flags);
  return requestLinkedAccounts(userId);
}

// Validation for manual account entry
export function validateManualAccount(account: ManualAccount): string | null {
  if (!account.name || !account.balance) {
    return "Please enter both account name and balance.";
  }
  // Add more validation as needed
  return null;
}
