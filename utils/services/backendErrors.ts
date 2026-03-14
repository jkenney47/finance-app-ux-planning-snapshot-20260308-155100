export type ParsedBackendError = {
  message: string;
  requestId: string | null;
  code: string | null;
};

type BackendErrorLike = {
  message?: string;
  requestId?: string | null;
  code?: string;
  details?: {
    message?: string;
    error?: string;
    details?: string;
    code?: string;
    request_id?: string;
  };
};

export function parseBackendError(
  error: unknown,
  fallback: string,
): ParsedBackendError {
  if (!error || typeof error !== "object") {
    return { message: fallback, requestId: null, code: null };
  }

  const backendError = error as BackendErrorLike;
  const message =
    backendError.details?.message ??
    backendError.details?.error ??
    backendError.details?.details ??
    backendError.message ??
    (error instanceof Error ? error.message : fallback);
  const requestId =
    backendError.details?.request_id ?? backendError.requestId ?? null;
  const code = backendError.details?.code ?? backendError.code ?? null;

  return {
    message,
    requestId,
    code,
  };
}

export function withRequestId(
  message: string,
  requestId: string | null,
): string {
  if (!requestId) return message;
  return `${message} (request ${requestId})`;
}
