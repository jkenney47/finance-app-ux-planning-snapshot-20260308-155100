import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/stores/persistStorage";

type OnboardingCompletionState = {
  completedByUserId: Record<string, boolean>;
  markComplete: (userId: string) => void;
  isComplete: (userId: string) => boolean;
  reset: (userId?: string) => void;
};

export const useOnboardingCompletionStore = create<OnboardingCompletionState>()(
  persist(
    (set, get) => ({
      completedByUserId: {},
      markComplete: (userId) =>
        set((state) => ({
          completedByUserId: {
            ...state.completedByUserId,
            [userId]: true,
          },
        })),
      isComplete: (userId) => Boolean(get().completedByUserId[userId]),
      reset: (userId) =>
        set((state) => {
          if (!userId) {
            return { completedByUserId: {} };
          }

          const next = { ...state.completedByUserId };
          delete next[userId];
          return { completedByUserId: next };
        }),
    }),
    {
      name: "onboarding-completion-store",
      version: 1,
      storage: persistStorage,
    },
  ),
);
