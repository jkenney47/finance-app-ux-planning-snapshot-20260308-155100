import { type UseQueryResult, useQuery } from "@tanstack/react-query";

import type { RulePack } from "@/utils/contracts/rules";
import { supabase } from "@/utils/supabaseClient";

const REMOTE_RULE_PACKS_ENABLED =
  process.env.EXPO_PUBLIC_ENABLE_REMOTE_RULE_PACKS === "true";

export type RulePackRow = {
  version: number;
  region: string;
  effective_from: string;
  approved_at: string | null;
  updated_at: string;
  pack: unknown;
};

export function toRulePack(row: RulePackRow): RulePack {
  return {
    version: row.version,
    region: row.region,
    effectiveFrom: row.effective_from,
    publishedAt: row.approved_at ?? row.updated_at ?? row.effective_from,
    ...(row.pack as Omit<
      RulePack,
      "version" | "region" | "effectiveFrom" | "publishedAt"
    >),
  };
}

async function fetchRemoteRulePack(): Promise<RulePack | null> {
  const { data, error } = await supabase
    .from("rule_packs")
    .select("version,region,effective_from,approved_at,updated_at,pack")
    .eq("region", "US")
    .eq("status", "approved")
    .lte("effective_from", new Date().toISOString())
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return toRulePack(data as RulePackRow);
}

export async function getRulePack(): Promise<RulePack | null> {
  if (!REMOTE_RULE_PACKS_ENABLED) return null;
  try {
    return await fetchRemoteRulePack();
  } catch {
    return null;
  }
}

export function useRulePack(): UseQueryResult<RulePack | null, Error> {
  return useQuery({
    queryKey: ["fme", "rule-pack", "US"],
    queryFn: getRulePack,
    staleTime: 5 * 60 * 1000,
  });
}
