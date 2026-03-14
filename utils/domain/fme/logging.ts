import type { FactsSnapshot } from "@/utils/contracts/facts";
import type { FmeEvaluation } from "@/utils/contracts/fme";
import type { PolicyBundle, PolicyDomain } from "@/utils/contracts/policy";
import { POLICY_DOMAINS } from "@/utils/contracts/policy";
import type { RulePack } from "@/utils/contracts/rules";

type LoggableValue =
  | string
  | number
  | boolean
  | null
  | LoggableValue[]
  | { [key: string]: LoggableValue };

type FmeFactSummary = {
  source: string;
  confidence: number;
  asOf: string;
  value: LoggableValue;
};

export type FmeEvaluationLogPayload = {
  user_id: string;
  facts_hash: string;
  facts_summary: Record<string, FmeFactSummary>;
  policy_versions: Record<PolicyDomain, number | null>;
  rule_version: number | null;
  output_summary: {
    mode: string;
    primaryRecommendationId: string | null;
    alternativeRecommendationIds: string[];
    milestoneStatuses: Array<{
      id: string;
      status: string;
    }>;
    factRequestKeys: string[];
  };
  trace: FmeEvaluation["trace"];
};

type BuildPayloadInput = {
  userId: string;
  facts: FactsSnapshot;
  evaluation: FmeEvaluation;
  policyBundle?: PolicyBundle;
  rulePack?: RulePack | null;
};

type DebtLike = {
  apr?: number;
  balance?: number;
};

function stableStringify(value: LoggableValue): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    const serialized = entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",");
    return `{${serialized}}`;
  }
  return JSON.stringify(value);
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function isPrimitiveFact(
  value: unknown,
): value is number | string | boolean | null {
  return (
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    value === null
  );
}

function isDebtArray(value: unknown[]): value is DebtLike[] {
  return value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as DebtLike).balance === "number" &&
      typeof (item as DebtLike).apr === "number",
  );
}

function summarizeDebtArray(debts: DebtLike[]): LoggableValue {
  const totalBalance = debts.reduce(
    (sum, debt) => sum + (debt.balance ?? 0),
    0,
  );
  const maxApr = debts.reduce(
    (maxValue, debt) => Math.max(maxValue, debt.apr ?? 0),
    0,
  );
  return {
    debtCount: debts.length,
    totalBalance,
    maxApr,
  };
}

function summarizeArrayFact(value: unknown[]): LoggableValue {
  if (isDebtArray(value)) {
    return summarizeDebtArray(value);
  }
  return { itemCount: value.length };
}

function summarizeFactValue(value: unknown): LoggableValue {
  if (isPrimitiveFact(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return summarizeArrayFact(value);
  }

  return { present: true };
}

function buildFactsSummary(
  facts: FactsSnapshot,
): Record<string, FmeFactSummary> {
  const entries = Object.entries(facts).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return Object.fromEntries(
    entries.map(([factKey, fact]) => [
      factKey,
      {
        source: fact.source,
        confidence: fact.confidence,
        asOf: fact.asOf,
        value: summarizeFactValue(fact.value),
      },
    ]),
  );
}

function buildPolicyVersions(
  policyBundle: PolicyBundle | undefined,
): Record<PolicyDomain, number | null> {
  return Object.fromEntries(
    POLICY_DOMAINS.map((domain) => [
      domain,
      policyBundle?.domains[domain]?.version ?? null,
    ]),
  ) as Record<PolicyDomain, number | null>;
}

function buildOutputSummary(
  evaluation: FmeEvaluation,
): FmeEvaluationLogPayload["output_summary"] {
  return {
    mode: evaluation.mode,
    primaryRecommendationId: evaluation.primaryRecommendation?.id ?? null,
    alternativeRecommendationIds: evaluation.alternatives.map(
      (option) => option.id,
    ),
    milestoneStatuses: evaluation.milestones.map((milestone) => ({
      id: milestone.id,
      status: milestone.status,
    })),
    factRequestKeys: evaluation.factRequests.map((request) => request.key),
  };
}

export function buildFactsHash(facts: FactsSnapshot): string {
  const summary = buildFactsSummary(facts);
  return hashString(stableStringify(summary));
}

export function buildFmeEvaluationLogPayload({
  userId,
  facts,
  evaluation,
  policyBundle,
  rulePack,
}: BuildPayloadInput): FmeEvaluationLogPayload {
  const factsSummary = buildFactsSummary(facts);
  return {
    user_id: userId,
    facts_hash: hashString(stableStringify(factsSummary)),
    facts_summary: factsSummary,
    policy_versions: buildPolicyVersions(policyBundle),
    rule_version: rulePack?.version ?? null,
    output_summary: buildOutputSummary(evaluation),
    trace: evaluation.trace,
  };
}

export function buildEvaluationSignature(
  payload: Pick<
    FmeEvaluationLogPayload,
    | "user_id"
    | "facts_hash"
    | "policy_versions"
    | "rule_version"
    | "output_summary"
  >,
): string {
  return hashString(
    stableStringify({
      userId: payload.user_id,
      factsHash: payload.facts_hash,
      policyVersions: payload.policy_versions,
      ruleVersion: payload.rule_version,
      outputSummary: payload.output_summary,
    }),
  );
}
