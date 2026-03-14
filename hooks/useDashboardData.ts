import {
  type UseQueryResult,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { useFactRegistryStore } from "@/stores/useFactRegistryStore";
import { useMockLinkedAccountsStore } from "@/stores/useMockLinkedAccountsStore";
import { isRealAccountDataEnabled } from "@/utils/account";
import type { FactsSnapshot } from "@/utils/contracts/facts";
import type { FmeEvaluation } from "@/utils/contracts/fme";
import {
  type DashboardSummary,
  getDashboardSummary,
  getFinancialMaturityEvaluation,
  getMergedFinancialFacts,
  getResolvedDashboardLinkedAccounts,
} from "@/utils/dashboard";
import { getMockScenario } from "@/utils/mocks/mockScenarios";
import { useFmeEvaluationLogger } from "@/utils/queries/useFmeEvaluationLogs";
import { usePolicyBundle } from "@/utils/queries/usePolicyBundle";
import { useRulePack } from "@/utils/queries/useRulePack";
import { getDashboardSummaryQueryKey } from "@/utils/queryKeys";

const ONE_MINUTE = 60 * 1000;

type UseFinancialMaturityEvaluationOptions = {
  logEvaluation?: boolean;
};

export function useDashboardSummary(): UseQueryResult<DashboardSummary, Error> {
  const hasMockLinkedAccounts = useMockLinkedAccountsStore(
    (state) => state.hasLinkedAccounts,
  );
  const realDataEnabled = isRealAccountDataEnabled();
  const scenario = getMockScenario();

  return useQuery({
    queryKey: getDashboardSummaryQueryKey({
      realDataEnabled,
      hasMockLinkedAccounts,
      scenario,
    }),
    queryFn: async () =>
      getDashboardSummary({
        hasMockLinkedAccounts,
        realDataEnabled,
      }),
    staleTime: ONE_MINUTE,
  });
}

export function usePrefetchDashboard(): () => void {
  const queryClient = useQueryClient();
  const hasMockLinkedAccounts = useMockLinkedAccountsStore(
    (state) => state.hasLinkedAccounts,
  );
  const realDataEnabled = isRealAccountDataEnabled();
  const scenario = getMockScenario();

  return useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: getDashboardSummaryQueryKey({
        realDataEnabled,
        hasMockLinkedAccounts,
        scenario,
      }),
      queryFn: async () =>
        getDashboardSummary({
          hasMockLinkedAccounts,
          realDataEnabled,
        }),
    });
  }, [hasMockLinkedAccounts, queryClient, realDataEnabled, scenario]);
}

export function useFinancialMaturityEvaluation(
  summary: DashboardSummary | undefined,
  options?: UseFinancialMaturityEvaluationOptions,
): {
  evaluation: FmeEvaluation;
  facts: FactsSnapshot;
  isPolicyLoading: boolean;
  isPolicyError: boolean;
  isRulePackLoading: boolean;
  isRulePackError: boolean;
  refetchPolicyBundle: () => Promise<unknown>;
} {
  const hasMockLinkedAccounts = useMockLinkedAccountsStore(
    (state) => state.hasLinkedAccounts,
  );
  const factOverrides = useFactRegistryStore((state) => state.facts);
  const realDataEnabled = isRealAccountDataEnabled();
  const hasLinkedAccounts = getResolvedDashboardLinkedAccounts({
    summary,
    hasMockLinkedAccounts,
    realDataEnabled,
  });
  const policyBundleQuery = usePolicyBundle();
  const rulePackQuery = useRulePack();

  const mergedFacts = useMemo(
    () =>
      getMergedFinancialFacts({
        summary,
        hasLinkedAccounts,
        factOverrides,
      }),
    [factOverrides, hasLinkedAccounts, summary],
  );

  const evaluation = useMemo(
    () =>
      getFinancialMaturityEvaluation({
        summary,
        hasLinkedAccounts,
        factOverrides,
        policyBundle: policyBundleQuery.data,
      }),
    [factOverrides, hasLinkedAccounts, policyBundleQuery.data, summary],
  );

  useFmeEvaluationLogger({
    evaluation,
    facts: mergedFacts,
    policyBundle: policyBundleQuery.data,
    rulePack: rulePackQuery.data,
    enabled: (options?.logEvaluation ?? true) && !policyBundleQuery.isLoading,
  });

  const refetchPolicyBundle = useCallback(async () => {
    await policyBundleQuery.refetch();
  }, [policyBundleQuery]);

  return useMemo(
    () => ({
      evaluation,
      facts: mergedFacts,
      isPolicyLoading: policyBundleQuery.isLoading,
      isPolicyError: policyBundleQuery.isError,
      isRulePackLoading: rulePackQuery.isLoading,
      isRulePackError: rulePackQuery.isError,
      refetchPolicyBundle,
    }),
    [
      evaluation,
      mergedFacts,
      policyBundleQuery.isError,
      policyBundleQuery.isLoading,
      refetchPolicyBundle,
      rulePackQuery.isError,
      rulePackQuery.isLoading,
    ],
  );
}
