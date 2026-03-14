// Shared error formatting and handling utilities for web/mobile

export type AppError =
  | { type: "network"; detail?: string }
  | { type: "api"; code?: string; message?: string }
  | { type: "validation"; field?: string; message: string }
  | { type: "unknown"; error: unknown };

/**
 * Converts any error (thrown, API, etc.) to a user-friendly string.
 */
export function formatError(error: unknown): string {
  if (!error) return "An unknown error occurred.";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const errorRecord = error as Record<string, unknown>;
    if (typeof errorRecord.message === "string") {
      return errorRecord.message;
    }
    if (typeof errorRecord.code === "string") {
      return `API Error: ${errorRecord.code}`;
    }
  }
  return "An unexpected error occurred.";
}

/**
 * Example: Map API error codes to user-friendly messages.
 */
export function mapApiError(code: string): string {
  switch (code) {
    case "INVALID_TOKEN":
      return "Your session has expired. Please sign in again.";
    case "NOT_FOUND":
      return "Requested resource was not found.";
    case "NETWORK_ERROR":
      return "Network error. Please check your connection.";
    default:
      return "An unexpected error occurred.";
  }
}
