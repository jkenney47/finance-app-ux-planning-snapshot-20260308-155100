import {
  type DefinedUseQueryResult,
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  AgentProvider,
  AgentInvocationRequest,
  AgentInvocationResponse,
  AgentWorkflowDefinition,
  AgentWorkflowResult,
} from "@/utils/contracts/agents";
import {
  invokeAgent,
  type AgentInvocationLogEntry,
  listAgentInvocationHistory,
  listAgentProviders,
} from "@/utils/services/agentInteropClient";
import { runAgentWorkflow } from "@/utils/services/agentOrchestrator";

export const AGENT_WORKFLOW_HISTORY_QUERY_KEY = [
  "agents",
  "workflow-history",
] as const;

export type AgentWorkflowHistoryEntry = AgentWorkflowResult & {
  recordedAt: string;
};

export function appendWorkflowHistory(
  current: AgentWorkflowHistoryEntry[] | undefined,
  result: AgentWorkflowResult,
  maxEntries = 10,
): AgentWorkflowHistoryEntry[] {
  const nextEntry: AgentWorkflowHistoryEntry = {
    ...result,
    recordedAt: new Date().toISOString(),
  };

  const deduped = (current ?? []).filter(
    (entry) => entry.workflowId !== result.workflowId,
  );
  return [nextEntry, ...deduped].slice(0, maxEntries);
}

export function clearWorkflowHistory(): AgentWorkflowHistoryEntry[] {
  return [];
}

export function useAgentProviders(): UseQueryResult<AgentProvider[], Error> {
  return useQuery({
    queryKey: ["agents", "providers"],
    queryFn: listAgentProviders,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInvokeAgent(): UseMutationResult<
  AgentInvocationResponse,
  Error,
  AgentInvocationRequest,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AgentInvocationRequest) => invokeAgent(request),
    onSuccess: (response: AgentInvocationResponse) => {
      queryClient.setQueryData(
        ["agents", "last-invocation", response.providerKey],
        response,
      );
      void queryClient.invalidateQueries({
        queryKey: ["agents", "invocation-history"],
      });
    },
  });
}

export function useAgentInvocationHistory(
  limit = 10,
): UseQueryResult<AgentInvocationLogEntry[], Error> {
  return useQuery({
    queryKey: ["agents", "invocation-history", limit],
    queryFn: () => listAgentInvocationHistory(limit),
    staleTime: 15 * 1000,
  });
}

export function useRunAgentWorkflow(): UseMutationResult<
  AgentWorkflowResult,
  Error,
  AgentWorkflowDefinition,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (definition: AgentWorkflowDefinition) =>
      runAgentWorkflow(definition),
    onSuccess: (result: AgentWorkflowResult) => {
      queryClient.setQueryData(
        ["agents", "last-workflow", result.workflowId],
        result,
      );
      queryClient.setQueryData<AgentWorkflowHistoryEntry[]>(
        AGENT_WORKFLOW_HISTORY_QUERY_KEY,
        (current) => appendWorkflowHistory(current, result),
      );
      void queryClient.invalidateQueries({
        queryKey: ["agents", "invocation-history"],
      });
    },
  });
}

export function useAgentWorkflowHistory(
  limit = 5,
): DefinedUseQueryResult<AgentWorkflowHistoryEntry[], Error> {
  return useQuery({
    queryKey: AGENT_WORKFLOW_HISTORY_QUERY_KEY,
    queryFn: async () => [] as AgentWorkflowHistoryEntry[],
    initialData: [] as AgentWorkflowHistoryEntry[],
    staleTime: Infinity,
    gcTime: Infinity,
    select: (entries) => entries.slice(0, Math.max(1, limit)),
  });
}

export function useClearAgentWorkflowHistory(): UseMutationResult<
  { success: boolean },
  Error,
  void,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      queryClient.setQueryData<AgentWorkflowHistoryEntry[]>(
        AGENT_WORKFLOW_HISTORY_QUERY_KEY,
        clearWorkflowHistory(),
      );
      return { success: true };
    },
  });
}
