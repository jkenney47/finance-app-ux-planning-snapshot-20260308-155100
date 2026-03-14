import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { backendClient } from "@/utils/services/backendClient";
import type { PolicyDomain } from "@/utils/contracts/policy";

export type PolicyOpsAuditDomain = PolicyDomain | "policy_ops_admins";

export type PolicyOpsAudit = {
  id: string;
  actor_user_id: string | null;
  action: string;
  domain: PolicyOpsAuditDomain;
  region: string;
  jurisdiction: string;
  source_version: number | null;
  target_version: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  operation_signature?: string | null;
  artifact_signature?: string | null;
};

type PolicyOpsAuditsResponse = {
  status?: string;
  audits?: PolicyOpsAudit[];
};

export async function getPolicyOpsAudits(
  limit = 30,
): Promise<PolicyOpsAudit[]> {
  const response = await backendClient.post<PolicyOpsAuditsResponse>(
    "/governPolicyPacks",
    {
      action: "list_audits",
      region: "US",
      jurisdiction: "federal",
      limit,
    },
  );
  return response.audits ?? [];
}

export function usePolicyOpsAudits(
  limit = 30,
): UseQueryResult<PolicyOpsAudit[], Error> {
  return useQuery({
    queryKey: ["fme", "policy-governance-audits", "US", "federal", limit],
    queryFn: () => getPolicyOpsAudits(limit),
    staleTime: 30 * 1000,
  });
}
