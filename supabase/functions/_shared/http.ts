type JsonRecord = Record<string, unknown>;

export type JsonErrorInput = {
  status: number;
  error: string;
  code: string;
  message?: string;
  details?: unknown;
  context?: JsonRecord;
  requestId?: string;
  cors?: boolean;
  headers?: Record<string, string>;
};

const BASE_JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

const BASE_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id, x-policy-refresh-secret, plaid-verification-code, x-pending-insights-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;

function toRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as JsonRecord;
}

function buildHeaders(input: {
  requestId: string;
  cors?: boolean;
  headers?: Record<string, string>;
}): Record<string, string> {
  return {
    ...BASE_JSON_HEADERS,
    ...(input.cors ? BASE_CORS_HEADERS : {}),
    "X-Request-Id": input.requestId,
    ...(input.headers ?? {}),
  };
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export function jsonError(input: JsonErrorInput): Response {
  const requestId = input.requestId ?? createRequestId();
  const payload: JsonRecord = {
    error: input.error,
    message: input.message ?? input.error,
    code: input.code,
    request_id: requestId,
  };

  if (typeof input.details !== "undefined") {
    payload.details = input.details;
  }
  if (input.context) {
    payload.context = input.context;
  }

  return new Response(JSON.stringify(payload), {
    status: input.status,
    headers: buildHeaders({
      requestId,
      cors: input.cors,
      headers: input.headers,
    }),
  });
}

export function jsonSuccess(
  payload: unknown,
  input: {
    status?: number;
    requestId?: string;
    includeRequestIdInBody?: boolean;
    cors?: boolean;
    headers?: Record<string, string>;
  } = {},
): Response {
  const requestId = input.requestId ?? createRequestId();
  const payloadRecord = toRecord(payload);
  const includeRequestIdInBody =
    input.includeRequestIdInBody ?? Boolean(payloadRecord);
  const responseBody =
    includeRequestIdInBody && payloadRecord
      ? { ...payloadRecord, request_id: requestId }
      : payload;

  return new Response(JSON.stringify(responseBody), {
    status: input.status ?? 200,
    headers: buildHeaders({
      requestId,
      cors: input.cors,
      headers: input.headers,
    }),
  });
}

export function optionsResponse(
  input: { headers?: Record<string, string> } = {},
): Response {
  return new Response("ok", {
    headers: {
      ...BASE_CORS_HEADERS,
      ...(input.headers ?? {}),
    },
  });
}
