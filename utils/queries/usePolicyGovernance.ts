import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { backendClient } from "@/utils/services/backendClient";
import {
  buildPolicyGovernanceSnapshots,
  type PolicyGovernancePackRow,
  type PolicyGovernanceSnapshot,
} from "@/utils/services/policyGovernance";

type GovernanceListResponse = {
  status?: string;
  packs?: PolicyGovernancePackRow[];
};

export type PolicyGovernanceData = {
  packs: PolicyGovernancePackRow[];
  snapshots: PolicyGovernanceSnapshot[];
};

export async function getPolicyGovernance(): Promise<PolicyGovernanceData> {
  const response = await backendClient.post<GovernanceListResponse>(
    "/governPolicyPacks",
    {
      action: "list",
      region: "US",
      jurisdiction: "federal",
      limit: 120,
    },
  );
  const packs = response.packs ?? [];
  return {
    packs,
    snapshots: buildPolicyGovernanceSnapshots(packs),
  };
}

export function usePolicyGovernance(): UseQueryResult<
  PolicyGovernanceData,
  Error
> {
  return useQuery({
    queryKey: ["fme", "policy-governance", "US", "federal"],
    queryFn: getPolicyGovernance,
    staleTime: 60 * 1000,
  });
}
