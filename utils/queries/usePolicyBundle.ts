import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import type {
  PolicyBundle,
  PolicyDomain,
  PolicyPack,
} from "@/utils/contracts/policy";
import { POLICY_DOMAINS } from "@/utils/contracts/policy";
import { buildDefaultPolicyBundle } from "@/utils/domain/fme/policies";
import {
  applyMockPolicyScenario,
  getMockScenario,
} from "@/utils/mocks/mockScenarios";
import { getPolicyBundleQueryKey } from "@/utils/queryKeys";
import { supabase } from "@/utils/supabaseClient";

function isRemotePolicyPacksEnabled(): boolean {
  return process.env.EXPO_PUBLIC_ENABLE_REMOTE_POLICY_PACKS === "true";
}

export type PolicyPackRow = {
  domain: string;
  region: string;
  jurisdiction: string;
  version: number;
  effective_from: string;
  effective_to: string | null;
  approved_at: string | null;
  updated_at: string;
  source: string | null;
  status: string;
  pack: unknown;
};

function isPolicyDomain(value: string): value is PolicyDomain {
  return POLICY_DOMAINS.includes(value as PolicyDomain);
}

export function toPolicyPack(row: PolicyPackRow): PolicyPack | null {
  if (!isPolicyDomain(row.domain)) return null;

  return {
    domain: row.domain,
    region: row.region,
    jurisdiction: row.jurisdiction,
    version: row.version,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to ?? undefined,
    publishedAt: row.approved_at ?? row.updated_at ?? row.effective_from,
    source: row.source ?? "remote-policy-pack",
    status: row.status === "approved" ? "approved" : "draft",
    data: row.pack as PolicyPack["data"],
  };
}

export async function fetchRemotePolicyBundle(): Promise<PolicyBundle> {
  const { data, error } = await supabase
    .from("policy_packs")
    .select(
      "domain,region,jurisdiction,version,effective_from,effective_to,approved_at,updated_at,source,status,pack",
    )
    .eq("region", "US")
    .eq("jurisdiction", "federal")
    .eq("status", "approved")
    .lte("effective_from", new Date().toISOString())
    .order("effective_from", { ascending: false });

  if (error || !data || data.length === 0) {
    return buildDefaultPolicyBundle();
  }

  const rows = data as PolicyPackRow[];
  const fallback = buildDefaultPolicyBundle();
  const merged: PolicyBundle["domains"] = { ...fallback.domains };
  const appliedDomains = new Set<PolicyDomain>();

  for (const row of rows) {
    const policyPack = toPolicyPack(row);
    if (!policyPack) continue;
    if (appliedDomains.has(policyPack.domain)) continue;
    if (policyPack.domain === "rates") {
      merged.rates = policyPack as PolicyPack<"rates">;
      appliedDomains.add(policyPack.domain);
      continue;
    }
    if (policyPack.domain === "thresholds") {
      merged.thresholds = policyPack as PolicyPack<"thresholds">;
      appliedDomains.add(policyPack.domain);
      continue;
    }
    if (policyPack.domain === "limits") {
      merged.limits = policyPack as PolicyPack<"limits">;
      appliedDomains.add(policyPack.domain);
      continue;
    }
    if (policyPack.domain === "tax_labels") {
      merged.tax_labels = policyPack as PolicyPack<"tax_labels">;
      appliedDomains.add(policyPack.domain);
    }
  }

  return {
    asOf: new Date().toISOString(),
    domains: merged,
  };
}

export async function getPolicyBundle(): Promise<PolicyBundle> {
  const scenario = getMockScenario();
  if (!isRemotePolicyPacksEnabled()) {
    return applyMockPolicyScenario(buildDefaultPolicyBundle(), { scenario });
  }

  try {
    const remoteBundle = await fetchRemotePolicyBundle();
    return applyMockPolicyScenario(remoteBundle, { scenario });
  } catch {
    return applyMockPolicyScenario(buildDefaultPolicyBundle(), { scenario });
  }
}

export function usePolicyBundle(): UseQueryResult<PolicyBundle, Error> {
  const scenario = getMockScenario();
  return useQuery({
    queryKey: getPolicyBundleQueryKey(scenario),
    queryFn: getPolicyBundle,
    staleTime: 5 * 60 * 1000,
  });
}
