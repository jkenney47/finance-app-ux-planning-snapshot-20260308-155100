import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSessionStore } from "@/stores/useSessionStore";
import { isMockDataEnabled } from "@/utils/account";
import type { DerivedInsight } from "@/utils/insights";
import { getInsightsListQueryKey } from "@/utils/queryKeys";
import { supabase } from "@/utils/supabaseClient";

type InsightRow = {
  id: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

type InsightMetadata = {
  persona?: string;
  impact?: string;
  category?: string;
  actionRoute?: string;
  source?: string;
};

export type InsightItem = {
  id: string;
  title: string;
  summary: string;
  persona: string;
  impact: string;
  category: string;
  actionRoute: "/(dashboard)/journey" | "/(dashboard)/goals";
  createdAt: string;
};

async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

function toInsightItem(row: InsightRow): InsightItem {
  const metadata = (row.metadata ?? {}) as InsightMetadata;
  return {
    id: row.id,
    title: row.title,
    summary: row.body ?? "No summary available.",
    persona: metadata.persona ?? "Guide",
    impact: metadata.impact ?? "Impact pending",
    category: metadata.category ?? "General guidance",
    actionRoute:
      metadata.actionRoute === "/(dashboard)/goals"
        ? "/(dashboard)/goals"
        : "/(dashboard)/journey",
    createdAt: row.created_at,
  };
}

export function useInsightsQuery(
  enabled = true,
): UseQueryResult<InsightItem[], Error> {
  const sessionUserId = useSessionStore((state) => state.session?.user?.id);
  const mockMode = isMockDataEnabled();
  const insightsListQueryKey = getInsightsListQueryKey({
    userId: sessionUserId,
    mode: mockMode ? "mock" : "live",
  });

  return useQuery({
    queryKey: insightsListQueryKey,
    enabled,
    queryFn: async (): Promise<InsightItem[]> => {
      if (mockMode) {
        return [];
      }

      if (!sessionUserId) {
        return [];
      }

      const { data, error } = await supabase
        .from("insights")
        .select("id, title, body, metadata, status, created_at")
        .eq("user_id", sessionUserId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return ((data ?? []) as InsightRow[]).map(toInsightItem);
    },
  });
}

async function fetchExistingActiveTitles(userId: string): Promise<Set<string>> {
  const { data: existingRows, error: existingError } = await supabase
    .from("insights")
    .select("title")
    .eq("user_id", userId)
    .eq("status", "active");

  if (existingError) {
    throw new Error(existingError.message);
  }

  return new Set(
    (existingRows ?? [])
      .map((row) => row.title)
      .filter((title): title is string => typeof title === "string"),
  );
}

function prepareRowsToInsert(
  userId: string,
  derivedInsights: DerivedInsight[],
  existingTitles: Set<string>,
): {
  user_id: string;
  title: string;
  body: string;
  metadata: {
    persona: string;
    impact: string;
    category: string;
    actionRoute: "/(dashboard)/journey" | "/(dashboard)/goals";
    source: string;
  };
  status: string;
}[] {
  return derivedInsights
    .filter((insight) => !existingTitles.has(insight.title))
    .map((insight) => ({
      user_id: userId,
      title: insight.title,
      body: insight.summary,
      metadata: {
        persona: insight.persona,
        impact: insight.impact,
        category: insight.category,
        actionRoute: insight.actionRoute,
        source: "derived_from_dashboard_summary",
      },
      status: "active",
    }));
}

async function insertNewInsights(
  rowsToInsert: ReturnType<typeof prepareRowsToInsert>,
): Promise<number> {
  if (rowsToInsert.length === 0) {
    return 0;
  }

  const { error } = await supabase.from("insights").insert(rowsToInsert);
  if (error) {
    throw new Error(error.message);
  }

  return rowsToInsert.length;
}

export function useSeedInsightsMutation(): UseMutationResult<
  number,
  Error,
  DerivedInsight[],
  unknown
> {
  const queryClient = useQueryClient();
  const mockMode = isMockDataEnabled();

  return useMutation({
    mutationFn: async (derivedInsights: DerivedInsight[]): Promise<number> => {
      if (mockMode) {
        return 0;
      }

      const userId = await getCurrentUserId();
      if (!userId || derivedInsights.length === 0) {
        return 0;
      }

      const existingTitles = await fetchExistingActiveTitles(userId);
      const rowsToInsert = prepareRowsToInsert(
        userId,
        derivedInsights,
        existingTitles,
      );
      return await insertNewInsights(rowsToInsert);
    },
    onSuccess: async () => {
      if (mockMode) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["insights", "list"],
      });
    },
  });
}
