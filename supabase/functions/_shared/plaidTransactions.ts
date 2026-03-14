import { createClient } from "npm:@supabase/supabase-js@2";

export type PlaidEnvironment = "sandbox" | "development" | "production";

type TransactionRow = {
  plaid_transaction_id: string;
  user_id: string;
  plaid_item_id: string;
  plaid_account_id: string;
  transaction_date: string;
  name: string;
  amount: number;
  iso_currency_code: string | null;
  pending: boolean;
  category: string[] | null;
  updated_at: string;
};

type ProcessItemTransactionsInput = {
  plaidItemId: string;
  userId: string;
  encryptedAccessToken: string;
  plaidEnvironment: PlaidEnvironment;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV;
const PLAID_ACCESS_TOKEN_ENCRYPTION_KEY =
  process.env.PLAID_ACCESS_TOKEN_ENCRYPTION_KEY ?? SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  return normalized.length > 0 ? normalized : null;
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function decryptPlaidAccessToken(
  encryptedToken: string,
): Promise<string> {
  if (!encryptedToken.startsWith("v1.")) {
    return encryptedToken;
  }

  const parts = encryptedToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Encrypted Plaid token has invalid format.");
  }

  const keySeed = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(PLAID_ACCESS_TOKEN_ENCRYPTION_KEY),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    keySeed,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const iv = base64UrlDecode(parts[1]);
  const ciphertext = base64UrlDecode(parts[2]);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return textDecoder.decode(plainBuffer);
}

function plaidBaseUrl(environment: PlaidEnvironment): string {
  return `https://${environment}.plaid.com`;
}

async function plaidPost(
  environment: PlaidEnvironment,
  path: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!/^\/[a-zA-Z0-9_/-]+$/.test(path)) {
    throw new Error(`Invalid Plaid API path: ${path}`);
  }

  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    throw new Error("Missing Plaid credentials.");
  }

  const response = await fetch(`${plaidBaseUrl(environment)}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: PLAID_CLIENT_ID,
      secret: PLAID_SECRET,
      ...payload,
    }),
  });

  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    const message =
      typeof body.error_message === "string"
        ? body.error_message
        : `Plaid request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return body;
}

function normalizeTransactionRow(input: {
  transaction: Record<string, unknown>;
  userId: string;
  plaidItemId: string;
  nowIso: string;
}): TransactionRow | null {
  const transactionId = asString(input.transaction.transaction_id);
  const plaidAccountId = asString(input.transaction.account_id);
  const transactionDate =
    asString(input.transaction.date) ??
    asString(input.transaction.authorized_date);
  const amount = asNumber(input.transaction.amount);

  if (
    !transactionId ||
    !plaidAccountId ||
    !transactionDate ||
    amount === null
  ) {
    return null;
  }

  return {
    plaid_transaction_id: transactionId,
    user_id: input.userId,
    plaid_item_id: input.plaidItemId,
    plaid_account_id: plaidAccountId,
    transaction_date: transactionDate,
    name: asString(input.transaction.name) ?? "Plaid transaction",
    amount,
    iso_currency_code: asString(input.transaction.iso_currency_code),
    pending: input.transaction.pending === true,
    category: asStringArray(input.transaction.category),
    updated_at: input.nowIso,
  };
}

export function resolvePlaidEnvironment(
  payloadEnvironment: string | null,
): PlaidEnvironment {
  const normalized = (payloadEnvironment ?? PLAID_ENV ?? "sandbox")
    .trim()
    .toLowerCase();

  if (normalized === "development" || normalized === "production") {
    return normalized;
  }

  return "sandbox";
}

async function fetchTransactionsSync(
  accessToken: string,
  input: ProcessItemTransactionsInput,
): Promise<{
  transactionMap: Map<string, TransactionRow>;
  removedIds: Set<string>;
}> {
  const transactionMap = new Map<string, TransactionRow>();
  const removedIds = new Set<string>();

  let cursor: string | null = null;
  let hasMore = true;
  let iterations = 0;

  while (hasMore) {
    iterations += 1;
    if (iterations > 20) {
      throw new Error("transactions_sync iteration limit reached.");
    }

    const syncResponse = await plaidPost(
      input.plaidEnvironment,
      "/transactions/sync",
      {
        access_token: accessToken,
        ...(cursor ? { cursor } : {}),
        count: 500,
      },
    );

    const added = Array.isArray(syncResponse.added)
      ? (syncResponse.added as Array<Record<string, unknown>>)
      : [];
    const modified = Array.isArray(syncResponse.modified)
      ? (syncResponse.modified as Array<Record<string, unknown>>)
      : [];
    const removed = Array.isArray(syncResponse.removed)
      ? (syncResponse.removed as Array<Record<string, unknown>>)
      : [];

    const nowIso = new Date().toISOString();
    for (const transaction of [...added, ...modified]) {
      const normalized = normalizeTransactionRow({
        transaction,
        userId: input.userId,
        plaidItemId: input.plaidItemId,
        nowIso,
      });
      if (normalized) {
        transactionMap.set(normalized.plaid_transaction_id, normalized);
      }
    }

    for (const removedEntry of removed) {
      const removedId = asString(removedEntry.transaction_id);
      if (removedId) {
        removedIds.add(removedId);
      }
    }

    const nextCursor = asString(syncResponse.next_cursor);
    if (nextCursor) {
      cursor = nextCursor;
    }
    hasMore = syncResponse.has_more === true;
  }

  return { transactionMap, removedIds };
}

async function syncTransactionsWithSupabase(
  transactionMap: Map<string, TransactionRow>,
  removedIds: Set<string>,
): Promise<{ upserted: number; removed: number }> {
  const rowsToUpsert = [...transactionMap.values()].filter(
    (row) => !removedIds.has(row.plaid_transaction_id),
  );

  if (rowsToUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from("transactions")
      .upsert(rowsToUpsert, {
        onConflict: "plaid_transaction_id",
      });
    if (upsertError) {
      throw new Error(`Failed to upsert transactions: ${upsertError.message}`);
    }
  }

  if (removedIds.size > 0) {
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .in("plaid_transaction_id", [...removedIds]);
    if (deleteError) {
      throw new Error(
        `Failed to delete removed transactions: ${deleteError.message}`,
      );
    }
  }

  return {
    upserted: rowsToUpsert.length,
    removed: removedIds.size,
  };
}

export async function processItemTransactions(
  input: ProcessItemTransactionsInput,
): Promise<{ upserted: number; removed: number }> {
  const accessToken = await decryptPlaidAccessToken(input.encryptedAccessToken);
  const { transactionMap, removedIds } = await fetchTransactionsSync(
    accessToken,
    input,
  );
  return syncTransactionsWithSupabase(transactionMap, removedIds);
}
