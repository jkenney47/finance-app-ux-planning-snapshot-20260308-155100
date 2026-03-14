import * as Sentry from "@sentry/react-native";
import { trackEvent } from "../../utils/analytics";

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: { buildNumber: "1.0.0" },
    version: "1.0",
    runtimeVersion: "exporuntime",
  },
  manifest2: null,
  executionEnvironment: "storeClient",
  deviceName: "iPhone",
}));

jest.mock("@/utils/posthog", () => ({
  getPostHogClient: jest.fn(),
}));

jest.mock("expo-modules-core", () => ({
  NativeModulesProxy: {
    ExpoApplication: true,
  },
}));

jest.mock("@sentry/react-native", () => ({
  addBreadcrumb: jest.fn(),
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

describe("analytics.ts", () => {
  let originalDev: boolean | undefined;

  beforeAll(() => {
    // @ts-expect-error Mocking global __DEV__ for tests
    originalDev = globalThis.__DEV__;
    // @ts-expect-error Mocking global __DEV__ for tests
    globalThis.__DEV__ = false;
  });

  afterAll(() => {
    // @ts-expect-error Mocking global __DEV__ for tests
    globalThis.__DEV__ = originalDev;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("trackEvent", () => {
    it("should format event name and enrich payload correctly", () => {
      const payload = { foo: "bar" };
      trackEvent("Test Event Name", payload);

      const expectedName = "test_event_name";
      const expectedData = expect.objectContaining({
        foo: "bar",
        environment: expect.objectContaining({
          appVersion: "1.0",
          buildNumber: "1.0.0",
          releaseChannel: "storeClient",
          deviceName: "iPhone",
          runtimeVersion: "exporuntime",
        }),
        timestamp: expect.any(String),
      });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "analytics",
        message: expectedName,
        data: expectedData,
        level: "info",
      });

      expect(Sentry.captureMessage).toHaveBeenCalledWith(expectedName, {
        level: "info",
        extra: expectedData,
      });
    });

    it("should respect includeBreadcrumb: false option", () => {
      trackEvent("Test Event", { foo: "bar" }, { includeBreadcrumb: false });

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(1);
    });

    it("should respect level option", () => {
      trackEvent("Test Event", undefined, { level: "warning" });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({ level: "warning" }),
      );

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "test_event",
        expect.objectContaining({ level: "warning" }),
      );
    });

    it("should handle undefined payload smoothly", () => {
      trackEvent("Test Event");

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            environment: expect.any(Object),
            timestamp: expect.any(String),
          }),
        }),
      );
    });
  });
});
