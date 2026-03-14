import { Platform } from "react-native";

const REVENUECAT_IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? "";
const REVENUECAT_ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? "";

let revenueCatInitialized = false;

function resolveRevenueCatApiKey(): string {
  if (Platform.OS === "ios") {
    return REVENUECAT_IOS_API_KEY;
  }
  if (Platform.OS === "android") {
    return REVENUECAT_ANDROID_API_KEY;
  }
  return "";
}

export async function initializeRevenueCat(): Promise<void> {
  if (revenueCatInitialized || Platform.OS === "web") {
    return;
  }

  const apiKey = resolveRevenueCatApiKey();
  if (!apiKey) {
    return;
  }

  try {
    const Purchases = (await import("react-native-purchases")).default;
    await Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
    Purchases.configure({ apiKey });
    revenueCatInitialized = true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "RevenueCat init skipped:",
      error instanceof Error ? error.message : error,
    );
  }
}

export function isRevenueCatPaywallEnabled(): boolean {
  return false;
}
