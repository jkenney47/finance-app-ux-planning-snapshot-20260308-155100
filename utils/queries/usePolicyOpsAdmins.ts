import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { backendClient } from "@/utils/services/backendClient";

export type PolicyOpsAdmin = {
  user_id: string;
  active: boolean;
  notes: string | null;
  added_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

type PolicyOpsAdminsResponse = {
  status?: string;
  authMode?: "secret" | "admin_jwt";
  actorUserId?: string | null;
  admins?: PolicyOpsAdmin[];
};

export async function getPolicyOpsAdmins(
  limit = 50,
): Promise<PolicyOpsAdmin[]> {
  const response = await backendClient.post<PolicyOpsAdminsResponse>(
    "/governPolicyPacks",
    {
      action: "list_admins",
      limit,
    },
  );
  return response.admins ?? [];
}

export function usePolicyOpsAdmins(
  limit = 50,
  enabled = true,
): UseQueryResult<PolicyOpsAdmin[], Error> {
  return useQuery({
    queryKey: ["fme", "policy-ops-admins", limit],
    queryFn: () => getPolicyOpsAdmins(limit),
    staleTime: 60 * 1000,
    enabled,
  });
}
