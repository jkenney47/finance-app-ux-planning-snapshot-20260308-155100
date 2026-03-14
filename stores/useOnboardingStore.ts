import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  createDefaultOnboardingState,
  type OnboardingLinkCategory,
  type OnboardingMockLinkScenario,
  type OnboardingRouteId,
  type OnboardingState,
} from "@/utils/contracts/onboarding";
import { getMockLinkingState } from "@/utils/onboarding/mockLinking";
import { persistStorage } from "@/stores/persistStorage";
import type { RoadmapPayload } from "@/utils/engine/types";

type OnboardingStore = OnboardingState & {
  hydrateAuth: (input: { userId?: string; accountCreated: boolean }) => void;
  setCurrentRoute: (route: OnboardingRouteId) => void;
  saveIntake: (
    route: OnboardingRouteId,
    patch: Partial<OnboardingState["intake"]>,
  ) => void;
  setIntakeValues: (patch: Partial<OnboardingState["intake"]>) => void;
  markIntakeStarted: () => void;
  markIntakeCompleted: () => void;
  setLinkingState: (patch: {
    linkedInstitutionsCount?: number;
    linkedAccountsCount?: number;
    coreTransactionalLinked?: boolean;
    linkedCategories?: OnboardingLinkCategory[];
  }) => void;
  applyMockLinkScenario: (scenario: OnboardingMockLinkScenario) => void;
  setGeneratedRoadmap: (payload: RoadmapPayload) => void;
  clearGeneratedRoadmap: () => void;
  markOnboardingComplete: () => void;
  reset: () => void;
};

function appendCompletedRoute(
  completedRoutes: OnboardingRouteId[],
  route: OnboardingRouteId,
): OnboardingRouteId[] {
  if (completedRoutes.includes(route)) {
    return completedRoutes;
  }
  return [...completedRoutes, route];
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      ...createDefaultOnboardingState(),
      hydrateAuth: ({ userId, accountCreated }) =>
        set((state) => ({
          auth: {
            ...state.auth,
            userId,
            accountCreated,
          },
        })),
      setCurrentRoute: (route) =>
        set((state) => ({
          progress: {
            ...state.progress,
            currentRoute: route,
          },
        })),
      saveIntake: (route, patch) =>
        set((state) => ({
          intake: {
            ...state.intake,
            ...patch,
          },
          progress: {
            ...state.progress,
            currentRoute: route,
            completedRoutes: appendCompletedRoute(
              state.progress.completedRoutes,
              route,
            ),
            lastSavedAt: new Date().toISOString(),
          },
        })),
      setIntakeValues: (patch) =>
        set((state) => ({
          intake: {
            ...state.intake,
            ...patch,
          },
        })),
      markIntakeStarted: () =>
        set((state) => ({
          progress: {
            ...state.progress,
            intakeStartedAt:
              state.progress.intakeStartedAt ?? new Date().toISOString(),
            lastSavedAt: new Date().toISOString(),
          },
        })),
      markIntakeCompleted: () =>
        set((state) => ({
          progress: {
            ...state.progress,
            intakeCompletedAt: new Date().toISOString(),
            lastSavedAt: new Date().toISOString(),
          },
        })),
      setLinkingState: (patch) =>
        set((state) => ({
          linking: {
            ...state.linking,
            ...patch,
          },
          progress: {
            ...state.progress,
            lastSavedAt: new Date().toISOString(),
          },
        })),
      applyMockLinkScenario: (scenario) =>
        set((state) => ({
          linking: {
            ...state.linking,
            ...getMockLinkingState(scenario),
            mockScenario: scenario,
          },
          progress: {
            ...state.progress,
            lastSavedAt: new Date().toISOString(),
          },
        })),
      setGeneratedRoadmap: (payload) =>
        set((state) => ({
          generatedRoadmap: payload,
          roadmap: {
            coverageLevel: payload.overallCoverageLevel,
            initialStage: payload.currentStage.label,
            currentFocus: payload.currentFocus.label,
            nextAction: payload.nextAction.recommendation,
            keyMetricLabel: payload.keyMetric.label,
            keyMetricValue: payload.keyMetric.value,
            whyPlacedHere: payload.explanation.whyPlacedHere,
          },
          progress: {
            ...state.progress,
            lastSavedAt: new Date().toISOString(),
          },
        })),
      clearGeneratedRoadmap: () =>
        set(() => ({
          generatedRoadmap: null,
          roadmap: {},
        })),
      markOnboardingComplete: () =>
        set((state) => ({
          progress: {
            ...state.progress,
            onboardingCompletedAt: new Date().toISOString(),
            lastSavedAt: new Date().toISOString(),
          },
        })),
      reset: () => createDefaultOnboardingState(),
    }),
    {
      name: "onboarding-store",
      version: 1,
      storage: persistStorage,
    },
  ),
);
