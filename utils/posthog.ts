import PostHog, { type PostHogOptions } from "posthog-react-native";

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim() ?? "";
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() ?? "https://us.i.posthog.com";

const POSTHOG_OPTIONS: PostHogOptions = {
  host: POSTHOG_HOST,
  captureAppLifecycleEvents: false,
  enableSessionReplay: false,
  sessionReplayConfig: {
    maskAllTextInputs: true,
    maskAllImages: true,
    maskAllSandboxedViews: true,
    captureLog: false,
    captureNetworkTelemetry: false,
  },
};

let posthogClient: PostHog | null | undefined;

function createPostHogClient(): PostHog | null {
  if (!POSTHOG_API_KEY) {
    return null;
  }

  try {
    return new PostHog(POSTHOG_API_KEY, POSTHOG_OPTIONS);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "PostHog disabled:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export function getPostHogClient(): PostHog | null {
  if (posthogClient !== undefined) {
    return posthogClient;
  }

  posthogClient = createPostHogClient();
  return posthogClient;
}
