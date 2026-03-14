import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/stores/persistStorage";

export type MockGoalStatus = "active" | "paused" | "completed";

export type MockGoalItem = {
  id: string;
  name: string;
  target: number;
  saved: number;
  progress: number;
  cadence: string;
  nextMilestone: string;
  status: MockGoalStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateMockGoalInput = {
  name: string;
  targetAmount: number;
  savedAmount?: number;
  cadence?: string;
  milestoneNote?: string;
};

export type UpdateMockGoalInput = {
  goalId: string;
  savedAmount?: number;
  targetAmount?: number;
  cadence?: string;
  milestoneNote?: string;
  status?: MockGoalStatus;
};

type MockGoalsState = {
  goals: MockGoalItem[];
  createGoal: (input: CreateMockGoalInput) => MockGoalItem;
  updateGoal: (input: UpdateMockGoalInput) => MockGoalItem | null;
  resetGoals: () => void;
};

function deriveProgress(saved: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return Math.min(saved / target, 1);
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeCadence(input: string | undefined): string {
  const value = input?.trim();
  return value && value.length > 0 ? value : "Manual contributions";
}

function normalizeMilestone(input: string | undefined): string {
  const value = input?.trim();
  return value && value.length > 0 ? value : "No milestone set yet";
}

export const useMockGoalsStore = create<MockGoalsState>()(
  persist(
    (set, get) => ({
      goals: [],
      createGoal: (input) => {
        const target = Math.max(input.targetAmount, 0);
        const saved = Math.max(input.savedAmount ?? 0, 0);
        const timestamp = nowIso();
        const createdGoal: MockGoalItem = {
          id: `mock-goal-${Date.now()}`,
          name: input.name.trim(),
          target,
          saved,
          progress: deriveProgress(saved, target),
          cadence: normalizeCadence(input.cadence),
          nextMilestone: normalizeMilestone(input.milestoneNote),
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        set((state) => ({
          goals: [createdGoal, ...state.goals],
        }));

        return createdGoal;
      },
      updateGoal: (input) => {
        const existingGoal = get().goals.find(
          (goal) => goal.id === input.goalId,
        );
        if (!existingGoal) {
          return null;
        }

        const target =
          typeof input.targetAmount === "number"
            ? Math.max(input.targetAmount, 0)
            : existingGoal.target;
        const saved =
          typeof input.savedAmount === "number"
            ? Math.max(input.savedAmount, 0)
            : existingGoal.saved;
        const updatedGoal: MockGoalItem = {
          ...existingGoal,
          target,
          saved,
          progress: deriveProgress(saved, target),
          cadence:
            typeof input.cadence === "string"
              ? normalizeCadence(input.cadence)
              : existingGoal.cadence,
          nextMilestone:
            typeof input.milestoneNote === "string"
              ? normalizeMilestone(input.milestoneNote)
              : existingGoal.nextMilestone,
          status: input.status ?? existingGoal.status,
          updatedAt: nowIso(),
        };

        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === input.goalId ? updatedGoal : goal,
          ),
        }));

        return updatedGoal;
      },
      resetGoals: () => set({ goals: [] }),
    }),
    {
      name: "mock-goals-store-v1",
      version: 1,
      storage: persistStorage,
    },
  ),
);
