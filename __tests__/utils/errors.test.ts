import { formatError, mapApiError } from "../../utils/errors";

describe("formatError", () => {
  it("formats Error objects", () => {
    expect(formatError(new Error("Test error message"))).toBe(
      "Test error message",
    );
  });

  it("formats strings directly", () => {
    expect(formatError("A string error")).toBe("A string error");
  });

  it("handles falsy values (null) gracefully", () => {
    expect(formatError(null)).toBe("An unknown error occurred.");
  });

  it("handles falsy values (undefined) gracefully", () => {
    expect(formatError(undefined)).toBe("An unknown error occurred.");
  });

  it("formats object with string message property", () => {
    expect(formatError({ message: "Object error message" })).toBe(
      "Object error message",
    );
  });

  it("formats object with string code property when message is absent", () => {
    expect(formatError({ code: "ERR_CUSTOM" })).toBe("API Error: ERR_CUSTOM");
  });

  it("handles arbitrary objects without message or code", () => {
    expect(formatError({ some: "other property" })).toBe(
      "An unexpected error occurred.",
    );
  });

  it("handles primitive numbers by falling back to unexpected error", () => {
    expect(formatError(123)).toBe("An unexpected error occurred.");
  });

  it("handles primitive booleans by falling back to unexpected error", () => {
    expect(formatError(true)).toBe("An unexpected error occurred.");
  });

  it("handles object with non-string message property", () => {
    expect(formatError({ message: 123 })).toBe("An unexpected error occurred.");
  });

  it("handles object with non-string code property", () => {
    expect(formatError({ code: 123 })).toBe("An unexpected error occurred.");
  });
});

describe("mapApiError", () => {
  it("maps known API error codes", () => {
    expect(mapApiError("INVALID_TOKEN")).toBe(
      "Your session has expired. Please sign in again.",
    );
    expect(mapApiError("NOT_FOUND")).toBe("Requested resource was not found.");
    expect(mapApiError("NETWORK_ERROR")).toBe(
      "Network error. Please check your connection.",
    );
  });

  it("provides fallback for unknown error codes", () => {
    expect(mapApiError("UNKNOWN_ERROR_CODE")).toBe(
      "An unexpected error occurred.",
    );
  });
});
