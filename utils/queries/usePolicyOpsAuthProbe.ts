import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import { backendClient } from "@/utils/services/backendClient";

type PolicyOpsAuthProbeResponse = {
  status?: string;
  authMode?: "secret" | "admin_jwt";
  actorUserId?: string | null;
};

export type PolicyOpsAuthProbe = {
  authorized: boolean;
  authMode: "secret" | "admin_jwt" | "unknown";
  actorUserId: string | null;
};

export async function getPolicyOpsAuthProbe(): Promise<PolicyOpsAuthProbe> {
  try {
    const response = await backendClient.post<PolicyOpsAuthProbeResponse>(
      "/governPolicyPacks",
      {
        action: "auth_probe",
      },
    );
    return {
      authorized: response.status === "authorized",
      authMode: response.authMode ?? "unknown",
      actorUserId: response.actorUserId ?? null,
    };
  } catch {
    return {
      authorized: false,
      authMode: "unknown",
      actorUserId: null,
    };
  }
}

export function usePolicyOpsAuthProbe(): UseQueryResult<
  PolicyOpsAuthProbe,
  Error
> {
  return useQuery({
    queryKey: ["fme", "policy-ops-auth-probe"],
    queryFn: getPolicyOpsAuthProbe,
    staleTime: 60 * 1000,
  });
}
