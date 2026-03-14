import Constants from "expo-constants";
import { getPostHogClient } from "@/utils/posthog";
// Load Sentry lazily to avoid crashes if the native module
// isn't present in the current dev client/build yet.

type AnalyticsPayload = Record<string, unknown>;
type ConversionPayloadMap = {
  plaid_linked: {
    mode: "mock" | "live";
    accounts_linked_count: number;
  };
  onboarding_completed: {
    completion_mode: "full" | "partial";
    remaining_inputs_count: number;
  };
};
export type ConversionEventName = keyof ConversionPayloadMap;

type SentryLike = {
  addBreadcrumb: (breadcrumb: {
    category: string;
    message: string;
    data: AnalyticsPayload;
    level: "info" | "warning" | "error";
  }) => void;
  captureMessage: (
    message: string,
    context: { level: "info" | "warning" | "error"; extra: AnalyticsPayload },
  ) => void;
  captureException: (
    error: unknown,
    context: { extra: AnalyticsPayload },
  ) => void;
};

let __sentryCache: SentryLike | null | undefined;
function getSentry(): SentryLike | null {
  if (__sentryCache !== undefined) return __sentryCache;

  // Dev clients used for local E2E often omit native Sentry deps
  // (for example ExpoDevice). Skip Sentry entirely in __DEV__.
  if (__DEV__) {
    __sentryCache = null;
    return __sentryCache;
  }

  try {
    // Only load Sentry if the native module exists
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NativeModulesProxy } = require("expo-modules-core");
    const hasExpoApplication = Boolean(NativeModulesProxy?.ExpoApplication);

    if (!hasExpoApplication) {
      __sentryCache = null;
      return __sentryCache;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    __sentryCache = require("@sentry/react-native");
  } catch {
    __sentryCache = null;
  }
  return __sentryCache ?? null;
}

type TrackOptions = {
  level?: "info" | "warning" | "error";
  includeBreadcrumb?: boolean;
};

type AppManifestExtra = {
  version?: string;
  buildNumber?: string;
  runtimeVersion?: string;
} & Record<string, unknown>;

const expoExtra = Constants.expoConfig?.extra as AppManifestExtra | undefined;
const manifestExtra = Constants.manifest2?.extra as
  | AppManifestExtra
  | undefined;

const appEnv = {
  appVersion:
    Constants.expoConfig?.version ?? manifestExtra?.version ?? "unknown",
  buildNumber:
    expoExtra?.buildNumber ?? manifestExtra?.buildNumber ?? "unknown",
  releaseChannel: Constants.executionEnvironment,
  deviceName: Constants.deviceName,
  runtimeVersion:
    Constants.expoConfig?.runtimeVersion ??
    manifestExtra?.runtimeVersion ??
    "unknown",
};

function enrichPayload(
  payload?: AnalyticsPayload,
): AnalyticsPayload & { environment: typeof appEnv; timestamp: string } {
  return {
    ...payload,
    environment: appEnv,
    timestamp: new Date().toISOString(),
  };
}

function formatEventName(name: string): string {
  return name.replace(/\s+/g, "_").toLowerCase();
}

export function trackEvent(
  name: string,
  payload?: AnalyticsPayload,
  options?: TrackOptions,
): void {
  const enriched = enrichPayload(payload);

  if (options?.includeBreadcrumb ?? true) {
    const Sentry = getSentry();
    if (Sentry) {
      Sentry.addBreadcrumb({
        category: "analytics",
        message: formatEventName(name),
        data: enriched,
        level: options?.level ?? "info",
      });
    }
  }

  const Sentry = getSentry();
  if (Sentry) {
    Sentry.captureMessage(formatEventName(name), {
      level: options?.level ?? "info",
      extra: enriched,
    });
  }
}

export function trackScreen(name: string, payload?: AnalyticsPayload): void {
  trackEvent(`screen_view_${formatEventName(name)}`, payload, {
    includeBreadcrumb: false,
  });
}

export function trackConversionEvent<T extends ConversionEventName>(
  name: T,
  payload: ConversionPayloadMap[T],
): void {
  trackEvent(name, payload);

  try {
    const posthog = getPostHogClient();
    if (!posthog) {
      return;
    }

    posthog.capture(formatEventName(name), payload);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "PostHog capture failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

export function trackError(error: unknown, context?: AnalyticsPayload): void {
  const enriched = enrichPayload(context);
  const Sentry = getSentry();
  if (Sentry) {
    Sentry.captureException(error, {
      extra: enriched,
    });
  }
}
