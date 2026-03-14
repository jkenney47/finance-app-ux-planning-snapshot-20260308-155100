import { Redirect } from "expo-router";

import { getResumeOnboardingRoute } from "@/components/onboarding/routeConfig";
import { useOnboardingStore } from "@/stores/useOnboardingStore";

export default function OnboardingIndex(): JSX.Element {
  const onboarding = useOnboardingStore();
  return <Redirect href={getResumeOnboardingRoute(onboarding)} />;
}
