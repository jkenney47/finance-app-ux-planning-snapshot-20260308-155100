import type { MockScenario } from "@/utils/mocks/mockScenarios";

const ANON_QUERY_SCOPE = "anonymous";
type QueryMode = "mock" | "live";

export function getDashboardSummaryQueryKey(input: {
  realDataEnabled: boolean;
  hasMockLinkedAccounts: boolean;
  scenario: MockScenario;
}): readonly [
  "dashboard",
  "summary",
  "real" | "mock",
  boolean,
  "live-data" | MockScenario,
] {
  return [
    "dashboard",
    "summary",
    input.realDataEnabled ? "real" : "mock",
    input.hasMockLinkedAccounts,
    input.realDataEnabled ? "live-data" : input.scenario,
  ] as const;
}

export function getPolicyBundleQueryKey(
  scenario: MockScenario,
): readonly ["fme", "policy-bundle", "US", "federal", MockScenario] {
  return ["fme", "policy-bundle", "US", "federal", scenario] as const;
}

export function getGoalsQueryKey(
  userId: string | null | undefined,
): readonly ["goals", "list", string] {
  return ["goals", "list", userId ?? ANON_QUERY_SCOPE] as const;
}

export function getInsightsQueryKey(
  userId: string | null | undefined,
): readonly ["insights", "list", string] {
  return ["insights", "list", userId ?? ANON_QUERY_SCOPE] as const;
}

export function getGoalsListQueryKey(input: {
  userId: string | null | undefined;
  mode: QueryMode;
}): readonly ["goals", "list", string, QueryMode] {
  return [...getGoalsQueryKey(input.userId), input.mode] as const;
}

export function getInsightsListQueryKey(input: {
  userId: string | null | undefined;
  mode: QueryMode;
}): readonly ["insights", "list", string, QueryMode] {
  return [...getInsightsQueryKey(input.userId), input.mode] as const;
}
