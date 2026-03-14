import type { Recommendation } from "@/utils/contracts/fme";

export type RecommendationConfidence = {
  label: "High" | "Medium" | "Low";
  reason: string;
};

export function getRecommendationConfidence(
  recommendation: Recommendation,
): RecommendationConfidence {
  if (recommendation.id !== "collect_missing_facts") {
    return {
      label: "High",
      reason: "All required inputs are currently available.",
    };
  }

  const missingRequiredFacts = recommendation.requiredFacts.length;
  if (missingRequiredFacts === 0) {
    return {
      label: "High",
      reason: "All required inputs are currently available.",
    };
  }

  if (missingRequiredFacts <= 2) {
    return {
      label: "Medium",
      reason: `${missingRequiredFacts} required input${missingRequiredFacts === 1 ? "" : "s"} still missing.`,
    };
  }

  return {
    label: "Low",
    reason: `${missingRequiredFacts} required inputs still missing.`,
  };
}
