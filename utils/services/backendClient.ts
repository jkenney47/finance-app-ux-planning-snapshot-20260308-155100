import { supabase } from "@/utils/supabaseClient";

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  headers?: Record<string, string>;
};

export type BackendError = {
  status: number;
  message: string;
  code?: string;
  context?: Record<string, unknown>;
  details?: unknown;
  requestId: string | null;
  path: string;
  method: "GET" | "POST";
};

export type BackendResponse<T> = {
  data: T;
  requestId: string | null;
};

function getBaseUrl(): string {
  const explicitBaseUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_BASE_URL;
  if (explicitBaseUrl?.trim()) {
    return explicitBaseUrl.trim().replace(/\/$/, "");
  }

  const supabaseUrl =
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl?.trim()) {
    return `${supabaseUrl.trim().replace(/\/$/, "")}/functions/v1`;
  }

  return "/functions/v1";
}

async function getSessionAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (accessToken) {
      return {
        Authorization: `Bearer ${accessToken}`,
      };
    }
  } catch {
    // No-op fallback: unauthenticated requests remain supported where allowed.
  }
  return {};
}

function extractRequestId(
  payload: unknown,
  headerRequestId: string | null,
): string | null {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof (payload as { request_id?: unknown }).request_id === "string"
  ) {
    return (payload as { request_id: string }).request_id;
  }
  return headerRequestId;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(
  record: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" ? value : null;
}

async function requestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<BackendResponse<T>> {
  const method = options.method ?? "GET";
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const authHeader = await getSessionAuthHeader();
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response
    .json()
    .catch(() => ({ error: "Invalid response payload" }));
  const requestId = extractRequestId(
    payload,
    response.headers.get("x-request-id"),
  );

  if (!response.ok) {
    const payloadRecord = toRecord(payload);
    const payloadMessage =
      readString(payloadRecord, "message") ??
      readString(payloadRecord, "error");
    const payloadCode = readString(payloadRecord, "code") ?? undefined;
    const payloadContext =
      toRecord(payloadRecord?.context) ??
      toRecord(payloadRecord?.details) ??
      undefined;
    const error: BackendError = {
      status: response.status,
      message: payloadMessage ?? response.statusText ?? "Request failed",
      code: payloadCode,
      context: payloadContext,
      details: payload,
      requestId,
      path,
      method,
    };
    throw error;
  }

  return {
    data: payload as T,
    requestId,
  };
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await requestWithMeta<T>(path, options);
  return response.data;
}

export const backendClient = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: "GET", headers }),
  getWithMeta: <T>(path: string, headers?: Record<string, string>) =>
    requestWithMeta<T>(path, { method: "GET", headers }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, { method: "POST", body, headers }),
  postWithMeta: <T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ) => requestWithMeta<T>(path, { method: "POST", body, headers }),
};
