import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMockGoalsStore } from "@/stores/useMockGoalsStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { isMockDataEnabled } from "@/utils/account";
import { getGoalsListQueryKey } from "@/utils/queryKeys";
import { supabase } from "@/utils/supabaseClient";

type GoalRow = {
  id: string;
  name: string;
  target_amount: number | string;
  saved_amount: number | string;
  cadence: string | null;
  milestone_note: string | null;
  status: "active" | "paused" | "completed";
  created_at: string;
  updated_at: string;
};

export type GoalItem = {
  id: string;
  name: string;
  target: number;
  saved: number;
  progress: number;
  cadence: string;
  nextMilestone: string;
  status: "active" | "paused" | "completed";
  createdAt: string;
  updatedAt: string;
};

type CreateGoalInput = {
  name: string;
  targetAmount: number;
  savedAmount?: number;
  cadence?: string;
  milestoneNote?: string;
};

type UpdateGoalInput = {
  goalId: string;
  savedAmount?: number;
  targetAmount?: number;
  cadence?: string;
  milestoneNote?: string;
  status?: GoalItem["status"];
};

function toNumber(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function deriveProgress(saved: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return Math.min(saved / target, 1);
}

function mapGoalRow(row: GoalRow): GoalItem {
  const target = toNumber(row.target_amount);
  const saved = toNumber(row.saved_amount);

  return {
    id: row.id,
    name: row.name,
    target,
    saved,
    progress: deriveProgress(saved, target),
    cadence: row.cadence ?? "Manual contributions",
    nextMilestone: row.milestone_note ?? "No milestone set yet",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

export function useGoalsQuery(
  enabled = true,
): UseQueryResult<GoalItem[], Error> {
  const sessionUserId = useSessionStore((state) => state.session?.user?.id);
  const mockMode = isMockDataEnabled();
  const goalsListQueryKey = getGoalsListQueryKey({
    userId: sessionUserId,
    mode: mockMode ? "mock" : "live",
  });

  return useQuery({
    queryKey: goalsListQueryKey,
    enabled,
    queryFn: async (): Promise<GoalItem[]> => {
      if (mockMode) {
        return useMockGoalsStore.getState().goals;
      }

      if (!sessionUserId) {
        return [];
      }

      const { data, error } = await supabase
        .from("user_goals")
        .select(
          "id, name, target_amount, saved_amount, cadence, milestone_note, status, created_at, updated_at",
        )
        .eq("user_id", sessionUserId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return ((data ?? []) as GoalRow[]).map(mapGoalRow);
    },
  });
}

export function useCreateGoalMutation(): UseMutationResult<
  GoalItem,
  Error,
  CreateGoalInput,
  unknown
> {
  const queryClient = useQueryClient();
  const sessionUserId = useSessionStore((state) => state.session?.user?.id);
  const mockMode = isMockDataEnabled();
  const goalsListQueryKey = getGoalsListQueryKey({
    userId: sessionUserId,
    mode: mockMode ? "mock" : "live",
  });

  return useMutation({
    mutationFn: async (input: CreateGoalInput): Promise<GoalItem> => {
      if (mockMode) {
        return useMockGoalsStore.getState().createGoal(input);
      }

      const targetAmount = Math.max(input.targetAmount, 0);
      const savedAmount = Math.max(input.savedAmount ?? 0, 0);

      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Sign in is required to create goals.");
      }

      const { data, error } = await supabase
        .from("user_goals")
        .insert([
          {
            user_id: userId,
            name: input.name.trim(),
            target_amount: targetAmount,
            saved_amount: savedAmount,
            cadence: input.cadence?.trim() || null,
            milestone_note: input.milestoneNote?.trim() || null,
            status: "active",
          },
        ])
        .select(
          "id, name, target_amount, saved_amount, cadence, milestone_note, status, created_at, updated_at",
        )
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to create goal");
      }

      return mapGoalRow(data as GoalRow);
    },
    onSuccess: async () => {
      if (mockMode) {
        queryClient.setQueryData<GoalItem[]>(
          goalsListQueryKey,
          useMockGoalsStore.getState().goals,
        );
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["goals", "list"],
      });
    },
  });
}

export function useUpdateGoalMutation(): UseMutationResult<
  GoalItem,
  Error,
  UpdateGoalInput,
  unknown
> {
  const queryClient = useQueryClient();
  const sessionUserId = useSessionStore((state) => state.session?.user?.id);
  const mockMode = isMockDataEnabled();
  const goalsListQueryKey = getGoalsListQueryKey({
    userId: sessionUserId,
    mode: mockMode ? "mock" : "live",
  });

  return useMutation({
    mutationFn: async (input: UpdateGoalInput): Promise<GoalItem> => {
      if (mockMode) {
        const updatedGoal = useMockGoalsStore.getState().updateGoal(input);
        if (!updatedGoal) {
          throw new Error("Goal not found in mock mode.");
        }
        return updatedGoal;
      }

      const userId = await getCurrentUserId();
      if (!userId) {
        throw new Error("Sign in is required to update goals.");
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (typeof input.savedAmount === "number") {
        updates.saved_amount = Math.max(input.savedAmount, 0);
      }
      if (typeof input.targetAmount === "number") {
        updates.target_amount = Math.max(input.targetAmount, 0);
      }
      if (typeof input.cadence === "string") {
        updates.cadence = input.cadence.trim() || null;
      }
      if (typeof input.milestoneNote === "string") {
        updates.milestone_note = input.milestoneNote.trim() || null;
      }
      if (input.status) {
        updates.status = input.status;
      }

      const { data, error } = await supabase
        .from("user_goals")
        .update(updates)
        .eq("id", input.goalId)
        .eq("user_id", userId)
        .select(
          "id, name, target_amount, saved_amount, cadence, milestone_note, status, created_at, updated_at",
        )
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to update goal");
      }

      return mapGoalRow(data as GoalRow);
    },
    onSuccess: async () => {
      if (mockMode) {
        queryClient.setQueryData<GoalItem[]>(
          goalsListQueryKey,
          useMockGoalsStore.getState().goals,
        );
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["goals", "list"],
      });
    },
  });
}
