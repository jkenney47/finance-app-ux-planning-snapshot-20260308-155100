import type { FactKey } from "@/utils/contracts/facts";
import type { PolicyDomain } from "@/utils/contracts/policy";

export type DecisionOperator =
  | "equals"
  | "not_equals"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export type RuleCondition = {
  field: FactKey;
  operator: DecisionOperator;
  value: boolean | number | string;
};

export type RecommendationTemplate = {
  id: string;
  title: string;
  summary: string;
  actionLabel: string;
  analyticsEvent: string;
  requiredFacts: FactKey[];
  requiredPolicyDomains: PolicyDomain[];
  pros: string[];
  cons: string[];
  assumptions: string[];
  priority: number;
};

export type RuleMilestoneDefinition = {
  id: string;
  title: string;
  requiredFacts: FactKey[];
  requiredPolicyDomains: PolicyDomain[];
  recommendationIds: string[];
};

export type RulePack = {
  version: number;
  region: string;
  effectiveFrom: string;
  publishedAt: string;
  templates: RecommendationTemplate[];
  milestones: RuleMilestoneDefinition[];
};
