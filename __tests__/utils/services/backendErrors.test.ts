import {
  parseBackendError,
  withRequestId,
} from "@/utils/services/backendErrors";

describe("backendErrors", () => {
  describe("parseBackendError", () => {
    it("should handle non-object errors (null, undefined, string, etc.)", () => {
      expect(parseBackendError(null, "fallback")).toEqual({
        message: "fallback",
        requestId: null,
        code: null,
      });
      expect(parseBackendError(undefined, "fallback")).toEqual({
        message: "fallback",
        requestId: null,
        code: null,
      });
      expect(parseBackendError("string error", "fallback")).toEqual({
        message: "fallback",
        requestId: null,
        code: null,
      });
      expect(parseBackendError(123, "fallback")).toEqual({
        message: "fallback",
        requestId: null,
        code: null,
      });
    });

    it("should handle empty object", () => {
      expect(parseBackendError({}, "fallback")).toEqual({
        message: "fallback",
        requestId: null,
        code: null,
      });
    });

    it("should extract message from details.message", () => {
      expect(
        parseBackendError(
          { details: { message: "details message" } },
          "fallback",
        ),
      ).toEqual({
        message: "details message",
        requestId: null,
        code: null,
      });
    });

    it("should extract message from details.error", () => {
      expect(
        parseBackendError({ details: { error: "details error" } }, "fallback"),
      ).toEqual({
        message: "details error",
        requestId: null,
        code: null,
      });
    });

    it("should extract message from details.details", () => {
      expect(
        parseBackendError(
          { details: { details: "details details" } },
          "fallback",
        ),
      ).toEqual({
        message: "details details",
        requestId: null,
        code: null,
      });
    });

    it("should extract message from message", () => {
      expect(parseBackendError({ message: "top message" }, "fallback")).toEqual(
        {
          message: "top message",
          requestId: null,
          code: null,
        },
      );
    });

    it("should extract message from Error instance", () => {
      expect(
        parseBackendError(new Error("error instance"), "fallback"),
      ).toEqual({
        message: "error instance",
        requestId: null,
        code: null,
      });
    });

    it("should fallback when message is not found", () => {
      expect(parseBackendError({ something: "else" }, "fallback")).toEqual({
        message: "fallback",
        requestId: null,
        code: null,
      });
    });

    it("should extract requestId from details.request_id", () => {
      expect(
        parseBackendError({ details: { request_id: "req-123" } }, "fallback"),
      ).toEqual({
        message: "fallback",
        requestId: "req-123",
        code: null,
      });
    });

    it("should extract requestId from requestId", () => {
      expect(parseBackendError({ requestId: "req-456" }, "fallback")).toEqual({
        message: "fallback",
        requestId: "req-456",
        code: null,
      });
    });

    it("should extract code from details.code", () => {
      expect(
        parseBackendError({ details: { code: "code-123" } }, "fallback"),
      ).toEqual({
        message: "fallback",
        requestId: null,
        code: "code-123",
      });
    });

    it("should extract code from code", () => {
      expect(parseBackendError({ code: "code-456" }, "fallback")).toEqual({
        message: "fallback",
        requestId: null,
        code: "code-456",
      });
    });

    it("should prefer details.message over others", () => {
      expect(
        parseBackendError(
          {
            details: { message: "prio 1", error: "prio 2", details: "prio 3" },
            message: "prio 4",
          },
          "fallback",
        ),
      ).toEqual({
        message: "prio 1",
        requestId: null,
        code: null,
      });
    });

    it("should prefer details.error over details.details", () => {
      expect(
        parseBackendError(
          {
            details: { error: "prio 2", details: "prio 3" },
            message: "prio 4",
          },
          "fallback",
        ),
      ).toEqual({
        message: "prio 2",
        requestId: null,
        code: null,
      });
    });

    it("should prefer details.details over top-level message", () => {
      expect(
        parseBackendError(
          {
            details: { details: "prio 3" },
            message: "prio 4",
          },
          "fallback",
        ),
      ).toEqual({
        message: "prio 3",
        requestId: null,
        code: null,
      });
    });

    it("should extract all fields at once", () => {
      expect(
        parseBackendError(
          {
            message: "some message",
            code: "SOME_CODE",
            requestId: "req-abc",
          },
          "fallback",
        ),
      ).toEqual({
        message: "some message",
        requestId: "req-abc",
        code: "SOME_CODE",
      });
    });
  });

  describe("withRequestId", () => {
    it("should return message as is if requestId is null", () => {
      expect(withRequestId("hello", null)).toBe("hello");
    });

    it("should return message as is if requestId is empty string", () => {
      expect(withRequestId("hello", "")).toBe("hello");
    });

    it("should append requestId to message", () => {
      expect(withRequestId("hello", "req-123")).toBe("hello (request req-123)");
    });
  });
});
