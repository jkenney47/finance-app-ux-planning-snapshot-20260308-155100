import type { FactsSnapshot } from "@/utils/contracts/facts";
import type { FmeEvaluation } from "@/utils/contracts/fme";

export type CoverageConfidenceLevel = "high" | "medium" | "low";

export type CoverageConfidence = {
  level: CoverageConfidenceLevel;
  label: "High" | "Medium" | "Low";
  reasons: string[];
  summary: string;
};

type InstitutionHealth = {
  status: "connected" | "relink" | "syncing" | "error";
};

function averageFactConfidence(facts: FactsSnapshot): number {
  const values = Object.values(facts);
  if (values.length === 0) return 0;
  const total = values.reduce((sum, fact) => sum + fact.confidence, 0);
  return total / values.length;
}

export function deriveCoverageConfidence(
  evaluation: FmeEvaluation,
  facts: FactsSnapshot,
  institutionStatuses: InstitutionHealth[] = [],
): CoverageConfidence {
  const missingFactsCount = evaluation.factRequests.length;
  const staleDomainCount = evaluation.policyStatus.filter(
    (status) => status.isStale,
  ).length;
  const reconnectCount = institutionStatuses.filter(
    (institution) =>
      institution.status === "relink" || institution.status === "error",
  ).length;
  const syncingCount = institutionStatuses.filter(
    (institution) => institution.status === "syncing",
  ).length;
  const hasLinkedAccounts = facts.hasLinkedAccounts?.value === true;
  const avgConfidence = averageFactConfidence(facts);

  let score = 100;
  score -= Math.min(36, missingFactsCount * 9);
  score -= Math.min(40, staleDomainCount * 20);
  score -= hasLinkedAccounts ? 0 : 24;
  score -= Math.min(22, reconnectCount * 11);
  score -= Math.min(8, syncingCount * 4);

  if (avgConfidence < 0.45) {
    score -= 25;
  } else if (avgConfidence < 0.65) {
    score -= 14;
  } else if (avgConfidence < 0.8) {
    score -= 6;
  }

  const normalizedScore = Math.max(0, Math.min(100, score));

  const level: CoverageConfidenceLevel =
    normalizedScore >= 74 ? "high" : normalizedScore >= 45 ? "medium" : "low";
  const label =
    level === "high" ? "High" : level === "medium" ? "Medium" : "Low";

  const reasons: string[] = [];
  if (!hasLinkedAccounts) {
    reasons.push("No linked accounts yet");
  }
  if (missingFactsCount > 0) {
    reasons.push(
      `${missingFactsCount} key input${missingFactsCount === 1 ? "" : "s"} still missing`,
    );
  }
  if (staleDomainCount > 0) {
    reasons.push(
      `${staleDomainCount} policy domain${staleDomainCount === 1 ? "" : "s"} stale`,
    );
  }
  if (reconnectCount > 0) {
    reasons.push(
      `${reconnectCount} institution${reconnectCount === 1 ? "" : "s"} need reconnect`,
    );
  }
  if (syncingCount > 0 && reconnectCount === 0) {
    reasons.push(
      `${syncingCount} institution${syncingCount === 1 ? "" : "s"} currently syncing`,
    );
  }
  if (avgConfidence > 0 && avgConfidence < 0.65) {
    reasons.push("Several facts are low-confidence or inferred");
  }
  if (reasons.length === 0) {
    reasons.push("Connected and current inputs support recommendations");
  }

  return {
    level,
    label,
    reasons,
    summary: `Accuracy: ${label}`,
  };
}
