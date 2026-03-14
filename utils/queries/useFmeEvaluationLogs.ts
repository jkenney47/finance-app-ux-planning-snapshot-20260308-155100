import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import type { FactsSnapshot } from "@/utils/contracts/facts";
import type { FmeEvaluation } from "@/utils/contracts/fme";
import type { PolicyBundle } from "@/utils/contracts/policy";
import type { RulePack } from "@/utils/contracts/rules";
import {
  buildEvaluationSignature,
  buildFmeEvaluationLogPayload,
} from "@/utils/domain/fme/logging";
import { trackError } from "@/utils/analytics";
import { supabase } from "@/utils/supabaseClient";
import { useSessionStore } from "@/stores/useSessionStore";

type UseFmeEvaluationLoggerInput = {
  evaluation: FmeEvaluation;
  facts: FactsSnapshot;
  policyBundle?: PolicyBundle;
  rulePack?: RulePack | null;
  enabled?: boolean;
};

type FmeEvaluationLogRow = {
  id: string;
  created_at: string;
  output_summary: {
    mode?: string;
    primaryRecommendationId?: string | null;
  } | null;
  policy_versions: Record<string, number | null> | null;
  rule_version: number | null;
};

const loggedSignatures = new Set<string>();
const MAX_SIGNATURE_CACHE_SIZE = 500;

function cacheSignature(signature: string): void {
  loggedSignatures.add(signature);
  if (loggedSignatures.size <= MAX_SIGNATURE_CACHE_SIZE) return;
  const oldest = loggedSignatures.values().next().value;
  if (oldest) {
    loggedSignatures.delete(oldest);
  }
}

async function insertFmeEvaluationLog(
  payload: ReturnType<typeof buildFmeEvaluationLogPayload>,
  signature: string,
): Promise<void> {
  const { error } = await supabase.functions.invoke("logFmeEvaluation", {
    body: payload,
  });

  if (!error) return;

  const fallbackPayload = {
    ...payload,
    evaluation_signature: signature,
    artifact_signature: signature,
  };

  const { error: fallbackError } = await supabase
    .from("fme_evaluation_logs")
    .insert([fallbackPayload]);
  if (fallbackError) {
    throw fallbackError;
  }
}

export function useFmeEvaluationLogger({
  evaluation,
  facts,
  policyBundle,
  rulePack,
  enabled = true,
}: UseFmeEvaluationLoggerInput): void {
  const userId = useSessionStore((state) => state.session?.user?.id);

  const logPayload = useMemo(() => {
    if (!enabled || !userId) return null;
    return buildFmeEvaluationLogPayload({
      userId,
      facts,
      evaluation,
      policyBundle,
      rulePack,
    });
  }, [enabled, evaluation, facts, policyBundle, rulePack, userId]);

  const signature = useMemo(() => {
    if (!logPayload) return null;
    return buildEvaluationSignature(logPayload);
  }, [logPayload]);

  useEffect(() => {
    if (!logPayload || !signature) return;
    if (loggedSignatures.has(signature)) return;

    cacheSignature(signature);
    void insertFmeEvaluationLog(logPayload, signature).catch((error) => {
      loggedSignatures.delete(signature);
      trackError(error);
    });
  }, [logPayload, signature]);
}

export function useFmeEvaluationLogHistory(
  limit = 5,
): UseQueryResult<FmeEvaluationLogRow[], Error> {
  const userId = useSessionStore((state) => state.session?.user?.id);

  return useQuery({
    queryKey: ["fme", "evaluation-logs", userId, limit],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FmeEvaluationLogRow[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("fme_evaluation_logs")
        .select("id,created_at,output_summary,policy_versions,rule_version")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data ?? []) as FmeEvaluationLogRow[];
    },
    staleTime: 30 * 1000,
  });
}
