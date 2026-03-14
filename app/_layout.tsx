import "../globals.css";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { PostHogProvider } from "posthog-react-native";
// Initialize Sentry lazily and only if the ExpoApplication native module exists
// to avoid crashes/noise when the dev client is missing that module.
try {
  // Require cheaply from expo-modules-core and check for the module
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NativeModulesProxy } = require("expo-modules-core");
  const hasExpoApplication = !!NativeModulesProxy?.ExpoApplication;
  const hasDsn = !!process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (hasExpoApplication && hasDsn) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require("@sentry/react-native");
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      debug: false,
    });
  } else {
    // eslint-disable-next-line no-console
    console.warn("Sentry disabled (missing native module or DSN)");
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn("Sentry init skipped:", (e as Error)?.message ?? e);
}

import { ErrorBanner } from "@/components/ErrorBanner";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import {
  getResumeOnboardingRoute,
  isOnboardingComplete,
} from "@/components/onboarding/routeConfig";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { getSession, onAuthStateChange } from "@/utils/auth";
import { getPostHogClient } from "@/utils/posthog";
import { initializeRevenueCat } from "@/utils/revenueCat";

// __sentryInitialized is intentionally unused; it's for clarity of flow
const AUTH_BYPASS_ENABLED = process.env.EXPO_PUBLIC_BYPASS_AUTH === "true";

function AuthGate(): JSX.Element {
  const router = useRouter();
  const segments = useSegments();
  const status = useSessionStore((state) => state.status);
  const session = useSessionStore((state) => state.session);
  const onboarding = useOnboardingStore();

  const inAuthGroup = useMemo(() => segments[0] === "(unauth)", [segments]);
  const inOnboarding = useMemo(
    () => segments[0] === "onboarding" || segments[0] === "(onboarding)",
    [segments],
  );
  const needsOnboarding = useMemo(
    () =>
      !isOnboardingComplete(onboarding) ||
      !onboarding.linking.coreTransactionalLinked,
    [onboarding],
  );

  useEffect(() => {
    if (status === "loading") return;

    if (AUTH_BYPASS_ENABLED) {
      if (needsOnboarding && !inOnboarding) {
        router.replace(getResumeOnboardingRoute(onboarding));
        return;
      }

      if (!needsOnboarding && (inAuthGroup || inOnboarding)) {
        router.replace("/(dashboard)");
      }
      return;
    }

    if (!session) {
      if (!inAuthGroup && !inOnboarding) {
        router.replace("/onboarding/welcome");
      }
      return;
    }

    if (needsOnboarding && !inOnboarding) {
      router.replace(getResumeOnboardingRoute(onboarding));
      return;
    }

    if (!needsOnboarding && (inAuthGroup || inOnboarding)) {
      router.replace("/(dashboard)");
    }
  }, [
    inAuthGroup,
    inOnboarding,
    needsOnboarding,
    onboarding,
    router,
    session,
    status,
  ]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout(): JSX.Element {
  const [queryClient] = useState(() => new QueryClient());
  const setSession = useSessionStore((state) => state.setSession);
  const startLoading = useSessionStore((state) => state.startLoading);
  const posthogClient = getPostHogClient();

  useEffect(() => {
    startLoading();
    let mounted = true;

    if (AUTH_BYPASS_ENABLED) {
      setSession(null);
      SplashScreen.hideAsync().catch(() => undefined);
      return () => {
        mounted = false;
      };
    }

    (async () => {
      const { data } = await getSession();
      if (mounted) {
        setSession(data);
        SplashScreen.hideAsync().catch(() => undefined);
      }
    })();

    const { unsubscribe } = onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [setSession, startLoading]);

  useEffect(() => {
    void initializeRevenueCat();
  }, []);

  const appTree = (
    <QueryClientProvider client={queryClient}>
      <PortalHost />
      <ErrorBanner />
      <AuthGate />
    </QueryClientProvider>
  );

  return (
    <AppErrorBoundary>
      {posthogClient ? (
        <PostHogProvider client={posthogClient} autocapture={false}>
          {appTree}
        </PostHogProvider>
      ) : (
        appTree
      )}
    </AppErrorBoundary>
  );
}
